/**
 * Gmail API integration for sending emails
 * Uses Supabase Edge Functions to handle OAuth and API calls
 * Client-side only creates the message and invokes the function
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Email message structure
 */
export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  headers?: Record<string, string>;
  encoded?: string;
}

/**
 * Validate email address format
 * Simple validation - more thorough validation happens server-side
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Create an email message object ready to send
 * Converts to RFC 2822 format and base64url encodes it
 */
export function createEmailMessage(input: {
  to: string;
  subject: string;
  body: string;
}): EmailMessage {
  // Validate inputs
  if (!validateEmail(input.to)) {
    throw new Error(`Invalid email address: ${input.to}`);
  }

  if (!input.subject || input.subject.trim().length === 0) {
    throw new Error('Subject cannot be empty');
  }

  if (!input.body || input.body.trim().length === 0) {
    throw new Error('Body cannot be empty');
  }

  // Create RFC 2822 format email
  const headers = {
    to: input.to,
    subject: input.subject,
  };

  // Create message in RFC 2822 format
  const headerString = Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\r\n');

  const rawMessage = `${headerString}\r\n\r\n${input.body}`;

  // Encode to base64url for Gmail API
  const encoded = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return {
    to: input.to,
    subject: input.subject,
    body: input.body,
    headers,
    encoded,
  };
}

/**
 * Send email via Gmail API through Supabase Edge Function
 * The Edge Function handles OAuth credential retrieval and Gmail API calls
 */
export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
  supplierId: string;
  pedidoId: string;
  pedidoFornecedorId?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  threadId?: string;
  error?: string;
}

export async function sendEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  // Verify authentication
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(userError?.message || 'User not authenticated');
  }

  // Validate email
  if (!validateEmail(input.to)) {
    throw new Error(`Invalid recipient email: ${input.to}`);
  }

  // Create message
  const message = createEmailMessage({
    to: input.to,
    subject: input.subject,
    body: input.body,
  });

  try {
    // Invoke the Edge Function to send via Gmail API
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: message.to,
        subject: message.subject,
        body: message.body,
        encoded: message.encoded,
        supplierId: input.supplierId,
        pedidoId: input.pedidoId,
        pedidoFornecedorId: input.pedidoFornecedorId,
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Unknown error during send',
      };
    }

    if (data?.error) {
      return {
        success: false,
        error: data.error.message || 'Gmail API error',
      };
    }

    return {
      success: data?.success || false,
      messageId: data?.messageId,
      threadId: data?.threadId,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Failed to send email: ${errorMessage}`);
  }
}

/**
 * Batch send emails to multiple suppliers
 * Sends sequentially with error handling for each individual email
 */
export interface BatchEmailInput {
  to: string;
  subject: string;
  body: string;
  supplierId: string;
  pedidoId: string;
  pedidoFornecedorId?: string;
}

export async function sendBatchEmails(
  emails: BatchEmailInput[]
): Promise<SendEmailResult[]> {
  const results: SendEmailResult[] = [];

  for (const email of emails) {
    try {
      const result = await sendEmail(email);
      results.push(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      results.push({
        success: false,
        error: errorMessage,
      });
    }
  }

  return results;
}
