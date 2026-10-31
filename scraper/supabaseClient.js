/**
 * Supabase Client Module
 * Handles saving supplier data to Supabase
 */

import { classifyPhone } from './validator.js';

/**
 * Gets the bare domain of a website, as the app shows and links it
 * @param {string} website - Website URL
 * @returns {string|null} - Domain without "www." or null
 */
function toDomain(website) {
  if (!website) return null;
  try {
    return new URL(website).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Saves suppliers to Supabase fornecedores table
 * Implements upsert logic to prevent duplicates
 * @param {object} supabase - Supabase client instance
 * @param {array} suppliers - Array of supplier objects (with enriched data)
 * @param {string} service - Service type (for categorization)
 * @param {string} region - Geographic region
 * @returns {Promise<object>} - {saved: number, errors: number}
 */
async function saveSuppliers(supabase, suppliers, service, region) {
  if (!supabase || !suppliers || !Array.isArray(suppliers)) {
    return { saved: 0, errors: 0 };
  }

  if (suppliers.length === 0) {
    return { saved: 0, errors: 0 };
  }

  const BATCH_SIZE = 10;
  // The app searches services in lowercase
  const normalizedService = service.trim().toLowerCase();
  const normalizedRegion = region.trim();
  let totalSaved = 0;
  let totalErrors = 0;

  // The same place can appear twice, and one upsert cannot touch a row twice
  const unique = [...new Map(
    suppliers.map(supplier => [`${supplier.name}|${supplier.address || ''}`, supplier])
  ).values()];

  // Process suppliers in batches
  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);

    try {
      // Keep the services a supplier already has when it is found by another search
      const { data: existing, error: readError } = await supabase
        .from('fornecedores')
        .select('nome, endereco, servicos')
        .eq('regiao', normalizedRegion)
        .in('nome', batch.map(supplier => supplier.name || 'Unknown'));

      if (readError) {
        console.error('[ERROR] Batch read failed:', readError.message);
        totalErrors += batch.length;
        continue;
      }

      // Transform suppliers to match database schema
      const transformed = batch.map(supplier => {
        const nome = supplier.name || 'Unknown';
        const endereco = supplier.address || '';
        const previous = (existing || []).find(row => row.nome === nome && row.endereco === endereco);
        return {
          nome,
          dominio: toDomain(supplier.website),
          endereco,
          servicos: [...new Set([...(previous?.servicos || []), normalizedService])],
          regiao: normalizedRegion,
          email: supplier.email || null,
          whatsapp_link: supplier.whatsapp_link || null,
          whatsapp_numero: supplier.whatsapp_numero || null,
          telefone: supplier.phone ? classifyPhone(supplier.phone).number || supplier.phone : null,
          data_extracao: new Date().toISOString(),
        };
      });

      const { error } = await supabase
        .from('fornecedores')
        .upsert(transformed, {
          onConflict: 'nome,regiao,endereco', // Composite unique key
        });

      if (error) {
        console.error('[ERROR] Batch save failed:', error.message);
        totalErrors += batch.length;
      } else {
        // Count actual rows saved/updated
        totalSaved += transformed.length;
      }
    } catch (error) {
      console.error('[ERROR] Batch processing failed:', error.message);
      totalErrors += batch.length;
    }
  }

  return {
    saved: totalSaved,
    errors: totalErrors,
  };
}

export { saveSuppliers, toDomain };
