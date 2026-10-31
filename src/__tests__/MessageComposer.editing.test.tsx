import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageComposer } from '../pages/MessageComposer';
import type { Fornecedor, Modelo } from '../utils/types';

const fornecedor = (id: string): Fornecedor => ({
  id,
  nome: id,
  data_extracao: '2026-10-31T10:00:00Z',
  created_at: '2026-10-31T10:00:00Z',
  updated_at: '2026-10-31T10:00:00Z',
});

const modelos: Modelo[] = [
  { id: 'm1', nome: 'Um', corpo: 'Olá, {fornecedor}! {servico}', criado_por: 'u', created_at: '2026-10-31T10:00:00Z' },
  { id: 'm2', nome: 'Dois', corpo: 'Oi, {fornecedor}. {servico}', criado_por: 'u', created_at: '2026-10-31T10:00:00Z' },
];

async function abrir(onProceed = vi.fn()) {
  const user = userEvent.setup();
  render(
    <MessageComposer
      templates={modelos}
      suppliers={[fornecedor('Ana'), fornecedor('Bia')]}
      selectedSupplierIds={['Ana', 'Bia']}
      onGoBack={vi.fn()}
      onProceed={onProceed}
    />
  );
  await user.selectOptions(screen.getByRole('combobox', { name: /Escolha um modelo/i }), 'm1');
  await user.type(screen.getByLabelText('Serviço'), 'som');
  return user;
}

const editar = (user: ReturnType<typeof userEvent.setup>, nome: string) =>
  user.click(screen.getByRole('button', { name: `Editar mensagem de ${nome}` }));
const campo = (nome: string) => screen.getByRole('textbox', { name: `Texto da mensagem de ${nome}` });

describe('Choosing where each message goes', () => {
  const ambos = { ...fornecedor('Dois'), email: 'dois@example.com', whatsapp_numero: '5519999999999' };
  const soZap = { ...fornecedor('Zap'), whatsapp_numero: '5519888888888' };

  async function abrirCanais(onProceed = vi.fn(), suppliers = [ambos, soZap]) {
    const user = userEvent.setup();
    render(
      <MessageComposer
        templates={modelos}
        suppliers={suppliers}
        selectedSupplierIds={suppliers.map((s) => s.id)}
        onGoBack={vi.fn()}
        onProceed={onProceed}
      />
    );
    await user.selectOptions(screen.getByRole('combobox', { name: /Escolha um modelo/i }), 'm1');
    await user.type(screen.getByLabelText('Serviço'), 'som');
    return user;
  }
  const prosseguir = (user: ReturnType<typeof userEvent.setup>) =>
    user.click(screen.getByRole('button', { name: /Prosseguir/ }));

  it('starts with a single channel, so nobody is contacted twice by accident', async () => {
    const onProceed = vi.fn();
    const user = await abrirCanais(onProceed);

    await prosseguir(user);

    expect(onProceed.mock.calls[0][0].canais).toEqual({
      Dois: { email: true, whatsapp: false },
      Zap: { email: false, whatsapp: true },
    });
  });

  it('offers only the channels the supplier has', async () => {
    await abrirCanais();

    expect(screen.getByRole('checkbox', { name: 'Enviar para Dois por e-mail' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Enviar para Dois por WhatsApp' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Enviar para Zap por e-mail' })).not.toBeInTheDocument();
  });

  it('switches a supplier to WhatsApp, or to both channels', async () => {
    const onProceed = vi.fn();
    const user = await abrirCanais(onProceed);

    await user.click(screen.getByRole('checkbox', { name: 'Enviar para Dois por WhatsApp' }));
    await prosseguir(user);

    expect(onProceed.mock.calls[0][0].canais.Dois).toEqual({ email: true, whatsapp: true });
  });

  it('does not proceed when a supplier is left without a channel', async () => {
    const user = await abrirCanais();

    await user.click(screen.getByRole('checkbox', { name: 'Enviar para Dois por e-mail' }));

    expect(screen.getByRole('button', { name: /Prosseguir/ })).toBeDisabled();
    expect(screen.getByText(/Escolha e-mail ou WhatsApp para: Dois/)).toBeInTheDocument();
  });

  it('sends everyone by one channel, keeping who does not have it', async () => {
    const onProceed = vi.fn();
    const user = await abrirCanais(onProceed);

    await user.click(screen.getByRole('button', { name: 'E-mail' }));
    await user.click(screen.getByRole('button', { name: 'WhatsApp' }));
    await user.click(screen.getByRole('button', { name: 'E-mail' }));
    await prosseguir(user);

    expect(onProceed.mock.calls[0][0].canais).toEqual({
      Dois: { email: true, whatsapp: false },
      Zap: { email: false, whatsapp: true },
    });
  });

  it('lets a supplier without email or WhatsApp through, warning it will not be sent', async () => {
    const onProceed = vi.fn();
    const user = await abrirCanais(onProceed, [fornecedor('Fixo')]);

    expect(screen.getByText(/a mensagem não será enviada/)).toBeInTheDocument();
    await prosseguir(user);

    expect(onProceed).toHaveBeenCalled();
  });
});

describe('Personalizing a message with the pencil', () => {
  it('changes only the message of that supplier', async () => {
    const onProceed = vi.fn();
    const user = await abrir(onProceed);

    await editar(user, 'Ana');
    await user.clear(campo('Ana'));
    await user.type(campo('Ana'), 'Texto da Ana');
    await user.click(screen.getByRole('button', { name: 'Concluir' }));
    await user.click(screen.getByRole('button', { name: /Prosseguir/ }));

    expect(onProceed.mock.calls[0][0].previews).toEqual({ Ana: 'Texto da Ana', Bia: 'Olá, Bia! som' });
    expect(screen.getByText('(personalizada)')).toBeInTheDocument();
  });

  it('keeps the personalized text when a field changes afterwards', async () => {
    const user = await abrir();

    await editar(user, 'Ana');
    await user.clear(campo('Ana'));
    await user.type(campo('Ana'), 'Texto da Ana');
    await user.type(screen.getByLabelText('Serviço'), ' e luz');

    expect(campo('Ana')).toHaveValue('Texto da Ana');
    expect(screen.getByText('Olá, Bia! som e luz')).toBeInTheDocument();
  });

  it('returns to the template text, with the current fields', async () => {
    const user = await abrir();

    await editar(user, 'Ana');
    await user.clear(campo('Ana'));
    await user.type(campo('Ana'), 'Texto da Ana');
    await user.click(screen.getByRole('button', { name: 'Voltar ao texto do modelo' }));

    expect(campo('Ana')).toHaveValue('Olá, Ana! som');
  });

  it('does not proceed with an empty personalized message', async () => {
    const onProceed = vi.fn();
    const user = await abrir(onProceed);

    await editar(user, 'Ana');
    await user.clear(campo('Ana'));

    expect(screen.getByRole('button', { name: /Prosseguir/ })).toBeDisabled();
    expect(screen.getByText(/mensagem personalizada está vazia/)).toBeInTheDocument();
  });

  it('discards the personalized text when another template is chosen', async () => {
    const user = await abrir();

    await editar(user, 'Ana');
    await user.clear(campo('Ana'));
    await user.type(campo('Ana'), 'Texto da Ana');
    await user.selectOptions(screen.getByRole('combobox', { name: /Escolha um modelo/i }), 'm2');

    expect(campo('Ana')).toHaveValue('Oi, Ana. som');
  });
});
