-- Pedidos are shared with the whole team, so everyone can see who was contacted and avoid
-- duplicate contacts. Reading is shared; changing a pedido's suppliers and sends stays with its author.
DROP POLICY "pedido_fornecedores_select_own" ON pedido_fornecedores;

CREATE POLICY "pedido_fornecedores_select_agencia"
  ON pedido_fornecedores
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND eh_agencia());

DROP POLICY "envios_select_own" ON envios;

CREATE POLICY "envios_select_agencia"
  ON envios
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND eh_agencia());
