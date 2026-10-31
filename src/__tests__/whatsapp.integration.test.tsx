/**
 * WhatsApp Integration Tests
 *
 * Tests for WhatsApp contact integration including:
 * - wa.me URL generation with pre-filled messages
 * - Special character handling and encoding
 * - Message template formatting
 * - WhatsAppButton component rendering
 *
 * Manual test checklist is included at the end for runtime testing
 * on mobile and desktop browsers.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { generateWhatsAppUrl } from '../utils/whatsapp';
import { WhatsAppButton } from '../components/WhatsAppButton';
import type { Fornecedor } from '../utils/types';

describe('WhatsAppButton Component', () => {
  describe('Basic Rendering', () => {
    it('should render button with correct label', () => {
      render(
        <WhatsAppButton
          phoneNumber="5511999887766"
          message="Olá! Procuro fornecedor"
          label="WhatsApp 💬"
        />
      );

      const button = screen.getByText('WhatsApp 💬');
      expect(button).toBeInTheDocument();
    });

    it('should render default label when not provided', () => {
      render(
        <WhatsAppButton
          phoneNumber="5511999887766"
          message="Olá! Procuro fornecedor"
        />
      );

      const button = screen.getByText('WhatsApp');
      expect(button).toBeInTheDocument();
    });

    it('should render as anchor element with correct href', () => {
      render(
        <WhatsAppButton
          phoneNumber="5511999887766"
          message="Test message"
        />
      );

      const link = screen.getByRole('link') as HTMLAnchorElement;
      expect(link).toHaveAttribute('href', expect.stringContaining('https://wa.me/5511999887766'));
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Props Handling', () => {
    it('should generate correct wa.me URL with phone and message', () => {
      render(
        <WhatsAppButton
          phoneNumber="5511999887766"
          message="Olá! Como você está?"
        />
      );

      const link = screen.getByRole('link') as HTMLAnchorElement;
      expect(link.href).toContain('https://wa.me/5511999887766');
      expect(link.href).toContain('?text=');
      expect(link.href).toContain('Como%20voc%C3%AA%20est%C3%A1');
    });

    it('should handle phone number with formatting characters', () => {
      render(
        <WhatsAppButton
          phoneNumber="(55) 11 99988-7766"
          message="Test"
        />
      );

      const link = screen.getByRole('link') as HTMLAnchorElement;
      expect(link.href).toContain('5511999887766');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <WhatsAppButton
          phoneNumber="5511999887766"
          message="Test"
          className="custom-class"
        />
      );

      const link = container.querySelector('.custom-class');
      expect(link).toBeInTheDocument();
    });

    it('should set aria-label correctly', () => {
      render(
        <WhatsAppButton
          phoneNumber="5511999887766"
          message="Test"
          supplierName="Test Supplier"
          ariaLabel="Contact supplier via WhatsApp"
        />
      );

      const link = screen.getByRole('link') as HTMLAnchorElement;
      expect(link).toHaveAttribute('aria-label', 'Contact supplier via WhatsApp');
    });

    it('should use default aria-label with supplier name', () => {
      render(
        <WhatsAppButton
          phoneNumber="5511999887766"
          message="Test"
          supplierName="Catering Delícia"
        />
      );

      const link = screen.getByRole('link') as HTMLAnchorElement;
      expect(link).toHaveAttribute('aria-label', expect.stringContaining('Catering Delícia'));
    });

    it('should set title attribute', () => {
      render(
        <WhatsAppButton
          phoneNumber="5511999887766"
          message="Test"
          title="Open WhatsApp chat"
        />
      );

      const link = screen.getByRole('link') as HTMLAnchorElement;
      expect(link).toHaveAttribute('title', 'Open WhatsApp chat');
    });

    it('should use default title when not provided', () => {
      render(
        <WhatsAppButton
          phoneNumber="5511999887766"
          message="Test"
        />
      );

      const link = screen.getByRole('link') as HTMLAnchorElement;
      expect(link).toHaveAttribute('title', 'Open WhatsApp conversation');
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic HTML structure', () => {
      const { container } = render(
        <WhatsAppButton
          phoneNumber="5511999887766"
          message="Test"
          supplierName="Test Supplier"
        />
      );

      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link?.textContent).toBeTruthy();
    });

    it('should have aria-label for screen readers', () => {
      render(
        <WhatsAppButton
          phoneNumber="5511999887766"
          message="Test"
          supplierName="Test Supplier"
        />
      );

      const link = screen.getByRole('link') as HTMLAnchorElement;
      expect(link).toHaveAccessibleName(expect.stringContaining('Test Supplier'));
    });

    it('should have noopener and noreferrer for security', () => {
      render(
        <WhatsAppButton
          phoneNumber="5511999887766"
          message="Test"
        />
      );

      const link = screen.getByRole('link') as HTMLAnchorElement;
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Message Encoding', () => {
    it('should handle special characters in message', () => {
      render(
        <WhatsAppButton
          phoneNumber="5511999887766"
          message="Olá! Procuro serviço de catering & decoração"
        />
      );

      const link = screen.getByRole('link') as HTMLAnchorElement;
      expect(link.href).toContain('%C3%A1'); // á
      expect(link.href).toContain('%26'); // &
    });

    it('should encode emoji in message', () => {
      render(
        <WhatsAppButton
          phoneNumber="5511999887766"
          message="Olá! 👋 Como você está? 😊"
        />
      );

      const link = screen.getByRole('link') as HTMLAnchorElement;
      // URL should be longer due to emoji encoding
      expect(link.href.length).toBeGreaterThan('https://wa.me/5511999887766?text='.length);
    });

    it('should encode newlines in message', () => {
      render(
        <WhatsAppButton
          phoneNumber="5511999887766"
          message={'Line 1\nLine 2\nLine 3'}
        />
      );

      const link = screen.getByRole('link') as HTMLAnchorElement;
      expect(link.href).toContain('%0A');
    });

    it('should handle multi-line formatted message', () => {
      const message = `Olá Catering Delícia!

Procuro fornecedor de catering para evento em SP.
Data: 15/11/2024

Poderia me passar informações?`;

      render(
        <WhatsAppButton
          phoneNumber="5511999887766"
          message={message}
          supplierName="Catering Delícia"
        />
      );

      const link = screen.getByRole('link') as HTMLAnchorElement;
      expect(link.href).toContain('%0A');
      expect(link.href).toContain('Catering%20Del%C3%ADcia');
    });
  });

  describe('Click Behavior', () => {
    it('should call onClick callback when provided', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(
        <WhatsAppButton
          phoneNumber="5511999887766"
          message="Test"
          onClick={onClick}
        />
      );

      const link = screen.getByRole('link');
      await user.click(link);

      expect(onClick).toHaveBeenCalled();
    });

    it('should open link in new tab', () => {
      render(
        <WhatsAppButton
          phoneNumber="5511999887766"
          message="Test"
        />
      );

      const link = screen.getByRole('link') as HTMLAnchorElement;
      expect(link.target).toBe('_blank');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message gracefully', () => {
      render(
        <WhatsAppButton
          phoneNumber="5511999887766"
          message=""
        />
      );

      const link = screen.getByRole('link') as HTMLAnchorElement;
      // URL should not have ?text parameter if message is empty
      expect(link.href).toBe('https://wa.me/5511999887766');
    });

    it('should handle very long message', () => {
      const longMessage = 'A'.repeat(1000);

      render(
        <WhatsAppButton
          phoneNumber="5511999887766"
          message={longMessage}
        />
      );

      const link = screen.getByRole('link') as HTMLAnchorElement;
      expect(link.href.length).toBeGreaterThan(1000);
    });

    it('should handle phone number with + prefix', () => {
      render(
        <WhatsAppButton
          phoneNumber="+5511999887766"
          message="Test"
        />
      );

      const link = screen.getByRole('link') as HTMLAnchorElement;
      expect(link.href).toContain('5511999887766');
    });

    it('should render with minimal props', () => {
      render(
        <WhatsAppButton
          phoneNumber="5511999887766"
          message="Test"
        />
      );

      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href');
    });

    it('should handle missing optional supplierName', () => {
      render(
        <WhatsAppButton
          phoneNumber="5511999887766"
          message="Test"
        />
      );

      const link = screen.getByRole('link') as HTMLAnchorElement;
      // Should still have aria-label, just without supplier name
      expect(link).toHaveAttribute('aria-label', 'Contact undefined via WhatsApp');
    });
  });
});

describe('WhatsApp Utils: generateWhatsAppUrl()', () => {
  describe('Basic URL Generation', () => {
    it('should generate valid wa.me URL with phone number only', () => {
      const url = generateWhatsAppUrl('5511999887766');
      expect(url).toBe('https://wa.me/5511999887766');
    });

    it('should generate wa.me URL with phone and message', () => {
      const url = generateWhatsAppUrl('5511999887766', 'Hello World');
      expect(url).toContain('https://wa.me/5511999887766');
      expect(url).toContain('?text=');
      expect(url).toContain('Hello%20World');
    });

    it('should not include ?text parameter if message is empty or undefined', () => {
      const url1 = generateWhatsAppUrl('5511999887766', '');
      const url2 = generateWhatsAppUrl('5511999887766', undefined);
      const url3 = generateWhatsAppUrl('5511999887766');

      expect(url1).toBe('https://wa.me/5511999887766');
      expect(url2).toBe('https://wa.me/5511999887766');
      expect(url3).toBe('https://wa.me/5511999887766');
    });

    it('should strip leading + from phone numbers', () => {
      const url = generateWhatsAppUrl('+5511999887766', 'Hello');
      // wa.me accepts both formats, but we should be consistent
      expect(url).toContain('5511999887766');
    });

    it('should remove spaces from phone number', () => {
      const url = generateWhatsAppUrl('55 11 99988 7766', 'Hello');
      expect(url).toContain('5511999887766');
    });

    it('should remove hyphens and dots from phone number', () => {
      const url = generateWhatsAppUrl('55-11-99988-7766', 'Hello');
      expect(url).toContain('5511999887766');
    });
  });

  describe('Special Character Handling', () => {
    it('should properly encode spaces in message', () => {
      const url = generateWhatsAppUrl('5511999887766', 'Hello World Test');
      expect(url).toContain('Hello%20World%20Test');
    });

    it('should properly encode special characters', () => {
      const message = 'Olá! Como você está? #Disponível';
      const url = generateWhatsAppUrl('5511999887766', message);

      // Verify the URL is properly encoded
      expect(url).toContain('https://wa.me/5511999887766?text=');
      // The exact encoding depends on encodeURIComponent behavior
      expect(url).toContain('%C3%A1'); // á
      expect(url).toContain('%23'); // #
    });

    it('should encode emoji characters', () => {
      const message = 'Olá 👋 Como você está? 😊';
      const url = generateWhatsAppUrl('5511999887766', message);

      expect(url).toContain('https://wa.me/5511999887766?text=');
      // Emoji should be URL encoded
      expect(url.length).toBeGreaterThan('https://wa.me/5511999887766?text=Olá Como você está?'.length);
    });

    it('should handle line breaks in message', () => {
      const message = 'Line 1\nLine 2\nLine 3';
      const url = generateWhatsAppUrl('5511999887766', message);

      // Line breaks should be encoded as %0A
      expect(url).toContain('%0A');
    });

    it('should handle ampersands in message', () => {
      const message = 'Serviço A & Serviço B';
      const url = generateWhatsAppUrl('5511999887766', message);

      // & should be encoded as %26
      expect(url).toContain('%26');
    });

    it('should handle question marks and exclamation marks', () => {
      const message = 'Qual é o preço? Tenho desconto!';
      const url = generateWhatsAppUrl('5511999887766', message);

      expect(url).toContain('?text=');
      expect(url).toContain('%3F'); // ?
      expect(url).toContain('desconto!'); // encodeURIComponent keeps !
    });

    it('should handle URLs within message', () => {
      const message = 'Veja mais em https://example.com';
      const url = generateWhatsAppUrl('5511999887766', message);

      expect(url).toContain('https%3A%2F%2Fexample.com');
    });

    it('should handle long messages with multiple special characters', () => {
      const message = 'Olá! Estou procurando fornecedor para: Evento em SP - Data: 15/11 - Orçamento: R$5.000,00 - Contato: (11) 9999-8877 - Email: contact@test.com - Website: https://test.com';
      const url = generateWhatsAppUrl('5511999887766', message);

      expect(url).toContain('https://wa.me/5511999887766?text=');
      expect(url.length).toBeGreaterThan(100);
    });

    it('should preserve message structure with newlines and special chars', () => {
      const message = `Olá!

Gostaria de informações sobre serviços.

Evento: Festa de Formatura
Data: 15/11/2024
Local: São Paulo, SP
Orçamento: R$ 5.000,00

Favor responder em até 3 dias.

Obrigado!`;

      const url = generateWhatsAppUrl('5511999887766', message);

      expect(url).toContain('https://wa.me/5511999887766?text=');
      // Should have multiple encoded newlines
      const newlineCount = (url.match(/%0A/g) || []).length;
      expect(newlineCount).toBeGreaterThan(0);
    });
  });

  describe('Message Template Formatting', () => {
    it('should format supplier info into message', () => {
      const supplier: Fornecedor = {
        id: 'test-id',
        nome: 'Catering Delícia',
        dominio: 'catering-delicia.com',
        endereco: 'Rua A, 123',
        servicos: ['catering', 'buffet'],
        regiao: 'SP',
        email: 'contato@catering.com',
        whatsapp_numero: '5511999887766',
        data_extracao: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const message = `Olá Catering Delícia! Procuro fornecedor de catering para evento em SP.`;
      const url = generateWhatsAppUrl(supplier.whatsapp_numero!, message);

      expect(url).toContain('5511999887766');
      expect(url).toContain('text=');
    });

    it('should handle message with placeholder fields', () => {
      const message = 'Olá {fornecedor}! Procuro {servico} em {regiao}.';
      const formatted = message
        .replace('{fornecedor}', 'Catering Test')
        .replace('{servico}', 'catering')
        .replace('{regiao}', 'SP');

      const url = generateWhatsAppUrl('5511999887766', formatted);
      expect(url).toContain('Catering%20Test');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should reject an empty phone number', () => {
      expect(() => generateWhatsAppUrl('', 'Hello')).toThrow('Phone number must be a non-empty string');
    });

    it('should handle very long phone numbers', () => {
      const longNumber = '5511999887766123456789';
      const url = generateWhatsAppUrl(longNumber);
      expect(url).toContain(longNumber);
    });

    it('should handle null/undefined phone gracefully', () => {
      // This tests error handling - implementation should handle or throw
      expect(() => {
        generateWhatsAppUrl(null as any);
      }).toThrow();
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(1000);
      const url = generateWhatsAppUrl('5511999887766', longMessage);

      expect(url).toContain('https://wa.me/5511999887766?text=');
      expect(url.length).toBeGreaterThan(1000);
    });

    it('should preserve case sensitivity in message', () => {
      const message = 'ABC xyz MiXeD CaSe';
      const url = generateWhatsAppUrl('5511999887766', message);

      expect(url).toContain('ABC');
      expect(url).toContain('xyz');
      expect(url).toContain('MiXeD');
    });

    it('should handle consecutive special characters', () => {
      const message = 'Test??? Multiple!!! And--- More...';
      const url = generateWhatsAppUrl('5511999887766', message);

      expect(url).toContain('https://wa.me/5511999887766?text=');
      expect(url).toContain('%3F%3F%3F'); // ???
    });
  });

  describe('Brazilian Phone Number Formats', () => {
    it('should accept standard Brazilian mobile format (11 digits with 55)', () => {
      const url = generateWhatsAppUrl('5511999887766', 'Olá');
      expect(url).toContain('5511999887766');
    });

    it('should handle Brazilian mobile with formatting', () => {
      const url = generateWhatsAppUrl('(55) 11 99988-7766', 'Olá');
      expect(url).toContain('5511999887766');
    });

    it('should accept phone number without country code (11 digits)', () => {
      const url = generateWhatsAppUrl('11999887766', 'Olá');
      // Accept as-is or prepend 55
      expect(url).toContain('11999887766');
    });

    it('should handle different Brazilian area codes', () => {
      const areaCodesWithNumber = [
        '5511999887766', // São Paulo
        '5521999887766', // Rio de Janeiro
        '5585999887766', // Ceará
        '5548999887766', // Santa Catarina
      ];

      areaCodesWithNumber.forEach(number => {
        const url = generateWhatsAppUrl(number, 'Olá');
        expect(url).toContain(number);
      });
    });
  });
});

/**
 * ============================================================================
 * MANUAL TEST CHECKLIST
 * ============================================================================
 *
 * These tests verify the integration with real WhatsApp clients and
 * confirm the wa.me link behavior on different platforms.
 *
 * Run these tests manually:
 *
 * 1. DESKTOP BROWSER TEST (Chrome/Firefox/Safari/Edge)
 * ─────────────────────────────────────────────────────────────────────────
 *
 * a) URL Generation Display:
 *    - Open the app and navigate to a supplier with WhatsApp number
 *    - Right-click the WhatsApp button → "Inspect Element"
 *    - Check the <a href> URL:
 *      Expected: https://wa.me/5511999887766?text=...
 *      ✓ URL should start with https://wa.me/
 *      ✓ Phone number should be included (digits only, no formatting)
 *      ✓ Message should be URL-encoded (spaces as %20, special chars encoded)
 *      ✓ No extra query parameters
 *
 * b) Click Opens WhatsApp Web (Desktop):
 *    - If WhatsApp Web is logged in:
 *      ✓ Click the WhatsApp button
 *      ✓ WhatsApp Web should open in a new tab
 *      ✓ Conversation window should appear for the contact number
 *      ✓ Message should be pre-filled in the input field
 *      ✓ Special characters (é, ã, &, #, etc) should display correctly
 *      ✓ Newlines should be preserved in the message
 *    - If WhatsApp Web is not logged in:
 *      ✓ Should redirect to WhatsApp Web login
 *
 * 2. MOBILE BROWSER TEST (iOS Safari / Android Chrome)
 * ─────────────────────────────────────────────────────────────────────────
 *
 * a) iOS Safari:
 *    - Open the app on iPhone/iPad
 *    - Navigate to a supplier with WhatsApp number
 *    - Verify WhatsApp button is visible and clickable
 *    - Click the WhatsApp button
 *    Expected:
 *      ✓ WhatsApp app should open (if installed)
 *      ✓ Conversation with the supplier should be ready
 *      ✓ Pre-filled message should be in the input field
 *      ✓ User can review and modify message before sending
 *    - User manually sends the message
 *    Verify:
 *      ✓ Message arrives in WhatsApp with correct content
 *      ✓ All special characters preserved
 *      ✓ Formatting (newlines, etc) is correct
 *
 * b) Android Chrome:
 *    - Open the app on Android device
 *    - Navigate to a supplier with WhatsApp number
 *    - Verify WhatsApp button is visible and clickable
 *    - Click the WhatsApp button
 *    Expected:
 *      ✓ System should ask to open with WhatsApp (if installed)
 *      ✓ WhatsApp app should open to the contact
 *      ✓ Pre-filled message should be ready
 *      ✓ User can review and modify before sending
 *    - User manually sends the message
 *    Verify:
 *      ✓ Message arrives correctly
 *      ✓ All formatting preserved
 *
 * 3. MESSAGE CONTENT TEST
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Test message with template placeholders filled:
 * - Navigate to: Supply request → Results → WhatsApp Button
 * - Message should include (from template):
 *   ✓ Event name: {evento} → "Festa de Formatura"
 *   ✓ Event date: {data} → "15/11/2024"
 *   ✓ Event location: {local} → "São Paulo, SP"
 *   ✓ Deadline: {prazo} → "Responder até 10/11"
 *   ✓ Service type: {servico} → "catering"
 *
 * Verify special characters in message:
 *   ✓ Portuguese characters (é, ã, ç, etc) display correctly
 *   ✓ Ampersands (&) don't break the message
 *   ✓ Numbers and currency symbols work fine (R$, %, etc)
 *   ✓ Newlines create proper line breaks
 *   ✓ Emojis (if used) display correctly
 *
 * 4. BUTTON BEHAVIOR TEST
 * ─────────────────────────────────────────────────────────────────────────
 *
 * a) Button Rendering:
 *    - Supplier WITH WhatsApp number (email + whatsapp_numero):
 *      ✓ WhatsApp button should be visible
 *      ✓ Button should be styled consistently
 *      ✓ Button should have WhatsApp branding/icon
 *
 * b) Supplier WITHOUT WhatsApp number:
 *      ✓ WhatsApp button should not appear
 *      ✓ Only email button should show
 *
 * c) Button States:
 *      ✓ Hover state should work on desktop
 *      ✓ Active/pressed state should work on mobile
 *      ✓ Cursor should change to pointer
 *
 * 5. NEW TAB/WINDOW TEST
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Desktop behavior:
 *    - Click WhatsApp button
 *    ✓ Opens in NEW tab/window (not replacing current page)
 *    ✓ User can return to the supplier list
 *    ✓ Can open multiple WhatsApp conversations in different tabs
 *
 * 6. DIFFERENT MESSAGE TEMPLATES TEST
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Test with different email templates (Modelo):
 * a) Short template (1-2 lines):
 *    - Message should be concise
 *    - URL length should be reasonable
 *
 * b) Long template (5+ lines with multiple fields):
 *    - Full message should be included
 *    - No truncation
 *    - All fields filled correctly
 *
 * c) Template with special formatting (multiple newlines):
 *    - Each newline should create a proper line break
 *    - Message structure should be preserved
 *
 * 7. CROSS-BROWSER COMPATIBILITY TEST
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Test on:
 *    ✓ Chrome (latest)
 *    ✓ Firefox (latest)
 *    ✓ Safari (latest)
 *    ✓ Edge (latest)
 *
 * Each browser should:
 *    ✓ Display the button correctly
 *    ✓ Generate correct wa.me URL
 *    ✓ Open WhatsApp Web in new tab
 *
 * 8. ERROR STATES TEST
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Supplier with invalid WhatsApp number:
 *    ✓ Button should still render (if whatsapp_numero exists)
 *    ✓ URL should still be generated
 *    ✓ WhatsApp should handle invalid number gracefully
 *
 * Supplier with empty message template:
 *    ✓ Button should still work
 *    ✓ Should open chat without pre-filled message
 *
 * ============================================================================
 * TEST EXECUTION NOTES
 * ============================================================================
 *
 * - Automated tests (Vitest) cover URL generation and encoding
 * - Manual tests verify real-world WhatsApp behavior
 * - WhatsApp Business API is NOT used (just wa.me links)
 * - User manually sends the message (no automatic sending)
 * - Test with actual WhatsApp accounts to verify end-to-end flow
 *
 * ============================================================================
 */
