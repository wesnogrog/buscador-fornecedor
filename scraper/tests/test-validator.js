/**
 * Tests for email validation and phone classification
 * Validates MX records and classifies Brazilian phone numbers
 */

import assert from 'assert';
import { validateEmail, classifyPhone } from '../validator.js';

describe('validateEmail', () => {
  it('validates email with MX record (google.com)', async () => {
    const result = await validateEmail('user@google.com');
    assert.strictEqual(result, true, 'google.com should have valid MX records');
  });

  it('rejects email with no MX record (invalid domain)', async () => {
    const result = await validateEmail('user@domain.invalid');
    assert.strictEqual(result, false, 'domain.invalid should have no MX records');
  });

  it('handles timeout gracefully (slow domain)', async () => {
    const result = await validateEmail('user@very-slow-domain.invalid');
    assert.strictEqual(result, false, 'timeout should return false, not error');
  });

  it('validates email with MX record (microsoft.com)', async () => {
    const result = await validateEmail('test@microsoft.com');
    assert.strictEqual(result, true, 'microsoft.com should have valid MX records');
  });

  it('handles malformed email gracefully', async () => {
    const result = await validateEmail('notanemail');
    assert.strictEqual(result, false, 'malformed email should return false');
  });

  it('rejects email with no @ symbol', async () => {
    const result = await validateEmail('usergmail.com');
    assert.strictEqual(result, false, 'email without @ should return false');
  });

  it('validates email with MX record (amazon.com)', async () => {
    const result = await validateEmail('support@amazon.com');
    assert.strictEqual(result, true, 'amazon.com should have valid MX records');
  });
});

describe('classifyPhone with the long-distance zero', () => {
  it('recognizes a mobile as Google Maps gives it', () => {
    assert.deepStrictEqual(classifyPhone('019999953561'), { type: 'celular', number: '5519999953561' });
  });

  it('recognizes a landline as Google Maps gives it', () => {
    assert.deepStrictEqual(classifyPhone('01932137952'), { type: 'fixo', number: '551932137952' });
  });

  it('keeps 0800 numbers out of the mobile and landline types', () => {
    assert.strictEqual(classifyPhone('08001234567').type, 'outro');
  });
});

describe('classifyPhone', () => {
  it('classifies Brazilian mobile (11-digit, 9th digit is 9)', () => {
    const result = classifyPhone('11999887766');
    assert.strictEqual(result.type, 'celular', 'Should classify as celular');
    assert.strictEqual(result.number, '5511999887766', 'Should normalize with country code');
  });

  it('classifies Brazilian fixed line (10-digit)', () => {
    const result = classifyPhone('1133334444');
    assert.strictEqual(result.type, 'fixo', 'Should classify as fixo');
    assert.strictEqual(result.number, '551133334444', 'Should normalize with country code');
  });

  it('rejects invalid format (letters)', () => {
    const result = classifyPhone('abc');
    assert.strictEqual(result.type, 'outro', 'Should classify as outro');
    assert.strictEqual(result.number, undefined, 'Should not have number field');
  });

  it('handles country code prefix (+55)', () => {
    const result = classifyPhone('+5511999887766');
    assert.strictEqual(result.type, 'celular', 'Should classify as celular');
    assert.strictEqual(result.number, '5511999887766', 'Should remove duplicated country code');
  });

  it('handles formatted mobile with spaces and dashes', () => {
    const result = classifyPhone('(11) 99988-7766');
    assert.strictEqual(result.type, 'celular', 'Should extract digits and classify as celular');
    assert.strictEqual(result.number, '5511999887766', 'Should normalize');
  });

  it('handles formatted landline with parentheses', () => {
    const result = classifyPhone('(11) 3333-4444');
    assert.strictEqual(result.type, 'fixo', 'Should extract digits and classify as fixo');
    assert.strictEqual(result.number, '551133334444', 'Should normalize');
  });

  it('rejects empty string', () => {
    const result = classifyPhone('');
    assert.strictEqual(result.type, 'outro', 'Should classify as outro');
    assert.strictEqual(result.number, undefined, 'Should not have number field');
  });

  it('rejects phone with only 9 digits', () => {
    const result = classifyPhone('119998877');
    assert.strictEqual(result.type, 'outro', 'Should classify as outro');
    assert.strictEqual(result.number, undefined, 'Should not have number field');
  });

  it('classifies mobile with 55 country code prefix', () => {
    const result = classifyPhone('5511999887766');
    assert.strictEqual(result.type, 'celular', 'Should classify as celular');
    assert.strictEqual(result.number, '5511999887766', 'Should normalize correctly');
  });

  it('classifies landline with 55 country code prefix', () => {
    const result = classifyPhone('551133334444');
    assert.strictEqual(result.type, 'fixo', 'Should classify as fixo');
    assert.strictEqual(result.number, '551133334444', 'Should normalize correctly');
  });

  it('handles phone with leading zeros after country code (invalid format)', () => {
    const result = classifyPhone('550119998877');
    assert.strictEqual(result.type, 'outro', 'Should classify as outro');
    assert.strictEqual(result.number, undefined, 'Should not have number field');
  });

  it('rejects phone with 9th digit not being 9 in 11-digit format', () => {
    const result = classifyPhone('11899887766');
    assert.strictEqual(result.type, 'outro', 'Should classify as outro (11-digit but 9th digit is not 9)');
    assert.strictEqual(result.number, undefined, 'Should not have number field');
  });

  it('classifies valid mobile with WhatsApp link format', () => {
    const result = classifyPhone('11 99988-7766');
    assert.strictEqual(result.type, 'celular', 'Should classify as celular');
    assert.strictEqual(result.number, '5511999887766', 'Should normalize');
  });
});
