/**
 * Integration tests for the complete email send flow
 * Tests idempotency, error handling, and end-to-end flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkIdempotency, recordSend } from '../utils/idempotency';
import { sendEmail } from '../utils/gmail';

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  auth: { getUser: vi.fn() },
  functions: { invoke: vi.fn() },
}));

// createClient runs at module load, so the client must exist before beforeEach
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

const insertReturning = (result: unknown) =>
  vi.fn(() => ({
    select: () => ({ single: () => Promise.resolve(result) }),
  }));

describe('Email Send Integration Tests', () => {
  beforeEach(() => {
    mockSupabase.from = vi.fn();
    mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    mockSupabase.functions.invoke = vi.fn();
  });

  describe('Complete send flow', () => {
    it('should prevent duplicate sends for same supplier+pedido pair', async () => {
      // First send attempt
      const mockInsert = {
        data: {
          id: 'envio-123',
          chave_idempotencia: 'supplier-1_pedido-456',
          status: 'sucesso',
        },
        error: null,
      };

      mockSupabase.from.mockReturnValue({
        insert: insertReturning(mockInsert),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      // Record first send
      const record = await recordSend({
        pedidoFornecedorId: 'pf-1',
        supplierId: 'supplier-1',
        pedidoId: 'pedido-456',
        message: 'First send',
        status: 'sucesso',
      });

      expect(record.status).toBe('sucesso');

      // Try to send again - idempotency check should detect it
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'envio-123',
              status: 'sucesso',
            },
            error: null,
          }),
        }),
      });

      const isDuplicate = await checkIdempotency(
        'supplier-1',
        'pedido-456'
      );

      expect(isDuplicate).toBe(true);
    });

    it('should allow sending to different supplier in same pedido', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      const isDuplicate1 = await checkIdempotency(
        'supplier-1',
        'pedido-456'
      );

      const isDuplicate2 = await checkIdempotency(
        'supplier-2',
        'pedido-456'
      );

      expect(isDuplicate1).toBe(false);
      expect(isDuplicate2).toBe(false);
    });

    it('should allow same supplier in different pedido', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      const isDuplicate1 = await checkIdempotency(
        'supplier-1',
        'pedido-456'
      );

      const isDuplicate2 = await checkIdempotency(
        'supplier-1',
        'pedido-789'
      );

      expect(isDuplicate1).toBe(false);
      expect(isDuplicate2).toBe(false);
    });

    it('should record send with all required fields for audit trail', async () => {
      const insertFunc = insertReturning({
        data: {
          id: 'envio-789',
          pedido_fornecedor_id: 'pf-1',
          canal: 'email',
          status: 'sucesso',
          mensagem: 'Test message',
          data_envio: '2026-10-31T10:00:00Z',
          chave_idempotencia: 'supplier-1_pedido-456',
          criado_por: 'user-123',
        },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: insertFunc,
      });

      await recordSend({
        pedidoFornecedorId: 'pf-1',
        supplierId: 'supplier-1',
        pedidoId: 'pedido-456',
        message: 'Test message',
        status: 'sucesso',
      });

      expect(insertFunc).toHaveBeenCalled();
      const insertedData = (insertFunc.mock.calls as unknown[][])[0][0];

      expect(insertedData).toHaveProperty('pedido_fornecedor_id');
      expect(insertedData).toHaveProperty('canal', 'email');
      expect(insertedData).toHaveProperty('status');
      expect(insertedData).toHaveProperty('mensagem');
      expect(insertedData).toHaveProperty('data_envio');
      expect(insertedData).toHaveProperty('chave_idempotencia');
      expect(insertedData).toHaveProperty('criado_por');
    });

    it('should record failed sends with error message for investigation', async () => {
      mockSupabase.from.mockReturnValue({
        insert: insertReturning({
          data: {
            id: 'envio-fail',
            status: 'falhou',
            erro: 'Gmail API: Invalid recipient format',
          },
          error: null,
        }),
      });

      const result = await recordSend({
        pedidoFornecedorId: 'pf-1',
        supplierId: 'supplier-1',
        pedidoId: 'pedido-456',
        message: 'Test message',
        status: 'falhou',
        errorMessage: 'Gmail API: Invalid recipient format',
      });

      expect(result.status).toBe('falhou');
      expect(result.erro).toBe('Gmail API: Invalid recipient format');
    });

    it('should handle Gmail API errors without blocking subsequent sends', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          error: {
            message: 'Invalid recipient',
          },
        },
        error: null,
      });

      const result = await sendEmail({
        to: 'invalid@test.local',
        subject: 'Test',
        body: 'Test',
        supplierId: 'supplier-1',
        pedidoId: 'pedido-456',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should track multiple sends in sequence correctly', async () => {
      const sendResults = [];

      for (let i = 1; i <= 3; i++) {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        });

        const isDuplicate = await checkIdempotency(
          `supplier-${i}`,
          'pedido-456'
        );

        sendResults.push(isDuplicate);
      }

      // All three should be allowed (different suppliers)
      expect(sendResults).toEqual([false, false, false]);
    });

    it('should validate email format before sending', async () => {
      await expect(
        sendEmail({
          to: 'not-an-email',
          subject: 'Test',
          body: 'Test',
          supplierId: 'supplier-1',
          pedidoId: 'pedido-456',
        })
      ).rejects.toThrow(/Invalid recipient email/);
    });

    it('should require authentication for all operations', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('User not authenticated'),
      });

      await expect(
        checkIdempotency('supplier-1', 'pedido-456')
      ).rejects.toThrow('User not authenticated');
    });

    it('should create correct idempotency key format', async () => {
      // Test various supplier/pedido combinations to ensure key format
      const testCases = [
        { supplierId: 'supplier-1', pedidoId: 'pedido-456', expected: 'supplier-1_pedido-456' },
        { supplierId: 'abc-def', pedidoId: 'xyz-123', expected: 'abc-def_xyz-123' },
        { supplierId: 's1', pedidoId: 'p1', expected: 's1_p1' },
      ];

      let lastInsertedKey: string | null = null;

      mockSupabase.from.mockReturnValue({
        insert: vi.fn((data) => {
          lastInsertedKey = data.chave_idempotencia;
          return insertReturning({
            data: { id: 'test', ...data },
            error: null,
          })();
        }),
      });

      for (const testCase of testCases) {
        lastInsertedKey = null;

        await recordSend({
          pedidoFornecedorId: 'pf-1',
          supplierId: testCase.supplierId,
          pedidoId: testCase.pedidoId,
          message: 'Test',
          status: 'sucesso',
        });

        expect(lastInsertedKey).toBe(testCase.expected);
      }
    });
  });
});
