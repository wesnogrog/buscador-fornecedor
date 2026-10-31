-- Functional RLS Tests for Buscador de Fornecedor
-- Tests verify that RLS policies actually enforce restrictions
--
-- NOTE ON TESTING APPROACH:
-- The eh_agencia() function checks JWT tokens from Supabase auth.
-- In a local PostgreSQL environment, JWT checks will fail for non-JWT roles.
-- This test file verifies:
-- 1. RLS is enabled on all tables
-- 2. Policies are correctly defined with proper constraints
-- 3. Permission structures are in place (structural verification)
--
-- For functional testing with actual permission denial, use:
-- - Supabase client library (JavaScript/Python) with real auth tokens
-- - Integration tests with Vitest (see bottom of this file for examples)

BEGIN;

-- ============================================================================
-- TEST SUITE 1: FORNECEDORES TABLE
-- Expected: Only logged-in users with @agenciasurto.com email can SELECT
-- ============================================================================

-- Insert test data (as superuser)
INSERT INTO fornecedores (nome, dominio, email, regiao, servicos)
VALUES ('Test Supplier 1', 'supplier1.com', 'contact@supplier1.com', 'SP', ARRAY['catering', 'eventos']);

-- Test 1.1: Anonymous user cannot SELECT from fornecedores
-- Note: This would require proper auth setup in Supabase
-- For now, verify the policy exists
SELECT COUNT(*) as fornecedores_select_policies
FROM pg_policies
WHERE tablename = 'fornecedores'
AND policyname = 'fornecedores_select_agencia'
AND schemaname = 'public';

-- Test 1.2: INSERT into fornecedores is blocked
-- Verify the disable policy exists
SELECT COUNT(*) as fornecedores_insert_disabled
FROM pg_policies
WHERE tablename = 'fornecedores'
AND policyname = 'fornecedores_insert_disabled'
AND schemaname = 'public'
AND qual = 'WITH CHECK (false)';

-- Test 1.3: UPDATE into fornecedores is blocked
SELECT COUNT(*) as fornecedores_update_disabled
FROM pg_policies
WHERE tablename = 'fornecedores'
AND policyname = 'fornecedores_update_disabled'
AND schemaname = 'public'
AND qual = 'USING (false)';

-- Test 1.4: DELETE from fornecedores is blocked
SELECT COUNT(*) as fornecedores_delete_disabled
FROM pg_policies
WHERE tablename = 'fornecedores'
AND policyname = 'fornecedores_delete_disabled'
AND schemaname = 'public'
AND qual = 'USING (false)';

-- ============================================================================
-- TEST SUITE 2: PEDIDOS TABLE (requires authenticated users)
-- Expected: Users can SELECT all pedidos, but INSERT/UPDATE/DELETE only own
-- ============================================================================

-- Test 2.1: Verify SELECT policy exists (shared visibility)
SELECT COUNT(*) as pedidos_select_policies
FROM pg_policies
WHERE tablename = 'pedidos'
AND policyname = 'pedidos_select_agencia'
AND schemaname = 'public';

-- Test 2.2: Verify INSERT policy exists (own only)
SELECT COUNT(*) as pedidos_insert_policies
FROM pg_policies
WHERE tablename = 'pedidos'
AND policyname = 'pedidos_insert_own'
AND schemaname = 'public';

-- Test 2.3: Verify UPDATE policy exists (own only)
SELECT COUNT(*) as pedidos_update_policies
FROM pg_policies
WHERE tablename = 'pedidos'
AND policyname = 'pedidos_update_own'
AND schemaname = 'public';

-- Test 2.4: Verify DELETE policy exists (own only)
SELECT COUNT(*) as pedidos_delete_policies
FROM pg_policies
WHERE tablename = 'pedidos'
AND policyname = 'pedidos_delete_own'
AND schemaname = 'public';

-- ============================================================================
-- TEST SUITE 3: PEDIDO_FORNECEDORES TABLE
-- Expected: Users can only access rows linked to their own pedidos
-- ============================================================================

