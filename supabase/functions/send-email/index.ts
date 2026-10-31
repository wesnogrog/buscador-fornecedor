/**
 * Supabase Edge Function for sending emails via Gmail API
 *
 * This function:
 * 1. Retrieves the user's encrypted Gmail credentials from Supabase
 * 2. Decrypts the credentials using the Supabase secret key
 * 3. Uses the refresh token to obtain a fresh access token
 * 4. Calls the Gmail API to send the email
 * 5. Returns the result to the client
 *
 * Only the user who authenticated can send emails from their account.
 * The function is protected by Supabase Auth.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

import { decryptCredential } from './crypto.ts';

// Gmail API constants
const GMAIL_API_BASE = 'https://www.googleapis.com/gmail/v1/users/me';
const GOOGLE_OAUTH_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
  encoded: string; // base64url encoded RFC 2822 message
  supplierId: string;
  pedidoId: string;
  pedidoFornecedorId?: string;
}

interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  threadId?: string;
  error?: string;
}


/**
 * Get a fresh access token using the refresh token
 */
async function getAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const response = await fetch(GOOGLE_OAUTH_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Failed to refresh token: ${error.error_description || error.error}`
    );
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Send email via Gmail API
 */
async function sendViaGmailAPI(
  accessToken: string,
  encoded: string
): Promise<{ messageId: string; threadId: string }> {
  const response = await fetch(`${GMAIL_API_BASE}/messages/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: encoded,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Gmail API error: ${error.error?.message || JSON.stringify(error)}`
    );
  }

  const data = await response.json();
  return {
    messageId: data.id,
    threadId: data.threadId || '',
  };
}

serve(async (req) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const payload: SendEmailRequest = await req.json();

    if (!payload.to || !payload.subject || !payload.body || !payload.encoded) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role key (server-side only)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user info from auth header
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User authentication failed' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Retrieve encrypted Gmail credentials for this user
    const { data: credentialRecord, error: credentialError } = await supabase
      .from('credenciais_gmail')
      .select('credencial_criptografada')
      .eq('usuario_id', user.id)
      .single();

    if (credentialError || !credentialRecord) {
      return new Response(
        JSON.stringify({
          error: 'No Gmail credentials configured. Please complete OAuth setup.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get encryption key from Supabase secrets
    const encryptionKey = Deno.env.get('GMAIL_ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('Missing GMAIL_ENCRYPTION_KEY in secrets');
    }

    // Decrypt the credentials
    const decrypted = await decryptCredential(
      credentialRecord.credencial_criptografada as Uint8Array | string,
      encryptionKey
    );

    // Get Google OAuth client ID and secret
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!googleClientId || !googleClientSecret) {
      throw new Error('Missing Google OAuth configuration');
    }

    // Get fresh access token
    const accessToken = await getAccessToken(
      decrypted.refresh_token,
      googleClientId,
      googleClientSecret
    );

    // Send email via Gmail API
    const { messageId, threadId } = await sendViaGmailAPI(
      accessToken,
      payload.encoded
    );

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        messageId,
        threadId,
      } as SendEmailResponse),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error('Send email error:', errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      } as SendEmailResponse),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
