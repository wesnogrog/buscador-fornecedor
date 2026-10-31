/**
 * MessageComposer Page Component
 * Task 10: Message Composition and Preview
 *
 * Flow:
 * 1. User selects a template from available modelos
 * 2. User fills in the dynamic fields (servico, evento, data, local, prazo)
 * 3. Component shows real-time preview of final message for each selected supplier
 * 4. User proceeds to send (Task 11)
 */

import React, { useEffect } from 'react';
import { useMessageCompose } from '../hooks/useMessageCompose';
import { MessagePreview } from '../components/MessagePreview';
import type { Modelo, Fornecedor, Pedido } from '../utils/types';

interface MessageComposerProps {
  templates: Modelo[];
  suppliers: Fornecedor[];
  selectedSupplierIds: string[];
  pedido: Pedido;
  onGoBack: () => void;
  onProceed: (data: {
    selectedTemplate: Modelo;
    fields: Record<string, string>;
    previews: Record<string, string>;
  }) => void;
}

export function MessageComposer({
  templates,
  suppliers,
  selectedSupplierIds,
  pedido,
  onGoBack,
  onProceed,
}: MessageComposerProps): React.ReactElement {
  const messageCompose = useMessageCompose(templates);

  // Generate previews whenever template or fields change
  useEffect(() => {
    if (messageCompose.selectedTemplate) {
      selectedSupplierIds.forEach((supplierId) => {
        const supplier = suppliers.find((s) => s.id === supplierId);
        if (supplier) {
          messageCompose.generatePreview(supplierId, supplier.nome);
        }
      });
    }
  }, [messageCompose.selectedTemplate, messageCompose.fields]);

  const selectedSuppliers = suppliers.filter((s) => selectedSupplierIds.includes(s.id));
  const { missingFields } = messageCompose.validate();
  const canProceed = messageCompose.selectedTemplate !== null && missingFields.length === 0;

  const handleProceed = () => {
    if (messageCompose.selectedTemplate) {
      onProceed({
        selectedTemplate: messageCompose.selectedTemplate,
        fields: messageCompose.fields,
        previews: messageCompose.previews,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mensagem</h1>
              <p className="text-gray-600 mt-2">
                Escolha um modelo e confira a prévia para {selectedSuppliers.length} fornecedor(es)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-24">
              {/* Template Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Escolha um modelo
                </label>
                <select
                  value={messageCompose.selectedTemplate?.id ?? ''}
                  onChange={(e) => messageCompose.selectTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Selecione um modelo --</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field Inputs */}
              {messageCompose.selectedTemplate && (
                <div className="space-y-4">
                  {/* Serviço */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Serviço
                    </label>
                    <input
                      type="text"
                      value={messageCompose.fields.servico}
                      onChange={(e) => messageCompose.updateField('servico', e.target.value)}
                      placeholder="Ex: Locação de Som"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Evento */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Evento (opcional)
                    </label>
                    <input
                      type="text"
                      value={messageCompose.fields.evento}
                      onChange={(e) => messageCompose.updateField('evento', e.target.value)}
                      placeholder="Ex: Workshop 2024"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Data */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data (opcional)
                    </label>
                    <input
                      type="date"
                      value={messageCompose.fields.data}
                      onChange={(e) => messageCompose.updateField('data', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Local */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Local (opcional)
                    </label>
                    <input
                      type="text"
                      value={messageCompose.fields.local}
                      onChange={(e) => messageCompose.updateField('local', e.target.value)}
                      placeholder="Ex: São Paulo - SP"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Prazo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prazo (opcional)
                    </label>
                    <input
                      type="text"
                      value={messageCompose.fields.prazo}
                      onChange={(e) => messageCompose.updateField('prazo', e.target.value)}
                      placeholder="Ex: 2 dias"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Help Text */}
                  <div className="mt-6 p-3 bg-blue-50 rounded-md border border-blue-200">
                    <p className="text-xs text-blue-800">
                      <strong>Dica:</strong> O campo {'{fornecedor}'} será preenchido automaticamente com o nome de cada fornecedor.
                    </p>
                  </div>
                </div>
              )}

              {!messageCompose.selectedTemplate && (
                <div className="p-4 bg-yellow-50 rounded-md border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    Selecione um modelo para visualizar os campos disponíveis.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Previews Column */}
          <div className="lg:col-span-2">
            {messageCompose.selectedTemplate ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Prévia da Mensagem
                  </h2>
                </div>

                {selectedSuppliers.length > 0 ? (
                  selectedSuppliers.map((supplier) => (
                    <MessagePreview
                      key={supplier.id}
                      supplier={supplier}
                      preview={messageCompose.previews[supplier.id] || ''}
                    />
                  ))
                ) : (
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <p className="text-yellow-800">
                      Nenhum fornecedor selecionado. Volte e selecione fornecedores para visualizar as prévias.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-600">
                  Selecione um modelo para visualizar as prévias das mensagens.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Validation Message */}
        {messageCompose.selectedTemplate && missingFields.length > 0 && (
          <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-800">
              <strong>Campos obrigatórios:</strong> Complete os campos: {missingFields.join(', ')}
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-12 flex justify-between items-center">
          <button
            onClick={onGoBack}
            className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            ← Voltar
          </button>

          <button
            onClick={handleProceed}
            disabled={!canProceed}
            className={`px-6 py-2 rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              canProceed
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            Prosseguir →
          </button>
        </div>
      </div>
    </div>
  );
}
