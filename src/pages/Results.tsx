/**
 * Results page component
 * Displays filtered suppliers with selection checkboxes
 * Allows user to select suppliers for message composition
 */

import { useState } from 'react';
import type { Fornecedor } from '../utils/types';
import { sortSuppliers, filterSuppliers, groupByIndicator } from '../utils/suppliers';
import { indicatorLabels } from '../utils/indicators';
import SupplierCard from '../components/SupplierCard';
import { useSupplierSelection } from '../hooks/useSupplierSelection';

interface ResultsProps {
  /** Suppliers to display */
  suppliers: Fornecedor[];

  /** Callback when suppliers are selected */
  onSelectSuppliers?: (selectedIds: string[]) => void;

  /** Show grouped view if true */
  groupByIndicator?: boolean;

  /** Allow filtering */
  allowFilter?: boolean;
}

/**
 * Results page displaying suppliers with:
 * - Sorted by contact indicator priority
 * - Selection checkboxes
 * - Filtering by name/domain/address
 * - Contact indicator badges
 * - Links to websites and contact methods
 */
export function Results({
  suppliers: initialSuppliers,
  onSelectSuppliers,
  groupByIndicator: shouldGroupByIndicator = false,
  allowFilter = true,
}: ResultsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'sorted' | 'grouped'>('sorted');

  // Filter suppliers by search term
  const filteredSuppliers = filterSuppliers(initialSuppliers, searchTerm);

  // Sort by priority
  const sortedSuppliers = sortSuppliers(filteredSuppliers);

  // Initialize selection state
  const supplierIds = sortedSuppliers.map((s) => s.id);
  const selection = useSupplierSelection(supplierIds);

  // Handle selection change
  const handleSelectChange = (id: string) => {
    selection.toggle(id);
    onSelectSuppliers?.(selection.getSelected());
  };

  const handleSelectAll = () => {
    selection.toggleAll();
    onSelectSuppliers?.(selection.getSelected());
  };

  const handleClearAll = () => {
    selection.clear();
    onSelectSuppliers?.([]);
  };

  // Render sorted view
  const renderSortedView = () => (
    <div className="space-y-3">
      {sortedSuppliers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchTerm.trim() ? (
            <p>No suppliers found matching "{searchTerm}"</p>
          ) : (
            <p>No suppliers to display</p>
          )}
        </div>
      ) : (
        sortedSuppliers.map((supplier) => (
          <SupplierCard
            key={supplier.id}
            supplier={supplier}
            isSelected={selection.isSelected(supplier.id)}
            onToggleSelect={handleSelectChange}
          />
        ))
      )}
    </div>
  );

  // Render grouped view
  const renderGroupedView = () => {
    const groups = groupByIndicator(sortedSuppliers);

    return (
      <div className="space-y-6">
        {Object.entries(groups).map(([indicator, groupSuppliers]) => {
          if (groupSuppliers.length === 0) return null;

          const label = indicatorLabels[indicator as keyof typeof indicatorLabels];

          return (
            <section key={indicator}>
              <div className="sticky top-0 bg-white py-2 mb-3">
                <h2 className="text-sm font-semibold text-gray-700">
                  {label} ({groupSuppliers.length})
                </h2>
                <div className="h-1 w-12 bg-blue-600 rounded mt-1"></div>
              </div>

              <div className="space-y-3">
                {groupSuppliers.map((supplier) => (
                  <SupplierCard
                    key={supplier.id}
                    supplier={supplier}
                    isSelected={selection.isSelected(supplier.id)}
                    onToggleSelect={handleSelectChange}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Resultados da Busca
          </h1>
          <p className="text-gray-600">
            {filteredSuppliers.length} fornecedor{filteredSuppliers.length !== 1 ? 'es' : ''}{' '}
            encontrado{filteredSuppliers.length !== 1 ? 's' : ''} •{' '}
            {selection.count()} selecionado{selection.count() !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 space-y-4">
          {/* Search */}
          {allowFilter && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar por nome, domínio ou endereço
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Digite para filtrar..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Select All / Clear */}
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              disabled={sortedSuppliers.length === 0}
            >
              {selection.count() === supplierIds.length && supplierIds.length > 0
                ? 'Desselecionar Tudo'
                : 'Selecionar Tudo'}
            </button>

            {selection.count() > 0 && (
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Limpar Seleção
              </button>
            )}

            {/* View Mode Toggle */}
            {shouldGroupByIndicator && (
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setViewMode('sorted')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    viewMode === 'sorted'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Ordenado
                </button>
                <button
                  onClick={() => setViewMode('grouped')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    viewMode === 'grouped'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Agrupado
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {viewMode === 'grouped' && shouldGroupByIndicator
            ? renderGroupedView()
            : renderSortedView()}
        </div>

        {/* Action Button */}
        {selection.count() > 0 && (
          <div className="fixed bottom-6 right-6">
            <button className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:bg-blue-700 transition-colors">
              Continuar com {selection.count()} fornecedor
              {selection.count() !== 1 ? 'es' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Results;
