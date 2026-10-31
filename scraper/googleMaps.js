/**
 * Google Maps Supplier Search Module
 * Searches Google Maps for suppliers matching a service and region
 * Opens each place to read name, address, phone and website
 */

import { randomDelay } from './main.js';

const LOAD_TIMEOUT_MS = 30000;
const PLACE_TIMEOUT_MS = 15000;
const MAX_SCROLLS = 8;

/**
 * Keeps only public HTTP(S) addresses, so a listing cannot send the scraper to this PC or its network
 * @param {string} url - Website address from the listing
 * @returns {string|undefined} - The address, or undefined if it is not public
 */
function toPublicWebsite(url) {
  try {
    const parsed = new URL(url);
    // Maps can wrap the real address in a redirect
    const target = parsed.hostname.endsWith('google.com') && parsed.searchParams.get('q')
      ? new URL(parsed.searchParams.get('q'))
      : parsed;
    const isPrivate = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/i.test(target.hostname);
    return ['http:', 'https:'].includes(target.protocol) && !isPrivate ? target.href : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Throws if Google refused the request
 * @param {Page} page - Puppeteer page
 */
async function assertNotBlocked(page) {
  const content = await page.content();
  if (page.url().includes('/sorry/') ||
      content.includes('We detected unusual activity') ||
      content.includes('detectamos tráfego incomum')) {
    throw new Error('Google has detected unusual activity and blocked the request (429).');
  }
}

/**
 * Accepts the cookie screen Google shows in some regions
 * @param {Page} page - Puppeteer page
 */
async function dismissConsent(page) {
  if (!page.url().includes('consent.google')) return;
  const button = await page.$('form[action*="consent"] button');
  if (button) {
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), button.click()]);
  }
}

/**
 * Reads one place from its Google Maps page
 * @param {Page} page - Puppeteer page already on the place
 * @returns {Promise<object|null>} - RawSupplier or null without a name
 */
async function readPlace(page) {
  const place = await page.evaluate(() => {
    const heading = [...document.querySelectorAll('h1')].find((el) => el.textContent.trim());
    const address = document.querySelector('button[data-item-id="address"]');
    const phone = document.querySelector('button[data-item-id^="phone:tel:"]');
    const website = document.querySelector('a[data-item-id="authority"]');
    return {
      name: heading?.textContent.trim() || '',
      address: address?.getAttribute('aria-label')?.replace(/^[^:]*:\s*/, '').trim() || '',
      phone: phone?.getAttribute('data-item-id').replace('phone:tel:', '') || undefined,
      website: website?.getAttribute('href') || undefined,
    };
  });

  if (!place.name) return null;
  return { ...place, website: place.website ? toPublicWebsite(place.website) : undefined };
}

/**
 * Search Google Maps for suppliers
 * @param {Browser} browser - Puppeteer browser instance
 * @param {string} service - Service type (e.g., "plumber", "catering")
 * @param {string} region - Geographic region (e.g., "São Paulo", "Campinas")
 * @param {number} maxResults - Maximum suppliers to read
 * @returns {Promise<Array>} Array of RawSupplier objects {name, address, phone?, website?}
 * @throws {Error} If Google blocks the request (403, 429) or other critical errors
 */
async function searchSuppliers(browser, service, region, maxResults = parseInt(process.env.MAX_RESULTS || '20', 10)) {
  const page = await browser.newPage();
  const suppliers = [];

  try {
    page.on('error', (err) => {
      console.error('[ERROR] Page error:', err.message);
    });

    const searchQuery = `${service} em ${region}`;
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}?hl=pt-BR`;

    console.log(`[INFO] Navigating to Google Maps: ${mapsUrl}`);
    await page.goto(mapsUrl, { waitUntil: 'domcontentloaded', timeout: LOAD_TIMEOUT_MS });
    await dismissConsent(page);
    await assertNotBlocked(page);

    // A search shows a list; a search with one match goes straight to the place
    await page.waitForSelector('[role="feed"], button[data-item-id="address"]', { timeout: LOAD_TIMEOUT_MS });

    if (!(await page.$('[role="feed"]'))) {
      const place = await readPlace(page);
      return place ? [place] : [];
    }

    // The list only loads more results as it scrolls
    const listLinks = () => page.$$eval('[role="feed"] a[href*="/maps/place/"]', (links) =>
      [...new Set(links.map((link) => link.href))]
    );

    let links = await listLinks();
    for (let scroll = 0; scroll < MAX_SCROLLS && links.length < maxResults; scroll++) {
      await page.evaluate(() => {
        const feed = document.querySelector('[role="feed"]');
        feed.scrollTop = feed.scrollHeight;
      });
      await randomDelay();
      const loaded = await listLinks();
      if (loaded.length === links.length) break;
      links = loaded;
    }
    links = links.slice(0, maxResults);
    console.log(`[INFO] Found ${links.length} places in the list`);

    for (const link of links) {
      await randomDelay();
      try {
        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: LOAD_TIMEOUT_MS });
        await assertNotBlocked(page);
        await page.waitForSelector('button[data-item-id="address"], a[data-item-id="authority"], button[data-item-id^="phone:tel:"]', { timeout: PLACE_TIMEOUT_MS });
        const place = await readPlace(page);
        if (place) {
          suppliers.push(place);
          console.log(`[INFO] ${suppliers.length}/${links.length}: ${place.name}`);
        }
      } catch (err) {
        if (err.message.includes('blocked')) throw err;
        console.warn(`[WARN] Failed to read a place: ${err.message}`);
      }
    }

    console.log(`[INFO] Extracted total ${suppliers.length} suppliers`);
    return suppliers;
  } catch (error) {
    if (error.message.includes('blocked') || error.message.includes('429') || error.message.includes('403')) {
      throw error; // Re-throw blocking errors
    }
    console.error('[ERROR] Error during supplier search:', error.message);
    throw error;
  } finally {
    await page.close();
  }
}

export { searchSuppliers, toPublicWebsite };
