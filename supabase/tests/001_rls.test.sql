-- RLS Policy Tests for Buscador de Fornecedor
-- Test suite for Row-Level Security policies

BEGIN;

-- Test helper function
CREATE OR REPLACE FUNCTION test_eh_agencia()
RETURNS VOID AS $$
DECLARE
  result BOOLEAN;
BEGIN
  -- Test with valid @agenciasurto.com email (mocked)
  -- Note: This would require proper auth setup to fully test
  RAISE NOTICE 'eh_agencia() function created successfully';
END;
$$ LANGUAGE plpgsql;

-- Test 1: Verify all tables exist
SELECT
  COUNT(*) as table_count
FROM information_schema.tables
WHERE table_name IN ('fornecedores', 'pedidos', 'pedido_fornecedores', 'modelos', 'envios', 'credenciais_gmail')
AND table_schema = 'public';

-- Test 2: Verify RLS is enabled on all tables
SELECT
  tablename,
  CASE WHEN rowsecurity = true THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables
WHERE tablename IN ('fornecedores', 'pedidos', 'pedido_fornecedores', 'modelos', 'envios', 'credenciais_gmail')
AND schemaname = 'public'
ORDER BY tablename;

-- Test 3: Verify fornecedores policies exist
SELECT
  COUNT(*) as fornecedores_policy_count
FROM pg_policies
WHERE tablename = 'fornecedores'
AND schemaname = 'public';

-- Test 4: Verify pedidos policies exist
SELECT
  COUNT(*) as pedidos_policy_count
FROM pg_policies
WHERE tablename = 'pedidos'
AND schemaname = 'public';

-- Test 5: Verify pedido_fornecedores policies exist
SELECT
  COUNT(*) as pedido_fornecedores_policy_count
FROM pg_policies
WHERE tablename = 'pedido_fornecedores'
AND schemaname = 'public';

-- Test 6: Verify modelos policies exist
SELECT
  COUNT(*) as modelos_policy_count
FROM pg_policies
WHERE tablename = 'modelos'
AND schemaname = 'public';

-- Test 7: Verify envios policies exist
SELECT
  COUNT(*) as envios_policy_count
FROM pg_policies
WHERE tablename = 'envios'
AND schemaname = 'public';

-- Test 8: Verify credenciais_gmail policies exist
SELECT
  COUNT(*) as credenciais_gmail_policy_count
FROM pg_policies
WHERE tablename = 'credenciais_gmail'
AND schemaname = 'public';

-- Test 9: Verify indexes exist for performance
SELECT
  COUNT(*) as index_count
FROM pg_indexes
WHERE tablename IN ('fornecedores', 'pedidos', 'pedido_fornecedores', 'modelos', 'envios', 'credenciais_gmail')
AND schemaname = 'public'
AND indexname NOT LIKE '%_pkey';

-- Test 10: List all created indexes
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('fornecedores', 'pedidos', 'pedido_fornecedores', 'modelos', 'envios', 'credenciais_gmail')
AND schemaname = 'public'
AND indexname NOT LIKE '%_pkey'
ORDER BY tablename, indexname;

-- Test 11: Verify column types for fornecedores
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'fornecedores'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test 12: Verify column types for pedidos
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'pedidos'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test 13: Verify foreign key constraints
SELECT
  constraint_name,
  table_name,
  column_name,
  referenced_table_name,
  referenced_column_name
FROM information_schema.referential_constraints
WHERE constraint_schema = 'public'
ORDER BY table_name;

-- Test 14: Verify CHECK constraints for status fields
SELECT
  table_name,
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
AND (table_name = 'pedido_fornecedores' OR table_name = 'envios')
ORDER BY table_name;

COMMIT;

-- Note: The following tests would require actual user authentication and should be run separately:
-- - Anonymous user cannot SELECT from any table
-- - User with non-@agenciasurto.com email cannot SELECT
-- - User with @agenciasurto.com email can SELECT fornecedores
-- - User can INSERT into pedidos, reads own back
-- - User cannot READ other user's credenciais_gmail
-- - User cannot INSERT into fornecedores (RLS blocks)

-- These would be tested using Supabase client library (Vitest) in src/utils/types.test.ts
