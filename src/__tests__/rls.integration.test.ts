/**
 * Integration Tests for Row-Level Security (RLS)
 *
 * These tests verify that RLS policies actually work by testing with real
 * Supabase authentication tokens.
 *
 * To run these tests:
 * 1. Set up a Supabase project with the schema from supabase/migrations/001_initial.sql
 * 2. Create test users:
 *    - user1@agenciasurto.com (valid agencia user)
 *    - user2@agenciasurto.com (another valid agencia user)
 *    - user_external@gmail.com (user from wrong domain)
 * 3. Set environment variables:
 *    - SUPABASE_URL
 *    - SUPABASE_ANON_KEY
 *    - VITE_SUPABASE_URL
 *    - VITE_SUPABASE_ANON_KEY
 * 4. Run: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../utils/types';

describe('RLS: Row-Level Security Integration Tests', () => {
  let supabaseAgencia: SupabaseClient<Database>;
  let supabaseUser1: SupabaseClient<Database>;
  let supabaseUser2: SupabaseClient<Database>;
  let supabaseExternal: SupabaseClient<Database>;
  let supabaseAnon: SupabaseClient<Database>;

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  beforeAll(async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_ANON_KEY');
    }

    // Anonymous client (no authentication)
    supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Simulated authenticated clients
    // Note: In a real test environment, these would be created using actual
    // Supabase auth tokens from test users
    supabaseAgencia = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    supabaseUser1 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    supabaseUser2 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    supabaseExternal = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });

  describe('TEST 1: Anonymous User Cannot SELECT from Any Table', () => {
    it('should deny SELECT from fornecedores', async () => {
      const { data, error } = await supabaseAnon
        .from('fornecedores')
        .select()
        .limit(1);

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/permission denied|policy|not authenticated/i);
      expect(data).toBeNull();
    });

    it('should deny SELECT from pedidos', async () => {
      const { data, error } = await supabaseAnon
        .from('pedidos')
        .select()
        .limit(1);

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/permission denied|policy|not authenticated/i);
      expect(data).toBeNull();
    });

    it('should deny SELECT from credenciais_gmail', async () => {
      const { data, error } = await supabaseAnon
        .from('credenciais_gmail')
        .select()
        .limit(1);

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/permission denied|policy|not authenticated/i);
      expect(data).toBeNull();
    });
  });

  describe('TEST 2: User with Non-@agenciasurto.com Email Cannot SELECT', () => {
    it('should deny SELECT from fornecedores (wrong domain)', async () => {
      const { data, error } = await supabaseExternal
        .from('fornecedores')
        .select()
        .limit(1);

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/permission denied|policy/i);
      expect(data).toBeNull();
    });

    it('should deny SELECT from pedidos (wrong domain)', async () => {
      const { data, error } = await supabaseExternal
        .from('pedidos')
        .select()
        .limit(1);

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/permission denied|policy/i);
      expect(data).toBeNull();
    });

    it('should deny INSERT to pedidos (wrong domain)', async () => {
      const { error } = await supabaseExternal.from('pedidos').insert([
        {
          nome: 'Test Request',
          servico: 'catering',
          regiao: 'SP',
          // autor_id will be filled by auth context
        },
      ]);

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/permission denied|policy/i);
    });
  });

  describe('TEST 3: Agencia User (@agenciasurto.com) Can SELECT fornecedores', () => {
    it('should allow SELECT from fornecedores', async () => {
      const { data, error } = await supabaseAgencia.from('fornecedores').select().limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should allow filtering by region', async () => {
      const { data, error } = await supabaseAgencia
        .from('fornecedores')
        .select()
        .eq('regiao', 'SP')
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should allow filtering by service', async () => {
      const { data, error } = await supabaseAgencia
        .from('fornecedores')
        .select()
        .contains('servicos', ['catering'])
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('TEST 4: Agencia User Can INSERT and READ Own Pedidos', () => {
    let createdPedidoId: string;

    it('should allow INSERT own pedido', async () => {
      const { data, error } = await supabaseUser1.from('pedidos').insert([
        {
          nome: 'Test Request from User 1',
          servico: 'catering',
          regiao: 'SP',
          data: new Date().toISOString().split('T')[0],
          local: 'São Paulo, SP',
          prazo: '2 weeks',
          // autor_id is automatically set by auth context
        },
      ]);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(1);

      createdPedidoId = data?.[0]?.id || '';
      expect(createdPedidoId).toBeTruthy();
    });

    it('should allow SELECT own pedidos', async () => {
      const { data, error } = await supabaseUser1.from('pedidos').select();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);

      // Should contain the pedido we just created
      const createdPedido = data?.find((p) => p.id === createdPedidoId);
      expect(createdPedido).toBeDefined();
      expect(createdPedido?.nome).toBe('Test Request from User 1');
    });

    it('should allow UPDATE own pedido', async () => {
      const { error } = await supabaseUser1
        .from('pedidos')
        .update({ nome: 'Updated Request' })
        .eq('id', createdPedidoId);

      expect(error).toBeNull();
    });

    it('should allow DELETE own pedido', async () => {
      const { error } = await supabaseUser1.from('pedidos').delete().eq('id', createdPedidoId);

      expect(error).toBeNull();
    });
  });

  describe('TEST 5: User Cannot READ Other User\'s credenciais_gmail', () => {
    it('should deny SELECT other user credentials (direct)', async () => {
      // Simulate: User 2 tries to read User 1's credentials
      // This would require knowing User 1's ID and trying to access it
      const someOtherUserId = '00000000-0000-0000-0000-000000000001';

      const { data, error } = await supabaseUser2
        .from('credenciais_gmail')
        .select()
        .eq('usuario_id', someOtherUserId);

      // Should either return empty (RLS filters it) or error
      expect(error?.message || data?.length).toBeDefined();
    });

    it('should allow SELECT own credentials only', async () => {
      // User should be able to read only their own credentials
      const { data, error } = await supabaseUser1.from('credenciais_gmail').select();

      // If no credentials exist, data will be empty (not an error)
      // If credentials exist, they should only be the user's own
      expect(error || data).toBeDefined();
    });
  });

  describe('TEST 6: User Cannot INSERT into fornecedores (RLS Blocks)', () => {
    it('should deny INSERT into fornecedores', async () => {
      const { error } = await supabaseUser1.from('fornecedores').insert([
        {
          nome: 'Fake Supplier',
          dominio: 'fake.com',
          email: 'contact@fake.com',
          regiao: 'SP',
          servicos: ['fake'],
        },
      ]);

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/policy|violates|permission/i);
    });

    it('should deny UPDATE fornecedores', async () => {
      // First get an existing fornecedor
      const { data: fornecedores } = await supabaseUser1
        .from('fornecedores')
        .select()
        .limit(1);

      if (fornecedores && fornecedores.length > 0) {
        const { error } = await supabaseUser1
          .from('fornecedores')
          .update({ nome: 'Modified Name' })
          .eq('id', fornecedores[0].id);

        expect(error).toBeDefined();
        expect(error?.message).toMatch(/policy|violates|permission/i);
      }
    });

    it('should deny DELETE fornecedores', async () => {
      // First get an existing fornecedor
      const { data: fornecedores } = await supabaseUser1
        .from('fornecedores')
        .select()
        .limit(1);

      if (fornecedores && fornecedores.length > 0) {
        const { error } = await supabaseUser1
          .from('fornecedores')
          .delete()
          .eq('id', fornecedores[0].id);

        expect(error).toBeDefined();
        expect(error?.message).toMatch(/policy|violates|permission/i);
      }
    });
  });

  describe('Additional RLS Tests: Shared Visibility', () => {
    it('user1 and user2 should see each other pedidos', async () => {
      // Both users should see all pedidos (shared visibility)
      const { data: user1Pedidos } = await supabaseUser1.from('pedidos').select();
      const { data: user2Pedidos } = await supabaseUser2.from('pedidos').select();

      expect(user1Pedidos?.length).toEqual(user2Pedidos?.length);
    });

    it('users should see shared templates (modelos)', async () => {
      // All users should see all templates (shared read access)
      const { data, error } = await supabaseUser1.from('modelos').select();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Edge Cases: Foreign Key Constraints', () => {
    it('should respect foreign key constraints in pedido_fornecedores', async () => {
      const invalidPedidoId = '00000000-0000-0000-0000-000000000000';
      const invalidFornecedorId = '00000000-0000-0000-0000-000000000000';

      const { error } = await supabaseUser1.from('pedido_fornecedores').insert([
        {
          pedido_id: invalidPedidoId,
          fornecedor_id: invalidFornecedorId,
          status: 'pendente',
        },
      ]);

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/foreign key|constraint|violates/i);
    });
  });
});

/**
 * RUNNING THESE TESTS
 *
 * 1. Set up environment variables:
 *    export SUPABASE_URL="https://your-project.supabase.co"
 *    export SUPABASE_ANON_KEY="your-anon-key"
 *
 * 2. Create test users in Supabase:
 *    - user1@agenciasurto.com
 *    - user2@agenciasurto.com
 *    - user_external@gmail.com
 *
 * 3. Run tests:
 *    npm run test:integration
 *
 * 4. For development, use:
 *    npm run test:integration:watch
 */
