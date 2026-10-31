/**
 * Hook for managing email send operations
 * Handles state, progress tracking, error handling, and retry logic
 * Ensures send button is disabled during sending
 */

import { useState, useCallback } from 'react';
import { sendEmail } from '../utils/gmail';
import { checkIdempotency, recordSend } from '../utils/idempotency';

export interface SendEmailHookState {
  isSending: boolean;
  isButtonDisabled: boolean;
  canRetry: boolean;
  progress: {
    total: number;
    sent: number;
    failed: number;
  };
  errors: string[];
  successCount: number;
  failedCount: number;
  failedSupplierIds: string[];
}

export interface SendBatchResult {
  successCount: number;
  failedCount: number;
  errors: string[];
  failedSupplierIds: string[];
}

export interface EmailToSend {
  to: string;
  supplierId: string;
  pedidoId: string;
  pedidoFornecedorId?: string;
  message: string;
  subject?: string;
  /** Stored in envios instead of the final text, which stays only in the sender's Gmail */
  auditMessage?: string;
}

export interface UseSendEmailReturn extends SendEmailHookState {
  sendBatch: (emails: EmailToSend[]) => Promise<SendBatchResult>;
  clearErrors: () => void;
  resetProgress: () => void;
  enableRetry: () => void;
  disableRetry: () => void;
}

export function useSendEmail(): UseSendEmailReturn {
  const [isSending, setIsSending] = useState(false);
  const [canRetry, setCanRetry] = useState(false);
  const [progress, setProgress] = useState({
    total: 0,
    sent: 0,
    failed: 0,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [failedSupplierIds, setFailedSupplierIds] = useState<string[]>([]);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({ total: 0, sent: 0, failed: 0 });
    setSuccessCount(0);
    setFailedCount(0);
  }, []);

  const enableRetry = useCallback(() => {
    setCanRetry(true);
  }, []);

  const disableRetry = useCallback(() => {
    setCanRetry(false);
  }, []);

  const sendBatch = useCallback(
    async (emails: EmailToSend[]): Promise<SendBatchResult> => {
      clearErrors();
      resetProgress();
      setFailedSupplierIds([]);
      setCanRetry(false);

      setProgress({
        total: emails.length,
        sent: 0,
        failed: 0,
      });

      setIsSending(true);
      const newErrors: string[] = [];
      const retryableIds: string[] = [];
      let sentCount = 0;
      let failed = 0;

      for (const email of emails) {
        const audit = {
          pedidoFornecedorId: email.pedidoFornecedorId || '',
          supplierId: email.supplierId,
          pedidoId: email.pedidoId,
          message: email.auditMessage ?? email.message,
        };

        try {
          const isDuplicate = await checkIdempotency(email.supplierId, email.pedidoId);

          if (isDuplicate) {
            newErrors.push(`${email.to} já recebeu este pedido. O envio repetido foi bloqueado.`);
            failed++;
          } else {
            const result = await sendEmail({
              to: email.to,
              subject: email.subject ?? 'Pedido de orçamento',
              body: email.message,
              supplierId: email.supplierId,
              pedidoId: email.pedidoId,
              pedidoFornecedorId: email.pedidoFornecedorId,
            });

            if (result.success) {
              sentCount++;
              try {
                await recordSend({ ...audit, status: 'sucesso' });
              } catch {
                // Not retryable: the email already left, so a retry would send it twice
                newErrors.push(`E-mail enviado para ${email.to}, mas o envio não foi registrado no pedido.`);
              }
            } else {
              newErrors.push(`Falha ao enviar para ${email.to}: ${result.error || 'erro desconhecido'}`);
              failed++;
              retryableIds.push(email.supplierId);
              await recordSend({ ...audit, status: 'falhou', errorMessage: result.error });
            }
          }
        } catch (err) {
          const reason = err instanceof Error ? err.message : 'erro desconhecido';
          if (!retryableIds.includes(email.supplierId)) {
            newErrors.push(`Falha ao enviar para ${email.to}: ${reason}`);
            failed++;
            retryableIds.push(email.supplierId);
          }
        }

        const currentSent = sentCount;
        const currentFailed = failed;
        setProgress((prev) => ({ ...prev, sent: currentSent, failed: currentFailed }));
      }

      setErrors(newErrors);
      setSuccessCount(sentCount);
      setFailedCount(failed);
      setFailedSupplierIds(retryableIds);
      setCanRetry(retryableIds.length > 0);
      setIsSending(false);

      return {
        successCount: sentCount,
        failedCount: failed,
        errors: newErrors,
        failedSupplierIds: retryableIds,
      };
    },
    [clearErrors, resetProgress]
  );

  return {
    isSending,
    isButtonDisabled: isSending,
    canRetry,
    progress,
    errors,
    successCount,
    failedCount,
    failedSupplierIds,
    sendBatch,
    clearErrors,
    resetProgress,
    enableRetry,
    disableRetry,
  };
}
