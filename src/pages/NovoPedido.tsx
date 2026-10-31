import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SearchForm, type SearchResult } from '@/pages/SearchForm'
import { Results } from '@/pages/Results'
import { MessageComposer } from '@/pages/MessageComposer'
import { SendFlow } from '@/pages/SendFlow'
import { WhatsAppButton } from '@/components/WhatsAppButton'
import { supabase } from '@/utils/supabase'
import { loadModelos } from '@/utils/modelos'
import { addPedidoFornecedores, createPedido, loadContatosAnteriores, type ContatoAnterior } from '@/utils/pedidos'
import { formatPhone } from '@/utils/suppliers'
import { recordSend } from '@/utils/idempotency'
import { whatsappPhone, type Canais } from '@/utils/indicators'
import type { TemplateFields } from '@/utils/template'
import type { Fornecedor, Modelo } from '@/utils/types'

type Step = 'busca' | 'selecao' | 'mensagem' | 'envio'

interface Destino {
  fornecedor: Fornecedor
  pedidoFornecedorId: string
  corpo: string
  canais: Canais
}

export function NovoPedido() {
  const [step, setStep] = useState<Step>('busca')
  const [busca, setBusca] = useState<SearchResult | null>(null)
  const [contatosAnteriores, setContatosAnteriores] = useState<Record<string, ContatoAnterior>>({})
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [modelos, setModelos] = useState<Modelo[]>([])
  const [modelo, setModelo] = useState<Modelo | null>(null)
  const [destinos, setDestinos] = useState<Destino[]>([])
  const [pedidoId, setPedidoId] = useState<string | null>(null)
  const [whatsappEnviados, setWhatsappEnviados] = useState<Set<string>>(new Set())
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const pedidoIdRef = useRef<string | null>(null)

  useEffect(() => {
    loadModelos(supabase)
      .then(setModelos)
      .catch((err) => setErro(`Não foi possível carregar os modelos: ${err.message}`))
  }, [])

  const irParaEnvio = async ({
    selectedTemplate,
    fields,
    previews,
    canais,
  }: {
    selectedTemplate: Modelo
    fields: TemplateFields
    previews: Record<string, string>
    canais: Record<string, Canais>
  }) => {
    if (!busca) return
    setSalvando(true)
    setErro(null)
    try {
      // Going back and forward must reuse the pedido instead of creating a duplicate
      if (!pedidoIdRef.current) {
        const pedido = await createPedido(supabase, {
          nome: busca.orcamento_nome.trim() || busca.servico,
          servico: busca.servico,
          regiao: busca.regiao,
          data: fields.data || null,
          local: fields.local || null,
          prazo: fields.prazo || null,
        })
        pedidoIdRef.current = pedido.id
        setPedidoId(pedido.id)
      }

      const vinculos = await addPedidoFornecedores(supabase, pedidoIdRef.current, selecionados)
      setDestinos(
        vinculos.flatMap((vinculo) => {
          const fornecedor = busca.suppliers.find((s) => s.id === vinculo.fornecedor_id)
          if (!fornecedor) return []
          return [{
            fornecedor,
            pedidoFornecedorId: vinculo.id,
            corpo: previews[fornecedor.id] ?? '',
            canais: canais[fornecedor.id] ?? { email: false, whatsapp: false },
          }]
        })
      )
      setModelo(selectedTemplate)
      setStep('envio')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar o pedido')
    } finally {
      setSalvando(false)
    }
  }

  const marcarWhatsapp = async (destino: Destino) => {
    if (!pedidoId) return
    setErro(null)
    try {
      await recordSend({
        pedidoFornecedorId: destino.pedidoFornecedorId,
        supplierId: destino.fornecedor.id,
        pedidoId,
        message: modelo?.corpo ?? destino.corpo,
        status: 'sucesso',
        canal: 'whatsapp',
      })
      setWhatsappEnviados((prev) => new Set(prev).add(destino.fornecedor.id))
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível registrar o envio')
    }
  }

  const porEmail = destinos.filter((d) => d.fornecedor.email && d.canais.email)
  const porWhatsapp = destinos.filter((d) => whatsappPhone(d.fornecedor) && d.canais.whatsapp)
  const semCanal = destinos.filter((d) => !d.fornecedor.email && !whatsappPhone(d.fornecedor))

  return (
    <>
      {erro && (
        <div role="alert" className="max-w-4xl mx-auto mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {erro}
        </div>
      )}

      <div className={step === 'busca' ? '' : 'hidden'}>
        <SearchForm
          onContinue={(resultado) => {
            setBusca(resultado)
            setStep('selecao')
            setErro(null)
            setContatosAnteriores({})
            // The warning helps but does not block: the search stays usable if it fails
            loadContatosAnteriores(supabase, resultado.suppliers.map((s) => s.id))
              .then(setContatosAnteriores)
              .catch((err) => setErro(`Não foi possível verificar contatos anteriores: ${err.message}`))
          }}
        />
      </div>

      {busca && (
        <div className={step === 'selecao' ? '' : 'hidden'}>
          <div className="max-w-4xl mx-auto px-4 pt-6">
            <button onClick={() => setStep('busca')} className="text-sm font-medium text-blue-600 hover:text-blue-800">
              ← Voltar para a busca
            </button>
          </div>
          <Results
            suppliers={busca.suppliers}
            contatosAnteriores={contatosAnteriores}
            onSelectSuppliers={setSelecionados}
            onContinue={() => setStep('mensagem')}
          />
        </div>
      )}

      {busca && (
        <div className={step === 'mensagem' ? '' : 'hidden'}>
          <MessageComposer
            templates={modelos}
            suppliers={busca.suppliers}
            selectedSupplierIds={selecionados}
            onGoBack={() => setStep('selecao')}
            onProceed={irParaEnvio}
          />
          {salvando && <p className="text-center text-sm text-gray-600 pb-6">Salvando pedido...</p>}
        </div>
      )}

      {step === 'envio' && pedidoId && busca && (
        <div className="min-h-screen bg-gray-50 py-8 px-4 space-y-6">
          {porEmail.length > 0 && (
            <SendFlow
              pedidoId={pedidoId}
              messages={porEmail.map((d) => ({
                supplierId: d.fornecedor.id,
                pedidoFornecedorId: d.pedidoFornecedorId,
                supplierName: d.fornecedor.nome,
                supplierEmail: d.fornecedor.email as string,
                subject: `Pedido de orçamento: ${busca.servico}`,
                body: d.corpo,
                auditBody: modelo?.corpo,
              }))}
              onCancel={() => setStep('mensagem')}
            />
          )}

          {porWhatsapp.length > 0 && (
            <section className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
              <h2 className="text-xl font-bold text-gray-900 mb-1">WhatsApp</h2>
              <p className="text-sm text-gray-600 mb-4">
                Abra cada conversa, envie a mensagem e depois marque "Enviei".
              </p>
              <ul className="space-y-3">
                {porWhatsapp.map((d) => (
                  <li key={d.fornecedor.id} className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-medium text-gray-900">{d.fornecedor.nome}</span>
                    <span className="flex items-center gap-2">
                      <WhatsAppButton
                        phoneNumber={whatsappPhone(d.fornecedor)}
                        message={d.corpo}
                        label="Abrir WhatsApp"
                        ariaLabel={`Abrir WhatsApp de ${d.fornecedor.nome}`}
                        className="text-sm bg-green-50 text-green-700 px-3 py-1.5 rounded hover:bg-green-100"
                      />
                      {whatsappEnviados.has(d.fornecedor.id) ? (
                        <span className="text-sm font-medium text-green-700">✓ Enviei</span>
                      ) : (
                        <button
                          onClick={() => marcarWhatsapp(d)}
                          className="text-sm px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                          aria-label={`Marcar WhatsApp de ${d.fornecedor.nome} como enviado`}
                        >
                          Enviei
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {semCanal.length > 0 && (
            <p className="w-full max-w-2xl mx-auto text-sm text-amber-700">
              Sem e-mail ou WhatsApp:{' '}
              {semCanal
                .map((d) => (d.fornecedor.telefone ? `${d.fornecedor.nome} (ligar: ${formatPhone(d.fornecedor.telefone)})` : d.fornecedor.nome))
                .join(', ')}
              .
            </p>
          )}

          <div className="w-full max-w-2xl mx-auto flex justify-between">
            <button onClick={() => setStep('mensagem')} className="text-sm font-medium text-blue-600 hover:text-blue-800">
              ← Voltar para a mensagem
            </button>
            <Link to={`/pedido/${pedidoId}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
              Ver acompanhamento →
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
