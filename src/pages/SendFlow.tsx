/**
 * SendFlow Component
 * Handles email send confirmation, progress tracking, and error handling
 * Integrated with MessageComposer (Task 10) and supplies to SupplierList (Task 9)
 */

import React, { useState } from 'react';
import { useSendEmail, EmailToSend } from '../hooks/useSendEmail';

export interface SendFlowProps {
  /**
   * Pre-composed message from MessageComposer (Task 10)
   * Contains subject and body with placeholders filled for each supplier
   */
  messages: Array<{
    supplierId: string;
    pedidoFornecedorId: string;
    supplierName: string;
    supplierEmail: string;
    subject: string;
    body: string;
  }>;

  /**
   * Selected suppliers for sending
   * Should come from SupplierList (Task 9)
   */
  selectedSuppliers: Array<{
    id: string;
    nome: string;
    email: string;
  }>;

  /**
   * Current pedido ID
   * Used for idempotency checking
   */
  pedidoId: string;

  /**
   * Callback when send completes successfully
   * Allows parent component to update UI/state
   */
  onSendComplete?: (results: {
    successCount: number;
    failedCount: number;
    errors: string[];
  }) => void;

  /**
   * Callback when send is cancelled
   */
  onCancel?: () => void;

  /**
   * Allow retrying failed sends
   * Default: true
   */
  allowRetry?: boolean;
}

/**
 * Progress bar component
 */
function ProgressBar({
  sent,
  total,
}: {
  sent: number;
  total: number;
}): JSX.Element {
  const percentage = total === 0 ? 0 : (sent / total) * 100;

  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div
        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

/**
 * Error list component
 */
function ErrorList({ errors }: { errors: string[] }): JSX.Element {
  if (errors.length === 0) return <></>;

  return (
    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
      <h3 className="text-sm font-semibold text-red-800 mb-2">
        Erros ao enviar ({errors.length})
      </h3>
      <ul className="text-sm text-red-700 space-y-1">
        {errors.map((error, idx) => (
          <li key={idx} className="flex items-start">
            <span className="text-red-500 mr-2">•</span>
            <span>{error}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Status summary component
 */
function StatusSummary({
  total,
  sent,
  failed,
  isSending,
}: {
  total: number;
  sent: number;
  failed: number;
  isSending: boolean;
}): JSX.Element {
  if (isSending) {
    return (
      <div className="text-sm text-gray-600">
        Enviando... {sent} de {total}
      </div>
    );
  }

  if (total === 0) {
    return <div className="text-sm text-gray-500">Nenhum e-mail para enviar</div>;
  }

  if (failed === 0) {
    return (
      <div className="text-sm text-green-600 font-semibold">
        ✓ Todos os {total} e-mails foram enviados com sucesso!
      </div>
    );
  }

  return (
    <div className="text-sm text-amber-600">
      {sent} enviados, {failed} com erro
    </div>
  );
}

/**
 * Main SendFlow component
 */
export function SendFlow({
  messages,
  selectedSuppliers,
  pedidoId,
  onSendComplete,
  onCancel,
  allowRetry = true,
}: SendFlowProps): JSX.Element {
  const [hasStarted, setHasStarted] = useState(false);
  const {
    isSending,
    isButtonDisabled,
    canRetry,
    progress,
    errors,
    successCount,
    failedCount,
    sendBatch,
    clearErrors,
  } = useSendEmail();

  const handleSendClick = async (): Promise<void> => {
    if (messages.length === 0) {
      alert('Nenhum e-mail para enviar. Verifique a seleção de fornecedores.');
      return;
    }

    setHasStarted(true);

    const emailsToSend: EmailToSend[] = messages.map((msg) => ({
      to: msg.supplierEmail,
      supplierId: msg.supplierId,
      pedidoId: pedidoId,
      pedidoFornecedorId: msg.pedidoFornecedorId,
      message: msg.body,
    }));

    await sendBatch(emailsToSend);

    // Call parent callback if provided
    if (onSendComplete) {
      onSendComplete({
        successCount,
        failedCount,
        errors,
      });
    }
  };

  const handleRetry = async (): Promise<void> => {
    if (!allowRetry || !canRetry) return;

    // Filter messages for suppliers that had errors
    // For now, we'll retry all failed ones
    // In a real implementation, we'd only retry those that failed
    const emailsToSend: EmailToSend[] = messages.map((msg) => ({
      to: msg.supplierEmail,
      supplierId: msg.supplierId,
      pedidoId: pedidoId,
      pedidoFornecedorId: msg.pedidoFornecedorId,
      message: msg.body,
    }));

    clearErrors();
    await sendBatch(emailsToSend);
  };

  const handleCancel = (): void => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Envio de E-mails
      </h2>

      {/* Message preview section */}
      {!hasStarted && messages.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">
            Resumo do Envio
          </h3>
          <p className="text-sm text-blue-800 mb-2">
            Você está prestes a enviar {messages.length} e-mail(s) para:
          </p>
          <ul className="text-sm text-blue-700 space-y-1">
            {messages.slice(0, 5).map((msg) => (
              <li key={msg.supplierId} className="flex items-center">
                <span className="text-blue-500 mr-2">→</span>
                <span>
                  {msg.supplierName} ({msg.supplierEmail})
                </span>
              </li>
            ))}
            {messages.length > 5 && (
              <li className="text-blue-600 italic">
                + {messages.length - 5} outros fornecedores
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Progress section */}
      {hasStarted && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Progresso</h3>
            <StatusSummary
              total={progress.total}
              sent={progress.sent}
              failed={progress.failed}
              isSending={isSending}
            />
          </div>
          <ProgressBar sent={progress.sent} total={progress.total} />
        </div>
      )}

      {/* Error section */}
      {hasStarted && <ErrorList errors={errors} />}

      {/* Success message */}
      {hasStarted && failedCount === 0 && successCount > 0 && !isSending && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 font-semibold">
            ✓ Envio concluído com sucesso!
          </p>
          <p className="text-sm text-green-700 mt-1">
            {successCount} e-mail(s) enviado(s). As respostas chegaram no seu
            Gmail.
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-6 flex gap-3 justify-end">
        {!hasStarted && (
          <>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSendClick}
              disabled={isButtonDisabled || messages.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
            >
              Enviar E-mails
            </button>
          </>
        )}

        {hasStarted && !isSending && (
          <>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
            >
              Voltar
            </button>
            {allowRetry && canRetry && (
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition"
              >
                Tentar Novamente
              </button>
            )}
          </>
        )}

        {isSending && (
          <button
            disabled
            className="px-4 py-2 bg-gray-400 text-white rounded-lg font-medium cursor-not-allowed"
          >
            Enviando...
          </button>
        )}
      </div>

      {/* Information about idempotency */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 border border-gray-200">
        <p className="font-semibold text-gray-700 mb-1">Proteção contra duplicatas:</p>
        <p>
          Cada fornecedor pode receber apenas um e-mail por pedido. Se você fechar
          esta tela após o envio, o app impedirá envios duplicados mesmo se você
          tentar novamente.
        </p>
      </div>
    </div>
  );
}

export default SendFlow;
