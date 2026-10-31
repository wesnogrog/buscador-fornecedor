import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ColetaPanel } from '../components/ColetaPanel';
import { carregarColeta, pedirColeta, type Coleta } from '../utils/coletas';

vi.mock('../utils/coletas', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/coletas')>()),
  pedirColeta: vi.fn(),
  carregarColeta: vi.fn(),
}));

const coleta = (overrides: Partial<Coleta> = {}): Coleta => ({
  id: 'c1',
  servico: 'som',
  regiao: 'Niterói',
  status: 'pendente',
  encontrados: null,
  erro: null,
  updated_at: new Date().toISOString(),
  ...overrides,
});

const pedir = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Buscar no Google Maps' }));
  });
};
const aguardarVerificacao = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(10000);
  });

describe('ColetaPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(pedirColeta).mockResolvedValue(coleta());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('asks for the region before offering the collection', () => {
    render(<ColetaPanel servico="som" regiao="" onFound={vi.fn()} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText(/preencha a região/)).toBeInTheDocument();
  });

  it('asks for the collection and shows it is in progress', async () => {
    render(<ColetaPanel servico="som" regiao="Niterói" onFound={vi.fn()} />);

    await pedir();

    expect(pedirColeta).toHaveBeenCalledWith('som', 'Niterói');
    expect(screen.getByRole('status').textContent).toContain('Buscando no Google Maps');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('searches again by itself when the collection finds suppliers', async () => {
    const onFound = vi.fn();
    vi.mocked(carregarColeta)
      .mockResolvedValueOnce(coleta({ status: 'rodando' }))
      .mockResolvedValueOnce(coleta({ status: 'concluida', encontrados: 12 }));
    render(<ColetaPanel servico="som" regiao="Niterói" onFound={onFound} />);

    await pedir();
    await aguardarVerificacao();
    expect(onFound).not.toHaveBeenCalled();

    await aguardarVerificacao();
    expect(onFound).toHaveBeenCalledTimes(1);
  });

  it('says so when the collection finds nothing, and lets the person try again', async () => {
    const onFound = vi.fn();
    vi.mocked(carregarColeta).mockResolvedValue(coleta({ status: 'concluida', encontrados: 0 }));
    render(<ColetaPanel servico="som" regiao="Niterói" onFound={onFound} />);

    await pedir();
    await aguardarVerificacao();

    expect(onFound).not.toHaveBeenCalled();
    expect(screen.getByText(/terminou sem nenhum fornecedor/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buscar no Google Maps' })).toBeInTheDocument();
  });

  it('shows why the collection failed', async () => {
    vi.mocked(carregarColeta).mockResolvedValue(coleta({ status: 'falhou', erro: 'O Google bloqueou a coleta.' }));
    render(<ColetaPanel servico="som" regiao="Niterói" onFound={vi.fn()} />);

    await pedir();
    await aguardarVerificacao();

    expect(screen.getByRole('alert').textContent).toContain('O Google bloqueou');
  });

  it('shows the reason when the request is refused, such as the daily limit', async () => {
    vi.mocked(pedirColeta).mockRejectedValue(new Error('O limite de 20 coletas em 24 horas foi atingido.'));
    render(<ColetaPanel servico="som" regiao="Niterói" onFound={vi.fn()} />);

    await pedir();

    expect(screen.getByRole('alert').textContent).toContain('limite de 20 coletas');
  });

  it('stops waiting when a run died without updating its status', async () => {
    vi.mocked(carregarColeta).mockResolvedValue(
      coleta({ updated_at: new Date(Date.now() - 31 * 60 * 1000).toISOString() })
    );
    render(<ColetaPanel servico="som" regiao="Niterói" onFound={vi.fn()} />);

    await pedir();
    await aguardarVerificacao();

    expect(screen.getByRole('alert').textContent).toContain('demorou demais');
  });

  it('keeps waiting through a temporary network failure', async () => {
    vi.mocked(carregarColeta).mockRejectedValue(new Error('Sem conexão'));
    render(<ColetaPanel servico="som" regiao="Niterói" onFound={vi.fn()} />);

    await pedir();
    await aguardarVerificacao();

    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
