/**
 * Tests for SupplierCard component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SupplierCard } from '../components/SupplierCard';
import type { Fornecedor } from '../utils/types';
import { vi } from 'vitest';

describe('SupplierCard Component', () => {
  // Helper to create test supplier
  const createSupplier = (overrides: Partial<Fornecedor> = {}): Fornecedor => ({
    id: 'test-id',
    nome: 'Test Supplier',
    dominio: 'test.com',
    endereco: 'Test Address',
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

  test('renders supplier name and domain', () => {
    const supplier = createSupplier({
      nome: 'Catering ABC',
      dominio: 'catering-abc.com',
    });

    render(
      <SupplierCard
        supplier={supplier}
        isSelected={false}
        onToggleSelect={vi.fn()}
      />
    );

    expect(screen.getByText('Catering ABC')).toBeInTheDocument();
    expect(screen.getByText('catering-abc.com')).toBeInTheDocument();
  });

  test('renders address when available', () => {
    const supplier = createSupplier({
      endereco: '123 Main Street, São Paulo, SP',
    });

    render(
      <SupplierCard
        supplier={supplier}
        isSelected={false}
        onToggleSelect={vi.fn()}
      />
    );

    expect(screen.getByText('123 Main Street, São Paulo, SP')).toBeInTheDocument();
  });

  test('renders checkbox and calls callback on toggle', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const supplier = createSupplier();

    render(
      <SupplierCard
        supplier={supplier}
        isSelected={false}
        onToggleSelect={onToggle}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    expect(onToggle).toHaveBeenCalledWith('test-id');
  });

  test('shows selected state correctly', () => {
    const supplier = createSupplier();

    const { rerender } = render(
      <SupplierCard
        supplier={supplier}
        isSelected={false}
        onToggleSelect={vi.fn()}
      />
    );

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    // Rerender with selected=true
    rerender(
      <SupplierCard
        supplier={supplier}
        isSelected={true}
        onToggleSelect={vi.fn()}
      />
    );

    expect(checkbox.checked).toBe(true);
  });

  test('renders email as clickable link', () => {
    const supplier = createSupplier({
      email: 'contact@test.com',
    });

    render(
      <SupplierCard
        supplier={supplier}
        isSelected={false}
        onToggleSelect={vi.fn()}
      />
    );

    const emailLink = screen.getByText('contact@test.com');
    expect(emailLink).toHaveAttribute('href', 'mailto:contact@test.com');
  });

  test('renders WhatsApp link when available', () => {
    const supplier = createSupplier({
      whatsapp_link: 'https://wa.me/5511999887766',
    });

    render(
      <SupplierCard
        supplier={supplier}
        isSelected={false}
        onToggleSelect={vi.fn()}
      />
    );

    const whatsappLink = screen.getByText('WhatsApp 💬');
    expect(whatsappLink).toHaveAttribute('href', 'https://wa.me/5511999887766');
  });

  test('renders WhatsApp number when link is not available', () => {
    const supplier = createSupplier({
      whatsapp_numero: '5511999887766',
    });

    render(
      <SupplierCard
        supplier={supplier}
        isSelected={false}
        onToggleSelect={vi.fn()}
      />
    );

    expect(screen.getByText('5511999887766')).toBeInTheDocument();
  });

  test('prefers WhatsApp link over number when both available', () => {
    const supplier = createSupplier({
      whatsapp_link: 'https://wa.me/5511999887766',
      whatsapp_numero: '5511999887766',
    });

    render(
      <SupplierCard
        supplier={supplier}
        isSelected={false}
        onToggleSelect={vi.fn()}
      />
    );

    // Should show the link button
    expect(screen.getByText('WhatsApp 💬')).toBeInTheDocument();

    // Should not show the number separately
    const numberElements = screen.queryAllByText('5511999887766');
    expect(numberElements.length).toBe(0); // Only in the WhatsApp link
  });

  test('renders domain as external link', () => {
    const supplier = createSupplier({
      dominio: 'test.com',
    });

    render(
      <SupplierCard
        supplier={supplier}
        isSelected={false}
        onToggleSelect={vi.fn()}
      />
    );

    const domainLink = screen.getByText('test.com');
    expect(domainLink).toHaveAttribute('href', 'https://test.com');
    expect(domainLink).toHaveAttribute('target', '_blank');
    expect(domainLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('renders services as tags', () => {
    const supplier = createSupplier({
      servicos: ['catering', 'buffet', 'decoração'],
    });

    render(
      <SupplierCard
        supplier={supplier}
        isSelected={false}
        onToggleSelect={vi.fn()}
      />
    );

    expect(screen.getByText('catering')).toBeInTheDocument();
    expect(screen.getByText('buffet')).toBeInTheDocument();
    expect(screen.getByText('decoração')).toBeInTheDocument();
  });

  test('limits displayed services and shows overflow count', () => {
    const supplier = createSupplier({
      servicos: ['service1', 'service2', 'service3', 'service4', 'service5'],
    });

    render(
      <SupplierCard
        supplier={supplier}
        isSelected={false}
        onToggleSelect={vi.fn()}
      />
    );

    // First 3 should be visible
    expect(screen.getByText('service1')).toBeInTheDocument();
    expect(screen.getByText('service2')).toBeInTheDocument();
    expect(screen.getByText('service3')).toBeInTheDocument();

    // Overflow count should be shown
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  test('renders contact indicator badge', () => {
    const supplier = createSupplier({
      email: 'contact@test.com',
      whatsapp_link: 'https://wa.me/5511999887766',
    });

    render(
      <SupplierCard
        supplier={supplier}
        isSelected={false}
        onToggleSelect={vi.fn()}
      />
    );

    expect(screen.getByText('Email verificado + WhatsApp')).toBeInTheDocument();
  });

  test('renders extraction date', () => {
    const supplier = createSupplier({
      data_extracao: '2024-10-31T10:30:00Z',
    });

    render(
      <SupplierCard
        supplier={supplier}
        isSelected={false}
        onToggleSelect={vi.fn()}
      />
    );

    expect(screen.getByText(/Extracted:/)).toBeInTheDocument();
  });

  test('handles missing optional fields gracefully', () => {
    const supplier = createSupplier({
      dominio: null,
      endereco: null,
      email: null,
      whatsapp_link: null,
      whatsapp_numero: null,
      servicos: [],
    });

    const { container } = render(
      <SupplierCard
        supplier={supplier}
        isSelected={false}
        onToggleSelect={vi.fn()}
      />
    );

    // Component should still render without errors
    expect(screen.getByText('Test Supplier')).toBeInTheDocument();
    expect(container).toBeInTheDocument();
  });

  test('checkbox has accessible label', () => {
    const supplier = createSupplier({
      nome: 'Catering XYZ',
    });

    render(
      <SupplierCard
        supplier={supplier}
        isSelected={false}
        onToggleSelect={vi.fn()}
      />
    );

    const checkbox = screen.getByLabelText(/Select Catering XYZ/);
    expect(checkbox).toBeInTheDocument();
  });

  test('renders all contact indicators correctly', () => {
    const testCases = [
      {
        overrides: { email: 'test@test.com', whatsapp_link: 'https://wa.me/123' },
        expectedLabel: 'Email verificado + WhatsApp',
      },
      {
        overrides: { email: 'test@test.com' },
        expectedLabel: 'Email verificado',
      },
      {
        overrides: { whatsapp_link: 'https://wa.me/123' },
        expectedLabel: 'WhatsApp no site',
      },
      {
        overrides: { whatsapp_numero: '5511999887766' },
        expectedLabel: 'WhatsApp provável',
      },
      {
        overrides: {},
        expectedLabel: 'Só telefone fixo / Site fora do ar',
      },
    ];

    testCases.forEach(({ overrides, expectedLabel }) => {
      const { unmount } = render(
        <SupplierCard
          supplier={createSupplier(overrides)}
          isSelected={false}
          onToggleSelect={vi.fn()}
        />
      );

      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      unmount();
    });
  });
});
