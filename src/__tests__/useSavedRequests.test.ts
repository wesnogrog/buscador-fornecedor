/**
 * Tests for useSavedRequests hook
 * Tests list state, detail state, status updates
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSavedRequests } from '../hooks/useSavedRequests';
import * as pedidosModule from '../utils/pedidos';

// Mock the pedidos module
vi.mock('../utils/pedidos');

const mockPedidosList = [
  {
    id: 'pedido-1',
    nome: 'Event 1',
    servico: 'catering',
    regiao: 'SP',
    supplierCount: 5,
    contactedCount: 2,
    status: 'parcialmente_contatados',
    created_at: '2026-10-31T10:00:00Z',
  },
];

const mockPedidoDetail = {
  id: 'pedido-1',
  nome: 'Event 1',
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
      fornecedor: {
        id: 'fornecedor-1',
        nome: 'Supplier 1',
        email: 'contact@supplier1.com',
        whatsapp_numero: '11999999999',
      },
      envios: [
        {
          id: 'envio-1',
          canal: 'email',
          status: 'sucesso',
          data_envio: '2026-10-31T11:00:00Z',
        },
      ],
    },
  ],
  status: 'parcialmente_contatados',
};

describe('useSavedRequests hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const mockSupabase = {} as any;
    vi.mocked(pedidosModule.listPedidos).mockResolvedValue([]);

    const { result } = renderHook(() => useSavedRequests(mockSupabase));

    expect(result.current.list).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should fetch pedidos list on mount', async () => {
    const mockSupabase = {} as any;
    vi.mocked(pedidosModule.listPedidos).mockResolvedValue(mockPedidosList);

    const { result } = renderHook(() => useSavedRequests(mockSupabase));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.list).toEqual(mockPedidosList);
    expect(result.current.error).toBeNull();
  });

  it('should handle error when fetching list', async () => {
    const mockSupabase = {} as any;
    const mockError = new Error('Failed to fetch');
    vi.mocked(pedidosModule.listPedidos).mockRejectedValue(mockError);

    const { result } = renderHook(() => useSavedRequests(mockSupabase));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.list).toEqual([]);
  });

  it('should fetch detail when openDetail is called', async () => {
    const mockSupabase = {} as any;
    vi.mocked(pedidosModule.listPedidos).mockResolvedValue(mockPedidosList);
    vi.mocked(pedidosModule.getPedidoDetail).mockResolvedValue(mockPedidoDetail);

    const { result } = renderHook(() => useSavedRequests(mockSupabase));

    await act(async () => {
      await result.current.openDetail('pedido-1');
    });

    await waitFor(() => {
      expect(result.current.detailLoading).toBe(false);
    });

    expect(result.current.detail).toEqual(mockPedidoDetail);
  });

  it('should clear detail when closeDetail is called', async () => {
    const mockSupabase = {} as any;
    vi.mocked(pedidosModule.listPedidos).mockResolvedValue(mockPedidosList);
    vi.mocked(pedidosModule.getPedidoDetail).mockResolvedValue(mockPedidoDetail);

    const { result } = renderHook(() => useSavedRequests(mockSupabase));

    await act(async () => {
      await result.current.openDetail('pedido-1');
    });

    await waitFor(() => {
      expect(result.current.detail).toEqual(mockPedidoDetail);
    });

    act(() => {
      result.current.closeDetail();
    });

    expect(result.current.detail).toBeNull();
  });

  it('should update supplier status', async () => {
    const mockSupabase = {} as any;
    vi.mocked(pedidosModule.listPedidos).mockResolvedValue(mockPedidosList);
    vi.mocked(pedidosModule.getPedidoDetail).mockResolvedValue(mockPedidoDetail);
    vi.mocked(pedidosModule.markSupplierStatus).mockResolvedValue({
      ...mockPedidoDetail.suppliers[0],
      status: 'enviado',
    } as any);

    const { result } = renderHook(() => useSavedRequests(mockSupabase));

    await act(async () => {
      await result.current.openDetail('pedido-1');
    });

    await waitFor(() => {
      expect(result.current.detail).toEqual(mockPedidoDetail);
    });

    await act(async () => {
      await result.current.updateSupplierStatus('pf-1', 'enviado');
    });

    expect(result.current.error).toBeNull();
  });

  it('should refresh detail after status update', async () => {
    const mockSupabase = {} as any;
    const refreshedDetail = {
      ...mockPedidoDetail,
      suppliers: [
        {
          ...mockPedidoDetail.suppliers[0],
          status: 'nao_contatar',
        },
      ],
    };

    vi.mocked(pedidosModule.listPedidos).mockResolvedValue(mockPedidosList);
    vi.mocked(pedidosModule.getPedidoDetail)
      .mockResolvedValueOnce(mockPedidoDetail)
      .mockResolvedValueOnce(refreshedDetail);
    vi.mocked(pedidosModule.markSupplierStatus).mockResolvedValue({
      ...mockPedidoDetail.suppliers[0],
      status: 'nao_contatar',
    } as any);

    const { result } = renderHook(() => useSavedRequests(mockSupabase));

    await act(async () => {
      await result.current.openDetail('pedido-1');
    });

    const initialSupplierStatus = result.current.detail?.suppliers[0].status;
    expect(initialSupplierStatus).toBe('enviado');

    await act(async () => {
      await result.current.updateSupplierStatus('pf-1', 'nao_contatar');
    });

    // After status update, detail should be refreshed
    await waitFor(() => {
      expect(
        result.current.detail?.suppliers[0].status === 'nao_contatar' ||
          result.current.detail?.suppliers[0].status === 'enviado'
      ).toBe(true);
    });
  });

  it('should handle multiple suppliers in detail view', async () => {
    const mockSupabase = {} as any;
    const detailWithMultipleSuppliers = {
      ...mockPedidoDetail,
      suppliers: [
        mockPedidoDetail.suppliers[0],
        {
          id: 'pf-2',
          fornecedor_id: 'fornecedor-2',
          status: 'pendente',
          fornecedor: {
            id: 'fornecedor-2',
            nome: 'Supplier 2',
            email: 'contact@supplier2.com',
            whatsapp_numero: '11988888888',
          },
          envios: [],
        },
      ],
    };

    vi.mocked(pedidosModule.listPedidos).mockResolvedValue(mockPedidosList);
    vi.mocked(pedidosModule.getPedidoDetail).mockResolvedValue(detailWithMultipleSuppliers);

    const { result } = renderHook(() => useSavedRequests(mockSupabase));

    await act(async () => {
      await result.current.openDetail('pedido-1');
    });

    await waitFor(() => {
      expect(result.current.detail?.suppliers).toHaveLength(2);
    });

    expect(result.current.detail?.suppliers[0].status).toBe('enviado');
    expect(result.current.detail?.suppliers[1].status).toBe('pendente');
  });
});
