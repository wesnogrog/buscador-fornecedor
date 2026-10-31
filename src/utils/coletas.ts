/**
 * Collections of new suppliers requested on the site and run on GitHub Actions
 */

import { supabase } from '@/utils/supabase';

export type ColetaStatus = 'pendente' | 'rodando' | 'concluida' | 'falhou';

export interface Coleta {
  id: string;
  servico: string;
  regiao: string;
  status: ColetaStatus;
  encontrados: number | null;
  erro: string | null;
  updated_at: string;
}

// Slightly above the 25 minutes the workflow is allowed to run
const STALE_AFTER_MS = 30 * 60 * 1000;

/**
 * Asks for a collection. The function checks the domain and the daily limit,
 * and returns the one already running when the same search was requested.
 */
export async function pedirColeta(servico: string, regiao: string): Promise<Coleta> {
  const { data, error } = await supabase.functions.invoke('request-collection', {
    body: { servico, regiao },
  });

  if (error) {
    // The reason the function gave is in the response body
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error(body?.error ?? 'Não foi possível pedir a coleta.');
  }

  return data.coleta as Coleta;
}

export async function carregarColeta(id: string): Promise<Coleta> {
  const { data, error } = await supabase.from('coletas').select('*').eq('id', id).single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Coleta;
}

/**
 * A run that died never updates its status, so the wait must end by itself
 */
export function coletaTravada(coleta: Coleta, now = Date.now()): boolean {
  return (
    (coleta.status === 'pendente' || coleta.status === 'rodando') &&
    now - new Date(coleta.updated_at).getTime() > STALE_AFTER_MS
  );
}
