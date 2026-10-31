/**
 * WhatsAppButton Component
 *
 * Button that opens a WhatsApp conversation with a pre-filled message.
 * Uses wa.me links for cross-platform compatibility (mobile and desktop).
 *
 * Features:
 * - Opens wa.me link in a new tab/window
 * - Pre-fills message with supplier info and request details
 * - Supports special characters and newlines in messages
 * - Works on mobile (opens WhatsApp app) and desktop (opens WhatsApp Web)
 * - No Business API - just standard wa.me links
 *
 * Usage:
 *   <WhatsAppButton
 *     phoneNumber="5511999887766"
 *     message="Olá! Procuro fornecedor de catering..."
 *     supplierName="Catering Delícia"
 *   />
 */

import React from 'react';
import { generateWhatsAppUrl } from '../utils/whatsapp';

export interface WhatsAppButtonProps {
  /**
   * WhatsApp phone number (with or without formatting)
   * Examples: '5511999887766', '55 11 99988-7766', '+55 11 99988-7766'
   */
  phoneNumber: string;

  /**
   * Message to pre-fill in WhatsApp
   * Will be URL-encoded automatically
   */
  message: string;

  /**
   * Optional supplier name for logging/analytics
   */
  supplierName?: string;

  /**
   * Optional CSS class for styling
   */
  className?: string;

  /**
   * Optional label for the button (default: "WhatsApp")
   */
  label?: string;

  /**
   * Optional callback when button is clicked
   */
  onClick?: () => void;

  /**
   * Optional aria-label for accessibility
   */
  ariaLabel?: string;

  /**
   * Optional title for tooltip
   */
  title?: string;

  /**
   * Whether to open in new window vs new tab (default: new tab with target="_blank")
   */
  openInWindow?: boolean;
}

/**
 * WhatsApp Button Component
 *
 * Renders a clickable button that opens WhatsApp with a pre-filled message.
 * The message is URL-encoded to handle special characters, emoji, and newlines.
 *
 * On mobile devices with WhatsApp installed, opens the WhatsApp app.
 * On desktop/web, opens WhatsApp Web in a new tab.
 *
 * @example
 *   <WhatsAppButton
 *     phoneNumber="5511999887766"
 *     message={`Olá Catering Delícia!
 *
 * Procuro fornecedor de catering para evento em SP.
 * Data: 15/11/2024
 * Local: São Paulo, SP
 *
 * Poderia me passar informações?`}
 *     supplierName="Catering Delícia"
 *   />
 */
export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  phoneNumber,
  message,
  supplierName,
  className,
  label = 'WhatsApp',
  onClick,
  ariaLabel,
  title,
}) => {
  // Generate the wa.me URL with pre-filled message
  const whatsappUrl = generateWhatsAppUrl(phoneNumber, message);


  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onClick?.()}
      className={className}
      aria-label={ariaLabel || `Contact ${supplierName} via WhatsApp`}
      title={title || 'Open WhatsApp conversation'}
      // Prevent opening in new window if openInWindow is false
      style={{ display: 'inline-block' }}
    >
      {label}
    </a>
  );
};

export default WhatsAppButton;
