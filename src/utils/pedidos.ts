/**
 * Utility functions for pedidos (saved requests)
 * Functions for listing, retrieving detail, and updating supplier status
 * All operations use cached Supabase data - no new API calls on reopen
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Pedido, PedidoFornecedor, Envio, Fornecedor } from './types';

/**
 * Supplier with contact info and send history
 */
export interface SupplierDetail extends PedidoFornecedor {
  fornecedor: Fornecedor;
  envios: Envio[];
}

/**
 * Pedido list item with status summary
 */
export interface PedidoListItem extends Pedido {
  supplierCount: number;
  contactedCount: number;
  status: 'nenhum_contato' | 'parcialmente_contatados' | 'todos_contatados';
}

/**
 * Pedido detail with suppliers and history
 */
export interface PedidoDetailType {
  id: string;
  nome: string;
  servico: string;
  regiao: string;
  data?: string | null;
  local?: string | null;
  prazo?: string | null;
  autor_id: string;
  created_at: string;
  updated_at: string;
  suppliers: SupplierDetail[];
  status: 'nenhum_contato' | 'parcialmente_contatados' | 'todos_contatados';
}

/**
 * Calculate overall status based on supplier statuses
 */
export function calculatePedidoStatus(
  suppliers: SupplierDetail[]
): 'nenhum_contato' | 'parcialmente_contatados' | 'todos_contatados' {
  if (suppliers.length === 0) {
    return 'nenhum_contato';
  }

  const contatados = suppliers.filter((s) => s.status === 'enviado').length;

  if (contatados === 0) {
    return 'nenhum_contato';
  } else if (contatados === suppliers.length) {
    return 'todos_contatados';
  } else {
    return 'parcialmente_contatados';
  }
}

/**
 * Format status for display
 */
export function formatStatus(
  status: 'nenhum_contato' | 'parcialmente_contatados' | 'todos_contatados'
): string {
  const statusMap = {
    nenhum_contato: 'Nenhum Contato',
    parcialmente_contatados: 'Parcialmente Contatados',
    todos_contatados: 'Todos Contatados',
  };
  return statusMap[status];
}

/**
 * List all pedidos with status summary
 * Returns: array of pedidos with supplier counts and overall status
 * No new Google Maps calls - all data from Supabase
 */
export async function listPedidos(client: SupabaseClient<Database>): Promise<PedidoListItem[]> {
  const { data: pedidos, error } = await client.from('pedidos').select('*').order('created_at', {
    ascending: false,
  });

  if (error) {
    throw new Error(`Failed to fetch pedidos: ${error.message}`);
  }

  if (!pedidos || pedidos.length === 0) {
    return [];
  }

  // Fetch supplier info for each pedido
  const pedidosWithStatus = await Promise.all(
    pedidos.map(async (pedido) => {
      const { data: suppliers, error: suppliersError } = await client
        .from('pedido_fornecedores')
        .select('*')
        .eq('pedido_id', pedido.id);

      if (suppliersError) {
        console.warn(`Failed to fetch suppliers for pedido ${pedido.id}:`, suppliersError);
        return {
          ...pedido,
          supplierCount: 0,
          contactedCount: 0,
          status: 'nenhum_contato' as const,
        };
      }

      const supplierCount = suppliers?.length || 0;
      const contactedCount = suppliers?.filter((s) => s.status === 'enviado').length || 0;

      return {
        ...pedido,
        supplierCount,
        contactedCount,
        status: calculatePedidoStatus(
          suppliers?.map((s) => ({ ...s, fornecedor: {}, envios: [] })) || []
        ),
      } as PedidoListItem;
    })
  );

  return pedidosWithStatus;
}

/**
 * Get detailed view of a specific pedido with supplier list and send history
 * No new Google Maps calls - all data from Supabase
 */
export async function getPedidoDetail(
  client: SupabaseClient<Database>,
  pedidoId: string
): Promise<PedidoDetailType> {
  // Fetch the pedido
  const { data: pedidoData, error: pedidoError } = await client
    .from('pedidos')
    .select('*')
    .eq('id', pedidoId)
    .single();

  if (pedidoError) {
    throw new Error(`Failed to fetch pedido: ${pedidoError.message}`);
  }

  if (!pedidoData) {
    throw new Error('Pedido not found');
  }

  // Fetch suppliers with fornecedor info and send history
  const { data: supplierData, error: suppliersError } = await client
    .from('pedido_fornecedores')
    .select(
      `
    id,
    pedido_id,
    fornecedor_id,
    status,
    created_at,
    updated_at,
    fornecedor:fornecedor_id (
      id,
      nome,
      email,
      whatsapp_numero,
      endereco,
      servicos,
      dominio
    ),
    envios (
      id,
      pedido_fornecedor_id,
      canal,
      status,
      data_envio,
      mensagem,
      erro
    )
  `
    )
    .eq('pedido_id', pedidoId)
    .order('created_at', { ascending: false });

  if (suppliersError) {
    throw new Error(`Failed to fetch suppliers: ${suppliersError.message}`);
  }

  const suppliers = (supplierData || []) as unknown as SupplierDetail[];
  const status = calculatePedidoStatus(suppliers);

  return {
    ...pedidoData,
    suppliers,
    status,
  } as PedidoDetailType;
}

/**
 * Update supplier status (pendente, enviado, nao_contatar)
 * Allows marking suppliers as contacted or do-not-contact
 */
export async function markSupplierStatus(
  client: SupabaseClient<Database>,
  pedidoFornecedorId: string,
  status: 'pendente' | 'enviado' | 'nao_contatar'
): Promise<PedidoFornecedor> {
  const { data, error } = await client
    .from('pedido_fornecedores')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', pedidoFornecedorId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to update supplier status: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to update supplier status');
  }

  return data as PedidoFornecedor;
}

/**
 * Format date for display
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  const intl = new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return intl.format(date);
}

/**
 * Format time for display (including time of day)
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const intl = new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return intl.format(date);
}
