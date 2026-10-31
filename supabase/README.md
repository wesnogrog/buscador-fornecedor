# Supabase Configuration for Buscador de Fornecedor

This directory contains the Supabase migration files, tests, and configuration for the Buscador de Fornecedor application.

## Setup Instructions

### Prerequisites

1. **Node.js** 16+ installed
2. **Supabase CLI** installed:
   ```bash
   npm install -g supabase
   ```

### Initialize Local Development

1. **Create a Supabase project**:
   - Go to [app.supabase.com](https://app.supabase.com)
   - Create a new project
   - Copy the **Project URL** and **Anon Key**

2. **Configure environment**:
   ```bash
   # Create .env.local in project root
   echo "SUPABASE_URL=https://your-project.supabase.co" > .env.local
   echo "SUPABASE_ANON_KEY=your-anon-key-here" >> .env.local
   ```

3. **Link to your Supabase project**:
   ```bash
   supabase link --project-ref <your-project-ref>
   # Example: supabase link --project-ref abcdefghijklmnop
   ```
   You can find your project reference in the Supabase dashboard URL: `https://app.supabase.com/projects/[PROJECT_REF]/settings/general`

### Apply Migrations

1. **Push the schema to your Supabase project**:
   ```bash
   supabase db push
   ```
   This will:
   - Run `supabase/migrations/001_initial.sql`
   - Create all tables with correct columns and constraints
   - Enable RLS on all tables
   - Create RLS policies for each table
   - Create indexes for performance

2. **Verify in Supabase Dashboard**:
   - Go to **SQL Editor**
   - Run a test query to verify tables exist:
     ```sql
     SELECT tablename FROM pg_tables WHERE schemaname = 'public';
     ```
   - Check **Authentication** > **Policies** to verify RLS policies

### Running Tests

#### SQL Tests (PostgreSQL)

Run all SQL tests:
```bash
supabase test db --file supabase/tests/001_rls.test.sql
```

Expected output:
- ✓ All tables exist (6 tables)
- ✓ RLS is enabled on all tables
- ✓ Policies are created for each table
- ✓ Indexes are created for performance

#### Behavior Tests (SQL Editor)

Paste `supabase/tests/rls_comportamento.test.sql` into Dashboard > SQL Editor and run it. It simulates each kind of user inside a transaction that is rolled back, so it creates no real users and leaves nothing in the database. A failure stops with an error naming the broken rule.

**What's tested**:
- Anonymous user cannot read suppliers or credentials
- User with wrong domain (@gmail.com) is blocked by RLS
- Valid agencia users can read suppliers (fornecedores) but not change them
- Users can create pedidos only in their own name
- Colleagues can see a pedido, its suppliers and its sends, but cannot change them
- Users cannot access other users' Gmail credentials
- A successful send marks the supplier as sent and keeps "nao_contatar"

### Key Database Features

#### Row-Level Security (RLS)

All tables have RLS enabled with the following policies:

1. **Domain Check**: All queries include `eh_agencia()` function which verifies:
   - User is logged in: `auth.uid() IS NOT NULL`
   - Email domain is @agenciasurto.com: `auth.jwt() ->> 'email' ILIKE '%@agenciasurto.com'`

2. **Table-Specific Policies**:
   - **fornecedores**: Read-only (scraper inserts via service role)
   - **pedidos**: Read all, write own
   - **pedido_fornecedores**: Read all (shared), write linked to user's pedidos
   - **modelos**: Read all (shared), write own
   - **envios**: Read all (shared), write linked to user's pedidos
   - **credenciais_gmail**: Read/write own only

#### Encryption for Gmail Credentials

Gmail credentials are encrypted using AES-GCM:

1. **Storage**: `credenciais_gmail.credencial_criptografada` stores encrypted bytes
2. **Key Management**: Encryption key stored in Supabase secrets (never exposed to client)
3. **Access**: Server-side Edge Functions decrypt when needed
4. **User Isolation**: RLS ensures each user can only access their own credentials

### Deployment

For production deployment:

1. **Ensure RLS is enabled and tested** ✓
2. **Set Supabase to free tier if not already** (satisfies zero-cost constraint)
3. **Enable SMTP for email notifications** (optional, in Supabase dashboard)
4. **Configure Gmail OAuth 2.0 credentials** for email sending (see Task 3)

### Troubleshooting

#### Migration fails with "function already exists"

If you're re-running migrations, you may see this error:
```sql
ERROR: function eh_agencia() already exists
```

Solution: The migration uses `CREATE OR REPLACE FUNCTION` which handles this. If you see errors, check the Supabase UI for existing functions.

#### Tables exist but RLS policies don't

If tables are created but policies are missing:
```bash
supabase db push --dry-run
```

This shows what would be applied. If policies are missing, re-run `supabase db push`.

#### Cannot authenticate with @agenciasurto.com email

Login only works with Google. Check that **Authentication** > **Providers** > **Google** is enabled and has the client ID and secret.

### Files Structure

```
supabase/
├── migrations/
│   ├── 001_initial.sql              # Main schema migration
│   ├── 002_marcar_enviado.sql       # Marks suppliers as sent
│   └── 003_pedidos_compartilhados.sql # Shares pedidos with the team
├── tests/
│   ├── 001_rls.test.sql             # RLS policy structural tests
│   └── rls_comportamento.test.sql   # RLS behavior tests (rolled back)
└── README.md                        # This file
```

### References

- [Supabase Documentation](https://supabase.com/docs)
- [Row-Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
