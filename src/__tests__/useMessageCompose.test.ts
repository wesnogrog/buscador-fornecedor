/**
 * Tests for useMessageCompose hook
 * Manages message template selection, field filling, and preview generation
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMessageCompose } from '../hooks/useMessageCompose';
import type { Modelo } from '../utils/types';

// Mock templates for testing
const mockTemplates: Modelo[] = [
  {
    id: 'template-1',
    nome: 'Orçamento Padrão',
    corpo: 'Olá {fornecedor}, gostaria de um orçamento para {servico}.',
    criado_por: 'user-1',
    created_at: new Date().toISOString(),
  },
  {
    id: 'template-2',
    nome: 'Com Evento',
    corpo: 'Olá {fornecedor}, preciso de {servico} para {evento} no dia {data} em {local}. Prazo: {prazo}.',
    criado_por: 'user-1',
    created_at: new Date().toISOString(),
  },
];

describe('useMessageCompose', () => {
  test('initializes with default values', () => {
    const { result } = renderHook(() => useMessageCompose(mockTemplates));

    expect(result.current.selectedTemplate).toBeNull();
    expect(result.current.fields).toEqual({
      servico: '',
      evento: '',
      data: '',
      local: '',
      prazo: '',
    });
    expect(result.current.previews).toEqual({});
  });

  test('selects template and updates preview', () => {
    const { result } = renderHook(() => useMessageCompose(mockTemplates));

    act(() => {
      result.current.selectTemplate(mockTemplates[0].id);
    });

    expect(result.current.selectedTemplate?.id).toBe('template-1');
    expect(result.current.selectedTemplate?.nome).toBe('Orçamento Padrão');
  });

  test('updates field value', () => {
    const { result } = renderHook(() => useMessageCompose(mockTemplates));

    act(() => {
      result.current.updateField('servico', 'Locação de Som');
    });

    expect(result.current.fields.servico).toBe('Locação de Som');
  });

  test('updates multiple fields', () => {
    const { result } = renderHook(() => useMessageCompose(mockTemplates));

    act(() => {
      result.current.updateField('servico', 'Catering');
      result.current.updateField('data', '2024-12-15');
      result.current.updateField('local', 'São Paulo');
    });

    expect(result.current.fields.servico).toBe('Catering');
    expect(result.current.fields.data).toBe('2024-12-15');
    expect(result.current.fields.local).toBe('São Paulo');
  });

  test('generates preview for supplier', () => {
    const { result } = renderHook(() => useMessageCompose(mockTemplates));

    act(() => {
      result.current.selectTemplate(mockTemplates[0].id);
      result.current.updateField('servico', 'Locação de Som');
      result.current.generatePreview('supplier-1', 'Empresa ABC');
    });

    expect(result.current.previews['supplier-1']).toBe(
      'Olá Empresa ABC, gostaria de um orçamento para Locação de Som.'
    );
  });

  test('generates preview with all fields filled', () => {
    const { result } = renderHook(() => useMessageCompose(mockTemplates));

    act(() => {
      result.current.selectTemplate(mockTemplates[1].id);
      result.current.updateField('servico', 'Catering');
      result.current.updateField('evento', 'Conferência Tech');
      result.current.updateField('data', '15/12/2024');
      result.current.updateField('local', 'São Paulo - SP');
      result.current.updateField('prazo', '2 dias');
      result.current.generatePreview('supplier-1', 'Fornecedor XYZ');
    });

    const expectedPreview =
      'Olá Fornecedor XYZ, preciso de Catering para Conferência Tech no dia 15/12/2024 em São Paulo - SP. Prazo: 2 dias.';
    expect(result.current.previews['supplier-1']).toBe(expectedPreview);
  });

  test('generates previews for multiple suppliers', () => {
    const { result } = renderHook(() => useMessageCompose(mockTemplates));

    act(() => {
      result.current.selectTemplate(mockTemplates[0].id);
      result.current.updateField('servico', 'Locação de Som');
      result.current.generatePreview('supplier-1', 'Empresa A');
      result.current.generatePreview('supplier-2', 'Empresa B');
      result.current.generatePreview('supplier-3', 'Empresa C');
    });

    expect(result.current.previews['supplier-1']).toBe(
      'Olá Empresa A, gostaria de um orçamento para Locação de Som.'
    );
    expect(result.current.previews['supplier-2']).toBe(
      'Olá Empresa B, gostaria de um orçamento para Locação de Som.'
    );
    expect(result.current.previews['supplier-3']).toBe(
      'Olá Empresa C, gostaria de um orçamento para Locação de Som.'
    );
  });

  test('clears previews when template changes', () => {
    const { result } = renderHook(() => useMessageCompose(mockTemplates));

    act(() => {
      result.current.selectTemplate(mockTemplates[0].id);
      result.current.updateField('servico', 'Locação de Som');
      result.current.generatePreview('supplier-1', 'Empresa A');
    });

    expect(Object.keys(result.current.previews).length).toBeGreaterThan(0);

    act(() => {
      result.current.selectTemplate(mockTemplates[1].id);
    });

    expect(result.current.previews).toEqual({});
  });

  test('clears previews when field changes', () => {
    const { result } = renderHook(() => useMessageCompose(mockTemplates));

    act(() => {
      result.current.selectTemplate(mockTemplates[0].id);
      result.current.updateField('servico', 'Locação de Som');
      result.current.generatePreview('supplier-1', 'Empresa A');
    });

    expect(result.current.previews['supplier-1']).toBeDefined();

    act(() => {
      result.current.updateField('servico', 'Catering');
    });

    expect(result.current.previews).toEqual({});
  });

  test('handles clearing all data', () => {
    const { result } = renderHook(() => useMessageCompose(mockTemplates));

    act(() => {
      result.current.selectTemplate(mockTemplates[0].id);
      result.current.updateField('servico', 'Locação de Som');
      result.current.generatePreview('supplier-1', 'Empresa A');
      result.current.clear();
    });

    expect(result.current.selectedTemplate).toBeNull();
    expect(result.current.fields).toEqual({
      servico: '',
      evento: '',
      data: '',
      local: '',
      prazo: '',
    });
    expect(result.current.previews).toEqual({});
  });

  test('returns correct template from templates list', () => {
    const { result } = renderHook(() => useMessageCompose(mockTemplates));

    act(() => {
      result.current.selectTemplate(mockTemplates[1].id);
    });

    expect(result.current.selectedTemplate?.id).toBe(mockTemplates[1].id);
    expect(result.current.selectedTemplate?.nome).toBe(mockTemplates[1].nome);
    expect(result.current.selectedTemplate?.corpo).toBe(mockTemplates[1].corpo);
  });

  test('handles selecting non-existent template', () => {
    const { result } = renderHook(() => useMessageCompose(mockTemplates));

    act(() => {
      result.current.selectTemplate('non-existent-id');
    });

    expect(result.current.selectedTemplate).toBeNull();
  });

  test('updates field with empty string', () => {
    const { result } = renderHook(() => useMessageCompose(mockTemplates));

    act(() => {
      result.current.updateField('servico', 'Locação de Som');
    });

    expect(result.current.fields.servico).toBe('Locação de Som');

    act(() => {
      result.current.updateField('servico', '');
    });

    expect(result.current.fields.servico).toBe('');
  });

  test('preserves other fields when updating one', () => {
    const { result } = renderHook(() => useMessageCompose(mockTemplates));

    act(() => {
      result.current.updateField('servico', 'Catering');
      result.current.updateField('data', '2024-12-15');
      result.current.updateField('evento', 'Festa');
    });

    expect(result.current.fields.servico).toBe('Catering');
    expect(result.current.fields.data).toBe('2024-12-15');
    expect(result.current.fields.evento).toBe('Festa');
  });

  test('preview updates correctly when field changes', () => {
    const { result } = renderHook(() => useMessageCompose(mockTemplates));

    act(() => {
      result.current.selectTemplate(mockTemplates[0].id);
      result.current.updateField('servico', 'Locação de Som');
      result.current.generatePreview('supplier-1', 'Empresa A');
    });

    const preview1 = result.current.previews['supplier-1'];

    act(() => {
      result.current.updateField('servico', 'Catering');
      result.current.generatePreview('supplier-1', 'Empresa A');
    });

    const preview2 = result.current.previews['supplier-1'];

    expect(preview1).not.toBe(preview2);
    expect(preview1).toContain('Locação de Som');
    expect(preview2).toContain('Catering');
  });
});
