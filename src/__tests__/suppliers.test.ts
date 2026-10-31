/**
 * Tests for supplier filtering logic
 * Tests the filterSuppliers utility function with mock data
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { filterSuppliers, formatPhone, phoneHref } from '@/utils/suppliers'
import { supabase } from '@/utils/supabase'
import type { Fornecedor } from '@/utils/types'

vi.mock('@/utils/supabase', () => ({ supabase: { rpc: vi.fn() } }))

describe('filterSuppliers', () => {
  const supplier = { id: '1', nome: 'Som Bom' } as Fornecedor

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [supplier], error: null } as any)
  })

  it('searches by service and region in the database', async () => {
    const result = await filterSuppliers('som', 'Niterói')

    expect(supabase.rpc).toHaveBeenCalledWith('buscar_fornecedores', { p_servico: 'som', p_regiao: 'Niterói' })
    expect(result).toEqual([supplier])
  })

  it('searches every region when none is given', async () => {
    await filterSuppliers('som', null)
    await filterSuppliers('som', '   ')

    expect(supabase.rpc).toHaveBeenCalledTimes(2)
    expect(supabase.rpc).toHaveBeenCalledWith('buscar_fornecedores', { p_servico: 'som', p_regiao: null })
  })

  it('trims spaces from service and region', async () => {
    await filterSuppliers('  som  ', '  Niterói  ')

    expect(supabase.rpc).toHaveBeenCalledWith('buscar_fornecedores', { p_servico: 'som', p_regiao: 'Niterói' })
  })

  it('does not query the database without a service', async () => {
    await expect(filterSuppliers('', null)).resolves.toEqual([])
    await expect(filterSuppliers('   ', 'SP')).resolves.toEqual([])

    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('returns an empty list when nothing matches', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any)

    await expect(filterSuppliers('som', 'MG')).resolves.toEqual([])
  })

  it('reports a database failure instead of returning no suppliers', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: new Error('Database error') } as any)

    await expect(filterSuppliers('som', 'SP')).rejects.toThrow('Database error')
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
