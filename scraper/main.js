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
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

// Import modules from completed tasks
import { searchSuppliers } from './googleMaps.js';
import { extractContacts } from './extractor.js';
import { validateEmail, classifyPhone } from './validator.js';
import { saveSuppliers } from './supabaseClient.js';

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  SERVICE,
  REGION,
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
  // Logs on GitHub are public, so contact details stay out of them there
  const logContact = options.hideContacts ? () => {} : log;

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

    log('[INFO] Searching Google Maps...');

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
          // Uses the Chrome already installed on the PC
          channel: 'chrome',
          headless: HEADLESS === 'true' ? 'new' : false,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
          ],
        });

        suppliers = await searchSuppliers(browser, service, region);
        log(`[INFO] Found ${suppliers.length} suppliers`);
      } catch (error) {
        if (browser) {
          await browser.close();
        }
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
      }
    }

    if (suppliers.length === 0) {
      if (browser) {
        await browser.close();
      }
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

    try {
      for (const supplier of suppliers) {
        try {
          let html;

          if (isMock) {
            // Use mock HTML for testing
            html = getMockHtml(supplier.name);
          } else {
            // Fetch HTML from supplier website using browser
            if (!supplier.website) {
              log(`[WARN] No website URL for ${supplier.name}, skipping contact extraction`);
            } else {
              try {
                const page = await browser.newPage();
                try {
                  // Fetch with 10 second timeout. Many sites never go network idle
                  await page.goto(supplier.website, { waitUntil: 'domcontentloaded', timeout: 10000 });
                  html = await page.content();

                  // Reads at most three pages per site: the home page and two contact pages
                  const contactLinks = await page.$$eval('a[href]', (links) => [...new Set(
                    links
                      .filter((link) => /contat|fale|contact/i.test(`${link.textContent} ${link.href}`)
                        && link.hostname === location.hostname
                        && /^https?:$/.test(link.protocol))
                      .map((link) => link.href.split('#')[0])
                  )].filter((href) => href !== location.href).slice(0, 2));

                  for (const contactLink of contactLinks) {
                    try {
                      await page.goto(contactLink, { waitUntil: 'domcontentloaded', timeout: 10000 });
                      html += await page.content();
                    } catch (contactError) {
                      log(`[WARN] Failed to fetch contact page for ${supplier.name}: ${contactError.message}`);
                    }
                  }
                } finally {
                  await page.close();
                }
              } catch (fetchError) {
                // Handle fetch failures gracefully, keeping the phone from Google Maps
                log(`[WARN] Failed to fetch website for ${supplier.name}: ${fetchError.message}`);
              }
            }
          }

          // Extract contacts from HTML
          const contacts = await extractContacts(html);

          // Merge supplier with extracted contacts
          const enrichedSupplier = { ...supplier, ...contacts };

          // Invalid emails are discarded, so the app never offers them
          if (enrichedSupplier.email) {
            const isValid = await validateEmail(enrichedSupplier.email);
            logContact(`[INFO] Email ${enrichedSupplier.email}: ${isValid ? 'valid' : 'invalid'}`);
            if (!isValid) {
              delete enrichedSupplier.email;
            }
          }

          // Only a mobile number can be a probable WhatsApp, so a landline gets no WhatsApp button
          const mobile = [enrichedSupplier.whatsapp_numero, enrichedSupplier.phone]
            .map(classifyPhone)
            .find((phoneClass) => phoneClass.type === 'celular');
          if (mobile) {
            enrichedSupplier.whatsapp_numero = mobile.number;
          } else {
            delete enrichedSupplier.whatsapp_numero;
          }
          logContact(`[INFO] Extracted contacts: ${enrichedSupplier.name}, email=${enrichedSupplier.email || 'N/A'}, whatsapp=${enrichedSupplier.whatsapp_numero || enrichedSupplier.whatsapp_link || 'N/A'}`);

          enriched.push(enrichedSupplier);
        } catch (error) {
          // Log error but continue processing other suppliers
          log(`[WARN] Failed to process ${supplier.name}: ${error.message}`);
          extractionErrors++;
        }
      }
    } finally {
      // Close browser after enrichment is complete
      if (browser && !isMock) {
        await browser.close();
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

    if (options.dryRun) {
      log('[INFO] Dry run: nothing was saved');
      return {
        status: 'success',
        saved: 0,
        errors: extractionErrors,
        duration: Date.now() - startTime,
        message: `Found ${enriched.length} suppliers`,
      };
    }

    // Save to Supabase
    log('[INFO] Saving to Supabase...');

    let saved = enriched.length;
    let saveErrors = 0;

    if (!isMock) {
      // Real Supabase save. Only the secret key can write suppliers, which RLS closes to everyone else
      if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        log('[ERROR] Supabase credentials not configured');
        return {
          status: 'error',
          saved: 0,
          errors: enriched.length,
          duration: Date.now() - startTime,
          message: 'Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.',
        };
      }

      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
          auth: { persistSession: false },
        });
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
      status: saved === 0 && saveErrors > 0 ? 'error' : 'success',
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
  const args = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
  const service = args[0] || SERVICE;
  const region = args[1] || REGION;
  const mockFlag = process.argv.includes('--mock');
  const dryRun = process.argv.includes('--dry-run');

  if (!service || !region) {
    console.log(`
Usage: node main.js <SERVICE> <REGION> [--mock] [--dry-run]

Examples:
  node main.js "catering" "São Paulo"
  node main.js "electrician" "Brasília" --mock
  node main.js "catering" "São Paulo" --dry-run   (searches without saving)

Or set SERVICE and REGION in .env file.

Environment Variables:
  SERVICE: Service type to search
  REGION: Geographic region
  SUPABASE_URL: Supabase project URL
  SUPABASE_SERVICE_KEY: Supabase secret key. Keep it only in the .env file of this PC
  MAX_RESULTS: Maximum suppliers per search (default: 20)
    `);
    process.exit(1);
  }

  try {
    const result = await runScraper(service, region, { mock: mockFlag, dryRun });

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
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(console.error);
}

export { runScraper, randomDelay };
