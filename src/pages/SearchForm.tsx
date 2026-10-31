/**
 * SearchForm Component
 * Form for creating a new quote request (pedido) and searching for suppliers
 * Users enter: nome do orçamento, serviço, região
 * Then suppliers are loaded and displayed below
 */

import React from 'react'
import { useSearchForm } from '@/hooks/useSearchForm'
import { contactIndicators, indicatorLabels, indicatorIcons, indicatorColors } from '@/utils/indicators'
import type { Fornecedor } from '@/utils/types'

export interface SearchResult {
  orcamento_nome: string
  servico: string
  regiao: string
  suppliers: Fornecedor[]
}

interface SearchFormProps {
  /** When provided, the results are handed to the next step instead of listed here */
  onContinue?: (result: SearchResult) => void
}

export function SearchForm({ onContinue }: SearchFormProps = {}): JSX.Element {
  const form = useSearchForm()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    form.search()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Novo Pedido</h1>
          <p className="text-gray-600">
            Informe o serviço e a região para buscar fornecedores cadastrados
          </p>
        </div>

        {/* Form Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSubmit}>
            {/* Nome do Orçamento */}
            <div className="mb-6">
              <label htmlFor="orcamento_nome" className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Orçamento
              </label>
              <input
                id="orcamento_nome"
                type="text"
                placeholder="ex: Evento X"
                value={form.orcamento_nome}
                onChange={e => form.setOrcamento_nome(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
              <p className="text-xs text-gray-500 mt-1">Será usado como referência nos envios</p>
            </div>

            {/* Serviço */}
            <div className="mb-6">
              <label htmlFor="servico" className="block text-sm font-medium text-gray-700 mb-2">
                Serviço <span className="text-red-500">*</span>
              </label>
              <input
                id="servico"
                type="text"
                placeholder="ex: catering"
                value={form.servico}
                onChange={e => form.setServico(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
              <p className="text-xs text-gray-500 mt-1">Campo obrigatório</p>
            </div>

            {/* Região */}
            <div className="mb-6">
              <label htmlFor="regiao" className="block text-sm font-medium text-gray-700 mb-2">
                Região
              </label>
              <input
                id="regiao"
                type="text"
                placeholder="ex: São Paulo"
                value={form.regiao}
                onChange={e => form.setRegiao(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
              <p className="text-xs text-gray-500 mt-1">Opcional. Deixe em branco para buscar em todas as regiões</p>
            </div>

            {/* Error Message */}
            {form.error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  <strong>Erro:</strong> {form.error}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={form.loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition"
              >
                {form.loading ? 'Buscando...' : 'Buscar Fornecedores'}
              </button>
              <button
                type="button"
                onClick={() => form.reset()}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition"
              >
                Limpar
              </button>
            </div>
          </form>
        </div>

        {onContinue && form.suppliers.length > 0 && (
          <button
            type="button"
            onClick={() =>
              onContinue({
                orcamento_nome: form.orcamento_nome,
                servico: form.servico,
                regiao: form.regiao,
                suppliers: form.suppliers,
              })
            }
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition"
          >
            Selecionar fornecedores ({form.suppliers.length})
          </button>
        )}

        {/* Results Section */}
        {!onContinue && form.suppliers.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Resultados da Busca ({form.suppliers.length})
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {form.orcamento_nome ? `Orçamento: ${form.orcamento_nome}` : 'Nenhum nome de orçamento'}
              </p>
            </div>

            <div className="divide-y divide-gray-200">
              {form.suppliers.map(supplier => {
                const indicator = contactIndicators(supplier)
                const label = indicatorLabels[indicator]
                const icon = indicatorIcons[indicator]
                const colorClass = indicatorColors[indicator]

                return (
                  <div key={supplier.id} className="px-6 py-4 hover:bg-gray-50 transition">
                    {/* Supplier Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{supplier.nome}</h3>
                        {supplier.dominio && (
                          <p className="text-sm text-gray-600">{supplier.dominio}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-4 ${colorClass}`}>
                        {icon} {label}
                      </span>
                    </div>

                    {/* Contact Information */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      {supplier.endereco && (
                        <div className="text-sm text-gray-600">
                          <p className="font-medium text-gray-700">Endereço</p>
                          <p>{supplier.endereco}</p>
                        </div>
                      )}
                      {supplier.email && (
                        <div className="text-sm text-gray-600">
                          <p className="font-medium text-gray-700">E-mail</p>
                          <a href={`mailto:${supplier.email}`} className="text-blue-600 hover:underline">
                            {supplier.email}
                          </a>
                        </div>
                      )}
                      {supplier.whatsapp_link && (
                        <div className="text-sm text-gray-600">
                          <p className="font-medium text-gray-700">WhatsApp</p>
                          <a href={supplier.whatsapp_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            Iniciar conversa
                          </a>
                        </div>
                      )}
                      {supplier.whatsapp_numero && !supplier.whatsapp_link && (
                        <div className="text-sm text-gray-600">
                          <p className="font-medium text-gray-700">WhatsApp</p>
                          <a href={`https://wa.me/${supplier.whatsapp_numero.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {supplier.whatsapp_numero}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Services */}
                    {supplier.servicos && supplier.servicos.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {supplier.servicos.map(servico => (
                          <span key={servico} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {servico}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* No Results Message */}
        {!form.loading && form.suppliers.length === 0 && form.searchedFor && !form.error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800">
              Ainda não temos fornecedores salvos para "<strong>{form.searchedFor.servico}</strong>"
              {form.searchedFor.regiao && ` na região "${form.searchedFor.regiao}"`}.
            </p>
            <p className="text-sm text-yellow-700 mt-2">
              Esta busca só mostra fornecedores já coletados do Google Maps. Tente outro termo ou peça a
              coleta desse serviço e região.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