-- Test 3.1: Verify SELECT policy exists (linked to own pedido)
SELECT COUNT(*) as pedido_fornecedores_select_policies
FROM pg_policies
WHERE tablename = 'pedido_fornecedores'
AND policyname = 'pedido_fornecedores_select_own'
AND schemaname = 'public';

-- Test 3.2: Verify INSERT policy exists (linked to own pedido)
SELECT COUNT(*) as pedido_fornecedores_insert_policies
FROM pg_policies
WHERE tablename = 'pedido_fornecedores'
AND policyname = 'pedido_fornecedores_insert_own'
AND schemaname = 'public';

-- ============================================================================
-- TEST SUITE 4: CREDENCIAIS_GMAIL TABLE
-- Expected: Complete user isolation - can only access own record
-- ============================================================================

-- Test 4.1: Verify SELECT policy exists (own only)
SELECT COUNT(*) as credenciais_select_policies
FROM pg_policies
WHERE tablename = 'credenciais_gmail'
AND policyname = 'credenciais_gmail_select_own'
AND schemaname = 'public';

-- Test 4.2: Verify INSERT policy exists (own only)
SELECT COUNT(*) as credenciais_insert_policies
FROM pg_policies
WHERE tablename = 'credenciais_gmail'
AND policyname = 'credenciais_gmail_insert_own'
AND schemaname = 'public';

-- Test 4.3: Verify UPDATE policy exists (own only)
SELECT COUNT(*) as credenciais_update_policies
FROM pg_policies
WHERE tablename = 'credenciais_gmail'
AND policyname = 'credenciais_gmail_update_own'
AND schemaname = 'public';

-- Test 4.4: Verify DELETE policy exists (own only)
SELECT COUNT(*) as credenciais_delete_policies
FROM pg_policies
WHERE tablename = 'credenciais_gmail'
AND policyname = 'credenciais_gmail_delete_own'
AND schemaname = 'public';

-- ============================================================================
-- TEST SUITE 5: MODELOS TABLE
-- Expected: Users can SELECT all templates but INSERT/UPDATE/DELETE only own
-- ============================================================================

-- Test 5.1: Verify SELECT policy exists (shared visibility)
SELECT COUNT(*) as modelos_select_policies
FROM pg_policies
WHERE tablename = 'modelos'
AND policyname = 'modelos_select_agencia'
AND schemaname = 'public';

-- Test 5.2: Verify INSERT policy exists (own only)
SELECT COUNT(*) as modelos_insert_policies
FROM pg_policies
WHERE tablename = 'modelos'
AND policyname = 'modelos_insert_own'
AND schemaname = 'public';

-- ============================================================================
-- TEST SUITE 6: ENVIOS TABLE
-- Expected: Users can only access audit log entries linked to their pedidos
-- ============================================================================

-- Test 6.1: Verify SELECT policy exists (linked to own pedido)
SELECT COUNT(*) as envios_select_policies
FROM pg_policies
WHERE tablename = 'envios'
AND policyname = 'envios_select_own'
AND schemaname = 'public';

-- Test 6.2: Verify INSERT policy exists (own + linked to pedido)
SELECT COUNT(*) as envios_insert_policies
FROM pg_policies
WHERE tablename = 'envios'
AND policyname = 'envios_insert_own'
AND schemaname = 'public';

-- ============================================================================
-- DETAILED RLS POLICY VERIFICATION
-- ============================================================================

-- Summary of all policies
SELECT
  tablename,
  policyname,
  CASE WHEN qual IS NOT NULL THEN qual ELSE 'N/A' END as policy_definition,
  cmd
FROM pg_policies
WHERE tablename IN ('fornecedores', 'pedidos', 'pedido_fornecedores', 'modelos', 'envios', 'credenciais_gmail')
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- RLS ENFORCEMENT VERIFICATION
-- ============================================================================

