# Task 11: Email Send (Gmail API Integration)

## Overview

Task 11 implements email sending functionality for the Buscador de Fornecedor application. It allows users to send composed emails to selected suppliers via their own Gmail account through the Gmail API, with built-in idempotency protection to prevent duplicate sends.

## Architecture

### Components

1. **SendFlow Component** (`src/pages/SendFlow.tsx`)
   - User-facing interface for sending emails
   - Shows message preview before send
   - Tracks progress in real-time
   - Displays errors and allows retries
   - Disables send button during sending

2. **useSendEmail Hook** (`src/hooks/useSendEmail.ts`)
   - Manages send state and progress
   - Handles batch email sending
   - Implements error handling
   - Tracks sent/failed counts
   - Controls retry logic

3. **Gmail Utility** (`src/utils/gmail.ts`)
   - Creates RFC 2822 formatted email messages
   - Validates email addresses
   - Invokes Supabase Edge Function for sending
   - Returns success/error results

4. **Idempotency Utility** (`src/utils/idempotency.ts`)
   - Checks if email already sent for supplier+pedido pair
   - Creates idempotency keys: `{supplierId}_{pedidoId}`
   - Records send attempts with full audit trail
   - Prevents duplicate sends

5. **Supabase Edge Function** (`supabase/functions/send-email/index.ts`)
   - Server-side Gmail API integration
   - Handles OAuth and credential decryption
   - Calls Gmail API with access tokens
   - Returns messageId/threadId on success

## Data Flow

```
User clicks "Enviar E-mails"
         ↓
   SendFlow Component
         ↓
   useSendEmail Hook (sendBatch)
         ↓
   For each email:
     ├─ checkIdempotency(supplierId, pedidoId)
     │   └─ Query envios table for existing send
     │
     ├─ sendEmail(to, subject, body)
     │   └─ Invoke Supabase Edge Function 'send-email'
     │       ├─ Decrypt user's Gmail credentials
     │       ├─ Get fresh access token via OAuth refresh
     │       └─ Call Gmail API v1 messages.send
     │
     ├─ recordSend(...)
     │   └─ Insert row into envios table with:
     │       - chave_idempotencia: prevents duplicates
     │       - status: sucesso/falhou/pendente
     │       - error message if failed
     │       - audit fields: criado_por, data_envio
     │
     └─ Update progress state
         ↓
    Show results to user
```

## Idempotency Strategy

**Idempotency Key Format:** `{supplierId}_{pedidoId}`

**Prevention Mechanism:**
1. Before sending, check if `chave_idempotencia` exists in `envios` table
2. If exists: block send with error message
3. If not exists: proceed with send
4. After send (success or failure): record in `envios` with the key

**Result:**
- Same supplier cannot receive multiple emails in same pedido
- Protects against:
  - Double-click on send button
  - Browser back button after send
  - User closing/reopening page mid-send
  - Network retries

## Database Schema (Relevant Fields)

### `envios` Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| pedido_fornecedor_id | UUID | FK to pedido_fornecedores |
| canal | ENUM | 'email' or 'whatsapp' |
| status | ENUM | 'sucesso', 'falhou', 'pendente' |
| mensagem | TEXT | Message body sent (for audit) |
| data_envio | TIMESTAMP | When sent |
| erro | TEXT | Error message if status='falhou' |
| **chave_idempotencia** | TEXT | Unique key: `supplierId_pedidoId` |
| criado_por | UUID | FK to auth.users |
| created_at | TIMESTAMP | Record creation time |

### `credenciais_gmail` Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| usuario_id | UUID | FK to auth.users (unique) |
| credencial_criptografada | BYTEA | Encrypted refresh token |
| criado_em | TIMESTAMP | When created |

## Testing

All components include comprehensive tests using Vitest:

### Test Files

1. **`src/__tests__/idempotency.test.ts`** - Idempotency checking
   - Prevents duplicate sends
   - Handles database errors
   - Validates key format
   - Tracks audit fields

2. **`src/__tests__/gmail.test.ts`** - Gmail API integration
   - Email message creation
   - RFC 2822 format validation
   - Email validation
   - API error handling
   - Network error handling

3. **`src/__tests__/useSendEmail.test.ts`** - Hook state management
   - Send state lifecycle
   - Progress tracking
   - Error handling
   - Button disabled state
   - Retry logic
   - Batch operations

4. **`src/__tests__/SendFlow.test.tsx`** - Component UI
   - Message preview
   - Progress display
   - Error messages
   - Button states
   - Retry functionality
   - Callbacks (onSendComplete, onCancel)

