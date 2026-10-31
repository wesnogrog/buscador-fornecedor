/**
 * AES-GCM credential decryption (Web Crypto API; works in Deno and Node 18+).
 *
 * Stored format: [12-byte IV][ciphertext + 16-byte GCM tag]
 * Key: AES-256 key derived as SHA-256(encryptionKey string).
 * Plaintext: JSON { refresh_token, client_id, client_secret }
 */

export interface DecryptedCredential {
  refresh_token: string;
  client_id: string;
  client_secret: string;
}

const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * PostgREST returns BYTEA columns as hex strings ("\\x...") rather than bytes.
 * Accept either form.
 */
export function toBytes(data: Uint8Array | string): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (typeof data === 'string' && /^\\x([0-9a-fA-F]{2})+$/.test(data)) {
    const hex = data.slice(2);
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return out;
  }
  throw new Error('Invalid encrypted credential format');
}

export async function decryptCredential(
  encryptedData: Uint8Array | string,
  encryptionKey: string
): Promise<DecryptedCredential> {
  const bytes = toBytes(encryptedData);
  if (!encryptionKey) {
    throw new Error('Missing encryption key');
  }
  if (bytes.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Encrypted credential is too short');
  }

  const subtle = globalThis.crypto.subtle;
  const keyMaterial = await subtle.digest(
    'SHA-256',
    new TextEncoder().encode(encryptionKey)
  );
  const key = await subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const iv = bytes.slice(0, IV_LENGTH);
  const ciphertext = bytes.slice(IV_LENGTH);

  let plaintext: ArrayBuffer;
  try {
    plaintext = await subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  } catch {
    throw new Error('Failed to decrypt credential (wrong key or corrupted data)');
  }

  let parsed: Partial<DecryptedCredential>;
  try {
    parsed = JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    throw new Error('Decrypted credential is not valid JSON');
  }

  if (!parsed.refresh_token || !parsed.client_id || !parsed.client_secret) {
    throw new Error('Decrypted credential is missing required fields');
  }
  return {
    refresh_token: parsed.refresh_token,
    client_id: parsed.client_id,
    client_secret: parsed.client_secret,
  };
}
