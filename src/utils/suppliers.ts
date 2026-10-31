/**
 * Supplier utility functions
 */

import type { Fornecedor } from './types';
import { contactIndicators } from './indicators';
import { supabase } from './supabase';

/**
 * Sorts suppliers by contact indicator priority
 *
 * Priority order:
 * 1. Email + WhatsApp
 * 2. Email only
 * 3. WhatsApp (site)
 * 4. WhatsApp (probable)
 * 5. Phone only
 *
 * Maintains stable sort for same priority level
 */
export function sortSuppliers(suppliers: Fornecedor[]): Fornecedor[] {
  const priorityMap: Record<string, number> = {
    email_and_whatsapp: 0,
    email_only: 1,
    whatsapp_site: 2,
    whatsapp_probable: 3,
    phone_only: 4,
  };

  return [...suppliers].sort((a, b) => {
    const indicatorA = contactIndicators(a);
    const indicatorB = contactIndicators(b);

    const priorityA = priorityMap[indicatorA];
    const priorityB = priorityMap[indicatorB];

    return priorityA - priorityB;
  });
}

/**
 * Filters suppliers locally by search term (name, domain, address)
 * This is for client-side filtering of already-loaded suppliers
 * For querying suppliers from Supabase, use filterSuppliers()
 */
export function filterSuppliersLocally(
  suppliers: Fornecedor[],
  searchTerm: string
): Fornecedor[] {
  if (!searchTerm.trim()) {
    return suppliers;
  }

  const term = searchTerm.toLowerCase();

  return suppliers.filter((supplier) => {
    const name = supplier.nome?.toLowerCase() || '';
    const domain = supplier.dominio?.toLowerCase() || '';
    const address = supplier.endereco?.toLowerCase() || '';

    return name.includes(term) || domain.includes(term) || address.includes(term);
  });
}

/**
 * Groups suppliers by contact indicator type
 */
export function groupByIndicator(suppliers: Fornecedor[]): Record<string, Fornecedor[]> {
  const groups: Record<string, Fornecedor[]> = {
    email_and_whatsapp: [],
    email_only: [],
    whatsapp_site: [],
    whatsapp_probable: [],
    phone_only: [],
  };

  suppliers.forEach((supplier) => {
    const indicator = contactIndicators(supplier);
    groups[indicator].push(supplier);
  });

  return groups;
}

/**
 * Validates supplier data before display
 */
export function isValidSupplier(supplier: unknown): supplier is Fornecedor {
  if (!supplier || typeof supplier !== 'object') {
    return false;
  }

  const s = supplier as Record<string, unknown>;

  return (
    typeof s.id === 'string' &&
    typeof s.nome === 'string' &&
    typeof s.created_at === 'string' &&
    typeof s.data_extracao === 'string'
  );
}

/**
 * Gets the primary contact method for a supplier
 */
export function getPrimaryContact(supplier: Fornecedor): {
  type: 'email' | 'whatsapp' | 'phone' | 'none';
  value?: string;
  url?: string;
} {
  if (supplier.email?.trim()) {
    return {
      type: 'email',
      value: supplier.email,
      url: `mailto:${supplier.email}`,
    };
  }

  if (supplier.whatsapp_link?.trim()) {
    return {
      type: 'whatsapp',
      value: supplier.whatsapp_link,
      url: supplier.whatsapp_link,
    };
  }

  if (supplier.whatsapp_numero?.trim()) {
    return {
      type: 'whatsapp',
      value: supplier.whatsapp_numero,
      url: `https://wa.me/${supplier.whatsapp_numero.replace(/\D/g, '')}`,
    };
  }

  return {
    type: 'none',
  };
}

/**
 * Filter suppliers from Supabase by service and optionally by region
 * This queries the Supabase database to find matching suppliers
 * Used in search forms and filters
 * @param servico - The service to search for (required)
 * @param regiao - The region to filter by (optional)
 * @returns Array of matching suppliers
 */
export async function filterSuppliers(
  servico: string,
  regiao: string | null
): Promise<Fornecedor[]> {
  if (!servico || servico.trim() === '') {
    return [];
  }

  try {
    const servicoNormalized = servico.trim().toLowerCase();

    let query = supabase.from('fornecedores').select('*');

    // Filter by region if provided
    if (regiao && regiao.trim() !== '') {
      // "campinas" must find "Campinas"; % and _ in the text are not wildcards
      query = query.ilike('regiao', regiao.trim().replace(/[\\%_]/g, '\\$&'));
    }

    // Filter by service (array contains)
    query = query.contains('servicos', [servicoNormalized]);

    const { data, error } = await query;

    if (error) {
      console.error('Error filtering suppliers:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Unexpected error filtering suppliers:', err);
    return [];
  }
}

/**
 * Get all available regions for filtering
 * Useful for building autocomplete or dropdown lists
 * @returns Array of unique regions
 */
export async function getAvailableRegions(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('fornecedores')
      .select('regiao')
      .not('regiao', 'is', null)
      .order('regiao');

    if (error) {
      console.error('Error getting regions:', error);
      return [];
    }

    // Get unique regions
    const uniqueRegions = Array.from(new Set(data?.map(f => f.regiao).filter(Boolean) || []));
    return uniqueRegions;
  } catch (err) {
    console.error('Unexpected error getting regions:', err);
    return [];
  }
}

/**
 * Get all available services for filtering
 * Useful for building autocomplete or dropdown lists
 * @returns Array of unique services
 */
export async function getAvailableServices(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('fornecedores')
      .select('servicos')
      .not('servicos', 'is', null);

    if (error) {
      console.error('Error getting services:', error);
      return [];
    }

    // Flatten and get unique services
    const allServices = data?.flatMap(f => f.servicos || []) || [];
    const uniqueServices = Array.from(new Set(allServices)).sort();
    return uniqueServices;
  } catch (err) {
    console.error('Unexpected error getting services:', err);
    return [];
  }
}
