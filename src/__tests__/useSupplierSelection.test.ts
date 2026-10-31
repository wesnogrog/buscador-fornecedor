/**
 * Tests for useSupplierSelection hook
 * Manages checkbox selection state for suppliers
 */

import { renderHook, act } from '@testing-library/react';
import { useSupplierSelection } from '../hooks/useSupplierSelection';

describe('useSupplierSelection', () => {
  test('initializes with empty selection', () => {
    const { result } = renderHook(() => useSupplierSelection([]));

    expect(result.current.checked).toEqual(new Set());
    expect(result.current.getSelected()).toEqual([]);
  });

  test('toggles supplier selection', () => {
    const suppliers = ['id1', 'id2', 'id3'];
    const { result } = renderHook(() => useSupplierSelection(suppliers));

    act(() => {
      result.current.toggle('id1');
    });

    expect(result.current.checked.has('id1')).toBe(true);

    act(() => {
      result.current.toggle('id1');
    });

    expect(result.current.checked.has('id1')).toBe(false);
  });

  test('returns selected suppliers in order', () => {
    const suppliers = ['id1', 'id2', 'id3'];
    const { result } = renderHook(() => useSupplierSelection(suppliers));

    act(() => {
      result.current.toggle('id3');
      result.current.toggle('id1');
    });

    const selected = result.current.getSelected();
    expect(selected).toEqual(['id1', 'id3']);
  });

  test('toggleAll selects all suppliers', () => {
    const suppliers = ['id1', 'id2', 'id3'];
    const { result } = renderHook(() => useSupplierSelection(suppliers));

    act(() => {
      result.current.toggleAll();
    });

    expect(result.current.getSelected()).toEqual(['id1', 'id2', 'id3']);
  });

  test('toggleAll deselects all when all are selected', () => {
    const suppliers = ['id1', 'id2', 'id3'];
    const { result } = renderHook(() => useSupplierSelection(suppliers));

    act(() => {
      result.current.toggleAll();
      result.current.toggleAll();
    });

    expect(result.current.getSelected()).toEqual([]);
  });

  test('toggleAll selects all when only some are selected', () => {
    const suppliers = ['id1', 'id2', 'id3'];
    const { result } = renderHook(() => useSupplierSelection(suppliers));

    act(() => {
      result.current.toggle('id1');
      result.current.toggleAll();
    });

    expect(result.current.getSelected()).toEqual(['id1', 'id2', 'id3']);
  });

  test('clears all selections', () => {
    const suppliers = ['id1', 'id2', 'id3'];
    const { result } = renderHook(() => useSupplierSelection(suppliers));

    act(() => {
      result.current.toggle('id1');
      result.current.toggle('id2');
      result.current.clear();
    });

    expect(result.current.getSelected()).toEqual([]);
  });

  test('updates when suppliers array changes', () => {
    const suppliers1 = ['id1', 'id2'];
    const { result, rerender } = renderHook(
      ({ suppliers }) => useSupplierSelection(suppliers),
      { initialProps: { suppliers: suppliers1 } }
    );

    act(() => {
      result.current.toggle('id1');
    });

    expect(result.current.getSelected()).toEqual(['id1']);

    // Rerender with different suppliers
    const suppliers2 = ['id3', 'id4'];
    rerender({ suppliers: suppliers2 });

    // Old selection should be cleared
    expect(result.current.getSelected()).toEqual([]);
  });

  test('handles selecting from new supplier list', () => {
    const suppliers1 = ['id1', 'id2'];
    const { result, rerender } = renderHook(
      ({ suppliers }) => useSupplierSelection(suppliers),
      { initialProps: { suppliers: suppliers1 } }
    );

    act(() => {
      result.current.toggle('id1');
    });

    // Rerender with superset of suppliers
    const suppliers2 = ['id1', 'id2', 'id3'];
    rerender({ suppliers: suppliers2 });

    act(() => {
      result.current.toggle('id3');
    });

    expect(result.current.getSelected()).toEqual(['id1', 'id3']);
  });

  test('isSelected returns correct state', () => {
    const suppliers = ['id1', 'id2', 'id3'];
    const { result } = renderHook(() => useSupplierSelection(suppliers));

    expect(result.current.isSelected('id1')).toBe(false);

    act(() => {
      result.current.toggle('id1');
    });

    expect(result.current.isSelected('id1')).toBe(true);
    expect(result.current.isSelected('id2')).toBe(false);
  });

  test('count returns number of selected suppliers', () => {
    const suppliers = ['id1', 'id2', 'id3'];
    const { result } = renderHook(() => useSupplierSelection(suppliers));

    expect(result.current.count()).toBe(0);

    act(() => {
      result.current.toggle('id1');
      result.current.toggle('id2');
    });

    expect(result.current.count()).toBe(2);
  });
});
