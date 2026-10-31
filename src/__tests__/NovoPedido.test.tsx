import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NovoPedido } from '../pages/NovoPedido';
import { filterSuppliers } from '../utils/suppliers';
import { addPedidoFornecedores, createPedido } from '../utils/pedidos';
import { checkIdempotency, recordSend } from '../utils/idempotency';
import { sendEmail } from '../utils/gmail';
import type { Fornecedor } from '../utils/types';

vi.mock('../utils/suppliers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/suppliers')>()),
  filterSuppliers: vi.fn(),
}));
vi.mock('../utils/modelos', () => ({
  loadModelos: vi.fn().mockResolvedValue([
    {
      id: 'modelo-1',
      nome: 'Padrão',
      corpo: 'Olá, {fornecedor}! Orçamento de {servico}.',
      criado_por: 'user-1',
      created_at: '2026-10-31T10:00:00Z',
    },
  ]),
}));
vi.mock('../utils/pedidos', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/pedidos')>()),
  createPedido: vi.fn(),
  addPedidoFornecedores: vi.fn(),
}));
vi.mock('../utils/idempotency', () => ({
  checkIdempotency: vi.fn(),
  recordSend: vi.fn(),
}));
vi.mock('../utils/gmail', () => ({
  sendEmail: vi.fn(),
}));

const fornecedor = (id: string, overrides: Partial<Fornecedor>): Fornecedor => ({
  id,
  nome: id,
  data_extracao: '2026-10-31T10:00:00Z',
  created_at: '2026-10-31T10:00:00Z',
  updated_at: '2026-10-31T10:00:00Z',
  ...overrides,
});

const suppliers = [
  fornecedor('Som Email', { email: 'som@example.com' }),
  fornecedor('Som Zap', { whatsapp_numero: '5511999887766' }),
];

async function chegarAoEnvio(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Nome do Orçamento/i), 'Evento X');
  await user.type(screen.getByLabelText(/Serviço/i), 'som');
  await user.click(screen.getByRole('button', { name: /Buscar Fornecedores/i }));
  await user.click(await screen.findByRole('button', { name: /Selecionar fornecedores \(2\)/i }));

  await user.click(screen.getByRole('button', { name: 'Selecionar Tudo' }));
  await user.click(screen.getByRole('button', { name: /Continuar com 2 fornecedores/i }));

  await user.selectOptions(screen.getByRole('combobox', { name: /Escolha um modelo/i }), 'modelo-1');
  await user.type(screen.getByLabelText('Serviço'), 'som');
  await user.click(screen.getByRole('button', { name: /Prosseguir/ }));
}

describe('NovoPedido flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(filterSuppliers).mockResolvedValue(suppliers);
    vi.mocked(createPedido).mockResolvedValue({ id: 'pedido-1' } as any);
    vi.mocked(addPedidoFornecedores).mockResolvedValue([
      { id: 'pf-email', fornecedor_id: 'Som Email' },
      { id: 'pf-zap', fornecedor_id: 'Som Zap' },
    ] as any);
    vi.mocked(checkIdempotency).mockResolvedValue(false);
    vi.mocked(recordSend).mockResolvedValue({} as any);
    vi.mocked(sendEmail).mockResolvedValue({ success: true });
  });

  it('creates the pedido and links the selected suppliers', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><NovoPedido /></MemoryRouter>);

    await chegarAoEnvio(user);

    await waitFor(() => {
      expect(createPedido).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ nome: 'Evento X', servico: 'som', regiao: '' })
      );
    });
    expect(addPedidoFornecedores).toHaveBeenCalledWith(
      expect.anything(),
      'pedido-1',
      expect.arrayContaining(['Som Email', 'Som Zap'])
    );
  });

  it('sends the filled message by email and records the unfilled template', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><NovoPedido /></MemoryRouter>);

    await chegarAoEnvio(user);
    await user.click(await screen.findByRole('button', { name: /Enviar E-mails/ }));

    await waitFor(() => {
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'som@example.com',
          subject: 'Pedido de orçamento: som',
          body: 'Olá, Som Email! Orçamento de som.',
          pedidoFornecedorId: 'pf-email',
        })
      );
    });
    await waitFor(() => {
      expect(recordSend).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'sucesso',
          message: 'Olá, {fornecedor}! Orçamento de {servico}.',
        })
      );
    });
  });

  it('opens WhatsApp with the message ready and records it only after "Enviei"', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><NovoPedido /></MemoryRouter>);

    await chegarAoEnvio(user);

    const link = await screen.findByRole('link', { name: 'Abrir WhatsApp de Som Zap' });
    expect(link.getAttribute('href')).toBe(
      `https://wa.me/5511999887766?text=${encodeURIComponent('Olá, Som Zap! Orçamento de som.')}`
    );
    expect(recordSend).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Marcar WhatsApp de Som Zap/ }));

    await waitFor(() => {
      expect(recordSend).toHaveBeenCalledWith(
        expect.objectContaining({ canal: 'whatsapp', pedidoFornecedorId: 'pf-zap', status: 'sucesso' })
      );
    });
    expect(await screen.findByText('✓ Enviei')).toBeInTheDocument();
  });

  it('reuses the pedido when going back and proceeding again', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><NovoPedido /></MemoryRouter>);

    await chegarAoEnvio(user);
    await user.click(await screen.findByRole('button', { name: /Voltar para a mensagem/ }));
    await user.click(screen.getByRole('button', { name: /Prosseguir/ }));

    await screen.findByRole('button', { name: /Voltar para a mensagem/ });
    expect(createPedido).toHaveBeenCalledTimes(1);
    expect(addPedidoFornecedores).toHaveBeenCalledTimes(2);
  });

  it('keeps the composed message and shows the reason when saving fails', async () => {
    vi.mocked(createPedido).mockRejectedValue(new Error('Sem conexão'));
    const user = userEvent.setup();
    render(<MemoryRouter><NovoPedido /></MemoryRouter>);

    await chegarAoEnvio(user);

    expect((await screen.findByRole('alert')).textContent).toContain('Sem conexão');
    expect(screen.getByLabelText('Serviço', { selector: '#field-servico' })).toHaveValue('som');
  });
});
