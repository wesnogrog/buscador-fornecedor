/**
 * SupplierCard component
 * Displays individual supplier with contact indicators and selection checkbox
 */

import type { Fornecedor } from '../utils/types';
import {
  contactIndicators,
  indicatorLabels,
  indicatorDescriptions,
  indicatorColors,
  indicatorIcons,
} from '../utils/indicators';
import { WhatsAppButton } from './WhatsAppButton';
import { formatSupplierMessage } from '../utils/whatsapp';
import { formatPhone, phoneHref } from '../utils/suppliers';
import { formatDate, type ContatoAnterior } from '../utils/pedidos';

interface SupplierCardProps {
  supplier: Fornecedor;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  contatoAnterior?: ContatoAnterior;
}

/**
 * Displays a supplier with:
 * - Checkbox for selection
 * - Name and domain
 * - Address
 * - Contact indicator badge
 * - Link to website
 */
export function SupplierCard({
  supplier,
  isSelected,
  onToggleSelect,
  contatoAnterior,
}: SupplierCardProps) {
  const indicator = contactIndicators(supplier);
  const label = indicatorLabels[indicator];
  const description = indicatorDescriptions[indicator];
  const colors = indicatorColors[indicator];
  const icon = indicatorIcons[indicator];

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <div className="flex-shrink-0 pt-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(supplier.id)}
            className="w-5 h-5 text-blue-600 rounded cursor-pointer"
            aria-label={`Select ${supplier.nome}`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name and Domain */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-gray-900">{supplier.nome}</h3>
            {supplier.dominio && (
              <a
                href={`https://${supplier.dominio}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline text-sm truncate"
                title={`Visit ${supplier.dominio}`}
              >
                {supplier.dominio}
              </a>
            )}
          </div>

          {/* Address */}
          {supplier.endereco && (
            <p className="text-sm text-gray-600 mt-1">{supplier.endereco}</p>
          )}

          {/* Previous contact warning */}
          {contatoAnterior && (
            <p className="mt-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              ⚠️ Já contatado em {formatDate(contatoAnterior.data)} no pedido "{contatoAnterior.pedido}"
            </p>
          )}

          {/* Contact Info Summary */}
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            {/* Email */}
            {supplier.email && (
              <a
                href={`mailto:${supplier.email}`}
                className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                title="Send email"
              >
                {supplier.email}
              </a>
            )}

            {/* WhatsApp Button Component */}
            {(supplier.whatsapp_link || supplier.whatsapp_numero) && (
              <WhatsAppButton
                phoneNumber={
                  supplier.whatsapp_numero ||
                  (supplier.whatsapp_link ? supplier.whatsapp_link.replace(/\D/g, '') : '')
                }
                message={formatSupplierMessage(
                  supplier.nome,
                  supplier.servicos?.[0] || 'serviço',
                  supplier.regiao ?? undefined
                )}
                supplierName={supplier.nome}
                label="WhatsApp 💬"
                className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100 transition-colors"
                ariaLabel={`Contact ${supplier.nome} via WhatsApp`}
              />
            )}

            {/* Phone */}
            {supplier.telefone && (
              <a
                href={phoneHref(supplier.telefone)}
                className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                aria-label={`Ligar para ${supplier.nome}`}
              >
                ☎️ {formatPhone(supplier.telefone)}
              </a>
            )}
          </div>

          {/* Services */}
          {supplier.servicos && supplier.servicos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {supplier.servicos.slice(0, 3).map((service, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded"
                >
                  {service}
                </span>
              ))}
              {supplier.servicos.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{supplier.servicos.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Indicator Badge */}
        <div className="flex-shrink-0">
          <div
            className={`${colors} px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap text-center`}
            title={description}
          >
            <div className="mb-1">{icon}</div>
            <div className="text-xs leading-tight">{label}</div>
          </div>
        </div>
      </div>

      {/* Footer - extraction date */}
      {supplier.data_extracao && (
        <div className="mt-3 text-xs text-gray-400">
          Extracted: {new Date(supplier.data_extracao).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

export default SupplierCard;
