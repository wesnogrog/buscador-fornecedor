/**
 * WhatsApp URL Generation Utility
 *
 * Generates wa.me links for WhatsApp contact with pre-filled messages.
 * No Business API - just standard wa.me links that work on mobile and desktop.
 *
 * Usage:
 *   const url = generateWhatsAppUrl('5511999887766', 'Hello World');
 *   // → https://wa.me/5511999887766?text=Hello%20World
 */

/**
 * Normalize phone number by removing formatting characters
 *
 * Removes:
 * - Leading + sign
 * - Spaces, hyphens, parentheses, dots
 *
 * @param phone - Raw phone number (may include formatting)
 * @returns Normalized phone number (digits only)
 */
function normalizePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    throw new Error('Phone number must be a non-empty string');
  }

  // Remove formatting characters: spaces, hyphens, parentheses, dots
  let normalized = phone.replace(/[\s\-().,]/g, '');

  // Remove leading + if present
  if (normalized.startsWith('+')) {
    normalized = normalized.substring(1);
  }

  return normalized;
}

/**
 * Generate a wa.me URL with optional pre-filled message
 *
 * The message is URL-encoded using encodeURIComponent() which handles:
 * - Special characters (é, ã, ç, etc)
 * - Emoji
 * - URL characters (/, &, ?, etc)
 * - Newlines (\n becomes %0A)
 *
 * @param phone - WhatsApp phone number (with or without formatting)
 * @param message - Optional pre-filled message
 * @returns wa.me URL (https://wa.me/{phone}?text={message})
 *
 * @example
 *   // Basic usage
 *   generateWhatsAppUrl('5511999887766');
 *   // → https://wa.me/5511999887766
 *
 * @example
 *   // With message
 *   generateWhatsAppUrl('55 11 99988-7766', 'Olá! Como está?');
 *   // → https://wa.me/5511999887766?text=Ol%C3%A1%21%20Como%20est%C3%A1%3F
 *
 * @example
 *   // With special characters and newlines
 *   const msg = 'Olá!\n\nPreciso de catering para evento em SP.\n\nObrigado!';
 *   generateWhatsAppUrl('5511999887766', msg);
 *   // → https://wa.me/5511999887766?text=Ol%C3%A1%21%0A%0APreciso...
 */
export function generateWhatsAppUrl(phone: string, message?: string): string {
  // Normalize phone number
  const normalizedPhone = normalizePhoneNumber(phone);

  // Base wa.me URL
  const baseUrl = `https://wa.me/${normalizedPhone}`;

  // If no message provided, return just the base URL
  if (!message || message.trim() === '') {
    return baseUrl;
  }

  // Encode message using encodeURIComponent
  // This handles all special characters, emoji, newlines, etc.
  const encodedMessage = encodeURIComponent(message);

  // Combine into full URL with text parameter
  return `${baseUrl}?text=${encodedMessage}`;
}

/**
 * Format a supplier name and service into a WhatsApp message
 *
 * This helper creates a simple message template for contacting suppliers.
 *
 * @param supplierName - Name of the supplier
 * @param service - Service being requested
 * @param region - Region/location
 * @returns Formatted message
 *
 * @example
 *   formatSupplierMessage('Catering Delícia', 'catering', 'SP');
 *   // → 'Olá Catering Delícia!\n\nProcuro fornecedor de catering em SP.\n\nPoderia me passar informações sobre seus serviços?'
 */
export function formatSupplierMessage(
  supplierName: string,
  service: string,
  region?: string
): string {
  const lines = [
    `Olá ${supplierName}!`,
    '',
    `Procuro fornecedor de ${service}${region ? ` em ${region}` : ''}.`,
    '',
    'Poderia me passar informações sobre seus serviços?',
  ];

  return lines.join('\n');
}

/**
 * Replace template placeholders with actual values
 *
 * Supported placeholders:
 * - {fornecedor} - Supplier name
 * - {servico} - Service type
 * - {evento} - Event name
 * - {data} - Event date
 * - {local} - Event location
 * - {prazo} - Deadline
 *
 * @param template - Template string with placeholders
 * @param values - Object with placeholder values
 * @returns Template with placeholders replaced
 *
 * @example
 *   replaceMessagePlaceholders(
 *     'Olá {fornecedor}! Preciso de {servico} para {evento} em {local} na data {data}.',
 *     {
 *       fornecedor: 'Catering Delícia',
 *       servico: 'catering',
 *       evento: 'Festa de Formatura',
 *       data: '15/11/2024',
 *       local: 'São Paulo, SP'
 *     }
 *   );
 *   // → 'Olá Catering Delícia! Preciso de catering para Festa de Formatura em São Paulo, SP na data 15/11/2024.'
 */
export function replaceMessagePlaceholders(
  template: string,
  values: Partial<{
    fornecedor: string;
    servico: string;
    evento: string;
    data: string;
    local: string;
    prazo: string;
  }>
): string {
  let result = template;

  // Replace each placeholder with its value
  Object.entries(values).forEach(([key, value]) => {
    if (value) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }
  });

  return result;
}

/**
 * Validate WhatsApp phone number format
 *
 * Basic validation:
 * - Must be at least 10 digits
 * - Can be 11-12 digits (varies by country)
 * - Must be numeric after normalization
 *
 * @param phone - Phone number to validate
 * @returns true if phone number is valid, false otherwise
 *
 * @example
 *   isValidWhatsAppNumber('5511999887766');    // → true
 *   isValidWhatsAppNumber('11999887766');      // → true
 *   isValidWhatsAppNumber('123');              // → false
 *   isValidWhatsAppNumber('');                 // → false
 */
export function isValidWhatsAppNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  try {
    const normalized = normalizePhoneNumber(phone);
    // Must be at least 10 digits, at most 15 (international standard)
    return normalized.length >= 10 && normalized.length <= 15 && /^\d+$/.test(normalized);
  } catch {
    return false;
  }
}

/**
 * Get WhatsApp link from supplier data
 *
 * Returns whatsapp_link if available, otherwise generates from whatsapp_numero
 *
 * @param supplierPhone - Either whatsapp_link (URL) or whatsapp_numero (phone number)
 * @returns WhatsApp wa.me URL or null if neither is provided
 */
export function getWhatsAppLink(supplierPhone?: string | null): string | null {
  if (!supplierPhone) {
    return null;
  }

  // If it's already a URL (starts with http), return as-is
  if (supplierPhone.startsWith('http')) {
    return supplierPhone;
  }

  // Otherwise treat as phone number and generate URL
  if (isValidWhatsAppNumber(supplierPhone)) {
    return generateWhatsAppUrl(supplierPhone);
  }

  return null;
}
