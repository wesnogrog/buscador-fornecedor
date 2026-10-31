/**
 * Tests for AES-GCM credential decryption used by the send-email Edge Function
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  decryptCredential,
  encryptCredential,
  toBytes,
  toPostgresHex,
} from '../../supabase/functions/send-email/crypto';

const KEY = 'test-encryption-key';
const CREDENTIAL = {
  refresh_token: 'refresh-abc',
  client_id: 'client-id-123',
  client_secret: 'client-secret-xyz',
};

async function encrypt(payload: unknown, keyString = KEY): Promise<Uint8Array> {
  const subtle = globalThis.crypto.subtle;
  const material = await subtle.digest('SHA-256', new TextEncoder().encode(keyString));
  const key = await subtle.importKey('raw', material, { name: 'AES-GCM' }, false, ['encrypt']);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(payload)))
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return out;
}

describe('decryptCredential', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('decrypts valid AES-GCM data into a credential object', async () => {
    const encrypted = await encrypt(CREDENTIAL);
    await expect(decryptCredential(encrypted, KEY)).resolves.toEqual(CREDENTIAL);
  });

  it('accepts PostgREST hex-encoded bytea strings', async () => {
    const encrypted = await encrypt(CREDENTIAL);
    const hex = '\\x' + Array.from(encrypted, (b) => b.toString(16).padStart(2, '0')).join('');
    expect(toBytes(hex)).toEqual(encrypted);
    await expect(decryptCredential(hex, KEY)).resolves.toEqual(CREDENTIAL);
  });

  it('rejects when the key is wrong', async () => {
    const encrypted = await encrypt(CREDENTIAL);
    await expect(decryptCredential(encrypted, 'wrong-key')).rejects.toThrow(/Failed to decrypt/);
  });

  it('rejects when the key is empty', async () => {
    const encrypted = await encrypt(CREDENTIAL);
    await expect(decryptCredential(encrypted, '')).rejects.toThrow(/Missing encryption key/);
  });

  it('rejects corrupted ciphertext (tampered byte)', async () => {
    const encrypted = await encrypt(CREDENTIAL);
    encrypted[encrypted.length - 1] ^= 0xff;
    await expect(decryptCredential(encrypted, KEY)).rejects.toThrow(/Failed to decrypt/);
  });

  it('rejects data shorter than IV + tag', async () => {
    await expect(decryptCredential(new Uint8Array(10), KEY)).rejects.toThrow(/too short/);
  });

  it('rejects invalid input format', async () => {
    await expect(decryptCredential('not-bytes', KEY)).rejects.toThrow(/Invalid encrypted credential/);
  });

  it('rejects decrypted payload with missing fields', async () => {
    const encrypted = await encrypt({ refresh_token: 'only-this' });
    await expect(decryptCredential(encrypted, KEY)).rejects.toThrow(/missing required fields/);
  });

  it('rejects decrypted payload that is not JSON', async () => {
    const encrypted = await encrypt('placeholder');
    // Re-encrypt raw non-JSON text
    const subtle = globalThis.crypto.subtle;
    const material = await subtle.digest('SHA-256', new TextEncoder().encode(KEY));
    const key = await subtle.importKey('raw', material, { name: 'AES-GCM' }, false, ['encrypt']);
    const iv = new Uint8Array(12);
    const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode('not json')));
    const data = new Uint8Array(12 + ct.length);
    data.set(iv, 0);
    data.set(ct, 12);
    expect(encrypted.length).toBeGreaterThan(0);
    await expect(decryptCredential(data, KEY)).rejects.toThrow(/not valid JSON/);
  });

  it('uses a fresh IV per encryption but decrypts both to the same credential', async () => {
    const a = await encrypt(CREDENTIAL);
    const b = await encrypt(CREDENTIAL);
    expect(a.slice(0, 12)).not.toEqual(b.slice(0, 12));
    expect(await decryptCredential(a, KEY)).toEqual(await decryptCredential(b, KEY));
  });
});

describe('Edge Function credential flow (decrypt -> OAuth refresh)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function refresh(encrypted: Uint8Array, timeoutMs: number) {
    const cred = await decryptCredential(encrypted, KEY);
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: cred.client_id,
        client_secret: cred.client_secret,
        refresh_token: cred.refresh_token,
        grant_type: 'refresh_token',
      }).toString(),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return (await res.json()).access_token as string;
  }

  it('passes decrypted credentials to the OAuth token endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ access_token: 'tok' }) });
    vi.stubGlobal('fetch', fetchMock);

    const token = await refresh(await encrypt(CREDENTIAL), 1000);

    expect(token).toBe('tok');
    const body = new URLSearchParams(fetchMock.mock.calls[0][1].body);
    expect(body.get('refresh_token')).toBe('refresh-abc');
    expect(body.get('client_id')).toBe('client-id-123');
    expect(body.get('grant_type')).toBe('refresh_token');
  });

  it('surfaces an OAuth refresh timeout', async () => {
    const fetchMock = vi.fn().mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(init.signal.reason));
        })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(refresh(await encrypt(CREDENTIAL), 20)).rejects.toBeTruthy();
  });

  it('never calls OAuth when decryption fails', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const encrypted = await encrypt(CREDENTIAL, 'other-key');
    await expect(refresh(encrypted, 1000)).rejects.toThrow(/Failed to decrypt/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('encryptCredential', () => {
  const credential = { refresh_token: 'token', client_id: 'id', client_secret: 'secret' };

  it('round-trips through the hex format stored in BYTEA columns', async () => {
    const encrypted = await encryptCredential(credential, 'chave');
    await expect(decryptCredential(toPostgresHex(encrypted), 'chave')).resolves.toEqual(credential);
  });

  it('does not decrypt with another key', async () => {
    const encrypted = await encryptCredential(credential, 'chave');
    await expect(decryptCredential(encrypted, 'outra')).rejects.toThrow('Failed to decrypt');
  });
});
