-- Checks what each kind of user can really do, simulating their login.
-- Everything runs inside a transaction that is rolled back, so nothing stays in the database.
-- Run it in Supabase Dashboard > SQL Editor. A failure stops with an error naming the broken rule.
BEGIN;

DO $$
DECLARE
  ana UUID := gen_random_uuid();
  bia UUID := gen_random_uuid();
  externo UUID := gen_random_uuid();
  fornecedor UUID;
  outro_fornecedor UUID;
  pedido UUID;
  vinculo UUID;
  total INT;
  bloqueado BOOLEAN;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (ana, 'ana.teste@agenciasurto.com'),
    (bia, 'bia.teste@agenciasurto.com'),
    (externo, 'externo.teste@gmail.com');
  INSERT INTO fornecedores (nome) VALUES ('Fornecedor Teste') RETURNING id INTO fornecedor;
  INSERT INTO fornecedores (nome) VALUES ('Outro Fornecedor Teste') RETURNING id INTO outro_fornecedor;
  INSERT INTO credenciais_gmail (usuario_id, credencial_criptografada) VALUES (ana, '\x00');

  -- Not logged in
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM set_config('role', 'anon', true);
  SELECT count(*) INTO total FROM fornecedores;
  IF total <> 0 THEN RAISE EXCEPTION 'Anônimo não pode ler fornecedores'; END IF;
  SELECT count(*) INTO total FROM credenciais_gmail;
  IF total <> 0 THEN RAISE EXCEPTION 'Anônimo não pode ler credenciais'; END IF;

  -- Logged in with another domain
  PERFORM set_config('request.jwt.claims', json_build_object('sub', externo, 'email', 'externo.teste@gmail.com')::text, true);
  PERFORM set_config('role', 'authenticated', true);
  SELECT count(*) INTO total FROM fornecedores;
  IF total <> 0 THEN RAISE EXCEPTION 'Outro domínio não pode ler fornecedores'; END IF;
  bloqueado := false;
  BEGIN
    INSERT INTO pedidos (nome, servico, regiao, autor_id) VALUES ('X', 'som', 'SP', externo);
  EXCEPTION WHEN insufficient_privilege THEN bloqueado := true;
  END;
  IF NOT bloqueado THEN RAISE EXCEPTION 'Outro domínio não pode criar pedido'; END IF;

  -- Author from the agency
  PERFORM set_config('request.jwt.claims', json_build_object('sub', ana, 'email', 'ana.teste@agenciasurto.com')::text, true);
  SELECT count(*) INTO total FROM fornecedores WHERE id = fornecedor;
  IF total <> 1 THEN RAISE EXCEPTION 'Equipe precisa ler fornecedores'; END IF;

  bloqueado := false;
  BEGIN
    INSERT INTO fornecedores (nome) VALUES ('Falso');
  EXCEPTION WHEN insufficient_privilege THEN bloqueado := true;
  END;
  IF NOT bloqueado THEN RAISE EXCEPTION 'Equipe não pode criar fornecedor'; END IF;

  bloqueado := false;
  BEGIN
    INSERT INTO pedidos (nome, servico, regiao, autor_id) VALUES ('X', 'som', 'SP', bia);
  EXCEPTION WHEN insufficient_privilege THEN bloqueado := true;
  END;
  IF NOT bloqueado THEN RAISE EXCEPTION 'Ninguém pode criar pedido em nome de outra pessoa'; END IF;

  INSERT INTO pedidos (nome, servico, regiao, autor_id) VALUES ('Evento', 'som', 'SP', ana) RETURNING id INTO pedido;
  INSERT INTO pedido_fornecedores (pedido_id, fornecedor_id) VALUES (pedido, fornecedor) RETURNING id INTO vinculo;
  INSERT INTO envios (pedido_fornecedor_id, canal, status, mensagem, chave_idempotencia, criado_por)
    VALUES (vinculo, 'email', 'sucesso', 'modelo', 'teste-' || vinculo, ana);

  IF (SELECT status FROM pedido_fornecedores WHERE id = vinculo) <> 'enviado' THEN
    RAISE EXCEPTION 'Envio com sucesso precisa marcar o fornecedor como enviado';
  END IF;

  UPDATE pedido_fornecedores SET status = 'nao_contatar' WHERE id = vinculo;
  INSERT INTO envios (pedido_fornecedor_id, canal, status, mensagem, chave_idempotencia, criado_por)
    VALUES (vinculo, 'whatsapp', 'sucesso', 'modelo', 'teste-zap-' || vinculo, ana);
  IF (SELECT status FROM pedido_fornecedores WHERE id = vinculo) <> 'nao_contatar' THEN
    RAISE EXCEPTION 'Envio não pode apagar a marca de não contatar';
  END IF;

  -- Colleague from the agency
  PERFORM set_config('request.jwt.claims', json_build_object('sub', bia, 'email', 'bia.teste@agenciasurto.com')::text, true);
  SELECT count(*) INTO total FROM pedidos WHERE id = pedido;
  IF total <> 1 THEN RAISE EXCEPTION 'Colega precisa ver o pedido'; END IF;
  SELECT count(*) INTO total FROM pedido_fornecedores WHERE id = vinculo;
  IF total <> 1 THEN RAISE EXCEPTION 'Colega precisa ver os fornecedores do pedido'; END IF;
  SELECT count(*) INTO total FROM envios WHERE pedido_fornecedor_id = vinculo;
  IF total <> 2 THEN RAISE EXCEPTION 'Colega precisa ver os envios do pedido'; END IF;
  SELECT count(*) INTO total FROM credenciais_gmail;
  IF total <> 0 THEN RAISE EXCEPTION 'Colega não pode ler credencial de outra pessoa'; END IF;

  UPDATE pedidos SET nome = 'Alterado' WHERE id = pedido;
  GET DIAGNOSTICS total = ROW_COUNT;
  IF total <> 0 THEN RAISE EXCEPTION 'Colega não pode alterar pedido de outra pessoa'; END IF;

  UPDATE pedido_fornecedores SET status = 'pendente' WHERE id = vinculo;
  GET DIAGNOSTICS total = ROW_COUNT;
  IF total <> 0 THEN RAISE EXCEPTION 'Colega não pode alterar fornecedor do pedido de outra pessoa'; END IF;

  bloqueado := false;
  BEGIN
    INSERT INTO pedido_fornecedores (pedido_id, fornecedor_id) VALUES (pedido, outro_fornecedor);
  EXCEPTION WHEN insufficient_privilege THEN bloqueado := true;
  END;
  IF NOT bloqueado THEN RAISE EXCEPTION 'Colega não pode incluir fornecedor no pedido de outra pessoa'; END IF;

  bloqueado := false;
  BEGIN
    INSERT INTO envios (pedido_fornecedor_id, canal, status, mensagem, chave_idempotencia, criado_por)
      VALUES (vinculo, 'email', 'sucesso', 'modelo', 'teste-bia-' || vinculo, bia);
  EXCEPTION WHEN insufficient_privilege THEN bloqueado := true;
  END;
  IF NOT bloqueado THEN RAISE EXCEPTION 'Colega não pode registrar envio no pedido de outra pessoa'; END IF;
END $$;

ROLLBACK;

SELECT 'Todos os testes de segurança passaram' AS resultado;
