/**
 * Hook for managing email send operations
 * Handles state, progress tracking, error handling, and retry logic
 * Ensures send button is disabled during sending
 */

import { useState, useCallback } from 'react';
import { sendEmail, SendEmailInput, SendEmailResult } from '../utils/gmail';
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
}

export interface EmailToSend {
  to: string;
  supplierId: string;
  pedidoId: string;
  pedidoFornecedorId?: string;
  message: string;
}

export interface UseSendEmailReturn extends SendEmailHookState {
  sendBatch: (emails: EmailToSend[]) => Promise<void>;
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
    async (emails: EmailToSend[]): Promise<void> => {
      // Clear previous errors and reset progress
      clearErrors();
      resetProgress();

      // Initialize progress
      setProgress({
        total: emails.length,
        sent: 0,
        failed: 0,
      });

      // Start sending
      setIsSending(true);
      const newErrors: string[] = [];
      let sentCount = 0;
      let failedCount = 0;

      for (const email of emails) {
        try {
          // Check idempotency - prevent duplicate sends
          const isDuplicate = await checkIdempotency(
            email.supplierId,
            email.pedidoId
          );

          if (isDuplicate) {
            const errorMsg = `Email to ${email.supplierId} in pedido ${email.pedidoId} has already been sent. Duplicate sends are blocked to prevent duplicates.`;
            newErrors.push(errorMsg);
            failedCount++;
            continue;
          }

          // Send the email
          const result = await sendEmail({
            to: email.to,
            subject: 'Pedido de Orçamento', // This will be set by MessageComposer
            body: email.message,
            supplierId: email.supplierId,
            pedidoId: email.pedidoId,
            pedidoFornecedorId: email.pedidoFornecedorId,
          });

          if (!result.success) {
            const errorMsg = `Failed to send to ${email.to}: ${result.error || 'Unknown error'}`;
            newErrors.push(errorMsg);
            failedCount++;

            // Record the failed send
            await recordSend({
              pedidoFornecedorId: email.pedidoFornecedorId || '',
              supplierId: email.supplierId,
              pedidoId: email.pedidoId,
              message: email.message,
              status: 'falhou',
              errorMessage: result.error,
            });
            continue;
          }

          // Record successful send
          await recordSend({
            pedidoFornecedorId: email.pedidoFornecedorId || '',
            supplierId: email.supplierId,
            pedidoId: email.pedidoId,
            message: email.message,
            status: 'sucesso',
          });

          sentCount++;
        } catch (err) {
          const errorMsg =
            err instanceof Error
              ? err.message
              : `Error sending to ${email.supplierId}: Unknown error`;
          newErrors.push(errorMsg);
          failedCount++;
        }

        // Update progress
        setProgress((prev) => ({
          ...prev,
          sent: sentCount,
          failed: failedCount,
        }));
      }

      // Update final state
      setErrors(newErrors);
      setSuccessCount(sentCount);
      setFailedCount(failedCount);

      // Only allow retry if there were failures
      if (failedCount > 0) {
        setCanRetry(true);
      }

      // Stop sending
      setIsSending(false);
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
    sendBatch,
    clearErrors,
    resetProgress,
    enableRetry,
    disableRetry,
  };
}
