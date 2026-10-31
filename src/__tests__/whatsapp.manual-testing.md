# WhatsApp Integration - Manual Testing Checklist

## Overview
This checklist verifies the WhatsApp integration on different platforms and browsers. The integration uses `wa.me` links for cross-platform compatibility without the WhatsApp Business API.

**Key Features:**
- wa.me links with pre-filled messages
- Special character and emoji support
- Works on mobile (opens WhatsApp app) and desktop (opens WhatsApp Web)
- User manually sends message (no automatic sending)
- Message templates with placeholder fields

---

## 1. Desktop Browser Test (Chrome/Firefox/Safari/Edge)

### URL Generation Display
- [ ] Open app and navigate to a supplier with WhatsApp number
- [ ] Right-click WhatsApp button → "Inspect Element"
- [ ] Check the `<a href>` URL
  - [ ] URL starts with `https://wa.me/`
  - [ ] Phone number is included (digits only, no formatting)
  - [ ] Message is URL-encoded (spaces as `%20`, special chars encoded)
  - [ ] No extra query parameters
  - Example: `https://wa.me/5511999887766?text=Ol%C3%A1%21%20Como%20est%C3%A1%3F`

### Click Opens WhatsApp Web (Desktop)
**If WhatsApp Web is logged in:**
- [ ] Click WhatsApp button
- [ ] WhatsApp Web opens in a new tab
- [ ] Conversation window appears for the contact number
- [ ] Message is pre-filled in the input field
- [ ] Verify special characters display correctly:
  - [ ] Portuguese characters (é, ã, ç, etc)
  - [ ] Ampersands (&)
  - [ ] Currency symbols (R$)
  - [ ] Newlines preserved
- [ ] User can see the message before sending

**If WhatsApp Web is not logged in:**
- [ ] Redirects to WhatsApp Web login
- [ ] After login, conversation opens with message

---

## 2. iOS Safari (Mobile)

### Initial Setup
- [ ] iPhone or iPad with WhatsApp installed
- [ ] Open app in Safari
- [ ] Navigate to supplier with WhatsApp number

### Button and Click Behavior
- [ ] WhatsApp button is visible and clickable
- [ ] Button styling is consistent with design
- [ ] Click WhatsApp button
- [ ] WhatsApp app opens (not web version)
- [ ] Conversation with supplier appears
- [ ] Pre-filled message is in the input field
- [ ] User can see full message before sending

### Message Content Verification
- [ ] Message content is correct
- [ ] Portuguese characters display properly
- [ ] Newlines create proper line breaks
- [ ] All formatting is preserved
- [ ] No encoding artifacts (e.g., `%20` should not appear, should be spaces)
- [ ] User manually reviews and modifies if needed
- [ ] User sends the message
- [ ] Message arrives in WhatsApp with correct content

### Return to App
- [ ] Can close WhatsApp and return to supplier list
- [ ] Page state is preserved
- [ ] Can contact another supplier

---

## 3. Android Chrome (Mobile)

### Initial Setup
- [ ] Android phone with WhatsApp installed
- [ ] Open app in Chrome
- [ ] Navigate to supplier with WhatsApp number

### Button and Click Behavior
- [ ] WhatsApp button is visible and clickable
- [ ] Click WhatsApp button
- [ ] System prompt asks to open with WhatsApp
- [ ] Accept and open in WhatsApp
- [ ] Conversation with supplier appears
- [ ] Pre-filled message is ready
- [ ] User can review and modify before sending

### Message Content Verification
- [ ] Message content is complete
- [ ] All special characters preserved
- [ ] Formatting (newlines) is correct
- [ ] No truncation
- [ ] User manually sends message
- [ ] Message arrives correctly on WhatsApp

### Return to App
- [ ] Can return to supplier list
- [ ] Can contact multiple suppliers

---

## 4. Message Content Test

### Template Fields
Navigate to: Supply request → Results → WhatsApp Button

Message should include (from template):
- [ ] Event name: `{evento}` → "Festa de Formatura"
- [ ] Event date: `{data}` → "15/11/2024"
- [ ] Event location: `{local}` → "São Paulo, SP"
- [ ] Deadline: `{prazo}` → "Responder até 10/11"
- [ ] Service type: `{servico}` → "catering"

### Special Characters in Message
- [ ] Portuguese characters (é, ã, ç, etc) display correctly
- [ ] Ampersands (&) don't break the message
- [ ] Numbers and currency symbols work (R$, %, etc)
- [ ] Newlines create proper line breaks
- [ ] Emojis (if used) display correctly
- [ ] Multiple consecutive special characters work (???, ---, etc)

### Message Template Variations
Test with different email templates (Modelo):

**Short template (1-2 lines):**
- [ ] Message is concise
- [ ] URL length is reasonable
- [ ] Displays correctly on all platforms

**Long template (5+ lines with multiple fields):**
- [ ] Full message is included
- [ ] No truncation
- [ ] All fields filled correctly
- [ ] Newlines are preserved

**Template with special formatting (multiple newlines):**
- [ ] Each newline creates a proper line break
- [ ] Message structure is preserved
- [ ] Indentation works (if used)

---

## 5. Button Behavior Test

