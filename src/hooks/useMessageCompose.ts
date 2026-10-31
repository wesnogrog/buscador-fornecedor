/**
 * Hook for managing message composition state
 * Handles template selection, field updates, and preview generation
 */

import { useState, useCallback } from 'react';
import { fillTemplate, getMissingFields, type TemplateFields } from '../utils/template';
import type { Modelo } from '../utils/types';

export function useMessageCompose(templates: Modelo[]) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [fields, setFields] = useState<TemplateFields>({
    servico: '',
    evento: '',
    data: '',
    local: '',
    prazo: '',
  });
  const [generatedPreviews, setPreviews] = useState<Record<string, string>>({});
  // Text personalized by hand per supplier. Filling the fields again does not overwrite it
  const [edits, setEdits] = useState<Record<string, string>>({});

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;
  const previews = { ...generatedPreviews, ...edits };

  const editPreview = useCallback((supplierId: string, text: string) => {
    setEdits((prev) => ({ ...prev, [supplierId]: text }));
  }, []);

  const restorePreview = useCallback((supplierId: string) => {
    setEdits(({ [supplierId]: _removed, ...rest }) => rest);
  }, []);

  const selectTemplate = useCallback((templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
      // Clear previews when template changes
      setPreviews({});
      setEdits({});
    }
  }, [templates]);

  const updateField = useCallback((fieldName: keyof TemplateFields, value: string) => {
    setFields((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
    // Clear previews when field changes
    setPreviews({});
  }, []);

  const generatePreview = useCallback(
    (supplierId: string, supplierName: string) => {
      if (!selectedTemplate) return;

      const fieldsWithSupplier: TemplateFields = {
        ...fields,
        fornecedor: supplierName,
      };

      const preview = fillTemplate(selectedTemplate.corpo, fieldsWithSupplier);
      setPreviews((prev) => ({
        ...prev,
        [supplierId]: preview,
      }));
    },
    [selectedTemplate, fields]
  );

  const clear = useCallback(() => {
    setSelectedTemplateId(null);
    setFields({
      servico: '',
      evento: '',
      data: '',
      local: '',
      prazo: '',
    });
    setPreviews({});
    setEdits({});
  }, []);

  const validate = useCallback(() => {
    if (!selectedTemplate) {
      return {
        hasErrors: true,
        missingFields: [],
      };
    }

    // {fornecedor} is auto-filled per supplier, so the user never needs to provide it
    const missing = getMissingFields(selectedTemplate.corpo, fields).filter(
      (f) => f !== 'fornecedor'
    );
    return {
      hasErrors: missing.length > 0,
      missingFields: missing,
    };
  }, [selectedTemplate, fields]);

  return {
    selectedTemplate,
    fields,
    previews,
    edits,
    selectTemplate,
    updateField,
    generatePreview,
    editPreview,
    restorePreview,
    clear,
    validate,
  };
}
