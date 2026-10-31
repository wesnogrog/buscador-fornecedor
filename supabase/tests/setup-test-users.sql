-- Setup Test Users for RLS Integration Tests
--
-- This script creates test users for the Vitest integration test suite.
-- Run this manually if SUPABASE_SERVICE_KEY is not available.
--
-- To run:
-- 1. Copy this entire script
-- 2. Go to Supabase Dashboard > SQL Editor > New Query
-- 3. Paste and run
-- 4. Or use: psql -U postgres -d postgres < setup-test-users.sql
--
-- Test Users Created:
-- - user1@agenciasurto.com (password: test123456Test!)
-- - user2@agenciasurto.com (password: test123456Test!)
-- - user_external@gmail.com (password: test123456Test!)
--
-- These users will be used by the Vitest tests in src/__tests__/rls.integration.test.ts
-- to verify RLS policies are working correctly.

BEGIN;

-- Create test user 1 (agencia)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  phone
)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '10000000-0000-0000-0000-000000000001'::uuid,
  'authenticated',
  'authenticated',
  'user1@agenciasurto.com',
  crypt('test123456Test!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  '',
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  email = 'user1@agenciasurto.com',
  email_confirmed_at = NOW()
;

-- Create test user 2 (agencia)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  phone
)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '20000000-0000-0000-0000-000000000002'::uuid,
  'authenticated',
  'authenticated',
  'user2@agenciasurto.com',
  crypt('test123456Test!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  '',
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  email = 'user2@agenciasurto.com',
  email_confirmed_at = NOW()
;

-- Create test user 3 (external, wrong domain)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  phone
)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '30000000-0000-0000-0000-000000000003'::uuid,
  'authenticated',
  'authenticated',
  'user_external@gmail.com',
  crypt('test123456Test!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  '',
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  email = 'user_external@gmail.com',
  email_confirmed_at = NOW()
;

COMMIT;

-- Verify users were created
SELECT id, email, email_confirmed_at FROM auth.users
WHERE email IN ('user1@agenciasurto.com', 'user2@agenciasurto.com', 'user_external@gmail.com')
ORDER BY email;
