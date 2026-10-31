/**
 * Tests for supplier filtering logic
 * Tests the filterSuppliers utility function with mock data
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { filterSuppliers, formatPhone, phoneHref } from '@/utils/suppliers'
import { supabase } from '@/utils/supabase'
import type { Fornecedor } from '@/utils/types'

vi.mock('@/utils/supabase')

describe('filterSuppliers', () => {
  const mockSuppliers: Fornecedor[] = [
    {
      id: '1',
      nome: 'Catering Delícia',
      dominio: 'cateringdelicia.com.br',
      endereco: 'São Paulo, SP',
      servicos: ['catering', 'buffet'],
      regiao: 'SP',
      email: 'contato@cateringdelicia.com.br',
      whatsapp_link: 'https://wa.me/5511999999999',
      whatsapp_numero: null,
      data_extracao: '2026-10-31T10:00:00Z',
      created_at: '2026-10-31T10:00:00Z',
      updated_at: '2026-10-31T10:00:00Z',
    },
    {
      id: '2',
      nome: 'Som e Iluminação Pro',
      dominio: 'somilumipro.com.br',
      endereco: 'São Paulo, SP',
      servicos: ['som', 'iluminacao'],
      regiao: 'SP',
      email: 'orcamentos@somilumipro.com.br',
      whatsapp_link: null,
      whatsapp_numero: '11988888888',
      data_extracao: '2026-10-31T10:00:00Z',
      created_at: '2026-10-31T10:00:00Z',
      updated_at: '2026-10-31T10:00:00Z',
    },
    {
      id: '3',
      nome: 'Catering Campinas',
      dominio: 'cateringcampinas.com.br',
      endereco: 'Campinas, SP',
      servicos: ['catering'],
      regiao: 'Campinas',
      email: 'contato@cateringcampinas.com.br',
      whatsapp_link: 'https://wa.me/5519999999999',
      whatsapp_numero: null,
      data_extracao: '2026-10-31T10:00:00Z',
      created_at: '2026-10-31T10:00:00Z',
      updated_at: '2026-10-31T10:00:00Z',
    },
    {
      id: '4',
      nome: 'Som Rio',
      dominio: 'somrio.com.br',
      endereco: 'Rio de Janeiro, RJ',
      servicos: ['som'],
      regiao: 'RJ',
      email: null,
      whatsapp_link: null,
      whatsapp_numero: null,
      data_extracao: '2026-10-31T10:00:00Z',
      created_at: '2026-10-31T10:00:00Z',
      updated_at: '2026-10-31T10:00:00Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Filtering by service and region', () => {
    it('should return suppliers matching service and region', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        contains: vi.fn().mockResolvedValue({ data: [mockSuppliers[0]], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await filterSuppliers('catering', 'SP')

      expect(supabase.from).toHaveBeenCalledWith('fornecedores')
      expect(mockQuery.select).toHaveBeenCalled()
      expect(mockQuery.ilike).toHaveBeenCalledWith('regiao', 'SP')
      expect(mockQuery.contains).toHaveBeenCalledWith('servicos', ['catering'])
      expect(result).toEqual([mockSuppliers[0]])
    })

    it('should filter by service with case-insensitive matching', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        contains: vi.fn().mockResolvedValue({ data: [mockSuppliers[0]], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await filterSuppliers('CATERING', 'SP')

      // Should normalize service to lowercase
      expect(mockQuery.contains).toHaveBeenCalledWith('servicos', ['catering'])
    })

    it('should escape wildcards in the region', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        contains: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await filterSuppliers('catering', 'São%Paulo')

      expect(mockQuery.ilike).toHaveBeenCalledWith('regiao', 'São\\%Paulo')
    })

    it('should match the region ignoring case', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        contains: vi.fn().mockResolvedValue({ data: [mockSuppliers[2]], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await filterSuppliers('catering', 'Campinas')

      expect(mockQuery.ilike).toHaveBeenCalledWith('regiao', 'Campinas')
    })

    it('should return empty array when no suppliers match', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        contains: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await filterSuppliers('decoracao', 'MG')

      expect(result).toEqual([])
    })

    it('should report a database failure instead of returning no suppliers', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        contains: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(filterSuppliers('catering', 'SP')).rejects.toThrow('Database error')
    })

    it('should return multiple suppliers when they match', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        contains: vi.fn().mockResolvedValue({
          data: [mockSuppliers[0], mockSuppliers[1]],
          error: null,
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await filterSuppliers('som', 'SP')

      expect(result).toHaveLength(2)
    })
  })

  describe('Filtering by service only (no region)', () => {
    it('should allow filtering by service without region', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        contains: vi.fn().mockResolvedValue({
          data: [mockSuppliers[0]],
          error: null,
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await filterSuppliers('catering', null)

      expect(supabase.from).toHaveBeenCalledWith('fornecedores')
      expect(mockQuery.select).toHaveBeenCalled()
      expect(mockQuery.contains).toHaveBeenCalledWith('servicos', ['catering'])
      expect(result).toEqual([mockSuppliers[0]])
    })
  })

  describe('Edge cases', () => {
    it('should trim whitespace from service and region', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        contains: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await filterSuppliers('  catering  ', '  SP  ')

      expect(mockQuery.ilike).toHaveBeenCalledWith('regiao', 'SP')
      expect(mockQuery.contains).toHaveBeenCalledWith('servicos', ['catering'])
    })

    it('should handle empty string inputs', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        contains: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await filterSuppliers('', null)

      // Should return empty array for empty service
      expect(result).toEqual([])
    })

    it('should handle special characters in service names', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        contains: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await filterSuppliers('som & iluminação', 'SP')

      expect(mockQuery.contains).toHaveBeenCalledWith('servicos', ['som & iluminação'])
    })
  })
})

describe('formatPhone', () => {
  it('formats landlines and mobiles with the country code', () => {
    expect(formatPhone('551932321234')).toBe('(19) 3232-1234')
    expect(formatPhone('5519999953561')).toBe('(19) 99995-3561')
  })

  it('keeps a number in another format as it came', () => {
    expect(formatPhone('0800 123 4567')).toBe('0800 123 4567')
  })
})

describe('phoneHref', () => {
  it('adds the plus sign only to numbers with the country code', () => {
    expect(phoneHref('551932321234')).toBe('tel:+551932321234')
    expect(phoneHref('0800 123 4567')).toBe('tel:08001234567')
  })
})
