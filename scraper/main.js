/**
 * Buscador de Fornecedor - End-to-End Scraper CLI
 *
 * Complete orchestration of:
 * - Google Maps search (Task 3)
 * - Contact extraction (Task 4)
 * - Email/Phone validation (Task 5)
 * - Supabase persistence
 *
 * Usage:
 *   node main.js <service> <region> [--mock]
 *   SERVICE=catering REGION="São Paulo" node main.js
 */

import 'dotenv/config';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

// Import modules from completed tasks
import { searchSuppliers } from './googleMaps.js';
import { extractContacts } from './extractor.js';
import { validateEmail, classifyPhone } from './validator.js';
import { saveSuppliers } from './supabaseClient.js';

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SERVICE = process.argv[2],
  REGION = process.argv[3],
  HEADLESS = 'true',
  DELAY_MIN_MS = 2000,
  DELAY_MAX_MS = 5000,
} = process.env;

/**
 * Random delay between MIN and MAX milliseconds
 * Prevents aggressive rate limiting
 */
function randomDelay(min = parseInt(DELAY_MIN_MS), max = parseInt(DELAY_MAX_MS)) {
  return new Promise(resolve => {
    const delay = Math.random() * (max - min) + min;
    setTimeout(resolve, delay);
  });
}

/**
 * Mock supplier data for testing
 */
function getMockSuppliers() {
  return [
    {
      name: 'Catering ABC',
      address: '123 Main St, São Paulo, SP',
      phone: '(11) 1234-5678',
      website: 'https://catering-abc.com.br',
    },
    {
      name: 'Catering Deluxe',
      address: '456 Park Ave, São Paulo, SP',
      phone: '(11) 99988-7766',
      website: 'https://catering-deluxe.com.br',
    },
    {
      name: 'Buffet Premium',
      address: '789 Business Blvd, São Paulo, SP',
      phone: null,
      website: 'https://buffet-premium.com.br',
    },
  ];
}

/**
 * Mock HTML pages for contact extraction
 */
function getMockHtml(supplierName) {
  const htmlTemplates = {
    'Catering ABC': '<html><body><a href="mailto:info@catering-abc.com.br">info@catering-abc.com.br</a><p>WhatsApp: <a href="https://wa.me/5511999887766">Chat</a></p></body></html>',
    'Catering Deluxe': '<html><body><p>Email: contact@catering-deluxe.com.br</p><p>Phone: (11) 9 9988-7766</p></body></html>',
    'Buffet Premium': '<html><body><p>noreply@buffet-premium.com.br</p><p>Sales: sales@buffet-premium.com.br</p></body></html>',
  };
  return htmlTemplates[supplierName] || '<html><body></body></html>';
}

/**
 * Main scraper orchestration function
 * Integrates all modules: Google Maps → Extraction → Validation → Save
 *
 * @param {string} service - Service type (e.g., "catering", "plumber")
 * @param {string} region - Geographic region (e.g., "São Paulo")
 * @param {object} options - Configuration options
 *   - mock: false|true|"blocked"|"supabase-error" - Use mock data
 *   - onLog: function - Callback for logging
 *
 * @returns {Promise<object>} - {status, saved, errors, duration, message?}
 */
