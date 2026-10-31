import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Modelo } from './types';

export const MODELO_PADRAO = {
  nome: 'Pedido de orçamento',
  corpo: `Olá, {fornecedor}!

Somos da Agência Surtô e gostaríamos de um orçamento de {servico} para o evento {evento}.

Data: {data}
Local: {local}
Prazo para resposta: {prazo}

Atenciosamente,
Agência Surtô`,
};

// A new database has no templates, and the composer is unusable without one
export async function loadModelos(client: SupabaseClient<Database>): Promise<Modelo[]> {
  const { data, error } = await client.from('modelos').select('*').order('created_at');
  if (error) {
    throw new Error(error.message);
  }
  if (data && data.length > 0) {
    return data as Modelo[];
  }

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();
  if (userError || !user) {
    throw new Error(userError?.message || 'User not authenticated');
  }

  const { data: criado, error: insertError } = await client
    .from('modelos')
    .insert({ ...MODELO_PADRAO, criado_por: user.id })
    .select()
    .single();
  if (insertError) {
    throw new Error(insertError.message);
  }
  return [criado as Modelo];
}
