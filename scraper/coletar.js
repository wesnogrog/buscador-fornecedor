/**
 * Runs the collections requested on the site, oldest first, until none is left.
 * Used by the GitHub Actions workflow. Requires SUPABASE_URL and SUPABASE_SERVICE_KEY.
 */

import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { runScraper } from './main.js';

const MESSAGE_BLOCKED = 'O Google bloqueou a coleta por enquanto. Tente novamente em algumas horas.';
const MESSAGE_FAILED = 'A coleta falhou. Tente novamente mais tarde.';

/**
 * Updates a collection, stopping on failure so the same one is not picked up forever
 */
async function updateColeta(supabase, id, fields) {
  const { error } = await supabase
    .from('coletas')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    throw new Error(`Failed to update collection: ${error.message}`);
  }
}

/**
 * @param {object} supabase - Client with the secret key
 * @param {function} scrape - Same contract as runScraper
 * @returns {Promise<{processed: number, blocked: boolean}>}
 */
async function processarColetas(supabase, scrape = runScraper) {
  let processed = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('coletas')
      .select('id, servico, regiao')
      .eq('status', 'pendente')
      .order('created_at', { ascending: true })
      .limit(1);
    if (error) {
      throw new Error(`Failed to read collections: ${error.message}`);
    }
    if (!data || data.length === 0) {
      return { processed, blocked: false };
    }

    const coleta = data[0];
    await updateColeta(supabase, coleta.id, { status: 'rodando' });

    const result = await scrape(coleta.servico, coleta.regiao, { hideContacts: true });
    processed++;

    if (result.status === 'blocked') {
      await updateColeta(supabase, coleta.id, { status: 'falhou', erro: MESSAGE_BLOCKED });
      // The next ones would be blocked too, and insisting makes it worse
      const { error: pendingError } = await supabase
        .from('coletas')
        .update({ status: 'falhou', erro: MESSAGE_BLOCKED, updated_at: new Date().toISOString() })
        .eq('status', 'pendente');
      if (pendingError) {
        throw new Error(`Failed to update collections: ${pendingError.message}`);
      }
      return { processed, blocked: true };
    }

    if (result.status === 'success') {
      await updateColeta(supabase, coleta.id, { status: 'concluida', encontrados: result.saved });
    } else {
      console.error(`[ERROR] Collection failed: ${result.message}`);
      await updateColeta(supabase, coleta.id, { status: 'falhou', erro: MESSAGE_FAILED });
    }
  }
}

async function main() {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY.');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
  const { processed, blocked } = await processarColetas(supabase);
  console.log(`[INFO] Processed ${processed} collections`);
  process.exit(blocked ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('[ERROR]', error.message);
    process.exit(1);
  });
}

export { processarColetas };
