/**
 * Tests for idempotency checking and recording email sends
 * Ensures same (supplierId, pedidoId) pair cannot send twice
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkIdempotency, recordSend } from '../utils/idempotency';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

describe('Idempotency', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
      auth: {
        getUser: vi.fn(),
      },
    };
    vi.mocked(createClient).mockReturnValue(mockSupabase);
  });

  describe('checkIdempotency', () => {
    it('should return false (allow send) when no previous send exists for supplier+pedido pair', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        data: null,
        error: null,
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(mockQuery),
        }),
      });

      const result = await checkIdempotency('supplier-123', 'pedido-456');

      expect(result).toBe(false);
    });

    it('should return true (block send) when previous send exists for same supplier+pedido pair', async () => {
      const mockQuery = {
        data: {
          id: 'envio-789',
          status: 'sucesso',
          data_envio: '2026-10-31T10:00:00Z',
        },
        error: null,
      };

      const mockChain = {
        eq: vi.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn(() => mockChain).mockReturnThis(),
          single: vi.fn().mockResolvedValue(mockQuery),
        }),
      });

      const result = await checkIdempotency('supplier-123', 'pedido-456');

      expect(result).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      const mockQuery = {
        data: null,
        error: new Error('Database connection failed'),
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(mockQuery),
        }),
      });

      await expect(checkIdempotency('supplier-123', 'pedido-456')).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle missing credentials gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('User not authenticated'),
      });

      await expect(checkIdempotency('supplier-123', 'pedido-456')).rejects.toThrow(
        'User not authenticated'
      );
    });
  });

  describe('recordSend', () => {
    it('should record a successful send with all required fields', async () => {
      const mockInsert = {
        data: {
          id: 'envio-new',
          pedido_fornecedor_id: 'pf-123',
          canal: 'email',
          status: 'sucesso',
          mensagem: 'Test message',
          data_envio: '2026-10-31T10:00:00Z',
          chave_idempotencia: 'supplier-123_pedido-456',
          criado_por: 'user-123',
        },
        error: null,
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue(mockInsert),
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const result = await recordSend({
        pedidoFornecedorId: 'pf-123',
        supplierId: 'supplier-123',
        pedidoId: 'pedido-456',
        message: 'Test message',
        status: 'sucesso',
      });

      expect(result).toEqual(mockInsert.data);
      expect(mockSupabase.from).toHaveBeenCalledWith('envios');
    });

    it('should record a failed send with error message', async () => {
      const mockInsert = {
        data: {
          id: 'envio-fail',
          status: 'falhou',
          erro: 'Gmail API error: Invalid recipient',
          chave_idempotencia: 'supplier-123_pedido-456',
        },
        error: null,
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue(mockInsert),
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const result = await recordSend({
        pedidoFornecedorId: 'pf-123',
        supplierId: 'supplier-123',
        pedidoId: 'pedido-456',
        message: 'Test message',
        status: 'falhou',
        errorMessage: 'Gmail API error: Invalid recipient',
      });

      expect(result.status).toBe('falhou');
      expect(result.erro).toBe('Gmail API error: Invalid recipient');
    });

    it('should handle insertion errors', async () => {
      const mockInsert = {
        data: null,
        error: new Error('Unique constraint violation'),
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue(mockInsert),
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      await expect(
        recordSend({
          pedidoFornecedorId: 'pf-123',
          supplierId: 'supplier-123',
          pedidoId: 'pedido-456',
          message: 'Test message',
          status: 'sucesso',
        })
      ).rejects.toThrow('Unique constraint violation');
    });

    it('should create correct idempotency key format', async () => {
      let insertedData: any = null;

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockImplementation((data) => {
          insertedData = data;
          return Promise.resolve({
            data: { id: 'envio-123', ...data },
            error: null,
          });
        }),
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      await recordSend({
        pedidoFornecedorId: 'pf-123',
        supplierId: 'supplier-456',
        pedidoId: 'pedido-789',
        message: 'Test message',
        status: 'sucesso',
      });

      expect(insertedData?.chave_idempotencia).toBe('supplier-456_pedido-789');
    });
  });
});
