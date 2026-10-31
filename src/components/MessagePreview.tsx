/**
 * MessagePreview Component
 * Displays a preview of the final message for a specific supplier
 * Shows supplier info and the filled message preview
 */

import React from 'react';
import type { Fornecedor } from '../utils/types';

interface MessagePreviewProps {
  supplier: Fornecedor;
  preview: string;
}

export function MessagePreview({ supplier, preview }: MessagePreviewProps): React.ReactElement {
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

      {/* Message Preview */}
      <div className="border-t pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Prévia da mensagem
        </p>
        <div className="bg-gray-50 rounded p-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
          {preview}
        </div>
      </div>
    </div>
  );
}
