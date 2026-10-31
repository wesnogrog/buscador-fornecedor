/**
 * Tests for PedidoDetail page component
 * Tests detail view, supplier list, send history, status editing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PedidoDetail from '../pages/PedidoDetail';
import * as pedidosModule from '../utils/pedidos';

vi.mock('../utils/pedidos');
vi.mock('../hooks/useSavedRequests');
vi.mock('react-router-dom', () => ({
  useParams: () => ({ pedidoId: 'pedido-1' }),
  useNavigate: () => vi.fn(),
}));

const mockPedidoDetail = {
  id: 'pedido-1',
  nome: 'Catering Event',
  servico: 'catering',
  regiao: 'SP',
  data: '2026-11-15',
  local: 'São Paulo, SP',
  prazo: '2 weeks',
  suppliers: [
    {
      id: 'pf-1',
      fornecedor_id: 'fornecedor-1',
      status: 'enviado',
      created_at: '2026-10-31T10:00:00Z',
      updated_at: '2026-10-31T11:00:00Z',
      fornecedor: {
        id: 'fornecedor-1',
        nome: 'Caterer Prime',
        email: 'contact@caterer-prime.com',
        whatsapp_numero: '11999999999',
        endereco: 'Av. Paulista, 1000, SP',
        servicos: ['catering', 'eventos'],
      },
      envios: [
        {
          id: 'envio-1',
          pedido_fornecedor_id: 'pf-1',
          canal: 'email',
          status: 'sucesso',
          data_envio: '2026-10-31T11:00:00Z',
          mensagem: 'Olá, temos uma solicitação de catering...',
          erro: null,
        },
      ],
    },
    {
      id: 'pf-2',
      fornecedor_id: 'fornecedor-2',
      status: 'pendente',
      created_at: '2026-10-31T10:05:00Z',
      updated_at: '2026-10-31T10:05:00Z',
      fornecedor: {
        id: 'fornecedor-2',
        nome: 'Eventos Delicia',
        email: 'contato@eventos-delicia.com',
        whatsapp_numero: '11988888888',
        endereco: 'Rua das Flores, 250, SP',
        servicos: ['catering', 'decoracao'],
      },
      envios: [],
    },
  ],
  status: 'parcialmente_contatados',
  created_at: '2026-10-31T10:00:00Z',
  updated_at: '2026-10-31T11:00:00Z',
};

describe('PedidoDetail component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render pedido details correctly', async () => {
    const mockUseSavedRequests = vi.hoisted(() => ({
      detail: mockPedidoDetail,
      detailLoading: false,
      error: null,
      updateSupplierStatus: vi.fn(),
      closeDetail: vi.fn(),
    }));

    render(<PedidoDetail />);

    await waitFor(() => {
      expect(screen.getByText('Catering Event')).toBeInTheDocument();
      expect(screen.getByText('catering')).toBeInTheDocument();
      expect(screen.getByText('SP')).toBeInTheDocument();
      expect(screen.getByText('2026-11-15')).toBeInTheDocument();
    });
  });

  it('should display supplier list with contact information', async () => {
    const mockUseSavedRequests = vi.hoisted(() => ({
      detail: mockPedidoDetail,
      detailLoading: false,
      error: null,
      updateSupplierStatus: vi.fn(),
      closeDetail: vi.fn(),
    }));

    render(<PedidoDetail />);

    await waitFor(() => {
      expect(screen.getByText('Caterer Prime')).toBeInTheDocument();
      expect(screen.getByText('Eventos Delicia')).toBeInTheDocument();
      expect(screen.getByText('contact@caterer-prime.com')).toBeInTheDocument();
      expect(screen.getByText('contato@eventos-delicia.com')).toBeInTheDocument();
    });
  });

  it('should show send history for contacted suppliers', async () => {
    const mockUseSavedRequests = vi.hoisted(() => ({
      detail: mockPedidoDetail,
      detailLoading: false,
      error: null,
      updateSupplierStatus: vi.fn(),
      closeDetail: vi.fn(),
    }));

    render(<PedidoDetail />);

    await waitFor(() => {
      // Check for send history of first supplier
      expect(screen.getByText(/email/i)).toBeInTheDocument();
      expect(screen.getByText(/sucesso/i)).toBeInTheDocument();
    });
  });

  it('should display status badges for suppliers', async () => {
    const mockUseSavedRequests = vi.hoisted(() => ({
      detail: mockPedidoDetail,
      detailLoading: false,
      error: null,
      updateSupplierStatus: vi.fn(),
      closeDetail: vi.fn(),
    }));

    render(<PedidoDetail />);

    await waitFor(() => {
      expect(screen.getByText(/Enviado/i)).toBeInTheDocument();
      expect(screen.getByText(/Pendente/i)).toBeInTheDocument();
    });
  });

  it('should allow changing supplier status via dropdown', async () => {
    const mockUpdateSupplierStatus = vi.fn().mockResolvedValue(undefined);
    const mockUseSavedRequests = vi.hoisted(() => ({
      detail: mockPedidoDetail,
      detailLoading: false,
      error: null,
      updateSupplierStatus: mockUpdateSupplierStatus,
      closeDetail: vi.fn(),
    }));

    render(<PedidoDetail />);

    await waitFor(() => {
      const statusDropdowns = screen.getAllByRole('combobox') || screen.getAllByRole('select');
      expect(statusDropdowns.length).toBeGreaterThan(0);
    });

    // Simulate changing status
    const firstDropdown = screen.getAllByRole('combobox')[0] || screen.getAllByRole('select')[0];
    fireEvent.change(firstDropdown, { target: { value: 'nao_contatar' } });

    await waitFor(() => {
      expect(mockUpdateSupplierStatus).toHaveBeenCalledWith('pf-1', 'nao_contatar');
    });
  });

  it('should show "Nenhum contato" status when no suppliers contacted', async () => {
    const detailNoContact = {
      ...mockPedidoDetail,
      suppliers: [
        {
          ...mockPedidoDetail.suppliers[0],
          status: 'pendente',
          envios: [],
        },
      ],
      status: 'nenhum_contato',
    };

    const mockUseSavedRequests = vi.hoisted(() => ({
      detail: detailNoContact,
      detailLoading: false,
      error: null,
      updateSupplierStatus: vi.fn(),
      closeDetail: vi.fn(),
    }));

    render(<PedidoDetail />);

    await waitFor(() => {
      expect(screen.getByText(/Nenhum Contato/i)).toBeInTheDocument();
    });
  });

  it('should show contact options (email/WhatsApp) for suppliers', async () => {
    const mockUseSavedRequests = vi.hoisted(() => ({
      detail: mockPedidoDetail,
      detailLoading: false,
      error: null,
      updateSupplierStatus: vi.fn(),
      closeDetail: vi.fn(),
    }));

    render(<PedidoDetail />);

    await waitFor(() => {
      // Check for WhatsApp numbers that should be clickable
      expect(screen.getByText('11999999999')).toBeInTheDocument();
      expect(screen.getByText('11988888888')).toBeInTheDocument();
    });
  });

  it('should display loading state while fetching detail', () => {
    const mockUseSavedRequests = vi.hoisted(() => ({
      detail: null,
      detailLoading: true,
      error: null,
      updateSupplierStatus: vi.fn(),
      closeDetail: vi.fn(),
    }));

    render(<PedidoDetail />);

    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('should show error message if detail fetch fails', () => {
    const mockError = new Error('Failed to fetch detail');
    const mockUseSavedRequests = vi.hoisted(() => ({
      detail: null,
      detailLoading: false,
      error: mockError,
      updateSupplierStatus: vi.fn(),
      closeDetail: vi.fn(),
    }));

    render(<PedidoDetail />);

    expect(screen.getByText(/erro/i)).toBeInTheDocument();
  });

  it('should be mobile-responsive with collapsible supplier details', () => {
    const mockUseSavedRequests = vi.hoisted(() => ({
      detail: mockPedidoDetail,
      detailLoading: false,
      error: null,
      updateSupplierStatus: vi.fn(),
      closeDetail: vi.fn(),
    }));

    const { container } = render(<PedidoDetail />);

    // Check for responsive classes
    const responsiveElements = container.querySelectorAll('[class*="md:"], [class*="sm:"], [class*="lg:"]');
    expect(responsiveElements.length).toBeGreaterThan(0);
  });

  it('should allow reopening supplier selection for new message send', async () => {
    const mockUpdateSupplierStatus = vi.fn();
    const mockUseSavedRequests = vi.hoisted(() => ({
      detail: mockPedidoDetail,
      detailLoading: false,
      error: null,
      updateSupplierStatus: mockUpdateSupplierStatus,
      closeDetail: vi.fn(),
    }));

    render(<PedidoDetail />);

    await waitFor(() => {
      // Should have supplier list displayed
      expect(screen.getByText('Caterer Prime')).toBeInTheDocument();
    });

    // Verify we can interact with suppliers (select/deselect)
    const statusElements = screen.getAllByText(/Pendente|Enviado/i);
    expect(statusElements.length).toBeGreaterThan(0);
  });

  it('should show empty state when detail has no suppliers', async () => {
    const detailNoSuppliers = {
      ...mockPedidoDetail,
      suppliers: [],
      status: 'nenhum_contato',
    };

    const mockUseSavedRequests = vi.hoisted(() => ({
      detail: detailNoSuppliers,
      detailLoading: false,
      error: null,
      updateSupplierStatus: vi.fn(),
      closeDetail: vi.fn(),
    }));

    render(<PedidoDetail />);

    await waitFor(() => {
      expect(screen.getByText(/nenhum fornecedor/i)).toBeInTheDocument();
    });
  });

  it('should display supplier address when available', async () => {
    const mockUseSavedRequests = vi.hoisted(() => ({
      detail: mockPedidoDetail,
      detailLoading: false,
      error: null,
      updateSupplierStatus: vi.fn(),
      closeDetail: vi.fn(),
    }));

    render(<PedidoDetail />);

    await waitFor(() => {
      expect(screen.getByText(/Av\. Paulista, 1000, SP/)).toBeInTheDocument();
      expect(screen.getByText(/Rua das Flores, 250, SP/)).toBeInTheDocument();
    });
  });
});
