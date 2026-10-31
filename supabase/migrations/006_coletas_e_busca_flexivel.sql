-- Collection requests made from the site and run by the scraper on GitHub Actions.
-- The team only reads them: requests go through the request-collection function,
-- which checks the domain and the daily limit.
CREATE TABLE coletas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servico TEXT NOT NULL,
  regiao TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pendente', 'rodando', 'concluida', 'falhou')) DEFAULT 'pendente',
  encontrados INT,
  erro TEXT,
  criado_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE coletas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coletas_select_agencia"
  ON coletas
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND eh_agencia());

-- The same search cannot run twice at the same time
CREATE UNIQUE INDEX coletas_uma_ativa_por_busca
  ON coletas (lower(servico), lower(regiao))
  WHERE status IN ('pendente', 'rodando');

CREATE INDEX idx_coletas_created_at ON coletas(created_at);

-- Flexible search: "som" finds "locação de som" and "niteroi" finds "Niterói".
-- SECURITY INVOKER keeps the RLS rules of fornecedores.
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

CREATE FUNCTION buscar_fornecedores(p_servico TEXT, p_regiao TEXT DEFAULT NULL)
RETURNS SETOF public.fornecedores
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH termos AS (
    SELECT
      '%' || replace(replace(replace(extensions.unaccent(lower(trim(p_servico))), '\', '\\'), '%', '\%'), '_', '\_') || '%' AS servico,
      '%' || replace(replace(replace(extensions.unaccent(lower(trim(coalesce(p_regiao, '')))), '\', '\\'), '%', '\%'), '_', '\_') || '%' AS regiao
  )
  SELECT f.*
  FROM public.fornecedores f, termos t
  WHERE extensions.unaccent(lower(coalesce(f.regiao, ''))) LIKE t.regiao
    AND EXISTS (
      SELECT 1 FROM unnest(f.servicos) AS s
      WHERE extensions.unaccent(lower(s)) LIKE t.servico
    )
$$;
