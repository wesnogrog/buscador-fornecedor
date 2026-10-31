/**
 * Custom hook for managing supplier selection state
 * Handles checkboxes for selecting multiple suppliers
 */

import { useState, useEffect } from 'react';

export interface UseSupplierSelectionReturn {
  /** Set of currently selected supplier IDs */
  checked: Set<string>;

  /** Toggle selection for a supplier */
  toggle: (id: string) => void;

  /** Check if a supplier is selected */
  isSelected: (id: string) => boolean;

  /** Toggle selection for all suppliers */
  toggleAll: () => void;

  /** Clear all selections */
  clear: () => void;

  /** Get array of selected supplier IDs in order */
  getSelected: () => string[];

  /** Get count of selected suppliers */
  count: () => number;
}

/**
 * Custom hook for managing supplier selection
 *
 * @param suppliers - Array of supplier IDs to manage selection for
 * @returns Selection state and control methods
 */
export function useSupplierSelection(suppliers: string[]): UseSupplierSelectionReturn {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  // Reset selection when suppliers array changes
  useEffect(() => {
    setChecked(new Set());
  }, [suppliers.length]); // Only check length to avoid excessive re-renders

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isSelected = (id: string) => checked.has(id);

  const toggleAll = () => {
    setChecked((prev) => {
      // If all are selected, clear; otherwise select all
      if (prev.size === suppliers.length && suppliers.length > 0) {
        return new Set();
      }
      return new Set(suppliers);
    });
  };

  const clear = () => {
    setChecked(new Set());
  };

  const getSelected = () => {
    // Return selected IDs in the same order as the suppliers array
    return suppliers.filter((id) => checked.has(id));
  };

  const count = () => checked.size;

  return {
    checked,
    toggle,
    isSelected,
    toggleAll,
    clear,
    getSelected,
    count,
  };
}
