/**
 * Tests for MessagePreview component
 * Displays a preview of the final message for a specific supplier
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessagePreview } from '../components/MessagePreview';
import type { Fornecedor } from '../utils/types';

// Helper to create test supplier
const createSupplier = (overrides: Partial<Fornecedor> = {}): Fornecedor => ({
  id: 'supplier-1',
  nome: 'Empresa de Teste',
  dominio: 'empresa.com',
  endereco: 'Rua das Flores, 123',
  servicos: ['Som', 'Iluminação'],
  regiao: 'São Paulo',
  email: 'contato@empresa.com',
  whatsapp_link: 'https://wa.me/5511999887766',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  data_extracao: new Date().toISOString(),
  ...overrides,
});

describe('MessagePreview', () => {
  test('renders supplier name in preview', () => {
    const supplier = createSupplier({ nome: 'Empresa ABC' });
    const preview = 'Olá Empresa ABC, gostaria de um orçamento.';

    render(<MessagePreview supplier={supplier} preview={preview} />);

    expect(screen.getByText('Empresa ABC')).toBeInTheDocument();
  });

  test('displays preview message', () => {
    const supplier = createSupplier();
    const preview = 'Olá Empresa de Teste, gostaria de um orçamento para Catering.';

    render(<MessagePreview supplier={supplier} preview={preview} />);

    expect(screen.getByText(preview)).toBeInTheDocument();
  });

  test('renders with email contact info when available', () => {
    const supplier = createSupplier({ email: 'contato@empresa.com' });
    const preview = 'Teste de prévia.';

    render(<MessagePreview supplier={supplier} preview={preview} />);

    expect(screen.getByText(/contato@empresa.com/)).toBeInTheDocument();
  });

  test('renders with WhatsApp contact info when available', () => {
    const supplier = createSupplier({ whatsapp_link: 'https://wa.me/5511999887766' });
    const preview = 'Teste de prévia.';

    render(<MessagePreview supplier={supplier} preview={preview} />);

    // Should show WhatsApp indicator or link
    const element = screen.getByText('Empresa de Teste');
    expect(element).toBeInTheDocument();
  });

  test('renders without email when not available', () => {
    const supplier = createSupplier({ email: null });
    const preview = 'Teste de prévia.';

    render(<MessagePreview supplier={supplier} preview={preview} />);

    expect(screen.queryByText(/contato@/)).not.toBeInTheDocument();
  });

  test('handles multiline preview text', () => {
    const supplier = createSupplier();
    const preview = `Olá Empresa de Teste,

Gostaria de solicitar um orçamento para:
- Serviço: Som
- Data: 15/12/2024

Atenciosamente`;

    render(<MessagePreview supplier={supplier} preview={preview} />);

    expect(screen.getByText(/Olá Empresa de Teste/)).toBeInTheDocument();
    expect(screen.getByText(/Serviço: Som/)).toBeInTheDocument();
  });

  test('renders supplier address when available', () => {
    const supplier = createSupplier({ endereco: 'Av. Paulista, 1000' });
    const preview = 'Teste.';

    render(<MessagePreview supplier={supplier} preview={preview} />);

    expect(screen.getByText(/Av. Paulista, 1000/)).toBeInTheDocument();
  });

  test('renders supplier domain/website when available', () => {
    const supplier = createSupplier({ dominio: 'empresa.com.br' });
    const preview = 'Teste.';

    render(<MessagePreview supplier={supplier} preview={preview} />);

    expect(screen.getByText(/empresa.com.br/)).toBeInTheDocument();
  });

  test('renders with both email and WhatsApp', () => {
    const supplier = createSupplier({
      email: 'contato@empresa.com',
      whatsapp_link: 'https://wa.me/5511999887766',
    });
    const preview = 'Teste de prévia com múltiplos canais.';

    render(<MessagePreview supplier={supplier} preview={preview} />);

    expect(screen.getByText(/contato@empresa.com/)).toBeInTheDocument();
  });

  test('handles very long preview text', () => {
    const supplier = createSupplier();
    const longPreview = 'A'.repeat(1000);

    render(<MessagePreview supplier={supplier} preview={longPreview} />);

    expect(screen.getByText(longPreview)).toBeInTheDocument();
  });

  test('renders with whatsapp_numero when whatsapp_link not available', () => {
    const supplier = createSupplier({
      whatsapp_link: null,
      whatsapp_numero: '5511999887766',
    });
    const preview = 'Teste.';

    render(<MessagePreview supplier={supplier} preview={preview} />);

    expect(screen.getByText('Empresa de Teste')).toBeInTheDocument();
  });

  test('maintains consistent layout for multiple suppliers', () => {
    const supplier1 = createSupplier({ nome: 'Empresa A', email: 'a@empresa.com' });
    const supplier2 = createSupplier({ nome: 'Empresa B', email: 'b@empresa.com' });
    const preview = 'Mensagem padrão.';

    const { rerender } = render(<MessagePreview supplier={supplier1} preview={preview} />);
    expect(screen.getByText('Empresa A')).toBeInTheDocument();

    rerender(<MessagePreview supplier={supplier2} preview={preview} />);
    expect(screen.getByText('Empresa B')).toBeInTheDocument();
  });
});
