/**
 * Tests for SavedRequests page component
 * Tests rendering of pedidos list with status, navigation to detail
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SavedRequests from '../pages/SavedRequests';

vi.mock('../utils/pedidos', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/pedidos')>()),
  listPedidos: vi.fn(),
  getPedidoDetail: vi.fn(),
  markSupplierStatus: vi.fn(),
}));

const mockNavigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockUseSavedRequests: any = {
  list: [],
  loading: false,
  error: null,
  detail: null,
  detailLoading: false,
  openDetail: vi.fn(),
  closeDetail: vi.fn(),
  updateSupplierStatus: vi.fn(),
};

vi.mock('../hooks/useSavedRequests', () => ({
  useSavedRequests: () => mockUseSavedRequests,
}));

const mockPedidosList = [
  {
    id: 'pedido-1',
    nome: 'Catering Event 1',
    servico: 'catering',
    regiao: 'SP',
    supplierCount: 5,
    contactedCount: 2,
    status: 'parcialmente_contatados',
    created_at: '2026-10-31T10:00:00Z',
  },
  {
    id: 'pedido-2',
    nome: 'Decoração Casamento',
    servico: 'decoracao',
    regiao: 'MG',
    supplierCount: 3,
    contactedCount: 3,
    status: 'todos_contatados',
    created_at: '2026-10-30T15:30:00Z',
  },
];

describe('SavedRequests component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mockUseSavedRequests, { list: [], loading: false, error: null });
  });

  it('should render empty state when no pedidos exist', () => {
    mockUseSavedRequests.list = [];
    mockUseSavedRequests.loading = false;
    mockUseSavedRequests.error = null;

    render(<SavedRequests />);

    expect(screen.getByText(/nenhum pedido encontrado/i)).toBeInTheDocument();
  });

  it('should render list of pedidos with status summary', async () => {
    mockUseSavedRequests.list = mockPedidosList;
    mockUseSavedRequests.loading = false;
    mockUseSavedRequests.error = null;

    render(<SavedRequests />);

    await waitFor(() => {
      expect(screen.getByText('Catering Event 1')).toBeInTheDocument();
      expect(screen.getByText('Decoração Casamento')).toBeInTheDocument();
    });

    // Check status badges
    expect(screen.getByText('Parcialmente Contatados')).toBeInTheDocument();
    expect(screen.getByText('Todos Contatados')).toBeInTheDocument();
  });

  it('should show supplier count in summary', async () => {
    mockUseSavedRequests.list = mockPedidosList;

    render(<SavedRequests />);

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/2 \/ 5 fornecedores/);
      expect(document.body.textContent).toMatch(/3 \/ 3 fornecedores/);
    });
  });

  it('should show creation date in correct format', async () => {
    mockUseSavedRequests.list = mockPedidosList;

    render(<SavedRequests />);

    await waitFor(() => {
      // Should show date in readable format (e.g., "31 de outubro de 2026")
      expect(screen.getAllByText(/de outubro de 2026/i).length).toBeGreaterThan(0);
    });
  });

  it('should navigate to the detail page when clicking on a pedido', async () => {
    mockUseSavedRequests.list = mockPedidosList;

    render(<SavedRequests />);

    await waitFor(() => {
      const pedidoLink = screen.getByText('Catering Event 1');
      fireEvent.click(pedidoLink);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/pedido/pedido-1');
  });

  it('should show loading state while fetching pedidos', () => {
    mockUseSavedRequests.list = [];
    mockUseSavedRequests.loading = true;
    mockUseSavedRequests.error = null;

    render(<SavedRequests />);

    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('should show error message if fetch fails', () => {
    const mockError = new Error('Failed to fetch');
    mockUseSavedRequests.list = [];
    mockUseSavedRequests.loading = false;
    mockUseSavedRequests.error = mockError;

    render(<SavedRequests />);

    expect(screen.getByText(/erro ao carregar/i)).toBeInTheDocument();
  });

  it('should be mobile-responsive', () => {
    mockUseSavedRequests.list = mockPedidosList;

    const { container } = render(<SavedRequests />);

    expect(container.querySelector('[class*="sm:"]')).toBeInTheDocument();
  });

  it('should sort pedidos by creation date (newest first)', async () => {
    const unsortedList = [
      {
        id: 'pedido-1',
        nome: 'Older Event',
        servico: 'catering',
        regiao: 'SP',
        supplierCount: 5,
        contactedCount: 0,
        status: 'nenhum_contato',
        created_at: '2026-10-25T10:00:00Z',
      },
      {
        id: 'pedido-2',
        nome: 'Newer Event',
        servico: 'catering',
        regiao: 'SP',
        supplierCount: 5,
        contactedCount: 0,
        status: 'nenhum_contato',
        created_at: '2026-10-31T10:00:00Z',
      },
    ];

    mockUseSavedRequests.list = unsortedList;

    render(<SavedRequests />);

    await waitFor(() => {
      const newerEvent = screen.getByText('Newer Event');
      const olderEvent = screen.getByText('Older Event');
      expect(newerEvent.compareDocumentPosition(olderEvent)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });
});