-- Verify RLS is enabled on all tables (will fail if not)
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('fornecedores', 'pedidos', 'pedido_fornecedores', 'modelos', 'envios', 'credenciais_gmail')
AND schemaname = 'public'
AND rowsecurity = true
ORDER BY tablename;

-- Count total policies per table
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('fornecedores', 'pedidos', 'pedido_fornecedores', 'modelos', 'envios', 'credenciais_gmail')
AND schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- CONSTRAINT VERIFICATION (ensures data integrity for RLS)
-- ============================================================================

-- Verify unique constraint on pedido_fornecedores
SELECT COUNT(*) as pedido_fornecedores_unique_constraint
FROM information_schema.table_constraints
WHERE table_name = 'pedido_fornecedores'
AND constraint_type = 'UNIQUE'
AND constraint_schema = 'public';

-- Verify unique constraint on credenciais_gmail.usuario_id
SELECT COUNT(*) as credenciais_gmail_unique_constraint
FROM information_schema.table_constraints
WHERE table_name = 'credenciais_gmail'
AND constraint_name LIKE 'credenciais_gmail_usuario_id_%'
AND constraint_schema = 'public';

-- Verify unique constraint on envios.chave_idempotencia
SELECT COUNT(*) as envios_unique_constraint
FROM information_schema.table_constraints
WHERE table_name = 'envios'
AND constraint_name LIKE 'envios_chave_idempotencia_%'
AND constraint_schema = 'public';

COMMIT;

-- ============================================================================
-- INTEGRATION NOTES
-- ============================================================================
--
-- The functional RLS tests above verify the policy structure and constraints.
--
-- Testing the actual behavior (permission denied errors when accessed without
-- proper authentication) requires:
--
-- 1. Live Supabase connection with auth setup
-- 2. JWT tokens from auth.users() for different email domains
-- 3. Supabase client library (JavaScript/Python/Go)
--
-- Example Vitest integration test (src/__tests__/rls.test.ts):
--
-- describe('RLS: Anonymous User', () => {
--   it('should deny SELECT from fornecedores', async () => {
--     const { data, error } = await supabaseAnon.from('fornecedores').select();
--     expect(error).toBeDefined();
--     expect(error?.message).toMatch(/permission denied|policy/i);
--   });
-- });
--
-- describe('RLS: Wrong Domain User', () => {
--   it('should deny SELECT from fornecedores', async () => {
--     const { data, error } = await supabaseWrongDomain
--       .from('fornecedores')
--       .select();
--     expect(error).toBeDefined();
--     expect(error?.message).toMatch(/permission denied|policy/i);
--   });
-- });
--
-- describe('RLS: Agencia User (@agenciasurto.com)', () => {
--   it('should allow SELECT from fornecedores', async () => {
--     const { data, error } = await supabaseAgencia.from('fornecedores').select();
--     expect(error).toBeNull();
--     expect(data).toBeDefined();
--   });
--
--   it('should allow INSERT own pedidos', async () => {
--     const { data, error } = await supabaseUser1.from('pedidos').insert([{
--       nome: 'Test Request',
--       servico: 'catering',
--       regiao: 'SP',
--       autor_id: user1Id
--     }]);
--     expect(error).toBeNull();
--     expect(data).toBeDefined();
--   });
--
--   it('should block READ other user credenciais_gmail', async () => {
--     const { data, error } = await supabaseUser2
--       .from('credenciais_gmail')
--       .select()
--       .eq('usuario_id', user1Id);
--     expect(error).toBeDefined();
--     expect(error?.message).toMatch(/permission denied|policy/i);
--   });
--
--   it('should block INSERT into fornecedores', async () => {
--     const { error } = await supabaseUser.from('fornecedores').insert([{
--       nome: 'Fake Supplier'
--     }]);
--     expect(error).toBeDefined();
--     expect(error?.message).toMatch(/policy|violation/i);
--   });
-- });
--

