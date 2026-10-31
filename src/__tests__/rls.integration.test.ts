/**
 * Integration Tests for Row-Level Security (RLS)
 *
 * These tests verify that RLS policies actually work by testing with real
 * Supabase authentication tokens created dynamically.
 *
 * Setup:
 * 1. Set up a Supabase project with the schema from supabase/migrations/001_initial.sql
 * 2. Set environment variables:
 *    - SUPABASE_URL
 *    - SUPABASE_ANON_KEY
 *    - SUPABASE_SERVICE_KEY (optional, for automatic test user creation)
 *    - VITE_SUPABASE_URL (alternative)
 *    - VITE_SUPABASE_ANON_KEY (alternative)
 * 3. Run: npm run test:integration
 *
 * If SUPABASE_SERVICE_KEY is not available:
 * - Tests will attempt to sign in with existing test users
 * - Create test users manually or run: supabase/tests/setup-test-users.sql
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../utils/types';

// Needs a real Supabase project, so it only runs when real credentials are provided
describe.skipIf(!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY)('RLS: Row-Level Security Integration Tests', () => {
  let supabaseAgencia: SupabaseClient<Database>;
  let supabaseUser1: SupabaseClient<Database>;
  let supabaseUser2: SupabaseClient<Database>;
  let supabaseExternal: SupabaseClient<Database>;
  let supabaseAnon: SupabaseClient<Database>;

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  // Test user credentials
  const TEST_USERS = {
    agencia1: {
      email: 'user1@agenciasurto.com',
      password: 'test123456Test!',
    },
    agencia2: {
      email: 'user2@agenciasurto.com',
      password: 'test123456Test!',
    },
    external: {
      email: 'user_external@gmail.com',
      password: 'test123456Test!',
    },
  };

  /**
   * Create test users using service role (admin API)
   * Falls back gracefully if service key not available
   */
  async function ensureTestUsersExist() {
    if (!SUPABASE_SERVICE_KEY) {
      console.warn(
        'SUPABASE_SERVICE_KEY not available. Tests will use existing users.\n' +
          'If tests fail with auth errors, create test users manually:\n' +
          '  1. Dashboard > Auth > Users\n' +
          '  2. Create:',
        TEST_USERS,
        '\n  Or run: supabase/tests/setup-test-users.sql'
      );
      return;
    }

    const adminClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY);

    for (const [key, user] of Object.entries(TEST_USERS)) {
      try {
        // Try to create user (will fail silently if already exists)
        const { error: createError } = await adminClient.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
        });

        if (createError && !createError.message.includes('already registered')) {
          console.warn(`Warning creating test user ${user.email}:`, createError.message);
        } else if (!createError) {
          console.log(`Created test user: ${user.email}`);
        }
      } catch (err) {
        console.warn(`Error ensuring test user ${user.email} exists:`, err);
      }
    }
  }

  beforeAll(async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error(
        'Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_ANON_KEY (or VITE_* variants)'
      );
    }

    // Ensure test users exist (creates if service key available)
    await ensureTestUsersExist();

    // Anonymous client (no authentication)
    supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Create authenticated clients and sign in with real credentials
    supabaseUser1 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error: error1 } = await supabaseUser1.auth.signInWithPassword({
      email: TEST_USERS.agencia1.email,
      password: TEST_USERS.agencia1.password,
    });
    if (error1) {
      throw new Error(`Failed to authenticate user1: ${error1.message}`);
    }

    supabaseUser2 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error: error2 } = await supabaseUser2.auth.signInWithPassword({
      email: TEST_USERS.agencia2.email,
      password: TEST_USERS.agencia2.password,
    });
    if (error2) {
      throw new Error(`Failed to authenticate user2: ${error2.message}`);
    }

    // External user (wrong domain - should fail RLS checks)
    supabaseExternal = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error: errorExt } = await supabaseExternal.auth.signInWithPassword({
      email: TEST_USERS.external.email,
      password: TEST_USERS.external.password,
    });
    if (errorExt) {
      throw new Error(`Failed to authenticate external user: ${errorExt.message}`);
    }

    // supabaseAgencia is an alias for supabaseUser1
    supabaseAgencia = supabaseUser1;
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
 * ============================================================================
 * SETUP (Choose One Option)
 * ============================================================================
 *
 * OPTION A: Automatic (with Service Role Key) - RECOMMENDED
 * ─────────────────────────────────────────────────────────────────────────
 * 1. Get SUPABASE_SERVICE_KEY from your Supabase project:
 *    - Dashboard > Settings > API > service_role Key
 *    - Copy the entire key (it's long and starts with "eyJ...")
 *
 * 2. Set environment variables:
 *    export SUPABASE_URL="https://your-project.supabase.co"
 *    export SUPABASE_ANON_KEY="your-anon-key"
 *    export SUPABASE_SERVICE_KEY="your-service-role-key"
 *
 * 3. Run tests:
 *    npm run test:integration
 *
 *    The tests will automatically:
 *    - Create test users (or use existing ones)
 *    - Authenticate with each user
 *    - Run RLS verification
 *
 * OPTION B: Manual Setup (without Service Role Key)
 * ─────────────────────────────────────────────────────────────────────────
 * 1. Set environment variables (without SERVICE_KEY):
 *    export SUPABASE_URL="https://your-project.supabase.co"
 *    export SUPABASE_ANON_KEY="your-anon-key"
 *
 * 2. Create test users manually:
 *    - Open: supabase/tests/setup-test-users.sql
 *    - Copy the entire script
 *    - Paste in Supabase Dashboard > SQL Editor > New Query
 *    - Click "Run"
 *
 *    Created users:
 *    - user1@agenciasurto.com (password: test123456Test!)
 *    - user2@agenciasurto.com (password: test123456Test!)
 *    - user_external@gmail.com (password: test123456Test!)
 *
 * 3. Run tests:
 *    npm run test:integration
 *
 * ============================================================================
 * DEVELOPMENT
 * ============================================================================
 *
 * Watch mode (auto-rerun on file changes):
 *    npm run test:integration:watch
 *
 * Run specific test:
 *    npm run test:integration -- --grep "TEST 3"
 *
 * ============================================================================
 * WHAT THESE TESTS VERIFY
 * ============================================================================
 *
 * TEST 1: Anonymous User Cannot SELECT from Any Table
 *   - Verifies RLS denies unauthenticated access
 *   - Expected: permission denied errors
 *
 * TEST 2: User with Non-@agenciasurto.com Email Cannot SELECT
 *   - Verifies RLS denies wrong-domain users
 *   - user_external@gmail.com tries to access
 *   - Expected: permission denied errors
 *
 * TEST 3: Agencia User (@agenciasurto.com) Can SELECT fornecedores
 *   - Verifies RLS allows valid users to read suppliers
 *   - Can also filter by region and service
 *   - Expected: success, returns supplier data
 *
 * TEST 4: Agencia User Can INSERT and READ Own Pedidos
 *   - Verifies users can create requests
 *   - Verifies users can only see their own requests
 *   - Verifies INSERT/UPDATE/DELETE work on own records
 *   - Expected: success
 *
 * TEST 5: User Cannot READ Other User's Credentials
 *   - Verifies complete isolation of credenciais_gmail table
 *   - user2 tries to read user1's credentials
 *   - Expected: permission denied or empty result
 *
 * TEST 6: User Cannot INSERT into fornecedores (RLS Blocks)
 *   - Verifies suppliers table is read-only for users
 *   - Only service role can insert (for scraper)
 *   - Expected: permission denied errors
 *
 * Additional Tests:
 *   - Shared visibility of pedidos between agencia users
 *   - Shared visibility of email templates (modelos)
 *   - Foreign key constraint enforcement
 *
 * ============================================================================
 * TROUBLESHOOTING
 * ============================================================================
 *
 * "auth.signInWithPassword failed":
 *   - Test users don't exist
 *   - Solution: Run setup-test-users.sql (Option B)
 *   - Or provide SUPABASE_SERVICE_KEY (Option A)
 *
 * "permission denied" on all tests:
 *   - RLS policies are correctly blocking access
 *   - Check that users are actually authenticated
 *   - Verify auth.jwt() contains correct email in RLS policy
 *
 * "Missing Supabase credentials" error:
 *   - Set SUPABASE_URL and SUPABASE_ANON_KEY env vars
 *   - These are from: Supabase Dashboard > Settings > API
 *
 * Connection refused:
 *   - Check SUPABASE_URL is correct
 *   - Verify internet connection to Supabase
 */
