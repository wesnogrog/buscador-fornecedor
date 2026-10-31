import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

import { corsHeaders, isAgenciaEmail, jsonResponse } from '../_shared/http.ts';

const GITHUB_WORKFLOW_URL =
  'https://api.github.com/repos/wesnogrog/buscador-fornecedor/actions/workflows/scraper.yml/dispatches';
const MAX_TEXT_LENGTH = 80;
// Keeps the volume of searches on Google Maps low, to avoid blocks
const MAX_COLETAS_PER_DAY = 20;
const STALE_AFTER_MS = 30 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const UNIQUE_VIOLATION = '23505';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing or invalid authorization' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const githubToken = Deno.env.get('GITHUB_DISPATCH_TOKEN');
    if (!supabaseUrl || !serviceKey || !githubToken) {
      throw new Error('Missing server configuration');
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      return jsonResponse({ error: 'User authentication failed' }, 401);
    }
    if (!isAgenciaEmail(user.email)) {
      return jsonResponse({ error: 'Access restricted to @agenciasurto.com accounts' }, 403);
    }

    const body = await req.json();
    const servico = typeof body.servico === 'string' ? body.servico.trim() : '';
    const regiao = typeof body.regiao === 'string' ? body.regiao.trim() : '';
    if (!servico || !regiao) {
      return jsonResponse({ error: 'Informe o serviço e a região.' }, 400);
    }
    if (servico.length > MAX_TEXT_LENGTH || regiao.length > MAX_TEXT_LENGTH) {
      return jsonResponse({ error: 'Serviço ou região muito longos.' }, 400);
    }

    // A run that died must not block the same search forever
    const now = Date.now();
    const { error: staleError } = await supabase
      .from('coletas')
      .update({
        status: 'falhou',
        erro: 'A coleta demorou demais e foi cancelada.',
        updated_at: new Date(now).toISOString(),
      })
      .in('status', ['pendente', 'rodando'])
      .lt('updated_at', new Date(now - STALE_AFTER_MS).toISOString());
    if (staleError) {
      throw new Error(staleError.message);
    }

    const { count, error: countError } = await supabase
      .from('coletas')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(now - DAY_MS).toISOString());
    if (countError) {
      throw new Error(countError.message);
    }
    if ((count ?? 0) >= MAX_COLETAS_PER_DAY) {
      return jsonResponse(
        { error: `O limite de ${MAX_COLETAS_PER_DAY} coletas em 24 horas foi atingido. Tente novamente mais tarde.` },
        429
      );
    }

    const { data: coleta, error: insertError } = await supabase
      .from('coletas')
      .insert({ servico, regiao, criado_por: user.id })
      .select('*')
      .single();

    if (insertError) {
      if (insertError.code !== UNIQUE_VIOLATION) {
        throw new Error(insertError.message);
      }
      // Someone already asked for this search: follow that collection
      const { data: active, error: activeError } = await supabase
        .from('coletas')
        .select('*')
        .ilike('servico', servico.replace(/[\\%_]/g, '\\$&'))
        .ilike('regiao', regiao.replace(/[\\%_]/g, '\\$&'))
        .in('status', ['pendente', 'rodando'])
        .single();
      if (activeError) {
        throw new Error(activeError.message);
      }
      return jsonResponse({ coleta: active });
    }

    // The workflow reads what to do from the database, so no typed text reaches it
    const dispatch = await fetch(GITHUB_WORKFLOW_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${githubToken}`,
        'User-Agent': 'buscador-fornecedor',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ ref: 'main' }),
    });

    if (!dispatch.ok) {
      console.error('GitHub dispatch failed:', dispatch.status, await dispatch.text());
      await supabase
        .from('coletas')
        .update({
          status: 'falhou',
          erro: 'Não foi possível iniciar a coleta.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', coleta.id);
      return jsonResponse({ error: 'Não foi possível iniciar a coleta.' }, 502);
    }

    return jsonResponse({ coleta });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Request collection error:', message);
    return jsonResponse({ error: 'Não foi possível pedir a coleta.' }, 500);
  }
});
