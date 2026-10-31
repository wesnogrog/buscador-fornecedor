-- Keeps the supplier status in sync with successful sends, including WhatsApp marked by hand.
-- A supplier marked "nao_contatar" keeps that status.
CREATE OR REPLACE FUNCTION marcar_fornecedor_enviado()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pedido_fornecedores
  SET status = 'enviado', updated_at = now()
  WHERE id = NEW.pedido_fornecedor_id
    AND status <> 'nao_contatar';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER envios_marcar_enviado
  AFTER INSERT ON envios
  FOR EACH ROW
  WHEN (NEW.status = 'sucesso')
  EXECUTE FUNCTION marcar_fornecedor_enviado();
