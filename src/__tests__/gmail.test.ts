/**
 * Tests for Gmail API email sending integration
 * Tests against mocked Gmail API (no real emails sent)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendEmail, createEmailMessage } from '../utils/gmail';

// Mock Supabase client
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  auth: { getUser: vi.fn() },
  functions: { invoke: vi.fn() },
}));

// createClient runs at module load, so the client must exist before beforeEach
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// Mock Gmail API client
vi.mock('googleapis', () => ({
  google: {
    gmail: vi.fn().mockReturnValue({
      users: {
        messages: {
          send: vi.fn(),
        },
      },
    }),
    auth: {
      OAuth2: class MockOAuth2 {
        setCredentials = vi.fn();
      },
    },
  },
}));

describe('Gmail API', () => {
  beforeEach(() => {
    mockSupabase.from = vi.fn();
    mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    mockSupabase.functions.invoke = vi.fn();
  });

  describe('createEmailMessage', () => {
    it('should create valid email message with required fields', () => {
      const message = createEmailMessage({
        to: 'supplier@example.com',
        subject: 'Pedido de Orçamento',
        body: 'Olá,\n\nGostaria de solicitar um orçamento para...',
      });

      expect(message).toBeDefined();
      expect(message.to).toBe('supplier@example.com');
      expect(message.subject).toBe('Pedido de Orçamento');
      expect(message.body).toContain('Olá');
    });

    it('should include required headers in email message', () => {
      const message = createEmailMessage({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Test body',
      });

      expect(message).toHaveProperty('headers');
      expect(message.headers).toHaveProperty('to');
      expect(message.headers).toHaveProperty('subject');
    });

    it('should properly encode email message to base64url', () => {
      const message = createEmailMessage({
        to: 'test@example.com',
        subject: 'Test Subject',
        body: 'Test Body',
      });

      // The encoded property should be base64url encoded
      expect(message.encoded).toBeDefined();
      expect(typeof message.encoded).toBe('string');
      // Base64url contains only alphanumeric, -, _
      expect(/^[A-Za-z0-9_-]+$/.test(message.encoded)).toBe(true);
    });

    it('should handle special characters in subject and body', () => {
      const message = createEmailMessage({
        to: 'test@example.com',
        subject: 'Orçamento - Café & Bebidas €50',
        body: 'Preço: R$ 1.500,00\nDesde: São Paulo (SP)\nAté: 2026-11-15',
      });

      expect(message.subject).toContain('€50');
      expect(message.body).toContain('R$');
    });

    it('should encode accents without Buffer, as a browser would', () => {
      vi.stubGlobal('Buffer', undefined);
      try {
        const message = createEmailMessage({
          to: 'test@example.com',
          subject: 'Pedido de Orçamento',
          body: 'Olá, São Paulo',
        });

        const raw = atob(message.encoded!.replace(/-/g, '+').replace(/_/g, '/'));
        expect(raw).toContain('Content-Type: text/plain; charset="UTF-8"');
        expect(raw).toContain(`Subject: =?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode('Pedido de Orçamento')))}?=`);

        const body = raw.split('\r\n\r\n')[1];
        const bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
        expect(new TextDecoder().decode(bytes)).toBe('Olá, São Paulo');
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('should reject line breaks in the subject', () => {
      expect(() =>
        createEmailMessage({
          to: 'test@example.com',
          subject: 'Oi\r\nBcc: alguem@example.com',
          body: 'Test',
        })
      ).toThrow('line breaks');
    });

    it('should validate email recipient format', () => {
      expect(() => {
        createEmailMessage({
          to: 'invalid-email',
          subject: 'Test',
          body: 'Test',
        });
      }).toThrow();
    });

    it('should require non-empty subject and body', () => {
      expect(() => {
        createEmailMessage({
          to: 'test@example.com',
          subject: '',
          body: 'Test',
        });
      }).toThrow();

      expect(() => {
        createEmailMessage({
          to: 'test@example.com',
          subject: 'Test',
          body: '',
        });
      }).toThrow();
    });
  });

  describe('sendEmail', () => {
    it('should send email successfully via Gmail API', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          messageId: 'msg-12345',
          threadId: 'thread-67890',
          success: true,
        },
        error: null,
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const result = await sendEmail({
        to: 'supplier@example.com',
        subject: 'Pedido de Orçamento',
        body: 'Teste de envio',
        supplierId: 'supplier-123',
        pedidoId: 'pedido-456',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-12345');
    });

    it('should handle Gmail API errors gracefully', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: {
          message: 'Failed to authenticate with Gmail API',
          code: 'GMAIL_AUTH_ERROR',
        },
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const result = await sendEmail({
        to: 'supplier@example.com',
        subject: 'Test',
        body: 'Test',
        supplierId: 'supplier-123',
        pedidoId: 'pedido-456',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to authenticate');
    });

    it('should handle invalid recipient email', async () => {
      await expect(
        sendEmail({
          to: 'not-an-email',
          subject: 'Test',
          body: 'Test',
          supplierId: 'supplier-123',
          pedidoId: 'pedido-456',
        })
      ).rejects.toThrow();
    });

    it('should handle network errors during send', async () => {
      mockSupabase.functions.invoke.mockRejectedValue(
        new Error('Network timeout')
      );

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      await expect(
        sendEmail({
          to: 'supplier@example.com',
          subject: 'Test',
          body: 'Test',
          supplierId: 'supplier-123',
          pedidoId: 'pedido-456',
        })
      ).rejects.toThrow('Network timeout');
    });

    it('should pass correct email parameters to Gmail API', async () => {
      const invokeFunc = vi.fn().mockResolvedValue({
        data: {
          messageId: 'msg-123',
          success: true,
        },
        error: null,
      });

      mockSupabase.functions.invoke = invokeFunc;

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      await sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        body: 'Test Body',
        supplierId: 'supplier-123',
        pedidoId: 'pedido-456',
      });

      expect(invokeFunc).toHaveBeenCalledWith(
        'send-email',
        expect.objectContaining({
          body: expect.objectContaining({
            to: 'test@example.com',
            subject: 'Test Subject',
            supplierId: 'supplier-123',
            pedidoId: 'pedido-456',
          }),
        })
      );
    });

    it('should require authentication before sending', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('User not authenticated'),
      });

      await expect(
        sendEmail({
          to: 'test@example.com',
          subject: 'Test',
          body: 'Test',
          supplierId: 'supplier-123',
          pedidoId: 'pedido-456',
        })
      ).rejects.toThrow('User not authenticated');
    });
  });
});
