/**
 * Hook for managing saved requests state
 * Handles list fetching, detail fetching, and status updates
 */

import { useState, useEffect, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../utils/types';
import {
  listPedidos,
  getPedidoDetail,
  markSupplierStatus,
  type PedidoListItem,
  type PedidoDetailType,
} from '../utils/pedidos';

export interface UseSavedRequestsState {
  // List state
  list: PedidoListItem[];
  loading: boolean;
  error: Error | null;

  // Detail state
  detail: PedidoDetailType | null;
  detailLoading: boolean;

  // Actions
  openDetail: (pedidoId: string) => Promise<void>;
  closeDetail: () => void;
  updateSupplierStatus: (pedidoFornecedorId: string, status: 'pendente' | 'enviado' | 'nao_contatar') => Promise<void>;
  refreshList: () => Promise<void>;
}

/**
 * Hook to manage saved requests (pedidos) state
 * Fetches list on mount, allows opening/closing detail view
 */
export function useSavedRequests(client: SupabaseClient<Database>): UseSavedRequestsState {
  const [list, setList] = useState<PedidoListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [detail, setDetail] = useState<PedidoDetailType | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentDetailId, setCurrentDetailId] = useState<string | null>(null);

  // Fetch list on mount
  useEffect(() => {
    const fetchList = async () => {
      setLoading(true);
      setError(null);
      try {
        const pedidos = await listPedidos(client);
        setList(pedidos);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch pedidos');
        setError(error);
        console.error('Error fetching pedidos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchList();
  }, [client]);

  // Open detail view
  const openDetail = useCallback(
    async (pedidoId: string) => {
      setDetailLoading(true);
      setError(null);
      try {
        const pedidoDetail = await getPedidoDetail(client, pedidoId);
        setDetail(pedidoDetail);
        setCurrentDetailId(pedidoId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch pedido detail');
        setError(error);
        console.error('Error fetching pedido detail:', err);
      } finally {
        setDetailLoading(false);
      }
    },
    [client]
  );

  // Close detail view
  const closeDetail = useCallback(() => {
    setDetail(null);
    setCurrentDetailId(null);
  }, []);

  // Update supplier status and refresh detail
  const updateSupplierStatus = useCallback(
    async (pedidoFornecedorId: string, status: 'pendente' | 'enviado' | 'nao_contatar') => {
      setError(null);
      try {
        // Update status
        await markSupplierStatus(client, pedidoFornecedorId, status);

        // Refresh detail view if open
        if (currentDetailId) {
          const updatedDetail = await getPedidoDetail(client, currentDetailId);
          setDetail(updatedDetail);
        }

        // Refresh list
        const updatedList = await listPedidos(client);
        setList(updatedList);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update supplier status');
        setError(error);
        console.error('Error updating supplier status:', err);
        throw error;
      }
    },
    [client, currentDetailId]
  );

  // Manual refresh of list
  const refreshList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pedidos = await listPedidos(client);
      setList(pedidos);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to refresh list');
      setError(error);
      console.error('Error refreshing list:', err);
    } finally {
      setLoading(false);
    }
  }, [client]);

  return {
    list,
    loading,
    error,
    detail,
    detailLoading,
    openDetail,
    closeDetail,
    updateSupplierStatus,
    refreshList,
  };
}
