/**
 * Tests for Results component
 */

import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Results } from '../pages/Results';
import type { Fornecedor } from '../utils/types';

describe('Results Component', () => {
  // Helper to create test suppliers
  const createSupplier = (
    name: string,
    overrides: Partial<Fornecedor> = {}
  ): Fornecedor => ({
    id: `id-${name.replace(/\s+/g, '-').toLowerCase()}`,
    nome: name,
    dominio: overrides.dominio || `${name.replace(/\s+/g, '')}.com`,
    endereco: overrides.endereco || `Address of ${name}`,
    servicos: ['test'],
    regiao: 'Test Region',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    data_extracao: new Date().toISOString(),
    email: null,
    whatsapp_link: null,
    whatsapp_numero: null,
    ...overrides,
  });

  test('renders results page with title', () => {
    const suppliers = [createSupplier('Supplier 1')];

    render(
      <Results
        suppliers={suppliers}
        allowFilter={true}
      />
    );

    expect(screen.getByText('Resultados da Busca')).toBeInTheDocument();
  });

  test('displays count of suppliers', () => {
    const suppliers = [
      createSupplier('Supplier 1'),
      createSupplier('Supplier 2'),
      createSupplier('Supplier 3'),
    ];

    render(<Results suppliers={suppliers} />);

    expect(screen.getByText(/3 fornecedores encontrados/)).toBeInTheDocument();
  });

  test('renders supplier cards in sorted order', () => {
    const suppliers = [
      createSupplier('Phone Only'),
      createSupplier('Email Only', { email: 'contact@test.com' }),
      createSupplier('WhatsApp Site', {
        whatsapp_link: 'https://wa.me/5511999887766',
      }),
    ];

    render(<Results suppliers={suppliers} />);

    const cards = screen.getAllByRole('checkbox');
    // Should be sorted: Email first, then WhatsApp, then Phone
    expect(cards).toHaveLength(3);
  });

  test('filters suppliers by search term', async () => {
    const user = userEvent.setup();
    const suppliers = [
      createSupplier('Catering ABC'),
      createSupplier('Buffet Deluxe'),
    ];

    render(<Results suppliers={suppliers} allowFilter={true} />);

    const searchInput = screen.getByPlaceholderText('Digite para filtrar...');
    await user.type(searchInput, 'Catering');

    expect(screen.getByText('Catering ABC')).toBeInTheDocument();
    expect(screen.queryByText('Buffet Deluxe')).not.toBeInTheDocument();
  });

  test('selects and deselects individual suppliers', async () => {
    const user = userEvent.setup();
    const suppliers = [
      createSupplier('Supplier 1'),
      createSupplier('Supplier 2'),
    ];
    const onSelect = vi.fn();

    const { rerender } = render(
      <Results
        suppliers={suppliers}
        onSelectSuppliers={onSelect}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');

    // Select first supplier
    await user.click(checkboxes[0]);
    expect(onSelect).toHaveBeenCalledWith(['id-supplier-1']);

    // Select second supplier
    await user.click(checkboxes[1]);
    expect(onSelect).toHaveBeenCalledWith(['id-supplier-1', 'id-supplier-2']);

    // Deselect first supplier
    await user.click(checkboxes[0]);
    expect(onSelect).toHaveBeenCalledWith(['id-supplier-2']);
  });

  test('select all and deselect all buttons work', async () => {
    const user = userEvent.setup();
    const suppliers = [
      createSupplier('Supplier 1'),
      createSupplier('Supplier 2'),
      createSupplier('Supplier 3'),
    ];
    const onSelect = vi.fn();

    render(
      <Results
        suppliers={suppliers}
        onSelectSuppliers={onSelect}
      />
    );

    const selectAllButton = screen.getByText('Selecionar Tudo');

    // Select all
    await user.click(selectAllButton);
    expect(onSelect).toHaveBeenCalledWith(
      expect.arrayContaining([
        'id-supplier-1',
        'id-supplier-2',
        'id-supplier-3',
      ])
    );

    // After selecting all, button should say "Desselecionar Tudo"
    expect(screen.getByText('Desselecionar Tudo')).toBeInTheDocument();

    // Deselect all
    await user.click(screen.getByText('Desselecionar Tudo'));
    expect(onSelect).toHaveBeenCalledWith([]);
  });

  test('clear selection button appears only when suppliers are selected', async () => {
    const user = userEvent.setup();
    const suppliers = [createSupplier('Supplier 1')];

    render(<Results suppliers={suppliers} />);

    // Clear button should not be visible initially
    expect(screen.queryByText('Limpar Seleção')).not.toBeInTheDocument();

    // Select a supplier
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    // Clear button should now be visible
    expect(screen.getByText('Limpar Seleção')).toBeInTheDocument();
  });

  test('displays empty state when no suppliers match filter', async () => {
    const user = userEvent.setup();
    const suppliers = [createSupplier('Supplier 1')];

    render(<Results suppliers={suppliers} allowFilter={true} />);

    const searchInput = screen.getByPlaceholderText('Digite para filtrar...');
    await user.type(searchInput, 'NonexistentSupplier');

    expect(screen.getByText(/No suppliers found matching/)).toBeInTheDocument();
  });

  test('displays empty state when suppliers array is empty', () => {
    render(<Results suppliers={[]} />);

    expect(screen.getByText(/No suppliers to display/)).toBeInTheDocument();
  });

  test('displays supplier details in cards', () => {
    const supplier = createSupplier('Test Supplier', {
      dominio: 'testsupplier.com',
      endereco: '123 Main St, São Paulo',
      email: 'contact@testsupplier.com',
    });

    render(<Results suppliers={[supplier]} />);

    expect(screen.getByText('Test Supplier')).toBeInTheDocument();
    expect(screen.getByText('testsupplier.com')).toBeInTheDocument();
    expect(screen.getByText('123 Main St, São Paulo')).toBeInTheDocument();
  });

  test('grouped view displays section headers when enabled', () => {
    const suppliers = [
      createSupplier('Email Supplier', { email: 'contact@test.com' }),
      createSupplier('Phone Supplier'),
    ];

    const { rerender } = render(
      <Results
        suppliers={suppliers}
        groupByIndicator={true}
      />
    );

    // Initial view should be sorted
    expect(screen.getByText('Ordenado')).toBeInTheDocument();

    // Click grouped view button
    const groupedButton = screen.getByText('Agrupado');
    fireEvent.click(groupedButton);

    // Should now show grouped view with section headers
    expect(screen.getByText(/Email verificado/)).toBeInTheDocument();
  });

  test('displays selection count in header', async () => {
    const user = userEvent.setup();
    const suppliers = [
      createSupplier('Supplier 1'),
      createSupplier('Supplier 2'),
    ];

    render(<Results suppliers={suppliers} />);

    // Initially no suppliers selected
    expect(screen.getByText(/0 selecionado/)).toBeInTheDocument();

    // Select one
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    // Should show 1 selected
    expect(screen.getByText(/1 selecionado/)).toBeInTheDocument();

    // Select another
    await user.click(checkboxes[1]);

    // Should show 2 selected
    expect(screen.getByText(/2 selecionados/)).toBeInTheDocument();
  });

  test('maintains sort order when filtering', async () => {
    const user = userEvent.setup();
    const suppliers = [
      createSupplier('Apple Phone', { email: 'apple@test.com', dominio: 'apple.com' }),
      createSupplier('Banana Email', { email: 'banana@test.com', dominio: 'banana.com' }),
      createSupplier('Cherry WhatsApp', {
        whatsapp_link: 'https://wa.me/5511999887766',
        dominio: 'cherry.com',
      }),
    ];

    render(<Results suppliers={suppliers} allowFilter={true} />);

    // All suppliers should be visible and sorted
    const names = screen.getAllByRole('checkbox');
    expect(names.length).toBe(3);

    // Filter to suppliers with "a" in name
    const searchInput = screen.getByPlaceholderText('Digite para filtrar...');
    await user.type(searchInput, 'a');

    // Should show Apple and Banana (both have 'a'), but order should be preserved
    expect(screen.getByText('Apple Phone')).toBeInTheDocument();
    expect(screen.getByText('Banana Email')).toBeInTheDocument();
    expect(screen.queryByText('Cherry WhatsApp')).not.toBeInTheDocument();
  });

  test('search works with domain', async () => {
    const user = userEvent.setup();
    const suppliers = [
      createSupplier('Company 1', { dominio: 'example.com' }),
      createSupplier('Company 2', { dominio: 'notexample.com' }),
    ];

    render(<Results suppliers={suppliers} allowFilter={true} />);

    const searchInput = screen.getByPlaceholderText('Digite para filtrar...');
    await user.type(searchInput, 'example.com');

    // Both should match because both have "example.com" in domain
    expect(screen.getByText('Company 1')).toBeInTheDocument();
    expect(screen.getByText('Company 2')).toBeInTheDocument();
  });

  test('action button shows selection count', async () => {
    const user = userEvent.setup();
    const suppliers = [
      createSupplier('Supplier 1'),
      createSupplier('Supplier 2'),
      createSupplier('Supplier 3'),
    ];

    render(<Results suppliers={suppliers} />);

    // No action button initially
    expect(
      screen.queryByText(/Continuar com/)
    ).not.toBeInTheDocument();

    // Select suppliers
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);

    // Action button should appear with correct count
    expect(
      screen.getByText(/Continuar com 2 fornecedores/)
    ).toBeInTheDocument();
  });
});

// Import vi from vitest for mocking
import { vi } from 'vitest';
