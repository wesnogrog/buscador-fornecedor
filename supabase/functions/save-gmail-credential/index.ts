import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

import { corsHeaders, isAgenciaEmail, jsonResponse } from '../_shared/http.ts';
import { encryptCredential, toPostgresHex } from '../send-email/crypto.ts';

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

    const { refresh_token: refreshToken } = await req.json();
    if (!refreshToken || typeof refreshToken !== 'string') {
      return jsonResponse({ error: 'Missing refresh_token' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const encryptionKey = Deno.env.get('GMAIL_ENCRYPTION_KEY');
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    if (!supabaseUrl || !serviceKey || !encryptionKey || !clientId || !clientSecret) {
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

    const encrypted = await encryptCredential(
      { refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret },
      encryptionKey
    );

    const { error } = await supabase.from('credenciais_gmail').upsert(
      { usuario_id: user.id, credencial_criptografada: toPostgresHex(encrypted) },
      { onConflict: 'usuario_id' }
    );
    if (error) {
      throw new Error(error.message);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Save credential error:', message);
    return jsonResponse({ error: message }, 500);
  }
});
