/**
 * MessagePreview Component
 * Displays a preview of the final message for a specific supplier
 * Shows supplier info and the filled message preview
 */

import React, { useState } from 'react';
import type { Fornecedor } from '../utils/types';
import { whatsappPhone, type Canais } from '../utils/indicators';

interface MessagePreviewProps {
  /** Where the message goes. Without these two, no choice is shown */
  canais?: Canais;
  onCanaisChange?: (canais: Canais) => void;
  supplier: Fornecedor;
  preview: string;
  /** The text was personalized by hand */
  edited?: boolean;
  /** Without these two, the preview is read-only */
  onEdit?: (text: string) => void;
  onRestore?: () => void;
}

export function MessagePreview({
  supplier,
  canais,
  onCanaisChange,
  preview,
  edited = false,
  onEdit,
  onRestore,
}: MessagePreviewProps): React.ReactElement {
  const [editing, setEditing] = useState(false);

  // Determine contact indicators
  const hasEmail = !!supplier.email;
  const hasWhatsAppLink = !!supplier.whatsapp_link;
  const hasWhatsAppNumber = !!supplier.whatsapp_numero;

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      {/* Supplier Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{supplier.nome}</h3>
            {supplier.dominio && (
              <p className="text-sm text-gray-600">{supplier.dominio}</p>
            )}
          </div>
        </div>

        {/* Address */}
        {supplier.endereco && (
          <p className="text-sm text-gray-600 mt-2">{supplier.endereco}</p>
        )}

        {/* Contact Channels */}
        <div className="flex gap-4 mt-3 flex-wrap">
          {hasEmail && (
            <div className="text-sm">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                📧 {supplier.email}
              </span>
            </div>
          )}
          {hasWhatsAppLink && (
            <div className="text-sm">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                💬 WhatsApp (link)
              </span>
            </div>
          )}
          {hasWhatsAppNumber && !hasWhatsAppLink && (
            <div className="text-sm">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                📱 {supplier.whatsapp_numero} (provável)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Channel choice */}
      {canais && onCanaisChange && (
        <fieldset className="border-t pt-3 pb-3">
          <legend className="sr-only">Enviar mensagem de {supplier.nome} por</legend>
          {hasEmail || whatsappPhone(supplier) ? (
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Enviar por:</span>
              {hasEmail && (
                <label className="inline-flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canais.email}
                    onChange={(e) => onCanaisChange({ ...canais, email: e.target.checked })}
                    aria-label={`Enviar para ${supplier.nome} por e-mail`}
                    className="w-4 h-4 rounded"
                  />
                  E-mail
                </label>
              )}
              {whatsappPhone(supplier) && (
                <label className="inline-flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canais.whatsapp}
                    onChange={(e) => onCanaisChange({ ...canais, whatsapp: e.target.checked })}
                    aria-label={`Enviar para ${supplier.nome} por WhatsApp`}
                    className="w-4 h-4 rounded"
                  />
                  WhatsApp
                </label>
              )}
            </div>
          ) : (
            <p className="text-sm text-amber-700">Sem e-mail ou WhatsApp: a mensagem não será enviada.</p>
          )}
        </fieldset>
      )}

      {/* Message Preview */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Prévia da mensagem
            {edited && <span className="ml-2 normal-case text-blue-700">(personalizada)</span>}
          </p>
          {onEdit && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={`Editar mensagem de ${supplier.nome}`}
              title="Editar mensagem"
              className="px-2 py-1 text-sm rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              ✏️ <span className="text-xs font-medium text-gray-700">Editar</span>
            </button>
          )}
        </div>

        {editing ? (
          <div>
            <textarea
              value={preview}
              onChange={(e) => onEdit?.(e.target.value)}
              rows={10}
              autoFocus
              aria-label={`Texto da mensagem de ${supplier.nome}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Depois de editar, os campos ao lado não mudam mais este texto. Para aplicá-los, volte ao texto do modelo.
            </p>
            <div className="mt-2 flex justify-end gap-2">
              {edited && (
                <button
                  type="button"
                  onClick={onRestore}
                  className="px-3 py-1.5 text-sm font-medium rounded text-gray-700 bg-gray-100 hover:bg-gray-200"
                >
                  Voltar ao texto do modelo
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
              >
                Concluir
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded p-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {preview}
          </div>
        )}
      </div>
    </div>
  );
}
