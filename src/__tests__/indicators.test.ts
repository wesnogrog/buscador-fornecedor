/**
 * Tests for contactIndicators() function
 * Determines contact indicator type for a supplier
 */

import { contactIndicators } from '../utils/indicators';
import type { Fornecedor } from '../utils/types';

describe('contactIndicators', () => {
  // Helper to create test suppliers
  const createSupplier = (overrides: Partial<Fornecedor> = {}): Fornecedor => ({
    id: 'test-id',
    nome: 'Test Supplier',
    dominio: 'test.com',
    endereco: 'Test Address',
    servicos: ['test'],
    regiao: 'Test Region',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    data_extracao: new Date().toISOString(),
    ...overrides,
  });

  test('returns email_and_whatsapp when email and whatsapp_link present', () => {
    const supplier = createSupplier({
      email: 'contact@test.com',
      whatsapp_link: 'https://wa.me/5511999887766',
    });

    const result = contactIndicators(supplier);
    expect(result).toBe('email_and_whatsapp');
  });

  test('returns email_only when only email present', () => {
    const supplier = createSupplier({
      email: 'contact@test.com',
    });

    const result = contactIndicators(supplier);
    expect(result).toBe('email_only');
  });

  test('returns whatsapp_site when only whatsapp_link present', () => {
    const supplier = createSupplier({
      whatsapp_link: 'https://wa.me/5511999887766',
    });

    const result = contactIndicators(supplier);
    expect(result).toBe('whatsapp_site');
  });

  test('returns whatsapp_probable when only whatsapp_numero present', () => {
    const supplier = createSupplier({
      whatsapp_numero: '5511999887766',
    });

    const result = contactIndicators(supplier);
    expect(result).toBe('whatsapp_probable');
  });

  test('returns phone_only when only phone present (no email/whatsapp)', () => {
    const supplier = createSupplier({
      email: null,
      whatsapp_link: null,
      whatsapp_numero: null,
    });

    const result = contactIndicators(supplier);
    expect(result).toBe('phone_only');
  });

  test('prefers whatsapp_link over whatsapp_numero when both present', () => {
    const supplier = createSupplier({
      whatsapp_link: 'https://wa.me/5511999887766',
      whatsapp_numero: '5511999887766',
    });

    const result = contactIndicators(supplier);
    expect(result).toBe('whatsapp_site');
  });

  test('handles all missing contact info gracefully', () => {
    const supplier = createSupplier({
      email: null,
      whatsapp_link: null,
      whatsapp_numero: null,
    });

    const result = contactIndicators(supplier);
    expect(result).toBe('phone_only');
  });

  test('ignores null/undefined values correctly', () => {
    const supplier = createSupplier({
      email: undefined,
      whatsapp_link: null,
    });

    const result = contactIndicators(supplier);
    expect(result).toBe('phone_only');
  });

  test('trims whitespace from contact fields', () => {
    const supplier = createSupplier({
      email: '  contact@test.com  ',
      whatsapp_link: null,
    });

    // Should recognize email despite whitespace
    const result = contactIndicators(supplier);
    expect(result).toBe('email_only');
  });

  test('returns correct type for email + whatsapp_numero (no link)', () => {
    const supplier = createSupplier({
      email: 'contact@test.com',
      whatsapp_link: null,
      whatsapp_numero: '5511999887766',
    });

    const result = contactIndicators(supplier);
    // Email + whatsapp_numero should be email + whatsapp_probable
    expect(result).toBe('email_and_whatsapp');
  });
});
