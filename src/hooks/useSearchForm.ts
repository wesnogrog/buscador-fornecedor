/**
 * Custom hook for managing search form state and supplier filtering
 * Handles form inputs, loading states, error handling, and Supabase queries
 */

import { useState, useCallback } from 'react'
import { filterSuppliers } from '@/utils/suppliers'
import type { Fornecedor } from '@/utils/types'

export interface SearchFormState {
  orcamento_nome: string
  servico: string
  regiao: string
  suppliers: Fornecedor[]
  loading: boolean
  error: string | null
}

export interface SearchFormActions {
  setOrcamento_nome: (value: string) => void
  setServico: (value: string) => void
  setRegiao: (value: string) => void
  search: () => Promise<void>
  reset: () => void
}

export type UseSearchFormReturn = SearchFormState & SearchFormActions

/**
 * Hook for managing search form state and supplier filtering
 * @returns Object containing form state and action functions
 */
export function useSearchForm(): UseSearchFormReturn {
  const [orcamento_nome, setOrcamento_nome] = useState('')
  const [servico, setServico] = useState('')
  const [regiao, setRegiao] = useState('')
  const [suppliers, setSuppliers] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Search for suppliers matching the form criteria
   */
  const search = useCallback(async () => {
    // Validate required fields
    if (!servico || servico.trim() === '') {
      setError('Por favor, preencha o serviço')
      setSuppliers([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const results = await filterSuppliers(servico, regiao || null)
      setSuppliers(results)

      if (results.length === 0) {
        setError(null) // No error, just no results
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar fornecedores'
      setError(message)
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }, [servico, regiao])

  /**
   * Reset all form fields and clear results
   */
  const reset = useCallback(() => {
    setOrcamento_nome('')
    setServico('')
    setRegiao('')
    setSuppliers([])
    setError(null)
  }, [])

  return {
    orcamento_nome,
    servico,
    regiao,
    suppliers,
    loading,
    error,
    setOrcamento_nome,
    setServico,
    setRegiao,
    search,
    reset,
  }
}
