/**
 * Tests for sortSuppliers() function
 * Orders suppliers by contact indicator priority:
 * 1. email + whatsapp
 * 2. email only
 * 3. whatsapp (site)
 * 4. whatsapp (probable)
 * 5. phone only
 */

import { sortSuppliers } from '../utils/suppliers';
import type { Fornecedor } from '../utils/types';

describe('sortSuppliers', () => {
  // Helper to create test suppliers
  const createSupplier = (
    name: string,
    overrides: Partial<Fornecedor> = {}
  ): Fornecedor => ({
    id: `id-${name}`,
    nome: name,
    dominio: `${name}.com`,
    endereco: `Address of ${name}`,
    servicos: ['test'],
    regiao: 'Test Region',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    data_extracao: new Date().toISOString(),
    ...overrides,
  });

  test('sorts by priority: email+whatsapp first', () => {
    const suppliers = [
      createSupplier('phone-only', {}),
      createSupplier('email-whatsapp', {
        email: 'contact@test.com',
        whatsapp_link: 'https://wa.me/5511999887766',
      }),
      createSupplier('email-only', { email: 'contact@test.com' }),
    ];

    const sorted = sortSuppliers(suppliers);

    expect(sorted[0].nome).toBe('email-whatsapp');
    expect(sorted[1].nome).toBe('email-only');
    expect(sorted[2].nome).toBe('phone-only');
  });

  test('sorts by priority: email only before whatsapp', () => {
    const suppliers = [
      createSupplier('whatsapp-site', {
        whatsapp_link: 'https://wa.me/5511999887766',
      }),
      createSupplier('email-only', { email: 'contact@test.com' }),
    ];

    const sorted = sortSuppliers(suppliers);

    expect(sorted[0].nome).toBe('email-only');
    expect(sorted[1].nome).toBe('whatsapp-site');
  });

  test('sorts by priority: whatsapp site before whatsapp probable', () => {
    const suppliers = [
      createSupplier('whatsapp-probable', { whatsapp_numero: '5511999887766' }),
      createSupplier('whatsapp-site', {
        whatsapp_link: 'https://wa.me/5511999887766',
      }),
    ];

    const sorted = sortSuppliers(suppliers);

    expect(sorted[0].nome).toBe('whatsapp-site');
    expect(sorted[1].nome).toBe('whatsapp-probable');
  });

  test('sorts by priority: full order', () => {
    const suppliers = [
      createSupplier('phone-only', {}),
      createSupplier('email-whatsapp', {
        email: 'contact@test.com',
        whatsapp_link: 'https://wa.me/5511999887766',
      }),
      createSupplier('whatsapp-probable', { whatsapp_numero: '5511999887766' }),
      createSupplier('email-only', { email: 'contact@test.com' }),
      createSupplier('whatsapp-site', {
        whatsapp_link: 'https://wa.me/5511999887766',
      }),
    ];

    const sorted = sortSuppliers(suppliers);

    const order = sorted.map((s) => s.nome);
    expect(order).toEqual([
      'email-whatsapp',
      'email-only',
      'whatsapp-site',
      'whatsapp-probable',
      'phone-only',
    ]);
  });

  test('maintains relative order for same priority', () => {
    const suppliers = [
      createSupplier('email-a', { email: 'contact-a@test.com' }),
      createSupplier('email-b', { email: 'contact-b@test.com' }),
    ];

    const sorted = sortSuppliers(suppliers);

    expect(sorted[0].nome).toBe('email-a');
    expect(sorted[1].nome).toBe('email-b');
  });

  test('handles empty array', () => {
    const sorted = sortSuppliers([]);
    expect(sorted).toEqual([]);
  });

  test('handles single supplier', () => {
    const supplier = createSupplier('single', {
      email: 'contact@test.com',
    });

    const sorted = sortSuppliers([supplier]);
    expect(sorted).toEqual([supplier]);
  });

  test('handles suppliers with null values correctly', () => {
    const suppliers = [
      createSupplier('supplier-1', {
        email: null,
        whatsapp_link: null,
        whatsapp_numero: null,
      }),
      createSupplier('supplier-2', {
        email: 'contact@test.com',
      }),
    ];

    const sorted = sortSuppliers(suppliers);

    expect(sorted[0].nome).toBe('supplier-2');
    expect(sorted[1].nome).toBe('supplier-1');
  });

  test('prioritizes whatsapp_link over whatsapp_numero', () => {
    const suppliers = [
      createSupplier('with-link', {
        email: 'contact@test.com',
        whatsapp_link: 'https://wa.me/5511999887766',
        whatsapp_numero: '5511999887766',
      }),
      createSupplier('with-numero', {
        email: 'contact@test.com',
        whatsapp_numero: '5511999887766',
      }),
    ];

    const sorted = sortSuppliers(suppliers);

    expect(sorted[0].nome).toBe('with-link');
    expect(sorted[1].nome).toBe('with-numero');
  });
});
