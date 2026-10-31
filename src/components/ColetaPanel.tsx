/**
 * Lets the team collect suppliers from Google Maps when a search finds nothing
 */

import { useEffect, useState } from 'react';
import { carregarColeta, coletaTravada, pedirColeta, type Coleta } from '@/utils/coletas';

const POLL_INTERVAL_MS = 10000;

interface ColetaPanelProps {
  servico: string;
  regiao: string;
  /** Called when the collection found suppliers, to search again */
  onFound: () => void;
}

export function ColetaPanel({ servico, regiao, onFound }: ColetaPanelProps) {
  const [coleta, setColeta] = useState<Coleta | null>(null);
  const [pedindo, setPedindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const emAndamento = coleta?.status === 'pendente' || coleta?.status === 'rodando';
  const coletaId = emAndamento ? coleta?.id : null;

  useEffect(() => {
    if (!coletaId) return;

    const timer = setInterval(async () => {
      try {
        const atual = await carregarColeta(coletaId);
        if (coletaTravada(atual)) {
          setColeta(null);
          setErro('A coleta demorou demais. Tente novamente.');
          return;
        }
        setColeta(atual);
        if (atual.status === 'concluida' && (atual.encontrados ?? 0) > 0) {
          onFound();
        }
      } catch {
        // A network failure while waiting is temporary: the next check tries again
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [coletaId]);

  const pedir = async () => {
    setPedindo(true);
    setErro(null);
    setColeta(null);
    try {
      setColeta(await pedirColeta(servico, regiao));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível pedir a coleta.');
    } finally {
      setPedindo(false);
    }
  };

  if (!regiao) {
    return (
      <p className="text-sm text-yellow-800 mt-3">
        Para buscar novos fornecedores no Google Maps, preencha a região e clique em Buscar Fornecedores de novo.
      </p>
    );
  }

  if (emAndamento) {
    return (
      <p role="status" className="text-sm font-medium text-blue-800 mt-3">
        ⏳ Buscando no Google Maps... Isso leva alguns minutos. Os resultados aparecem aqui sozinhos, e você pode deixar
        esta tela aberta enquanto faz outra coisa.
      </p>
    );
  }

  return (
    <div className="mt-4">
      {coleta?.status === 'concluida' && (
        <p className="text-sm text-yellow-800 mb-3">
          A busca no Google Maps terminou sem nenhum fornecedor. Tente outro termo ou região.
        </p>
      )}
      {(coleta?.status === 'falhou' || erro) && (
        <p role="alert" className="text-sm text-red-700 mb-3">
          {erro ?? coleta?.erro ?? 'A coleta falhou. Tente novamente mais tarde.'}
        </p>
      )}
      <button
        type="button"
        onClick={pedir}
        disabled={pedindo}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition"
      >
        {pedindo ? 'Pedindo...' : 'Buscar no Google Maps'}
      </button>
    </div>
  );
}
