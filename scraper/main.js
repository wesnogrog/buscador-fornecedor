/**
 * Buscador de Fornecedor - Google Maps Scraper
 *
 * Scrapes Google Maps for suppliers (e.g., plumbers, electricians) in a given region
 * Extracts: name, domain, email, WhatsApp, phone, address
 * Stores results in Supabase
 *
 * Requirements: Puppeteer for headless browser automation
 * Includes: 2-5 second delays between requests to avoid IP blocking
 */

import 'dotenv/config';
import puppeteer from 'puppeteer';

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SERVICE,
  REGION,
  HEADLESS = true,
  MAX_RETRIES = 3,
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
 * Main scraper function
 * @param {string} service - Business type to search (e.g., "plumber")
 * @param {string} region - Geographic region (e.g., "São Paulo")
 */
async function scrapeGoogleMaps(service, region) {
  let browser;
  try {
    // Validate inputs
    if (!service || !region) {
      throw new Error('SERVICE and REGION environment variables are required');
    }

    console.log(`[INFO] Starting scraper for "${service}" in "${region}"`);
    console.log(`[INFO] Supabase URL: ${SUPABASE_URL || 'Not configured'}`);

    // Launch browser
    browser = await puppeteer.launch({
      headless: HEADLESS === 'true',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    console.log('[INFO] Browser launched');

    // TODO: Implement scraping logic
    // 1. Navigate to Google Maps search
    // 2. Extract supplier listings
    // 3. Visit each listing to extract email, WhatsApp, phone
    // 4. Apply delays between requests
    // 5. Handle pagination
    // 6. Insert results to Supabase

    console.log('[PLACEHOLDER] Scraping logic not yet implemented');
    console.log('[INFO] Ready for Task 2: Database schema and Supabase integration');

  } catch (error) {
    console.error('[ERROR]', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
      console.log('[INFO] Browser closed');
    }
  }
}

// Main entry point
async function main() {
  const service = process.argv[2] || SERVICE;
  const region = process.argv[3] || REGION;

  if (!service || !region) {
    console.log(`
Usage: node main.js [SERVICE] [REGION]

Examples:
  node main.js "plumber" "São Paulo"
  node main.js "electrician" "Brasília"

Or set SERVICE and REGION in .env file.
    `);
    process.exit(1);
  }

  await scrapeGoogleMaps(service, region);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { scrapeGoogleMaps, randomDelay };
