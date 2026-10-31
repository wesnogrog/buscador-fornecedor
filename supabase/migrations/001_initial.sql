-- Task 2: Initial schema with RLS policies for Buscador de Fornecedor
-- Created: 2026-10-31

-- Helper function to check if user's email is from @agenciasurto.com domain
CREATE OR REPLACE FUNCTION eh_agencia()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() ->> 'email')::text ILIKE '%@agenciasurto.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TABLE: fornecedores (suppliers)
-- RLS: SELECT for logged-in @agenciasurto.com users only
--      INSERT/UPDATE/DELETE disabled (scraper-only via service role)
-- ============================================================================
CREATE TABLE IF NOT EXISTS fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  dominio TEXT,
  endereco TEXT,
  servicos TEXT[] DEFAULT '{}',
  regiao TEXT,
  email TEXT,
  whatsapp_link TEXT,
  whatsapp_numero TEXT,
  data_extracao TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fornecedores_select_agencia"
  ON fornecedores
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND eh_agencia());

CREATE POLICY "fornecedores_insert_disabled"
  ON fornecedores
  FOR INSERT
  WITH CHECK (FALSE);

CREATE POLICY "fornecedores_update_disabled"
  ON fornecedores
  FOR UPDATE
  USING (FALSE);

CREATE POLICY "fornecedores_delete_disabled"
  ON fornecedores
  FOR DELETE
  USING (FALSE);

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_fornecedores_regiao ON fornecedores(regiao);
CREATE INDEX IF NOT EXISTS idx_fornecedores_servicos ON fornecedores USING GIN(servicos);

-- ============================================================================
-- TABLE: pedidos (requests)
-- RLS: SELECT own or shared, INSERT own, UPDATE own, DELETE own
-- ============================================================================
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  servico TEXT NOT NULL,
  regiao TEXT NOT NULL,
  data DATE,
  local TEXT,
  prazo TEXT,
  autor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pedidos_select_agencia"
  ON pedidos
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND eh_agencia());

CREATE POLICY "pedidos_insert_own"
  ON pedidos
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND eh_agencia() AND autor_id = auth.uid());

CREATE POLICY "pedidos_update_own"
  ON pedidos
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND eh_agencia() AND autor_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND eh_agencia() AND autor_id = auth.uid());

CREATE POLICY "pedidos_delete_own"
  ON pedidos
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND eh_agencia() AND autor_id = auth.uid());

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_pedidos_autor_id ON pedidos(autor_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_servico ON pedidos(servico);
CREATE INDEX IF NOT EXISTS idx_pedidos_regiao ON pedidos(regiao);

-- ============================================================================
-- TABLE: pedido_fornecedores (request ↔ supplier mapping)
-- RLS: SELECT linked to user's pedido, INSERT linked to user's pedido, UPDATE own pedido
-- ============================================================================
CREATE TABLE IF NOT EXISTS pedido_fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  fornecedor_id UUID NOT NULL REFERENCES fornecedores(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pendente', 'enviado', 'nao_contatar')) DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pedido_id, fornecedor_id)
);

ALTER TABLE pedido_fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pedido_fornecedores_select_own"
  ON pedido_fornecedores
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND eh_agencia()
    AND EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = pedido_fornecedores.pedido_id
      AND pedidos.autor_id = auth.uid()
    )
  );

CREATE POLICY "pedido_fornecedores_insert_own"
  ON pedido_fornecedores
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND eh_agencia()
    AND EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = pedido_fornecedores.pedido_id
      AND pedidos.autor_id = auth.uid()
    )
  );

CREATE POLICY "pedido_fornecedores_update_own"
  ON pedido_fornecedores
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND eh_agencia()
    AND EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = pedido_fornecedores.pedido_id
      AND pedidos.autor_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND eh_agencia()
    AND EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = pedido_fornecedores.pedido_id
      AND pedidos.autor_id = auth.uid()
    )
  );

