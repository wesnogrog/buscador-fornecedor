/**
 * Idempotency checking and recording for email sends
 * Prevents duplicate sends for the same (supplierId, pedidoId) pair
 */

import { createClient } from '@supabase/supabase-js';
import { Envio } from './types';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Idempotency key format: "{supplierId}_{pedidoId}"
 * This ensures each supplier can only be sent one message per request
 */
export function createIdempotencyKey(
  supplierId: string,
  pedidoId: string
): string {
  return `${supplierId}_${pedidoId}`;
}

/**
 * Check if email has already been sent to this supplier in this pedido
 * Returns true if send already recorded (should block new send)
 * Returns false if no previous send (safe to proceed)
 */
export async function checkIdempotency(
  supplierId: string,
  pedidoId: string
): Promise<boolean> {
  // Verify user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(userError?.message || 'User not authenticated');
  }

  const idempotencyKey = createIdempotencyKey(supplierId, pedidoId);

  // Only a successful send blocks: a failed attempt must stay retryable
  const { data, error } = await supabase
    .from('envios')
    .select('id, status, data_envio')
    .eq('chave_idempotencia', idempotencyKey)
    .eq('status', 'sucesso')
    .single();

  if (error) {
    // PGRST116 is "not found" - this is OK, means no previous send
    if (error.code === 'PGRST116') {
      return false;
    }
    throw new Error(error.message);
  }

  // If we got here, a record exists - prevent duplicate send
  return data !== null;
}

/**
 * Record send attempt in the envios table
 * Called after email is sent (successfully or not)
 */
export interface RecordSendInput {
  pedidoFornecedorId: string;
  supplierId: string;
  pedidoId: string;
  message: string;
  status: 'sucesso' | 'falhou' | 'pendente';
  errorMessage?: string;
  canal?: 'email' | 'whatsapp';
}

export async function recordSend(input: RecordSendInput): Promise<Envio> {
  // Verify user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(userError?.message || 'User not authenticated');
  }

  const canal = input.canal ?? 'email';
  const baseKey = createIdempotencyKey(input.supplierId, input.pedidoId);
  const channelKey = canal === 'email' ? baseKey : `${baseKey}_${canal}`;
  // The column is UNIQUE: failures get their own key so they stay in the history and allow a retry
  const idempotencyKey =
    input.status === 'falhou' ? `${channelKey}_falhou_${crypto.randomUUID()}` : channelKey;

  // Insert the envio record
  const { data, error } = await supabase
    .from('envios')
    .insert({
      pedido_fornecedor_id: input.pedidoFornecedorId,
      canal,
      status: input.status,
      mensagem: input.message,
      data_envio: new Date().toISOString(),
      erro: input.errorMessage || null,
      chave_idempotencia: idempotencyKey,
      criado_por: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Envio;
}

/**
 * Record a pending send attempt (used for async operations)
 * Useful for tracking sends that are in progress
 */
export async function recordPendingSend(
  input: Omit<RecordSendInput, 'status'>
): Promise<Envio> {
  return recordSend({
    ...input,
    status: 'pendente',
  });
}
