/**
 * Email and Phone Validation Module
 * Validates emails via MX record lookup and classifies Brazilian phone numbers
 */

/**
 * Validates email by checking MX record via DNS over HTTPS
 * @param {string} email - Email address to validate
 * @returns {Promise<boolean>} - true if valid MX record exists, false otherwise
 */
async function validateEmail(email) {
  try {
    // Basic email format validation
    if (!email || typeof email !== 'string') {
      return false;
    }

    // Extract domain from email
    const atIndex = email.lastIndexOf('@');
    if (atIndex === -1 || atIndex === 0 || atIndex === email.length - 1) {
      return false;
    }

    const domain = email.substring(atIndex + 1).toLowerCase();

    // Validate domain format (basic check)
    if (!domain.includes('.') || domain.includes(' ')) {
      return false;
    }

    // Query MX record using DNS over HTTPS
    const url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`;

    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return false;
      }

      const data = await response.json();

      // Check if Answer array exists and has MX records
      if (data.Answer && Array.isArray(data.Answer)) {
        return data.Answer.some(record => record.type === 15); // MX record type is 15
      }

      return false;
    } catch (error) {
      clearTimeout(timeoutId);
      // Timeout or network error → return false
      return false;
    }
  } catch (error) {
    // Any other error → return false
    return false;
  }
}

/**
 * Classifies Brazilian phone numbers
 * @param {string} phone - Phone number to classify
 * @returns {object} - { type: 'celular' | 'fixo' | 'outro', number?: string }
 */
function classifyPhone(phone) {
  try {
    // Handle invalid input
    if (!phone || typeof phone !== 'string') {
      return { type: 'outro' };
    }

    // Extract digits only (remove +, -, spaces, parentheses)
    const digitsOnly = phone.replace(/\D/g, '');

    // Handle empty result after digit extraction
    if (!digitsOnly) {
      return { type: 'outro' };
    }

    // Remove country code (55) if present
    let normalizedPhone = digitsOnly;
    if (normalizedPhone.startsWith('55')) {
      normalizedPhone = normalizedPhone.substring(2);
    }

    // Validate length: must be 10 (fixo) or 11 (celular)
    if (normalizedPhone.length !== 10 && normalizedPhone.length !== 11) {
      return { type: 'outro' };
    }

    // Check for valid Brazilian DDD format
    // DDD should be 2 digits and reasonable (11-99, but typically 11-99 with some gaps)
    const ddd = normalizedPhone.substring(0, 2);
    const dddNum = parseInt(ddd, 10);
    if (dddNum < 11 || dddNum > 99) {
      return { type: 'outro' };
    }

    // Classification logic
    let type = 'outro';
    if (normalizedPhone.length === 11) {
      // 11-digit: celular if the first digit after DDD (position 2) is 9
      // Format: DD 9 XXXXXXXX (DDD is 2 digits, then 9 for mobile)
      if (normalizedPhone[2] === '9') {
        type = 'celular';
      }
    } else if (normalizedPhone.length === 10) {
      // 10-digit: fixo (fixed line)
      // Format: DD XXXXXXXX (DDD is 2 digits, then 8 digits)
      type = 'fixo';
    }

    // Return result with normalized number if valid
    if (type !== 'outro') {
      const normalizedNumber = '55' + normalizedPhone;
      return { type, number: normalizedNumber };
    }

    return { type: 'outro' };
  } catch (error) {
    return { type: 'outro' };
  }
}

export { validateEmail, classifyPhone };