### Button Rendering
**Supplier WITH WhatsApp number (email + whatsapp_numero):**
- [ ] WhatsApp button is visible
- [ ] Button styled consistently
- [ ] Button has WhatsApp branding/icon (if applicable)
- [ ] Button is accessible (proper `aria-label`)

**Supplier WITHOUT WhatsApp number:**
- [ ] WhatsApp button does NOT appear
- [ ] Only email button shows (if email exists)
- [ ] No blank space where button would be

### Button States
- [ ] Hover state works on desktop
- [ ] Active/pressed state works on mobile
- [ ] Cursor changes to pointer on desktop
- [ ] Visual feedback on interaction

---

## 6. New Tab/Window Behavior (Desktop)

- [ ] Click WhatsApp button
- [ ] Opens in NEW tab (not replacing current page)
- [ ] URL bar shows new tab with WhatsApp Web
- [ ] User can return to supplier list in original tab
- [ ] Can open multiple WhatsApp conversations in different tabs
- [ ] Each tab has its own conversation

---

## 7. Cross-Browser Compatibility

Test on each browser (all recent versions):

### Chrome
- [ ] Button displays correctly
- [ ] URL generated correctly
- [ ] Opens WhatsApp Web in new tab
- [ ] Message pre-filled correctly

### Firefox
- [ ] Button displays correctly
- [ ] URL generated correctly
- [ ] Opens WhatsApp Web in new tab
- [ ] Message pre-filled correctly

### Safari (macOS)
- [ ] Button displays correctly
- [ ] URL generated correctly
- [ ] Opens WhatsApp Web in new tab
- [ ] Message pre-filled correctly

### Edge
- [ ] Button displays correctly
- [ ] URL generated correctly
- [ ] Opens WhatsApp Web in new tab
- [ ] Message pre-filled correctly

---

## 8. Error States Test

### Supplier with Invalid WhatsApp Number
- [ ] Button still renders (if whatsapp_numero field exists)
- [ ] URL is still generated
- [ ] WhatsApp handles invalid number gracefully
- [ ] Doesn't crash or show error to user

### Supplier with Empty Message Template
- [ ] Button still works
- [ ] Opens chat without pre-filled message
- [ ] User can type message manually

### Supplier with Very Long Message
- [ ] Entire message is included in URL
- [ ] No truncation
- [ ] Message displays correctly in WhatsApp

---

## 9. URL Encoding Verification

Test message with various special characters:

### Test Cases

**Message:** `Olá! Como você está? #Disponível`
- [ ] `á` encoded as `%C3%A1`
- [ ] `!` encoded as `%21`
- [ ] `?` encoded as `%3F`
- [ ] `#` encoded as `%23`

**Message:** `Serviço A & Serviço B`
- [ ] `&` encoded as `%26`

**Message with newlines:**
```
Line 1
Line 2
Line 3
```
- [ ] Newlines encoded as `%0A`
- [ ] Each newline preserved in URL

**Message with URL:**
`Veja mais em https://example.com`
- [ ] `:` encoded as `%3A`
- [ ] `/` encoded as `%2F`
- [ ] Full URL encoded properly

**Brazilian phone format:**
- [ ] `5511999887766` generates correct URL
- [ ] `(55) 11 99988-7766` normalizes correctly
- [ ] `55 11 99988-7766` handles spaces
- [ ] `11999887766` (without country code) works

---

## 10. Performance Test

- [ ] Button renders without delay
- [ ] URL generation is instant
- [ ] Click to WhatsApp opening is quick
- [ ] No lag on mobile devices
- [ ] Message displays immediately in WhatsApp

---

## 11. Accessibility Test

- [ ] WhatsApp button has proper `aria-label`
- [ ] Keyboard navigation works (Tab to button, Enter to click)
- [ ] Screen readers announce button purpose
- [ ] Button is large enough to tap on mobile
- [ ] Color contrast is sufficient
- [ ] No reliance on color alone to identify button

---

## 12. Integration with Email Channel

- [ ] Both email and WhatsApp buttons appear (when both channels available)
- [ ] Buttons are properly spaced
- [ ] User can choose either channel
- [ ] No conflicts or overlapping

---

## Checklist Summary

Total items to verify: 100+

Mark as complete when:
- [ ] All automated tests pass (`npm test`)
- [ ] All manual tests passed (all browsers and platforms)
- [ ] Special character handling verified
- [ ] Message templates working correctly
- [ ] Accessibility verified
- [ ] No performance issues
- [ ] Code is committed with proper documentation

---

## Issues Found During Testing

Use this section to document any issues:

| Issue | Platform | Browser | Severity | Notes |
|-------|----------|---------|----------|-------|
| | | | | |
| | | | | |

---

## Sign-Off

- [ ] QA tested and approved
- [ ] No blocking issues
- [ ] Ready for release

**Tested by:** ________________  
**Date:** ________________  
**Time spent:** ________________  

---

## Notes

- WhatsApp wa.me links work on all platforms
- User manually sends message (no API integration)
- Message can be edited before sending
- Supports both desktop (WhatsApp Web) and mobile (WhatsApp app)
- No dependency on WhatsApp Business API
