/**
 * PedidoDetail page component
 * Shows detail view of a saved pedido with supplier list and send history
 * Mobile-responsive design with Tailwind CSS
 * No new Google Maps calls - all data cached in Supabase
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useSavedRequests } from '../hooks/useSavedRequests';
import { formatDate, formatDateTime, formatStatus } from '../utils/pedidos';
import { formatPhone, phoneHref } from '../utils/suppliers';
import type { SupplierDetail } from '../utils/pedidos';

export default function PedidoDetail() {
  const { pedidoId } = useParams<{ pedidoId: string }>();
  const navigate = useNavigate();
  const { detail, detailLoading, error, openDetail, closeDetail, updateSupplierStatus } =
    useSavedRequests(supabase as any);

  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set());

  // Fetch detail when component mounts or pedidoId changes
  useEffect(() => {
    if (pedidoId) {
      openDetail(pedidoId);
    }

    return () => {
      closeDetail();
    };
  }, [pedidoId, openDetail, closeDetail]);

  const toggleSupplierExpanded = (supplierId: string) => {
    const newExpanded = new Set(expandedSuppliers);
    if (newExpanded.has(supplierId)) {
      newExpanded.delete(supplierId);
    } else {
      newExpanded.add(supplierId);
    }
    setExpandedSuppliers(newExpanded);
  };

  if (detailLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <p className="mt-4 text-gray-600">Carregando pedido...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => navigate('/pedidos')}
            className="mb-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Voltar
          </button>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-red-200">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Erro ao carregar pedido</h2>
            <p className="text-red-700">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/pedidos')}
            className="mb-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Voltar
          </button>
          <div className="text-center">
            <p className="text-gray-600">Pedido não encontrado</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/pedidos')}
              className="mb-4 text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              ← Voltar para pedidos
            </button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{detail.nome}</h1>
          </div>
          <span
            className={`inline-block px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${getStatusBadgeClass(
              detail.status
            )}`}
          >
            {formatStatus(detail.status)}
          </span>
        </div>

        {/* Pedido info card */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6 border border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600 font-medium mb-1">Serviço</p>
              <p className="text-gray-900">{detail.servico}</p>
            </div>
            <div>
              <p className="text-gray-600 font-medium mb-1">Região</p>
              <p className="text-gray-900">{detail.regiao}</p>
            </div>
            <div>
              <p className="text-gray-600 font-medium mb-1">Data do Evento</p>
              <p className="text-gray-900">{formatDate(detail.data) || '—'}</p>
            </div>
            <div>
              <p className="text-gray-600 font-medium mb-1">Prazo</p>
              <p className="text-gray-900">{detail.prazo || '—'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-gray-600 font-medium mb-1">Local</p>
              <p className="text-gray-900">{detail.local || '—'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-gray-600 font-medium mb-1">Criado em</p>
              <p className="text-gray-900">{formatDate(detail.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Suppliers list */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Fornecedores ({detail.suppliers.length})
          </h2>

          {detail.suppliers.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center border border-gray-200">
              <p className="text-gray-600 mb-4">Nenhum fornecedor encontrado para este pedido</p>
              <button
                onClick={() => navigate(`/novo-pedido?id=${detail.id}`)}
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Adicionar fornecedores
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {detail.suppliers.map((supplier) => (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  isExpanded={expandedSuppliers.has(supplier.id)}
                  onToggleExpand={() => toggleSupplierExpanded(supplier.id)}
                  onStatusChange={(status) => updateSupplierStatus(supplier.id, status)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Supplier card component showing supplier details and send history
 */
function SupplierCard({
  supplier,
  isExpanded,
  onToggleExpand,
  onStatusChange,
}: {
  supplier: SupplierDetail;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStatusChange: (status: 'pendente' | 'enviado' | 'nao_contatar') => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: 'pendente' | 'enviado' | 'nao_contatar') => {
    setIsUpdating(true);
    try {
      await onStatusChange(newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const lastSend = supplier.envios && supplier.envios.length > 0 ? supplier.envios[0] : null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          {/* Supplier name and basic info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 break-words">
              {supplier.fornecedor?.nome || 'Fornecedor'} {supplier.fornecedor?.dominio && <span className="text-sm text-gray-600">({supplier.fornecedor.dominio})</span>}
            </h3>

            <div className="space-y-1 text-sm text-gray-600">
              {supplier.fornecedor?.email && (
                <a
                  href={`mailto:${supplier.fornecedor.email}`}
                  className="block text-blue-600 hover:text-blue-700 break-all"
                >
                  {supplier.fornecedor.email}
                </a>
              )}

              {supplier.fornecedor?.whatsapp_numero && (
                <a
                  href={`https://wa.me/${supplier.fornecedor.whatsapp_numero.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-green-600 hover:text-green-700"
                >
                  WhatsApp: {supplier.fornecedor.whatsapp_numero}
                </a>
              )}

              {supplier.fornecedor?.telefone && (
                <a
                  href={phoneHref(supplier.fornecedor.telefone)}
                  className="block text-gray-700 hover:text-gray-900"
                >
                  Telefone: {formatPhone(supplier.fornecedor.telefone)}
                </a>
              )}

              {supplier.fornecedor?.endereco && (
                <div className="text-gray-600">{supplier.fornecedor.endereco}</div>
              )}
            </div>
          </div>

          {/* Status selector */}
          <div className="flex-shrink-0">
            <select
              value={supplier.status}
              onChange={(e) =>
                handleStatusChange(e.target.value as 'pendente' | 'enviado' | 'nao_contatar')
              }
              disabled={isUpdating}
              className={`px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isUpdating ? 'opacity-50 cursor-not-allowed' : ''
              } ${getStatusSelectClass(supplier.status)}`}
            >
              <option value="pendente">Pendente</option>
              <option value="enviado">Enviado</option>
              <option value="nao_contatar">Não Contatar</option>
            </select>
          </div>
        </div>

        {/* Last send status */}
        {lastSend && (
          <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">
                Último envio: <strong>{getChannelLabel(lastSend.canal)}</strong> em{' '}
                {formatDateTime(lastSend.data_envio)}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getSendStatusClass(lastSend.status)}`}>
                {lastSend.status === 'sucesso' ? '✓ Enviado' : '✗ Falhou'}
              </span>
            </div>
            {lastSend.erro && <p className="text-red-600 text-xs mt-2">Erro: {lastSend.erro}</p>}
          </div>
        )}

        {/* Send history toggle */}
        {supplier.envios && supplier.envios.length > 0 && (
          <button
            onClick={onToggleExpand}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mt-2"
          >
            {isExpanded ? '▼' : '▶'} {supplier.envios.length} {supplier.envios.length === 1 ? 'envio' : 'envios'}
          </button>
        )}

        {/* Send history (expanded) */}
        {isExpanded && supplier.envios && supplier.envios.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
            {supplier.envios.map((envio) => (
              <div key={envio.id} className="text-sm bg-gray-50 p-3 rounded border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    {getChannelLabel(envio.canal)} - {formatDateTime(envio.data_envio)}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSendStatusClass(envio.status)}`}>
                    {envio.status === 'sucesso' ? '✓ Enviado' : envio.status === 'falhou' ? '✗ Falhou' : '⏳ Pendente'}
                  </span>
                </div>
                {envio.mensagem && (
                  <p className="text-gray-600 text-xs whitespace-pre-wrap">{envio.mensagem.substring(0, 150)}...</p>
                )}
                {envio.erro && <p className="text-red-600 text-xs mt-1">Erro: {envio.erro}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Services tags */}
        {supplier.fornecedor?.servicos && supplier.fornecedor.servicos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {supplier.fornecedor.servicos.map((servico, idx) => (
              <span key={idx} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                {servico}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Get Tailwind classes for status badge
 */
function getStatusBadgeClass(status: 'nenhum_contato' | 'parcialmente_contatados' | 'todos_contatados'): string {
  switch (status) {
    case 'nenhum_contato':
      return 'bg-gray-100 text-gray-800';
    case 'parcialmente_contatados':
      return 'bg-yellow-100 text-yellow-800';
    case 'todos_contatados':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get Tailwind classes for status select
 */
function getStatusSelectClass(status: string): string {
  switch (status) {
    case 'pendente':
      return 'bg-gray-50 text-gray-900';
    case 'enviado':
      return 'bg-green-50 text-green-900';
    case 'nao_contatar':
      return 'bg-red-50 text-red-900';
    default:
      return 'bg-gray-50 text-gray-900';
  }
}

/**
 * Get Tailwind classes for send status
 */
function getSendStatusClass(status: string): string {
  switch (status) {
    case 'sucesso':
      return 'bg-green-100 text-green-800';
    case 'falhou':
      return 'bg-red-100 text-red-800';
    case 'pendente':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get channel label
 */
function getChannelLabel(canal: string): string {
  switch (canal) {
    case 'email':
      return '📧 Email';
    case 'whatsapp':
      return '💬 WhatsApp';
    default:
      return canal;
  }
}