5. **`src/__tests__/send-email-integration.test.ts`** - End-to-end flow
   - Complete send pipeline
   - Idempotency enforcement
   - Multiple sends
   - Error recovery
   - Audit trail

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- idempotency.test.ts

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## Environment Variables

### Client (.env.local)

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### Server (Supabase Secrets)

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
GMAIL_ENCRYPTION_KEY=your-encryption-key
```

## Integration Points

### Consumes From

- **MessageComposer** (Task 10): Pre-composed messages with placeholders filled
- **SupplierList** (Task 9): Selected suppliers with emails
- **Supabase Auth**: Current user ID for audit trail
- **Supabase DB**: credenciais_gmail, envios tables

### Produces For

- **SavedRequests** (Task 12): Can view send history for reopened pedidos
- **Audit Trail**: All sends recorded in envios table with status/errors

## Security Considerations

1. **Credential Storage**: Encrypted in database, decrypted only in Edge Function
2. **OAuth Scopes**: Only `gmail.send` - cannot read emails
3. **User Context**: Can only send from own account (auth.uid enforced)
4. **RLS**: Database access verified through Supabase RLS policies
5. **Edge Function**: Runs server-side with service role key
6. **Input Validation**: Email format, message length validated before send

## Error Handling

### User-Facing Errors

| Situation | Behavior |
|-----------|----------|
| No Gmail credentials configured | Show setup prompt |
| Gmail OAuth expired | Prompt for re-authorization |
| Invalid recipient email | Skip with error, continue others |
| Gmail API rate limit | Show error, allow retry later |
| Network timeout | Show error, allow retry |
| Duplicate send (idempotency) | Block with explanation |

### Logging

- All sends logged to `envios` table with status/error
- Server-side logs available in Supabase Edge Function logs
- Client logs available in browser console (dev only)

## UI/UX Features

1. **Pre-Send Confirmation**
   - Shows list of recipients
   - Shows subject and preview of message
   - Last chance to review before sending

2. **Real-Time Progress**
   - Progress bar showing sent/total
   - Count updates as each email completes
   - Shows which supplier being sent to

3. **Error Visibility**
   - List of all failures with reasons
   - User can read and understand each error
   - Allows targeted retry

4. **Button Management**
   - "Enviar E-mails" disabled while sending
   - "Tentar Novamente" appears only on failures
   - "Voltar" available to go back

5. **Success Confirmation**
   - Green success message with count
   - Reminds user responses arrive in their Gmail

## Future Enhancements (Out of Scope for Task 11)

- [ ] Selective retry (retry only failed emails)
- [ ] Email template preview before send
- [ ] Bulk send scheduling
- [ ] Send analytics dashboard
- [ ] Email read receipts (via Gmail API)
- [ ] Automatic follow-up emails after N days

## Implementation Notes

### Why Idempotency Key is (supplierId, pedidoId)

This ensures:
- Each supplier gets exactly one email per request
- User can safely retry after network failures
- Matches the business rule: "don't send duplicate requests to same supplier in same pedido"

### Why Edge Function for Gmail API

Instead of client-side:
- Credentials stay encrypted server-side
- OAuth tokens never exposed to client
- Rate limiting handled server-side
- Complies with Gmail API security best practices

### Why Record All Sends (Success and Failure)

Allows:
- Complete audit trail
- Retry logic (know what was attempted)
- Support for user investigations
- Analytics on send success rates

## Troubleshooting

### "No Gmail credentials configured"

**Solution:** User needs to complete OAuth setup in auth flow (handled by Task 7)

### "Gmail API: Invalid recipient"

**Possible causes:**
- Email address extracted by scraper was wrong
- Email address is no longer valid
- Domain has no MX record

**Solution:** User marks supplier as "não contatar" and updates email in scraper

### "Failed to refresh token"

**Possible causes:**
- User revoked app access in Gmail settings
- OAuth token was revoked

**Solution:** User needs to re-authorize the app

### Duplicate send error appearing for new supplier

**Possible causes:**
- Same email address used for different suppliers
- User confusion about which supplier is which

**Solution:** Check `envios` table and `pedido_fornecedores` mapping

## References

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [RFC 2822 Email Format](https://tools.ietf.org/html/rfc2822)
- [OAuth 2.0 Refresh Token Flow](https://developers.google.com/identity/protocols/oauth2/web-server#refresh)
- [Idempotency Best Practices](https://stripe.com/docs/api/idempotent_requests)
