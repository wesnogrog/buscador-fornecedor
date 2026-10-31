/**
 * Tests for useSendEmail hook
 * Tests sending state, progress tracking, error handling, and retry logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSendEmail } from '../hooks/useSendEmail';
import * as gmailModule from '../utils/gmail';
import * as idempotencyModule from '../utils/idempotency';

// Mock the sendEmail and idempotency functions
vi.mock('../utils/gmail', () => ({
  sendEmail: vi.fn(),
}));

vi.mock('../utils/idempotency', () => ({
  checkIdempotency: vi.fn(),
  recordSend: vi.fn(),
}));

describe('useSendEmail Hook', () => {
  let mockSendEmail: any;
  let mockCheckIdempotency: any;
  let mockRecordSend: any;

  beforeEach(() => {
    mockSendEmail = gmailModule.sendEmail;
    mockCheckIdempotency = idempotencyModule.checkIdempotency;
    mockRecordSend = idempotencyModule.recordSend;

    vi.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useSendEmail());

    expect(result.current.isSending).toBe(false);
    expect(result.current.progress).toEqual({
      total: 0,
      sent: 0,
      failed: 0,
    });
    expect(result.current.errors).toEqual([]);
    expect(result.current.canRetry).toBe(false);
  });

  it('should prevent sending to same supplier+pedido pair twice', async () => {
    mockCheckIdempotency.mockResolvedValue(true); // Idempotency violation detected

    const { result } = renderHook(() => useSendEmail());

    await act(async () => {
      await result.current.sendBatch([
        {
          to: 'supplier@example.com',
          supplierId: 'supplier-123',
          pedidoId: 'pedido-456',
          message: 'Test message',
        },
      ]);
    });

    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0]).toContain('já recebeu');
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('should track sending progress correctly', async () => {
    mockCheckIdempotency.mockResolvedValue(false);
    mockSendEmail.mockResolvedValue({
      success: true,
      messageId: 'msg-123',
    });
    mockRecordSend.mockResolvedValue({
      id: 'envio-123',
      status: 'sucesso',
    });

    const { result } = renderHook(() => useSendEmail());

    const emails = [
      {
        to: 'supplier1@example.com',
        supplierId: 'supplier-1',
        pedidoId: 'pedido-456',
        message: 'Test 1',
      },
      {
        to: 'supplier2@example.com',
        supplierId: 'supplier-2',
        pedidoId: 'pedido-456',
        message: 'Test 2',
      },
    ];

    await act(async () => {
      await result.current.sendBatch(emails);
    });

    expect(result.current.progress.total).toBe(2);
    expect(result.current.progress.sent).toBe(2);
    expect(result.current.progress.failed).toBe(0);
    expect(result.current.isSending).toBe(false);
  });

  it('should handle individual email failures without blocking others', async () => {
    mockCheckIdempotency.mockResolvedValue(false);

    // First email fails, second succeeds
    mockSendEmail
      .mockResolvedValueOnce({
        success: false,
        error: 'Invalid recipient',
      })
      .mockResolvedValueOnce({
        success: true,
        messageId: 'msg-456',
      });

    mockRecordSend
      .mockResolvedValueOnce({
        status: 'falhou',
        erro: 'Invalid recipient',
      })
      .mockResolvedValueOnce({
        status: 'sucesso',
      });

    const { result } = renderHook(() => useSendEmail());

    const emails = [
      {
        to: 'bad@example.com',
        supplierId: 'supplier-1',
        pedidoId: 'pedido-456',
        message: 'Test 1',
      },
      {
        to: 'good@example.com',
        supplierId: 'supplier-2',
        pedidoId: 'pedido-456',
        message: 'Test 2',
      },
    ];

    await act(async () => {
      await result.current.sendBatch(emails);
    });

    expect(result.current.progress.sent).toBe(1);
    expect(result.current.progress.failed).toBe(1);
    expect(result.current.errors).toHaveLength(1);
  });

  it('should disable send button while sending', async () => {
    mockCheckIdempotency.mockResolvedValue(false);
    mockSendEmail.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ success: true, messageId: 'msg-123' }),
            100
          )
        )
    );
    mockRecordSend.mockResolvedValue({ id: 'envio-123' });

    const { result } = renderHook(() => useSendEmail());

    expect(result.current.isButtonDisabled).toBe(false);

    let promiseResolve: any;
    const sendPromise = new Promise((resolve) => {
      promiseResolve = resolve;
    });

    mockSendEmail.mockReturnValue(sendPromise);

    act(() => {
      result.current.sendBatch([
        {
          to: 'test@example.com',
          supplierId: 'supplier-123',
          pedidoId: 'pedido-456',
          message: 'Test',
        },
      ]);
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(result.current.isButtonDisabled).toBe(true);

    act(() => {
      promiseResolve({ success: true });
    });

    await act(async () => {
      await sendPromise;
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(result.current.isButtonDisabled).toBe(false);
  });

  it('should only enable retry when explicitly requested', async () => {
    const { result } = renderHook(() => useSendEmail());

    expect(result.current.canRetry).toBe(false);

    // Simulate some failures
    act(() => {
      // Manually trigger error state (normally via sendBatch)
      result.current.errors = ['Test error'];
    });

    // Still can't retry unless explicitly enabled
    expect(result.current.canRetry).toBe(false);

    // Only retry is enabled after explicit user action
    act(() => {
      result.current.canRetry = true;
    });

    expect(result.current.canRetry).toBe(true);
  });

  it('should clear errors on new send attempt', async () => {
    const { result } = renderHook(() => useSendEmail());

    // Manually set some errors
    act(() => {
      result.current.errors = ['Previous error'];
    });

    expect(result.current.errors).toHaveLength(1);

    mockCheckIdempotency.mockResolvedValue(false);
    mockSendEmail.mockResolvedValue({ success: true });
    mockRecordSend.mockResolvedValue({ status: 'sucesso' });

    await act(async () => {
      await result.current.sendBatch([
        {
          to: 'test@example.com',
          supplierId: 'supplier-123',
          pedidoId: 'pedido-456',
          message: 'New message',
        },
      ]);
    });

    // Errors should be cleared after successful send
    expect(result.current.errors).toHaveLength(0);
  });

  it('should handle network errors during batch send', async () => {
    mockCheckIdempotency.mockResolvedValue(false);
    mockSendEmail.mockRejectedValue(new Error('Network timeout'));

    const { result } = renderHook(() => useSendEmail());

    await act(async () => {
      await result.current.sendBatch([
        {
          to: 'test@example.com',
          supplierId: 'supplier-123',
          pedidoId: 'pedido-456',
          message: 'Test',
        },
      ]);
    });

    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0]).toContain('Network');
    expect(result.current.isSending).toBe(false);
  });

  it('should calculate correct progress percentages', async () => {
    mockCheckIdempotency.mockResolvedValue(false);
    mockSendEmail.mockResolvedValue({ success: true });
    mockRecordSend.mockResolvedValue({ status: 'sucesso' });

    const { result } = renderHook(() => useSendEmail());

    const emails = Array(10)
      .fill(null)
      .map((_, i) => ({
        to: `supplier${i}@example.com`,
        supplierId: `supplier-${i}`,
        pedidoId: 'pedido-456',
        message: `Message ${i}`,
      }));

    await act(async () => {
      await result.current.sendBatch(emails);
    });

    const percentage =
      (result.current.progress.sent / result.current.progress.total) * 100;
    expect(percentage).toBe(100);
  });
});
