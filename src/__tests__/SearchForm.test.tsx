/**
 * Tests for SearchForm component
 * Tests form rendering, input handling, and submission
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchForm } from '@/pages/SearchForm'
import * as suppliersModule from '@/utils/suppliers'
import type { Fornecedor } from '@/utils/types'

vi.mock('@/utils/suppliers')

describe('SearchForm component', () => {
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
    vi.mocked(suppliersModule.filterSuppliers).mockResolvedValue(mockSuppliers)
  })

  describe('Form rendering', () => {
    it('should render form with all required fields', () => {
      render(<SearchForm />)

      expect(screen.getByText(/Novo Pedido/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Nome do Orçamento/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Serviço/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Região/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Buscar Fornecedores/i })).toBeInTheDocument()
    })

    it('should render input fields with correct types', () => {
      render(<SearchForm />)

      const orcamentoInput = screen.getByLabelText(/Nome do Orçamento/i) as HTMLInputElement
      const servicoInput = screen.getByLabelText(/Serviço/i) as HTMLInputElement
      const regiaoInput = screen.getByLabelText(/Região/i) as HTMLInputElement

      expect(orcamentoInput.type).toBe('text')
      expect(servicoInput.type).toBe('text')
      expect(regiaoInput.type).toBe('text')
    })

    it('should render form with placeholder text', () => {
      render(<SearchForm />)

      expect(screen.getByPlaceholderText(/ex: Evento X/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/ex: catering/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/ex: São Paulo/i)).toBeInTheDocument()
    })
  })

  describe('Form input handling', () => {
    it('should update input values on change', async () => {
      const user = userEvent.setup()
      render(<SearchForm />)

      const orcamentoInput = screen.getByLabelText(/Nome do Orçamento/i) as HTMLInputElement
      const servicoInput = screen.getByLabelText(/Serviço/i) as HTMLInputElement
      const regiaoInput = screen.getByLabelText(/Região/i) as HTMLInputElement

      await user.type(orcamentoInput, 'Evento X')
      await user.type(servicoInput, 'catering')
      await user.type(regiaoInput, 'SP')

      expect(orcamentoInput.value).toBe('Evento X')
      expect(servicoInput.value).toBe('catering')
      expect(regiaoInput.value).toBe('SP')
    })

    it('should allow typing multiple words', async () => {
      const user = userEvent.setup()
      render(<SearchForm />)

      const orcamentoInput = screen.getByLabelText(/Nome do Orçamento/i) as HTMLInputElement

      await user.type(orcamentoInput, 'Casamento de João e Maria')

      expect(orcamentoInput.value).toBe('Casamento de João e Maria')
    })
  })

  describe('Form submission', () => {
    it('should show loading state during search', async () => {
      const user = userEvent.setup()
      vi.mocked(suppliersModule.filterSuppliers).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockSuppliers), 200))
      )

      render(<SearchForm />)

      const servicoInput = screen.getByLabelText(/Serviço/i)
      const regiaoInput = screen.getByLabelText(/Região/i)
      const searchButton = screen.getByRole('button', { name: /Buscar Fornecedores/i })

      await user.type(servicoInput, 'catering')
      await user.type(regiaoInput, 'SP')

      fireEvent.click(searchButton)

      // Button should be disabled during loading
      expect(searchButton).toBeDisabled()

      // Should show loading message
      expect(screen.getByText(/Buscando/i)).toBeInTheDocument()

      await waitFor(() => {
        expect(searchButton).not.toBeDisabled()
      })
    })

    it('should display results after successful search', async () => {
      const user = userEvent.setup()
      render(<SearchForm />)

      const servicoInput = screen.getByLabelText(/Serviço/i)
      const regiaoInput = screen.getByLabelText(/Região/i)
      const searchButton = screen.getByRole('button', { name: /Buscar Fornecedores/i })

      await user.type(servicoInput, 'catering')
      await user.type(regiaoInput, 'SP')
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/Resultados da Busca/i)).toBeInTheDocument()
      })

      expect(screen.getByText('Catering Delícia')).toBeInTheDocument()
      expect(screen.getByText('cateringdelicia.com.br')).toBeInTheDocument()
    })

    it('should display error message when search fails', async () => {
      const user = userEvent.setup()
      vi.mocked(suppliersModule.filterSuppliers).mockRejectedValue(new Error('API Error'))

      render(<SearchForm />)

      const servicoInput = screen.getByLabelText(/Serviço/i)
      const regiaoInput = screen.getByLabelText(/Região/i)
      const searchButton = screen.getByRole('button', { name: /Buscar Fornecedores/i })

      await user.type(servicoInput, 'catering')
      await user.type(regiaoInput, 'SP')
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/Erro/i)).toBeInTheDocument()
        expect(screen.getByText(/API Error/i)).toBeInTheDocument()
      })
    })

    it('should show message when no suppliers found', async () => {
      const user = userEvent.setup()
      vi.mocked(suppliersModule.filterSuppliers).mockResolvedValue([])

      render(<SearchForm />)

      const servicoInput = screen.getByLabelText(/Serviço/i)
      const regiaoInput = screen.getByLabelText(/Região/i)
      const searchButton = screen.getByRole('button', { name: /Buscar Fornecedores/i })

      await user.type(servicoInput, 'decoracao')
      await user.type(regiaoInput, 'MG')
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/nenhum fornecedor/i)).toBeInTheDocument()
      })
    })

    it('should require service field before searching', async () => {
      const user = userEvent.setup()
      render(<SearchForm />)

      const searchButton = screen.getByRole('button', { name: /Buscar Fornecedores/i })

      await user.click(searchButton)

      expect(screen.getByText(/Preencha o serviço/i)).toBeInTheDocument()
      expect(suppliersModule.filterSuppliers).not.toHaveBeenCalled()
    })

    it('should allow searching without region', async () => {
      const user = userEvent.setup()
      render(<SearchForm />)

      const servicoInput = screen.getByLabelText(/Serviço/i)
      const searchButton = screen.getByRole('button', { name: /Buscar Fornecedores/i })

      await user.type(servicoInput, 'catering')
      await user.click(searchButton)

      await waitFor(() => {
        expect(suppliersModule.filterSuppliers).toHaveBeenCalled()
      })
    })
  })

  describe('Reset functionality', () => {
    it('should clear form on reset button click', async () => {
      const user = userEvent.setup()
      render(<SearchForm />)

      const orcamentoInput = screen.getByLabelText(/Nome do Orçamento/i) as HTMLInputElement
      const servicoInput = screen.getByLabelText(/Serviço/i) as HTMLInputElement
      const regiaoInput = screen.getByLabelText(/Região/i) as HTMLInputElement

      await user.type(orcamentoInput, 'Evento X')
      await user.type(servicoInput, 'catering')
      await user.type(regiaoInput, 'SP')

      const resetButton = screen.getByRole('button', { name: /Limpar/i })
      await user.click(resetButton)

      expect(orcamentoInput.value).toBe('')
      expect(servicoInput.value).toBe('')
      expect(regiaoInput.value).toBe('')
    })

    it('should clear results on reset', async () => {
      const user = userEvent.setup()
      render(<SearchForm />)

      const servicoInput = screen.getByLabelText(/Serviço/i)
      const regiaoInput = screen.getByLabelText(/Região/i)
      const searchButton = screen.getByRole('button', { name: /Buscar Fornecedores/i })

      await user.type(servicoInput, 'catering')
      await user.type(regiaoInput, 'SP')
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('Catering Delícia')).toBeInTheDocument()
      })

      const resetButton = screen.getByRole('button', { name: /Limpar/i })
      await user.click(resetButton)

      expect(screen.queryByText('Catering Delícia')).not.toBeInTheDocument()
    })
  })

  describe('Supplier result display', () => {
    it('should display supplier name and domain', async () => {
      const user = userEvent.setup()
      render(<SearchForm />)

      const servicoInput = screen.getByLabelText(/Serviço/i)
      const searchButton = screen.getByRole('button', { name: /Buscar Fornecedores/i })

      await user.type(servicoInput, 'catering')
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('Catering Delícia')).toBeInTheDocument()
        expect(screen.getByText('cateringdelicia.com.br')).toBeInTheDocument()
      })
    })

    it('should display supplier contact information', async () => {
      const user = userEvent.setup()
      render(<SearchForm />)

      const servicoInput = screen.getByLabelText(/Serviço/i)
      const searchButton = screen.getByRole('button', { name: /Buscar Fornecedores/i })

      await user.type(servicoInput, 'catering')
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('contato@cateringdelicia.com.br')).toBeInTheDocument()
      })
    })

    it('should display supplier address', async () => {
      const user = userEvent.setup()
      render(<SearchForm />)

      const servicoInput = screen.getByLabelText(/Serviço/i)
      const searchButton = screen.getByRole('button', { name: /Buscar Fornecedores/i })

      await user.type(servicoInput, 'catering')
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('São Paulo, SP')).toBeInTheDocument()
      })
    })
  })
})
