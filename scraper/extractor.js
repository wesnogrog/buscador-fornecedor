/**
 * Contact Extraction Module
 * Extracts email, WhatsApp link, and phone numbers from supplier website HTML
 */

/**
 * Cleans HTML content by removing script and style tags
 * @param {string} html - Raw HTML content
 * @returns {string} - Cleaned HTML
 */
function cleanHtmlContent(html) {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<code\b[^<]*(?:(?!<\/code>)<[^<]*)*<\/code>/gi, ' ');
}

/**
 * Extracts email from HTML content
 * Filters out noreply, test, fake, example emails
 * @param {string} html - HTML content
 * @returns {string|null} - First valid email found or null
 */
function extractEmail(html) {
  if (!html || typeof html !== 'string') {
    return null;
  }

  // Clean HTML first
  const cleaned = cleanHtmlContent(html);

  // Email regex pattern
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/gi;
  const matches = cleaned.match(emailRegex);

  if (!matches) {
    return null;
  }

  // Filter out noreply, test, fake, example emails
  const validEmail = matches.find(email => {
    const lower = email.toLowerCase();
    return !lower.includes('noreply') &&
           !lower.includes('no-reply') &&
           !lower.startsWith('test@') &&
           !lower.startsWith('fake@') &&
           !lower.startsWith('example@');
  });

  return validEmail || null;
}

/**
 * Extracts WhatsApp link from HTML content
 * Looks for wa.me or api.whatsapp.com URLs
 * @param {string} html - HTML content
 * @returns {string|null} - WhatsApp link or null
 */
function extractWhatsAppLink(html) {
  if (!html || typeof html !== 'string') {
    return null;
  }

  // Check for wa.me URLs first
  const waRegex = /https:\/\/wa\.me\/[\d+]+/gi;
  const waMatch = html.match(waRegex);
  if (waMatch) {
    return waMatch[0];
  }

  // Fall back to api.whatsapp.com URLs
  const apiRegex = /https:\/\/api\.whatsapp\.com\/send\?phone=[\d+]+/gi;
  const apiMatch = html.match(apiRegex);
  if (apiMatch) {
    return apiMatch[0];
  }

  return null;
}

/**
 * Validates Brazilian phone number format
 * @param {string} phone - Phone number
 * @returns {boolean} - true if valid Brazilian phone
 */
function validateBrazilianPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Extract digits only
  const digits = phone.replace(/\D/g, '');

  // Remove country code if present
  let normalized = digits;
  if (normalized.startsWith('55')) {
    normalized = normalized.substring(2);
  }

  // Check length: 10 (fixo) or 11 (celular)
  if (normalized.length !== 10 && normalized.length !== 11) {
    return false;
  }

  // Check valid DDD
  const ddd = parseInt(normalized.substring(0, 2), 10);
  if (ddd < 11 || ddd > 99) {
    return false;
  }

  // For 11-digit, 9th digit must be 9
  if (normalized.length === 11) {
    const ninthDigit = normalized[4];
    return ninthDigit === '9';
  }

  return true;
}

/**
 * Extracts WhatsApp phone number from HTML content
 * Handles Brazilian phone format: DDD + 8-9 digits
 * @param {string} html - HTML content
 * @returns {string|null} - Normalized phone number (55 + digits) or null
 */
function extractWhatsAppNumber(html) {
  if (!html || typeof html !== 'string') {
    return null;
  }

  // Pattern for 11-digit (mobile): DDD + 9 + 8 digits
  const mobile11Regex = /\b(\d{2})\s*9\s*(\d{4})\s*[-.\s]*(\d{4})\b/g;
  let match = html.match(mobile11Regex);

  if (match) {
    const digits = match[0].replace(/\D/g, '');
    if (validateBrazilianPhone(digits)) {
      return '55' + digits;
    }
  }

  // Pattern for 10-digit (landline): DDD + 8 digits
  const mobile10Regex = /\b(\d{2})\s*([3-8])\s*(\d{4})\s*[-.\s]*(\d{4})\b/g;
  match = html.match(mobile10Regex);

  if (match) {
    const digits = match[0].replace(/\D/g, '');
    if (validateBrazilianPhone(digits)) {
      return '55' + digits;
    }
  }

  // Pattern for +55 prefixed numbers
  const prefixedRegex = /\+?55\s*(\d{2})\s*9\s*(\d{4})\s*[-.\s]*(\d{4})/g;
  match = html.match(prefixedRegex);

  if (match) {
    const digits = match[0].replace(/\D/g, '');
    if (digits.startsWith('55')) {
      if (validateBrazilianPhone(digits)) {
        return digits;
      }
    } else if (validateBrazilianPhone(digits)) {
      return '55' + digits;
    }
  }

  // Pattern for unformatted 11-digit
  const unformatted11Regex = /\b(\d{2})9(\d{8})\b/g;
  match = html.match(unformatted11Regex);

  if (match) {
    const digits = match[0].replace(/\D/g, '');
    if (validateBrazilianPhone(digits)) {
      return '55' + digits;
    }
  }

  return null;
}

/**
 * Extracts contacts from website HTML
 * Async version (can accept timeout parameter)
 * @param {string} html - Website HTML content
 * @param {number} timeout - Optional timeout in milliseconds (not enforced in sync version)
 * @returns {Promise<Object>} - {email?, whatsapp_link?, whatsapp_numero?}
 */
async function extractContacts(html, timeout) {
  // Sync version wrapped in async
  return extractContactsSync(html);
}

/**
 * Synchronous version of extractContacts
 * @param {string} html - Website HTML content
 * @returns {Object} - {email?, whatsapp_link?, whatsapp_numero?}
 */
function extractContactsSync(html) {
  if (!html || typeof html !== 'string') {
    return {};
  }

  const result = {};

  const email = extractEmail(html);
  if (email) {
    result.email = email;
  }

  const whatsappLink = extractWhatsAppLink(html);
  if (whatsappLink) {
    result.whatsapp_link = whatsappLink;
  }

  const whatsappNumber = extractWhatsAppNumber(html);
  if (whatsappNumber) {
    result.whatsapp_numero = whatsappNumber;
  }

  return result;
}

export {
  extractContacts,
  extractContactsSync,
  extractEmail,
  extractWhatsAppLink,
  extractWhatsAppNumber,
  validateBrazilianPhone,
  cleanHtmlContent,
};
