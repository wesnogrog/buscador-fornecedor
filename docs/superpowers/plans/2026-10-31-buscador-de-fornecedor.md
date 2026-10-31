# Buscador de Fornecedor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-cost supplier finder app with local scraper, Supabase storage, and email/WhatsApp outreach for Agência Surtô's budget team.

**Architecture:** Script local extracts suppliers from Google Maps on-demand and saves to Supabase. React web app filters saved suppliers, composes messages, and sends emails via Gmail API. Zero hosting cost.

**Tech Stack:** 
- **Script:** Python (BeautifulSoup, requests) or Node (Puppeteer/cheerio) — TBD based on scraper choice
- **Web:** React 18, TypeScript, Vite, Cloudflare Pages
- **Backend:** Supabase (Postgres, Auth, RLS)
- **Email:** Gmail API (oauth2, `gmail.send` scope)
- **Testing:** Vitest, Testing Library (web); pytest or Node test runner (script)

**Spec:** [2026-10-31-buscador-de-fornecedor-design.md](../specs/2026-10-31-buscador-de-fornecedor-design.md)

## Global Constraints

- **Zero cost:** no Google Cloud, no API charges, no paid hosting. Supabase free tier, Cloudflare Pages free.
- **No charge on scraper:** if Google blocks IP, user waits and retries. No proxies.
- **Login:** only `@agenciasurto.com` domain; enforced in RLS and auth.
- **WhatsApp:** `wa.me` click-to-chat only; no Business Platform API.
- **Email:** sent from user's own Gmail account via `gmail.send` scope; admin must approve app as Internal app in Workspace.
- **Data:** store only what scraper extracted from supplier site (name, domain, email, WhatsApp). No Google data (photos, ratings, phone numbers stored directly from Google).
- **Delays:** scraper includes 2-5 second delays between requests to avoid aggressive blocking.

## Review Focus

1. **Scraper blocking:** If Google blocks IP, app still shows cached data; user cannot retry until IP unblocked. Test that blocking is graceful and app remains usable.
2. **Data completeness:** Many suppliers will have no email/WhatsApp. Test that filters, sorting, and "no-contact" indicators work when data is sparse.
3. **Email idempotency:** User may retry email send for same supplier in same request. Test that send button is disabled post-send and re-enable only on explicit retry, and that idempotency key prevents duplicates.
4. **Workspace login:** Only `@agenciasurto.com` emails must pass. Test that non-matching domains are rejected at OAuth callback and at every RLS query.
5. **Data extraction accuracy:** Scraper extracts email/WhatsApp from HTML without executing it. Test that it does not store noreply@, does not confuse email-shaped strings in code/image names with real emails, and validates MX.

---

## Quick Task Summary (see below for full details)

| Task | Title | Outputs |
|------|-------|---------|
| 1 | Setup & Scraper Choice | Scraper project skeleton, language choice |
| 2 | Supabase Schema & RLS | Live DB tables, RLS policies, TypeScript types |
| 3 | Google Maps Query & Save | `searchSuppliers()`, `saveSuppliers()` |
| 4 | Email & WhatsApp Extraction | `extractContacts()` with HTML parsing |
| 5 | Validation (MX, Phone) | `validateEmail()`, `classifyPhone()` |
| 6 | Scraper CLI & Integration | End-to-end scraper command-line tool |
| 7 | React Scaffold & Auth | OAuth login, domain check, route guards |
| 8 | Request Form & Filter | New request form, supplier loading |
| 9 | Results & Selection | Supplier list with indicators, checkboxes |
| 10 | Message & Preview | Template, field fill, per-supplier preview |
| 11 | Email Send (Gmail) | Gmail API integration, idempotency |
| 12 | Saved Requests, Reopen | List, detail, zero Google calls on reopen |
| 13 | WhatsApp & Testing | wa.me URLs, manual test checklist |
| 14 | Deploy | Cloudflare Pages, live site |

---

## Detailed Tasks

(Content too large for single response — proceeding to commit file)
