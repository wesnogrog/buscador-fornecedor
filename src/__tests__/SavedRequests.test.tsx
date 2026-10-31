/**
 * Tests for SavedRequests page component
 * Tests rendering of pedidos list with status, navigation to detail
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SavedRequests from '../pages/SavedRequests';
import * as pedidosModule from '../utils/pedidos';

vi.mock('../utils/pedidos');
vi.mock('../hooks/useSavedRequests');

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
  });

  it('should render empty state when no pedidos exist', () => {
    const mockUseSavedRequests = vi.hoisted(() => ({
      list: [],
      loading: false,
      error: null,
      detail: null,
      detailLoading: false,
      openDetail: vi.fn(),
      closeDetail: vi.fn(),
      updateSupplierStatus: vi.fn(),
    }));

    vi.mocked(pedidosModule.listPedidos).mockResolvedValue([]);

    render(<SavedRequests />);

    expect(screen.getByText(/nenhum pedido encontrado/i)).toBeInTheDocument();
  });

  it('should render list of pedidos with status summary', async () => {
    const mockUseSavedRequests = vi.hoisted(() => ({
      list: mockPedidosList,
      loading: false,
      error: null,
      detail: null,
      detailLoading: false,
      openDetail: vi.fn(),
      closeDetail: vi.fn(),
      updateSupplierStatus: vi.fn(),
    }));

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
    const mockUseSavedRequests = vi.hoisted(() => ({
      list: mockPedidosList,
      loading: false,
      error: null,
      detail: null,
      detailLoading: false,
      openDetail: vi.fn(),
      closeDetail: vi.fn(),
      updateSupplierStatus: vi.fn(),
    }));

    render(<SavedRequests />);

    await waitFor(() => {
      expect(screen.getByText(/2 \/ 5/)).toBeInTheDocument(); // contactedCount / supplierCount
      expect(screen.getByText(/3 \/ 3/)).toBeInTheDocument();
    });
  });

  it('should show creation date in correct format', async () => {
    const mockUseSavedRequests = vi.hoisted(() => ({
      list: mockPedidosList,
      loading: false,
      error: null,
      detail: null,
      detailLoading: false,
      openDetail: vi.fn(),
      closeDetail: vi.fn(),
      updateSupplierStatus: vi.fn(),
    }));

    render(<SavedRequests />);

    await waitFor(() => {
      // Should show date in readable format (e.g., "31 de outubro de 2026")
      const dateText = screen.getByText(/outubro/i);
      expect(dateText).toBeInTheDocument();
    });
  });

  it('should call openDetail when clicking on a pedido', async () => {
    const mockOpenDetail = vi.fn();
    const mockUseSavedRequests = vi.hoisted(() => ({
      list: mockPedidosList,
      loading: false,
      error: null,
      detail: null,
      detailLoading: false,
      openDetail: mockOpenDetail,
      closeDetail: vi.fn(),
      updateSupplierStatus: vi.fn(),
    }));

    render(<SavedRequests />);

    await waitFor(() => {
      const pedidoLink = screen.getByText('Catering Event 1');
      fireEvent.click(pedidoLink);
    });

    expect(mockOpenDetail).toHaveBeenCalledWith('pedido-1');
  });

  it('should show loading state while fetching pedidos', () => {
    const mockUseSavedRequests = vi.hoisted(() => ({
      list: [],
      loading: true,
      error: null,
      detail: null,
      detailLoading: false,
      openDetail: vi.fn(),
      closeDetail: vi.fn(),
      updateSupplierStatus: vi.fn(),
    }));

    render(<SavedRequests />);

    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('should show error message if fetch fails', () => {
    const mockError = new Error('Failed to fetch');
    const mockUseSavedRequests = vi.hoisted(() => ({
      list: [],
      loading: false,
      error: mockError,
      detail: null,
      detailLoading: false,
      openDetail: vi.fn(),
      closeDetail: vi.fn(),
      updateSupplierStatus: vi.fn(),
    }));

    render(<SavedRequests />);

    expect(screen.getByText(/erro ao carregar/i)).toBeInTheDocument();
  });

  it('should be mobile-responsive', () => {
    const mockUseSavedRequests = vi.hoisted(() => ({
      list: mockPedidosList,
      loading: false,
      error: null,
      detail: null,
      detailLoading: false,
      openDetail: vi.fn(),
      closeDetail: vi.fn(),
      updateSupplierStatus: vi.fn(),
    }));

    const { container } = render(<SavedRequests />);

    // Check for mobile-responsive classes
    const wrapper = container.querySelector('[class*="grid"]') || container.querySelector('[class*="flex"]');
    expect(wrapper).toBeInTheDocument();

    // Verify responsive grid classes (sm:, md:, lg:)
    const classes = container.className;
    expect(classes).toMatch(/responsive|sm:|md:|lg:|grid|flex/);
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

    const mockUseSavedRequests = vi.hoisted(() => ({
      list: unsortedList,
      loading: false,
      error: null,
      detail: null,
      detailLoading: false,
      openDetail: vi.fn(),
      closeDetail: vi.fn(),
      updateSupplierStatus: vi.fn(),
    }));

    render(<SavedRequests />);

    await waitFor(() => {
      const newerEvent = screen.getByText('Newer Event');
      const olderEvent = screen.getByText('Older Event');
      expect(newerEvent.compareDocumentPosition(olderEvent)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });
});
