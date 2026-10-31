/**
 * Tests for SendFlow component
 * Tests send confirmation, progress tracking, error handling, and UI interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SendFlow } from '../pages/SendFlow';
import * as useSendEmailModule from '../hooks/useSendEmail';

// Mock the useSendEmail hook
vi.mock('../hooks/useSendEmail', () => ({
  useSendEmail: vi.fn(),
}));

describe('SendFlow Component', () => {
  const mockMessages = [
    {
      supplierId: 'supplier-1',
      pedidoFornecedorId: 'pf-1',
      supplierName: 'Fornecedor A',
      supplierEmail: 'a@example.com',
      subject: 'Pedido de Orçamento',
      body: 'Olá Fornecedor A,\n\nGostaria de solicitar um orçamento...',
    },
    {
      supplierId: 'supplier-2',
      pedidoFornecedorId: 'pf-2',
      supplierName: 'Fornecedor B',
      supplierEmail: 'b@example.com',
      subject: 'Pedido de Orçamento',
      body: 'Olá Fornecedor B,\n\nGostaria de solicitar um orçamento...',
    },
  ];

  const mockSelectedSuppliers = [
    {
      id: 'supplier-1',
      nome: 'Fornecedor A',
      email: 'a@example.com',
    },
    {
      id: 'supplier-2',
      nome: 'Fornecedor B',
      email: 'b@example.com',
    },
  ];

  const defaultMockHookState = {
    isSending: false,
    isButtonDisabled: false,
    canRetry: false,
    progress: { total: 0, sent: 0, failed: 0 },
    errors: [],
    successCount: 0,
    failedCount: 0,
    sendBatch: vi.fn(),
    clearErrors: vi.fn(),
    resetProgress: vi.fn(),
    enableRetry: vi.fn(),
    disableRetry: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(useSendEmailModule.useSendEmail).mockReturnValue(
      defaultMockHookState
    );
  });

  it('should render send confirmation screen with message preview', () => {
    render(
      <SendFlow
        messages={mockMessages}
        selectedSuppliers={mockSelectedSuppliers}
        pedidoId="pedido-1"
      />
    );

    expect(screen.getByText('Envio de E-mails')).toBeInTheDocument();
    expect(screen.getByText('Resumo do Envio')).toBeInTheDocument();
    expect(screen.getByText(/Você está prestes a enviar 2 e-mail/)).toBeInTheDocument();
    expect(screen.getByText(/Fornecedor A/)).toBeInTheDocument();
    expect(screen.getByText(/Fornecedor B/)).toBeInTheDocument();
  });

  it('should display send button when not sending', () => {
    render(
      <SendFlow
        messages={mockMessages}
        selectedSuppliers={mockSelectedSuppliers}
        pedidoId="pedido-1"
      />
    );

    const sendButton = screen.getByRole('button', { name: /Enviar E-mails/ });
    expect(sendButton).toBeInTheDocument();
    expect(sendButton).not.toBeDisabled();
  });

  it('should disable send button while sending', () => {
    const mockHookState = {
      ...defaultMockHookState,
      isSending: true,
      isButtonDisabled: true,
    };

    vi.mocked(useSendEmailModule.useSendEmail).mockReturnValue(mockHookState);

    render(
      <SendFlow
        messages={mockMessages}
        selectedSuppliers={mockSelectedSuppliers}
        pedidoId="pedido-1"
      />
    );

    const sendButton = screen.getByRole('button', { name: /Enviar E-mails/ });
    expect(sendButton).toBeDisabled();
  });

  it('should call sendBatch with correct email data', async () => {
    const mockSendBatch = vi.fn();
    const mockHookState = {
      ...defaultMockHookState,
      sendBatch: mockSendBatch,
    };

    vi.mocked(useSendEmailModule.useSendEmail).mockReturnValue(mockHookState);

    render(
      <SendFlow
        messages={mockMessages}
        selectedSuppliers={mockSelectedSuppliers}
        pedidoId="pedido-1"
      />
    );

    const sendButton = screen.getByRole('button', { name: /Enviar E-mails/ });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            to: 'a@example.com',
            supplierId: 'supplier-1',
            pedidoId: 'pedido-1',
          }),
          expect.objectContaining({
            to: 'b@example.com',
            supplierId: 'supplier-2',
            pedidoId: 'pedido-1',
          }),
        ])
      );
    });
  });

  it('should show progress bar while sending', async () => {
    const mockHookState = {
      ...defaultMockHookState,
      isSending: true,
      progress: { total: 2, sent: 1, failed: 0 },
    };

    vi.mocked(useSendEmailModule.useSendEmail).mockReturnValue(mockHookState);

    const { rerender } = render(
      <SendFlow
        messages={mockMessages}
        selectedSuppliers={mockSelectedSuppliers}
        pedidoId="pedido-1"
      />
    );

    // Click send first
    const sendButton = screen.getByRole('button', { name: /Enviar E-mails/ });
    fireEvent.click(sendButton);

    // Rerender with sending state
    rerender(
      <SendFlow
        messages={mockMessages}
        selectedSuppliers={mockSelectedSuppliers}
        pedidoId="pedido-1"
      />
    );

    expect(screen.getByRole('button', { name: 'Enviando...' })).toBeDisabled();
    expect(screen.getByText(/1 de 2/)).toBeInTheDocument();
  });

  it('should display success message after all emails sent', () => {
    const mockHookState = {
      ...defaultMockHookState,
      isSending: false,
      successCount: 2,
      failedCount: 0,
      progress: { total: 2, sent: 2, failed: 0 },
    };

    vi.mocked(useSendEmailModule.useSendEmail).mockReturnValue(mockHookState);

    render(
      <SendFlow
        messages={mockMessages}
        selectedSuppliers={mockSelectedSuppliers}
        pedidoId="pedido-1"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Enviar E-mails/ }));

    expect(
      screen.getByText(/Envio concluído com sucesso/)
    ).toBeInTheDocument();
  });

  it('should display error messages', () => {
    const mockErrors = [
      'Failed to send to a@example.com: Invalid recipient',
      'Network error sending to b@example.com',
    ];

    const mockHookState = {
      ...defaultMockHookState,
      isSending: false,
      errors: mockErrors,
      failedCount: 2,
      progress: { total: 2, sent: 0, failed: 2 },
    };

    vi.mocked(useSendEmailModule.useSendEmail).mockReturnValue(mockHookState);

    render(
      <SendFlow
        messages={mockMessages}
        selectedSuppliers={mockSelectedSuppliers}
        pedidoId="pedido-1"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Enviar E-mails/ }));

    expect(screen.getByText(/Erros ao enviar \(2\)/)).toBeInTheDocument();
    mockErrors.forEach((error) => {
      expect(screen.getByText(error)).toBeInTheDocument();
    });
  });

  it('should show retry button when there are failures and retry is allowed', () => {
    const mockHookState = {
      ...defaultMockHookState,
      canRetry: true,
      failedCount: 1,
      errors: ['One email failed'],
      isSending: false,
      progress: { total: 2, sent: 1, failed: 1 },
    };

    vi.mocked(useSendEmailModule.useSendEmail).mockReturnValue(mockHookState);

    render(
      <SendFlow
        messages={mockMessages}
        selectedSuppliers={mockSelectedSuppliers}
        pedidoId="pedido-1"
        allowRetry={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Enviar E-mails/ }));

    const retryButton = screen.getByRole('button', {
      name: /Tentar Novamente/,
    });
    expect(retryButton).toBeInTheDocument();
  });

  it('should retry only the suppliers that failed', async () => {
    const mockSendBatch = vi.fn().mockResolvedValue({
      successCount: 1,
      failedCount: 1,
      errors: ['One email failed'],
      failedSupplierIds: ['supplier-2'],
    });

    vi.mocked(useSendEmailModule.useSendEmail).mockReturnValue({
      ...defaultMockHookState,
      sendBatch: mockSendBatch,
      canRetry: true,
      failedCount: 1,
      failedSupplierIds: ['supplier-2'],
    } as any);

    render(
      <SendFlow
        messages={mockMessages}
        selectedSuppliers={mockSelectedSuppliers}
        pedidoId="pedido-1"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Enviar E-mails/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Tentar Novamente/ }));

    await waitFor(() => expect(mockSendBatch).toHaveBeenCalledTimes(2));
    const retried = mockSendBatch.mock.calls[1][0];
    expect(retried.map((e: { supplierId: string }) => e.supplierId)).toEqual(['supplier-2']);
  });

  it('should not show retry button when retry is disabled', () => {
    const mockHookState = {
      ...defaultMockHookState,
      canRetry: true,
      failedCount: 1,
      errors: ['One email failed'],
      isSending: false,
    };

    vi.mocked(useSendEmailModule.useSendEmail).mockReturnValue(mockHookState);

    render(
      <SendFlow
        messages={mockMessages}
        selectedSuppliers={mockSelectedSuppliers}
        pedidoId="pedido-1"
        allowRetry={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Enviar E-mails/ }));

    const retryButton = screen.queryByRole('button', {
      name: /Tentar Novamente/,
    });
    expect(retryButton).not.toBeInTheDocument();
  });

  it('should call onSendComplete callback after sending', async () => {
    const onSendComplete = vi.fn();
    const mockSendBatch = vi.fn().mockResolvedValue({
      successCount: 2,
      failedCount: 0,
      errors: [],
      failedSupplierIds: [],
    });

    const mockHookState = {
      ...defaultMockHookState,
      sendBatch: mockSendBatch,
      successCount: 2,
      failedCount: 0,
      errors: [],
    };

    vi.mocked(useSendEmailModule.useSendEmail).mockReturnValue(mockHookState);

    render(
      <SendFlow
        messages={mockMessages}
        selectedSuppliers={mockSelectedSuppliers}
        pedidoId="pedido-1"
        onSendComplete={onSendComplete}
      />
    );

    const sendButton = screen.getByRole('button', { name: /Enviar E-mails/ });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(onSendComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          successCount: 2,
          failedCount: 0,
        })
      );
    });
  });

  it('should handle cancel action', () => {
    const onCancel = vi.fn();

    render(
      <SendFlow
        messages={mockMessages}
        selectedSuppliers={mockSelectedSuppliers}
        pedidoId="pedido-1"
        onCancel={onCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancelar/ });
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  it('should disable send button when no messages', () => {
    render(
      <SendFlow
        messages={[]}
        selectedSuppliers={[]}
        pedidoId="pedido-1"
      />
    );

    const sendButton = screen.getByRole('button', { name: /Enviar E-mails/ });
    expect(sendButton).toBeDisabled();
  });

  it('should truncate supplier list if more than 5', () => {
    const manyMessages = Array(10)
      .fill(null)
      .map((_, i) => ({
        supplierId: `supplier-${i}`,
        pedidoFornecedorId: `pf-${i}`,
        supplierName: `Fornecedor ${String.fromCharCode(65 + i)}`,
        supplierEmail: `supplier${i}@example.com`,
        subject: 'Pedido de Orçamento',
        body: 'Test body',
      }));

    render(
      <SendFlow
        messages={manyMessages}
        selectedSuppliers={[]}
        pedidoId="pedido-1"
      />
    );

    expect(screen.getByText(/\+ 5 outros fornecedores/)).toBeInTheDocument();
  });
});
