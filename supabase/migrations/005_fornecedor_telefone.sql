-- Suppliers with only a landline still need a number the team can call.
ALTER TABLE fornecedores ADD COLUMN telefone TEXT;