async function runScraper(service, region, options = {}) {
  const startTime = Date.now();
  const logs = [];

  // Helper function to log messages
  const log = (message) => {
    console.log(message);
    logs.push(message);
    if (options.onLog) {
      options.onLog(message);
    }
  };

  try {
    // Validate inputs
    if (!service || !region) {
      const message = 'Service and region are required parameters';
      log(`[ERROR] ${message}`);
      return {
        status: 'error',
        saved: 0,
        errors: 0,
        duration: Date.now() - startTime,
        message,
      };
    }

    log(`[INFO] Starting scraper for "${service}" in "${region}"`);

    // Determine if using mock or real data
    const isMock = options.mock === true || typeof options.mock === 'string';
    const mockMode = typeof options.mock === 'string' ? options.mock : null;

    let suppliers;
    let browser;

    if (isMock) {
      // Use mock data
      log('[INFO] Using mock data for testing');
      suppliers = getMockSuppliers();

      if (mockMode === 'blocked') {
        log('[ERROR] Google Maps request blocked (429)');
        return {
          status: 'blocked',
          saved: 0,
          errors: suppliers.length,
          duration: Date.now() - startTime,
          message: 'Google has blocked this IP. Please wait a few hours and retry.',
        };
      }

      if (mockMode === 'supabase-error') {
        log('[ERROR] Supabase connection failed');
        return {
          status: 'error',
          saved: 0,
          errors: suppliers.length,
          duration: Date.now() - startTime,
          message: 'Supabase connection failed. Check credentials and try again.',
        };
      }
    } else {
      // Real Google Maps search
      try {
        browser = await puppeteer.launch({
          headless: HEADLESS === 'true',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
          ],
        });

        log('[INFO] Searching Google Maps...');
        suppliers = await searchSuppliers(browser, service, region);
        log(`[INFO] Found ${suppliers.length} suppliers`);
      } catch (error) {
        // Handle Google blocking
        if (error.message && error.message.includes('blocked')) {
          log(`[ERROR] Google Maps blocked: ${error.message}`);
          return {
            status: 'blocked',
            saved: 0,
            errors: 1,
            duration: Date.now() - startTime,
            message: 'Google has blocked this IP. Please wait a few hours and retry.',
          };
        }
        throw error;
      } finally {
        if (browser) {
          await browser.close();
        }
      }
    }

    if (suppliers.length === 0) {
      log('[WARN] No suppliers found');
      return {
        status: 'success',
        saved: 0,
        errors: 0,
        duration: Date.now() - startTime,
        message: 'No suppliers found for this search',
      };
    }

    // Enrich suppliers with contact information
    log('[INFO] Extracting and validating contacts...');
    const enriched = [];
    let extractionErrors = 0;

    for (const supplier of suppliers) {
      try {
        const contacts = isMock
          ? await extractContacts(getMockHtml(supplier.name))
          : await extractContacts(supplier.website || '');

        // Merge supplier with extracted contacts
        const enrichedSupplier = { ...supplier, ...contacts };

        // Validate email if present
        if (enrichedSupplier.email) {
          const isValid = await validateEmail(enrichedSupplier.email);
          enrichedSupplier.emailValid = isValid;
          log(`[INFO] Email ${enrichedSupplier.email}: ${isValid ? 'valid' : 'invalid'}`);
        }

        // Classify phone if present
        if (enrichedSupplier.phone || enrichedSupplier.whatsapp_numero) {
          const phoneNumber = enrichedSupplier.whatsapp_numero || enrichedSupplier.phone;
          const phoneClass = classifyPhone(phoneNumber);
          enrichedSupplier.phoneType = phoneClass.type;
          if (phoneClass.number) {
            enrichedSupplier.whatsapp_numero = phoneClass.number;
          }
          log(`[INFO] Extracted contacts: ${enrichedSupplier.name}, email=${enrichedSupplier.email || 'N/A'}, whatsapp=${enrichedSupplier.whatsapp_numero || 'N/A'}`);
        } else {
          log(`[INFO] Extracted contacts: ${enrichedSupplier.name}, email=${enrichedSupplier.email || 'N/A'}`);
        }

        enriched.push(enrichedSupplier);
      } catch (error) {
        // Log error but continue processing other suppliers
        log(`[WARN] Failed to process ${supplier.name}: ${error.message}`);
        extractionErrors++;
      }
    }

    if (enriched.length === 0) {
      log('[ERROR] No suppliers successfully processed');
      return {
        status: 'error',
        saved: 0,
        errors: suppliers.length,
        duration: Date.now() - startTime,
        message: 'Failed to extract contacts from suppliers',
      };
    }

    // Save to Supabase
    log('[INFO] Saving to Supabase...');

    let saved = enriched.length;
    let saveErrors = 0;

    if (!isMock) {
      // Real Supabase save
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        log('[ERROR] Supabase credentials not configured');
        return {
          status: 'error',
          saved: 0,
          errors: enriched.length,
          duration: Date.now() - startTime,
          message: 'Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.',
        };
      }

      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const result = await saveSuppliers(supabase, enriched, service, region);
        saved = result.saved;
        saveErrors = result.errors;
      } catch (error) {
        log(`[ERROR] Supabase save failed: ${error.message}`);
        return {
          status: 'error',
          saved: 0,
          errors: enriched.length,
          duration: Date.now() - startTime,
          message: `Supabase save failed: ${error.message}`,
        };
      }
    }

    const totalErrors = extractionErrors + saveErrors;
    log(`[INFO] Saved ${saved} suppliers to Supabase`);
    log(`[INFO] Completed in ${Date.now() - startTime}ms`);

    return {
      status: 'success',
      saved,
      errors: totalErrors,
      duration: Date.now() - startTime,
      message: `Successfully processed ${saved} suppliers`,
    };
  } catch (error) {
    log(`[ERROR] Scraper failed: ${error.message}`);
    return {
      status: 'error',
      saved: 0,
      errors: 1,
      duration: Date.now() - startTime,
      message: error.message,
    };
  }
}

/**
 * Main CLI entry point
 */
async function main() {
  const service = process.argv[2] || SERVICE;
  const region = process.argv[3] || REGION;
  const mockFlag = process.argv.includes('--mock');

  if (!service || !region) {
    console.log(`
Usage: node main.js <SERVICE> <REGION> [--mock]

Examples:
  node main.js "catering" "São Paulo"
  node main.js "electrician" "Brasília" --mock

Or set SERVICE and REGION in .env file.

Environment Variables:
  SERVICE: Service type to search
  REGION: Geographic region
  SUPABASE_URL: Supabase project URL
  SUPABASE_ANON_KEY: Supabase anon key
    `);
    process.exit(1);
  }

  try {
    const result = await runScraper(service, region, { mock: mockFlag });

    // Exit with proper code
    if (result.status === 'success') {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error('[ERROR]', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { runScraper, randomDelay };
