/**
 * Template utility functions for dynamic message composition
 * Replaces field placeholders with actual values
 */

export interface TemplateFields {
  fornecedor?: string;
  servico?: string;
  evento?: string;
  data?: string;
  local?: string;
  prazo?: string;
}

/**
 * Fill template placeholders with field values
 * Supports: {fornecedor}, {servico}, {evento}, {data}, {local}, {prazo}
 *
 * @param template - Template string with placeholders like {fornecedor}
 * @param fields - Object with values to replace placeholders
 * @returns Template string with placeholders replaced
 */
export function fillTemplate(template: string, fields: Partial<TemplateFields>): string {
  let result = template;

  // List of supported placeholders
  const placeholders: (keyof TemplateFields)[] = ['fornecedor', 'servico', 'evento', 'data', 'local', 'prazo'];

  // Replace each placeholder with its value
  for (const placeholder of placeholders) {
    const value = fields[placeholder] ?? '';
    const regex = new RegExp(`\\{${placeholder}\\}`, 'g');
    result = result.replace(regex, value);
  }

  return result;
}

/**
 * Get list of missing required fields in a template
 * @param template - Template string to check
 * @param fields - Object with values to check
 * @returns Array of missing field names
 */
export function getMissingFields(
  template: string,
  fields: Partial<TemplateFields>
): (keyof TemplateFields)[] {
  const placeholders: (keyof TemplateFields)[] = ['fornecedor', 'servico', 'evento', 'data', 'local', 'prazo'];
  const missing: (keyof TemplateFields)[] = [];

  for (const placeholder of placeholders) {
    // Check if placeholder is in template
    const regex = new RegExp(`\\{${placeholder}\\}`);
    if (regex.test(template)) {
      // Check if field is missing or empty
      if (!fields[placeholder]) {
        missing.push(placeholder);
      }
    }
  }

  return missing;
}

/**
 * Get list of placeholders used in a template
 * @param template - Template string to analyze
 * @returns Array of placeholder names found in template
 */
export function getTemplatePlaceholders(template: string): (keyof TemplateFields)[] {
  const placeholders: (keyof TemplateFields)[] = ['fornecedor', 'servico', 'evento', 'data', 'local', 'prazo'];
  const found: (keyof TemplateFields)[] = [];

  for (const placeholder of placeholders) {
    const regex = new RegExp(`\\{${placeholder}\\}`);
    if (regex.test(template)) {
      found.push(placeholder);
    }
  }

  return found;
}
