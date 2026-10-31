/**
 * SavedRequests page component
 * Lists all saved pedidos with creation date, status summary
 * Mobile-responsive design with Tailwind CSS
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useSavedRequests } from '../hooks/useSavedRequests';
import { formatDate, formatStatus } from '../utils/pedidos';

export default function SavedRequests() {
  const navigate = useNavigate();
  const { list, loading, error } = useSavedRequests(supabase as any);

  const handleOpenPedido = useCallback(
    (pedidoId: string) => {
      navigate(`/pedido/${pedidoId}`);
    },
    [navigate]
  );

  // Sort by creation date (newest first)
  const sortedList = [...list].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <p className="mt-4 text-gray-600">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-red-200">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Erro ao carregar pedidos</h2>
            <p className="text-red-700">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (sortedList.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="h-16 w-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Nenhum pedido encontrado</h2>
          <p className="text-gray-600 mb-6">
            Você ainda não tem nenhum pedido salvo. Crie um novo pedido para começar.
          </p>
          <button
            onClick={() => navigate('/novo-pedido')}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Criar novo pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pedidos Salvos</h1>
          <p className="text-gray-600">
            Você tem {sortedList.length} pedido{sortedList.length !== 1 ? 's' : ''} salvo
            {sortedList.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* List of pedidos */}
        <div className="space-y-4">
          {sortedList.map((pedido) => (
            <div
              key={pedido.id}
              onClick={() => handleOpenPedido(pedido.id)}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 overflow-hidden"
            >
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  {/* Left: Title and metadata */}
                  <div className="flex-1">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                      {pedido.nome}
                    </h2>

                    <div className="flex flex-col sm:flex-row gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Serviço:</span> {pedido.servico}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Região:</span> {pedido.regiao}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Data:</span> {formatDate(pedido.data)}
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      Criado em {formatDate(pedido.created_at)}
                    </div>
                  </div>

                  {/* Right: Status and supplier summary */}
                  <div className="flex flex-col items-start sm:items-end gap-3 sm:min-w-max">
                    {/* Status badge */}
                    <div>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                          pedido.status
                        )}`}
                      >
                        {formatStatus(pedido.status)}
                      </span>
                    </div>

                    {/* Supplier count */}
                    <div className="text-sm font-medium text-gray-700">
                      <span className="text-blue-600">{pedido.contactedCount}</span>
                      <span className="text-gray-500"> / {pedido.supplierCount}</span> fornecedores
                    </div>

                    {/* Contact progress indicator */}
                    <div className="w-full sm:w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${getProgressBarColor(pedido.status)}`}
                        style={{
                          width:
                            pedido.supplierCount > 0
                              ? `${(pedido.contactedCount / pedido.supplierCount) * 100}%`
                              : '0%',
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom action hint (mobile) */}
              <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 sm:hidden text-xs text-gray-500">
                Toque para abrir detalhes
              </div>
            </div>
          ))}
        </div>

        {/* Footer action button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/novo-pedido')}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Criar novo pedido
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Get Tailwind classes for status badge
 */
function getStatusBadgeClass(status: 'nenhum_contato' | 'parcialmente_contatados' | 'todos_contatados'): string {
  const baseClass = 'inline-block px-3 py-1 rounded-full text-xs font-medium';

  switch (status) {
    case 'nenhum_contato':
      return `${baseClass} bg-gray-100 text-gray-800`;
    case 'parcialmente_contatados':
      return `${baseClass} bg-yellow-100 text-yellow-800`;
    case 'todos_contatados':
      return `${baseClass} bg-green-100 text-green-800`;
    default:
      return baseClass;
  }
}

/**
 * Get progress bar color based on status
 */
function getProgressBarColor(status: 'nenhum_contato' | 'parcialmente_contatados' | 'todos_contatados'): string {
  switch (status) {
    case 'nenhum_contato':
      return 'bg-gray-300';
    case 'parcialmente_contatados':
      return 'bg-yellow-400';
    case 'todos_contatados':
      return 'bg-green-500';
    default:
      return 'bg-gray-300';
  }
}
