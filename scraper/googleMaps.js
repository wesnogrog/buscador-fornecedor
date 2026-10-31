/**
 * Google Maps Supplier Search Module
 * Searches Google Maps for suppliers matching a service and region
 * Extracts up to 60 results with name, address, phone, website
 */

import { randomDelay } from './main.js';

/**
 * Search Google Maps for suppliers
 * @param {Browser} browser - Puppeteer browser instance
 * @param {string} service - Service type (e.g., "plumber", "catering")
 * @param {string} region - Geographic region (e.g., "São Paulo", "Campinas")
 * @returns {Promise<Array>} Array of RawSupplier objects {name, address, phone?, website?}
 * @throws {Error} If Google blocks the request (403, 429) or other critical errors
 */
async function searchSuppliers(browser, service, region) {
  const page = await browser.newPage();
  const suppliers = [];
  let currentPage = 1;
  const maxPages = 3; // ~20 results per page, 3 pages = ~60 results

  try {
    // Set up error handling for network issues
    page.on('error', (err) => {
      console.error('[ERROR] Page error:', err.message);
    });

    // Navigate to Google Maps search
    const searchQuery = `${service} in ${region}`;
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;

    console.log(`[INFO] Navigating to Google Maps: ${mapsUrl}`);

    try {
      await page.goto(mapsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    } catch (err) {
      if (err.message.includes('ERR_BLOCKED_BY_ADMIN') ||
          err.message.includes('ERR_BLOCKED_BY_CLIENT') ||
          err.message.includes('net::ERR_BLOCKED_BY_RESPONSE')) {
        throw new Error('Google has blocked this IP. Please try again later or use a proxy.');
      }
      throw err;
    }

    // Check for blocking (Google shows specific error messages)
    const pageContent = await page.content();
    if (pageContent.includes('We detected unusual activity') ||
        pageContent.includes('Please try again later')) {
      throw new Error('Google has detected unusual activity and blocked the request (429).');
    }

    // Extract supplier listings from current page
    const extractSuppliers = async () => {
      return await page.evaluate(() => {
        const results = [];
        // Google Maps supplier listings have specific selectors
        const listings = document.querySelectorAll('[data-item-id]');

        listings.forEach((listing) => {
          try {
            // Name is usually in the first text element
            const nameEl = listing.querySelector('h3, [role="heading"]');
            const name = nameEl ? nameEl.textContent.trim() : '';

            // Address is typically in a subtitle or secondary element
            const addressEl = listing.querySelector('[aria-label*="address"], .directions, .address');
            const address = addressEl ? addressEl.textContent.trim() : '';

            // Phone and website may be in the listing or require clicking
            const phoneEl = listing.querySelector('[aria-label*="phone"], .phone');
            const phone = phoneEl ? phoneEl.textContent.trim() : undefined;

            const websiteEl = listing.querySelector('[aria-label*="website"], a[href*="http"]');
            const website = websiteEl ? websiteEl.getAttribute('href') : undefined;

            if (name && address) {
              results.push({
                name,
                address,
                phone: phone || undefined,
                website: website || undefined,
              });
            }
          } catch (e) {
            // Skip this listing on extraction error
            console.warn('[WARN] Failed to extract listing:', e.message);
          }
        });

        return results;
      });
    };

    // Attempt to extract suppliers from first page
    let pageSuppliers = await extractSuppliers();
    suppliers.push(...pageSuppliers);
    console.log(`[INFO] Page ${currentPage}: Extracted ${pageSuppliers.length} suppliers`);

    // Try to load more pages (click "Load more" or scroll)
    currentPage++;
    while (currentPage <= maxPages && suppliers.length < 60) {
      try {
        // Try to find and click the "Load more" button
        const loadMoreButton = await page.$('[aria-label="Load more results"]');

        if (loadMoreButton) {
          console.log(`[INFO] Clicking "Load more" for page ${currentPage}...`);
          await loadMoreButton.click();
          // Wait for new results to load
          await randomDelay();
        } else {
          // Alternative: scroll to load more
          console.log(`[INFO] Scrolling to load more results...`);
          await page.evaluate(() => {
            const resultsContainer = document.querySelector('[role="region"]');
            if (resultsContainer) {
              resultsContainer.scrollTop = resultsContainer.scrollHeight;
            }
          });
          await randomDelay();
        }

        // Extract suppliers from this page
        pageSuppliers = await extractSuppliers();
        const newSuppliers = pageSuppliers.filter(
          (supplier) => !suppliers.some((s) => s.name === supplier.name && s.address === supplier.address)
        );
        suppliers.push(...newSuppliers);
        console.log(`[INFO] Page ${currentPage}: Extracted ${newSuppliers.length} new suppliers (total: ${suppliers.length})`);

        currentPage++;
      } catch (err) {
        console.warn(`[WARN] Failed to load page ${currentPage}:`, err.message);
        break;
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

export { searchSuppliers };
