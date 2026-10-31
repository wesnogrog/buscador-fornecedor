-- The scraper updates a supplier it already found instead of creating a duplicate.
CREATE UNIQUE INDEX fornecedores_nome_regiao_endereco_key
  ON fornecedores (nome, regiao, endereco);
