/**
 * Contact indicator determination for suppliers
 * Determines which contact methods are available for a supplier
 */

import type { Fornecedor } from './types';

/**
 * Where a message goes for one supplier
 */
export interface Canais {
  email: boolean;
  whatsapp: boolean;
}

/**
 * Number used to open a WhatsApp conversation, or empty without WhatsApp
 */
export function whatsappPhone(supplier: Fornecedor): string {
  return supplier.whatsapp_numero || (supplier.whatsapp_link ?? '').replace(/\D/g, '');
}

/**
 * Initial channel of a supplier: only one, so nobody is contacted twice by accident.
 * Email comes first because it is sent by the app and recorded without another step.
 */
export function canaisPadrao(supplier: Fornecedor): Canais {
  return supplier.email
    ? { email: true, whatsapp: false }
    : { email: false, whatsapp: !!whatsappPhone(supplier) };
}

/**
 * Indicator types representing available contact methods
 */
export type ContactIndicator =
  | 'email_and_whatsapp' // Email verified + WhatsApp (site or probable)
  | 'email_only' // Email verified only
  | 'whatsapp_site' // WhatsApp link from site
  | 'whatsapp_probable' // WhatsApp number only
  | 'phone_only'; // No verified contacts (site may be down)

/**
 * Display labels for contact indicators
 */
export const indicatorLabels: Record<ContactIndicator, string> = {
  email_and_whatsapp: 'Email verificado + WhatsApp',
  email_only: 'Email verificado',
  whatsapp_site: 'WhatsApp no site',
  whatsapp_probable: 'WhatsApp provável',
  phone_only: 'Só telefone fixo / Site fora do ar',
};

/**
 * Display descriptions for tooltips
 */
export const indicatorDescriptions: Record<ContactIndicator, string> = {
  email_and_whatsapp: 'Email verificado e WhatsApp (link ou número no site)',
  email_only: 'Email foi validado via MX record lookup',
  whatsapp_site: 'Link para WhatsApp encontrado no site',
  whatsapp_probable: 'Número de WhatsApp encontrado no site (não verificado)',
  phone_only: 'Apenas telefone fixo ou site indisponível para extração',
};

/**
 * Determines the contact indicator type for a supplier
 *
 * Priority order:
 * 1. Email + WhatsApp (link preferred over número)
 * 2. Email only
 * 3. WhatsApp (site link)
 * 4. WhatsApp (probable/número only)
 * 5. Phone only (default)
 */
export function contactIndicators(supplier: Fornecedor): ContactIndicator {
  const hasEmail = !!supplier.email?.trim();
  const hasWhatsAppLink = !!supplier.whatsapp_link?.trim();
  const hasWhatsAppNumber = !!supplier.whatsapp_numero?.trim();
  const hasWhatsApp = hasWhatsAppLink || hasWhatsAppNumber;

  if (hasEmail && hasWhatsApp) {
    return 'email_and_whatsapp';
  }

  if (hasEmail) {
    return 'email_only';
  }

  if (hasWhatsAppLink) {
    return 'whatsapp_site';
  }

  if (hasWhatsAppNumber) {
    return 'whatsapp_probable';
  }

  return 'phone_only';
}

/**
 * Color classes for indicator badges (Tailwind CSS)
 */
export const indicatorColors: Record<ContactIndicator, string> = {
  email_and_whatsapp: 'bg-green-100 text-green-800 border border-green-300',
  email_only: 'bg-blue-100 text-blue-800 border border-blue-300',
  whatsapp_site: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
  whatsapp_probable: 'bg-amber-100 text-amber-800 border border-amber-300',
  phone_only: 'bg-gray-100 text-gray-800 border border-gray-300',
};

/**
 * Icon representations for indicators (text-based using Unicode)
 */
export const indicatorIcons: Record<ContactIndicator, string> = {
  email_and_whatsapp: '✉️ 💬',
  email_only: '✉️',
  whatsapp_site: '💬',
  whatsapp_probable: '💬?',
  phone_only: '☎️',
};
