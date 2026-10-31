/**
 * Supabase Client Module
 * Handles saving supplier data to Supabase
 */

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
  let totalSaved = 0;
  let totalErrors = 0;

  // Process suppliers in batches
  for (let i = 0; i < suppliers.length; i += BATCH_SIZE) {
    const batch = suppliers.slice(i, i + BATCH_SIZE);

    // Transform suppliers to match database schema
    const transformed = batch.map(supplier => ({
      nome: supplier.name || 'Unknown',
      endereco: supplier.address || '',
      servicos: [service], // Array with search service
      regiao: region,
      email: supplier.email || null,
      whatsapp_link: supplier.whatsapp_link || null,
      whatsapp_numero: supplier.whatsapp_numero || null,
      website: supplier.website || null,
      telefone: supplier.phone || null,
      data_extracao: new Date().toISOString(),
    }));

    try {
      const { data, error } = await supabase
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

export { saveSuppliers };
