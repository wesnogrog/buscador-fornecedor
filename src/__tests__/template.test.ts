/**
 * Tests for template.ts - fillTemplate utility function
 * Tests dynamic field replacement in email templates with supplier names
 */

import { describe, it, expect } from 'vitest';
import { fillTemplate } from '../utils/template';

describe('fillTemplate', () => {
  test('fills single placeholder', () => {
    const template = 'Olá {fornecedor}, gostaria de um orçamento para {servico}.';
    const fields = {
      fornecedor: 'Fornecedor XYZ',
      servico: 'Locação de Som',
    };

    const result = fillTemplate(template, fields);
    expect(result).toBe('Olá Fornecedor XYZ, gostaria de um orçamento para Locação de Som.');
  });

  test('fills multiple placeholders', () => {
    const template = 'Olá {fornecedor}, gostaria de um orçamento para {servico} no dia {data} em {local}.';
    const fields = {
      fornecedor: 'Fornecedor ABC',
      servico: 'Catering',
      data: '2024-12-15',
      local: 'São Paulo',
    };

    const result = fillTemplate(template, fields);
    expect(result).toBe(
      'Olá Fornecedor ABC, gostaria de um orçamento para Catering no dia 2024-12-15 em São Paulo.'
    );
  });

  test('fills all supported placeholders', () => {
    const template =
      '{fornecedor}\n{servico}\n{evento}\n{data}\n{local}\n{prazo}';
    const fields = {
      fornecedor: 'Nome Fornecedor',
      servico: 'Serviço',
      evento: 'Evento',
      data: '2024-12-15',
      local: 'Local',
      prazo: 'Prazo',
    };

    const result = fillTemplate(template, fields);
    expect(result).toBe('Nome Fornecedor\nServiço\nEvento\n2024-12-15\nLocal\nPrazo');
  });

  test('handles missing fields with empty string', () => {
    const template = 'Olá {fornecedor}, {evento}';
    const fields = {
      fornecedor: 'Empresa A',
      evento: '',
    };

    const result = fillTemplate(template, fields);
    expect(result).toBe('Olá Empresa A, ');
  });

  test('handles undefined fields with empty string', () => {
    const template = 'Olá {fornecedor}, {evento}';
    const fields = {
      fornecedor: 'Empresa A',
    };

    const result = fillTemplate(template, fields as any);
    expect(result).toBe('Olá Empresa A, ');
  });

  test('does not replace partial matches', () => {
    const template = 'O fornecedor_id é {fornecedor_id}';
    const fields = {
      fornecedor: 'Empresa A',
    };

    const result = fillTemplate(template, fields as any);
    expect(result).toBe('O fornecedor_id é {fornecedor_id}');
  });

  test('handles case sensitivity - does not replace wrong case', () => {
    const template = 'Olá {Fornecedor} e {FORNECEDOR}';
    const fields = {
      fornecedor: 'Empresa A',
    };

    const result = fillTemplate(template, fields as any);
    expect(result).toBe('Olá {Fornecedor} e {FORNECEDOR}');
  });

  test('handles repeated placeholders', () => {
    const template = 'Sr. {fornecedor}, {fornecedor} está confirmado para {evento}. Obrigado, {fornecedor}.';
    const fields = {
      fornecedor: 'João Silva',
      evento: 'Conferência',
    };

    const result = fillTemplate(template, fields);
    expect(result).toBe('Sr. João Silva, João Silva está confirmado para Conferência. Obrigado, João Silva.');
  });

  test('handles special characters in field values', () => {
    const template = 'Olá {fornecedor}, o evento {evento} será em {local}.';
    const fields = {
      fornecedor: 'Empresa & Co. Ltda.',
      evento: 'Workshop "Tecnologia 2024"',
      local: 'São Paulo (SP)',
    };

    const result = fillTemplate(template, fields);
    expect(result).toBe(
      'Olá Empresa & Co. Ltda., o evento Workshop "Tecnologia 2024" será em São Paulo (SP).'
    );
  });

  test('handles newlines in field values', () => {
    const template = 'Detalhes:\n{evento}';
    const fields = {
      evento: 'Evento com\nmúltiplas linhas',
    };

    const result = fillTemplate(template, fields);
    expect(result).toBe('Detalhes:\nEvento com\nmúltiplas linhas');
  });

  test('handles empty template', () => {
    const template = '';
    const fields = {
      fornecedor: 'Empresa A',
    };

    const result = fillTemplate(template, fields);
    expect(result).toBe('');
  });

  test('handles template with no placeholders', () => {
    const template = 'Este é um texto fixo sem placeholders.';
    const fields = {
      fornecedor: 'Empresa A',
    };

    const result = fillTemplate(template, fields);
    expect(result).toBe('Este é um texto fixo sem placeholders.');
  });

  test('preserves formatting and whitespace', () => {
    const template = `Olá {fornecedor},

Gostaria de solicitar um orçamento para:
- Serviço: {servico}
- Data: {data}
- Local: {local}

Prazo: {prazo}`;

    const fields = {
      fornecedor: 'Empresa XYZ',
      servico: 'Locação de Som',
      data: '15/12/2024',
      local: 'São Paulo - SP',
      prazo: '2 dias',
    };

    const result = fillTemplate(template, fields);
    expect(result).toContain('Olá Empresa XYZ,');
    expect(result).toContain('- Serviço: Locação de Som');
    expect(result).toContain('- Data: 15/12/2024');
    expect(result).toContain('Prazo: 2 dias');
  });

  test('handles very long field values', () => {
    const longValue = 'A'.repeat(500);
    const template = 'Descrição: {evento}';
    const fields = {
      evento: longValue,
    };

    const result = fillTemplate(template, fields);
    expect(result).toBe(`Descrição: ${longValue}`);
  });

  test('handles fields with only whitespace', () => {
    const template = 'Evento: "{evento}"';
    const fields = {
      evento: '   ',
    };

    const result = fillTemplate(template, fields);
    expect(result).toBe('Evento: "   "');
  });
});