CREATE POLICY "pedido_fornecedores_delete_own"
  ON pedido_fornecedores
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND eh_agencia()
    AND EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = pedido_fornecedores.pedido_id
      AND pedidos.autor_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pedido_fornecedores_pedido_id ON pedido_fornecedores(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_fornecedores_fornecedor_id ON pedido_fornecedores(fornecedor_id);

-- ============================================================================
-- TABLE: modelos (email templates)
-- RLS: SELECT all (shared), INSERT own, UPDATE own
-- ============================================================================
CREATE TABLE IF NOT EXISTS modelos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  corpo TEXT NOT NULL,
  criado_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE modelos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modelos_select_agencia"
  ON modelos
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND eh_agencia());

CREATE POLICY "modelos_insert_own"
  ON modelos
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND eh_agencia() AND criado_por = auth.uid());

CREATE POLICY "modelos_update_own"
  ON modelos
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND eh_agencia() AND criado_por = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND eh_agencia() AND criado_por = auth.uid());

CREATE POLICY "modelos_delete_own"
  ON modelos
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND eh_agencia() AND criado_por = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_modelos_criado_por ON modelos(criado_por);

-- ============================================================================
-- TABLE: envios (sent messages)
-- RLS: SELECT linked to user's pedido, INSERT own, UPDATE own
-- ============================================================================
CREATE TABLE IF NOT EXISTS envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_fornecedor_id UUID NOT NULL REFERENCES pedido_fornecedores(id) ON DELETE CASCADE,
  canal TEXT NOT NULL CHECK (canal IN ('email', 'whatsapp')),
  status TEXT NOT NULL CHECK (status IN ('sucesso', 'falhou', 'pendente')) DEFAULT 'pendente',
  mensagem TEXT NOT NULL,
  data_envio TIMESTAMPTZ NOT NULL DEFAULT now(),
  erro TEXT,
  chave_idempotencia TEXT NOT NULL UNIQUE,
  criado_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE envios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "envios_select_own"
  ON envios
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND eh_agencia()
    AND EXISTS (
      SELECT 1 FROM pedido_fornecedores
      JOIN pedidos ON pedidos.id = pedido_fornecedores.pedido_id
      WHERE pedido_fornecedores.id = envios.pedido_fornecedor_id
      AND pedidos.autor_id = auth.uid()
    )
  );

CREATE POLICY "envios_insert_own"
  ON envios
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND eh_agencia()
    AND criado_por = auth.uid()
    AND EXISTS (
      SELECT 1 FROM pedido_fornecedores
      JOIN pedidos ON pedidos.id = pedido_fornecedores.pedido_id
      WHERE pedido_fornecedores.id = envios.pedido_fornecedor_id
      AND pedidos.autor_id = auth.uid()
    )
  );

CREATE POLICY "envios_update_own"
  ON envios
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND eh_agencia()
    AND criado_por = auth.uid()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND eh_agencia()
    AND criado_por = auth.uid()
  );

CREATE POLICY "envios_delete_own"
  ON envios
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND eh_agencia()
    AND criado_por = auth.uid()
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_envios_pedido_fornecedor_id ON envios(pedido_fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_envios_criado_por ON envios(criado_por);
CREATE INDEX IF NOT EXISTS idx_envios_chave_idempotencia ON envios(chave_idempotencia);

-- ============================================================================
-- TABLE: credenciais_gmail (Gmail credentials, encrypted)
-- RLS: SELECT own only, INSERT own, UPDATE own, DELETE own
-- ============================================================================
CREATE TABLE IF NOT EXISTS credenciais_gmail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  credencial_criptografada BYTEA NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE credenciais_gmail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credenciais_gmail_select_own"
  ON credenciais_gmail
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND eh_agencia() AND usuario_id = auth.uid());

CREATE POLICY "credenciais_gmail_insert_own"
  ON credenciais_gmail
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND eh_agencia() AND usuario_id = auth.uid());

CREATE POLICY "credenciais_gmail_update_own"
  ON credenciais_gmail
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND eh_agencia() AND usuario_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND eh_agencia() AND usuario_id = auth.uid());

CREATE POLICY "credenciais_gmail_delete_own"
  ON credenciais_gmail
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND eh_agencia() AND usuario_id = auth.uid());

-- Index
CREATE INDEX IF NOT EXISTS idx_credenciais_gmail_usuario_id ON credenciais_gmail(usuario_id);
