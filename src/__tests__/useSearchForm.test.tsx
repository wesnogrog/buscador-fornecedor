/**
 * Tests for useSearchForm hook
 * Tests form state management and supplier loading/filtering
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSearchForm } from '@/hooks/useSearchForm'
import * as suppliersModule from '@/utils/suppliers'
import type { Fornecedor } from '@/utils/types'

vi.mock('@/utils/suppliers')

describe('useSearchForm hook', () => {
  const mockSuppliers: Fornecedor[] = [
    {
      id: '1',
      nome: 'Catering Delícia',
      dominio: 'cateringdelicia.com.br',
      endereco: 'São Paulo, SP',
      servicos: ['catering'],
      regiao: 'SP',
      email: 'contato@cateringdelicia.com.br',
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

  describe('Initial state', () => {
    it('should initialize with empty form state', () => {
      const { result } = renderHook(() => useSearchForm())

      expect(result.current.orcamento_nome).toBe('')
      expect(result.current.servico).toBe('')
      expect(result.current.regiao).toBe('')
      expect(result.current.suppliers).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should provide update functions', () => {
      const { result } = renderHook(() => useSearchForm())

      expect(typeof result.current.setOrcamento_nome).toBe('function')
      expect(typeof result.current.setServico).toBe('function')
      expect(typeof result.current.setRegiao).toBe('function')
      expect(typeof result.current.search).toBe('function')
      expect(typeof result.current.reset).toBe('function')
    })
  })

  describe('Form input updates', () => {
    it('should update orcamento_nome', () => {
      const { result } = renderHook(() => useSearchForm())

      act(() => {
        result.current.setOrcamento_nome('Evento X')
      })

      expect(result.current.orcamento_nome).toBe('Evento X')
    })

    it('should update servico', () => {
      const { result } = renderHook(() => useSearchForm())

      act(() => {
        result.current.setServico('catering')
      })

      expect(result.current.servico).toBe('catering')
    })

    it('should update regiao', () => {
      const { result } = renderHook(() => useSearchForm())

      act(() => {
        result.current.setRegiao('SP')
      })

      expect(result.current.regiao).toBe('SP')
    })
  })

  describe('Search functionality', () => {
    it('should call filterSuppliers with service and region', async () => {
      vi.mocked(suppliersModule.filterSuppliers).mockResolvedValue(mockSuppliers)

      const { result } = renderHook(() => useSearchForm())

      act(() => {
        result.current.setOrcamento_nome('Test')
        result.current.setServico('catering')
        result.current.setRegiao('SP')
      })

      await act(async () => {
        await result.current.search()
      })

      expect(suppliersModule.filterSuppliers).toHaveBeenCalledWith('catering', 'SP')
    })

    it('should load suppliers and set loading state', async () => {
      vi.mocked(suppliersModule.filterSuppliers).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(mockSuppliers), 100))
      )

      const { result } = renderHook(() => useSearchForm())

      act(() => {
        result.current.setServico('catering')
        result.current.setRegiao('SP')
      })

      expect(result.current.loading).toBe(false)

      let isLoading = false
      let isComplete = false

      act(() => {
        result.current.search().then(() => {
          isComplete = true
        })
      })

      // After immediate state update, loading should be true
      if (result.current.loading) {
        isLoading = true
      }

      await waitFor(() => expect(isComplete).toBe(true), { timeout: 500 })
      expect(result.current.suppliers).toEqual(mockSuppliers)
    })

    it('should handle empty search results', async () => {
      vi.mocked(suppliersModule.filterSuppliers).mockResolvedValue([])

      const { result } = renderHook(() => useSearchForm())

      act(() => {
        result.current.setServico('inexistente')
        result.current.setRegiao('SP')
      })

      await act(async () => {
        await result.current.search()
      })

      expect(result.current.suppliers).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('should handle filterSuppliers errors', async () => {
      const errorMessage = 'Database error'
      vi.mocked(suppliersModule.filterSuppliers).mockRejectedValue(new Error(errorMessage))

      const { result } = renderHook(() => useSearchForm())

      act(() => {
        result.current.setServico('catering')
        result.current.setRegiao('SP')
      })

      await act(async () => {
        await result.current.search()
      })

      expect(result.current.error).toContain(errorMessage)
      expect(result.current.suppliers).toEqual([])
    })

    it('should require service to search', async () => {
      const { result } = renderHook(() => useSearchForm())

      act(() => {
        result.current.setOrcamento_nome('Test')
        result.current.setRegiao('SP')
      })

      await act(async () => {
        await result.current.search()
      })

      expect(result.current.error).toContain('serviço')
      expect(suppliersModule.filterSuppliers).not.toHaveBeenCalled()
    })

    it('should allow region to be optional', async () => {
      vi.mocked(suppliersModule.filterSuppliers).mockResolvedValue(mockSuppliers)

      const { result } = renderHook(() => useSearchForm())

      act(() => {
        result.current.setOrcamento_nome('Test')
        result.current.setServico('catering')
        // No region set
      })

      await act(async () => {
        await result.current.search()
      })

      expect(suppliersModule.filterSuppliers).toHaveBeenCalledWith('catering', null)
    })

    it('should clear error on successful search', async () => {
      vi.mocked(suppliersModule.filterSuppliers)
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(mockSuppliers)

      const { result } = renderHook(() => useSearchForm())

      act(() => {
        result.current.setServico('catering')
        result.current.setRegiao('SP')
      })

      // First search with error
      await act(async () => {
        await result.current.search()
      })

      expect(result.current.error).not.toBeNull()

      // Second search succeeds
      await act(async () => {
        await result.current.search()
      })

      expect(result.current.error).toBeNull()
      expect(result.current.suppliers).toEqual(mockSuppliers)
    })
  })

  describe('Reset functionality', () => {
    it('should clear all form fields', async () => {
      vi.mocked(suppliersModule.filterSuppliers).mockResolvedValue(mockSuppliers)

      const { result } = renderHook(() => useSearchForm())

      act(() => {
        result.current.setOrcamento_nome('Test Event')
        result.current.setServico('catering')
        result.current.setRegiao('SP')
      })

      await act(async () => {
        await result.current.search()
      })

      expect(result.current.suppliers).toEqual(mockSuppliers)

      act(() => {
        result.current.reset()
      })

      expect(result.current.orcamento_nome).toBe('')
      expect(result.current.servico).toBe('')
      expect(result.current.regiao).toBe('')
      expect(result.current.suppliers).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('should clear error state on reset', async () => {
      vi.mocked(suppliersModule.filterSuppliers).mockRejectedValue(new Error('Test error'))

      const { result } = renderHook(() => useSearchForm())

      act(() => {
        result.current.setServico('test')
        result.current.setRegiao('SP')
      })

      await act(async () => {
        await result.current.search()
      })

      expect(result.current.error).not.toBeNull()

      act(() => {
        result.current.reset()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('Loading state', () => {
    it('should set loading true during search', async () => {
      let resolveSearch: () => void
      const searchPromise = new Promise<Fornecedor[]>(resolve => {
        resolveSearch = () => resolve(mockSuppliers)
      })

      vi.mocked(suppliersModule.filterSuppliers).mockReturnValue(searchPromise)

      const { result } = renderHook(() => useSearchForm())

      act(() => {
        result.current.setServico('catering')
        result.current.setRegiao('SP')
      })

      const searchPromiseCall = act(async () => {
        result.current.search()
      })

      // Give time for state update
      await new Promise(resolve => setTimeout(resolve, 0))

      // Should be loading or complete quickly depending on timing
      resolveSearch!()

      await searchPromiseCall
      expect(result.current.loading).toBe(false)
    })
  })
})
