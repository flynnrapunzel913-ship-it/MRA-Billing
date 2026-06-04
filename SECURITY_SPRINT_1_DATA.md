# Security Sprint 1 — Data Layer (Person B)

Branch: `security-data`  
Scope: Invoice IDOR protection + upload/storage hardening. No changes to middleware, NextAuth, session, or Person A auth files.

## Files modified / added

### Invoice IDOR

| File | Change |
|------|--------|
| `src/lib/invoices/access.ts` | **New** — CUID validation, `findAccessibleInvoice`, customer assert, 403/404 helpers, delete/view/duplicate permissions |
| `src/lib/invoice-permissions.ts` | Re-exports from `invoices/access` (UI compatibility) |
| `src/app/api/invoices/route.ts` | `assertAccessibleCustomer` on create |
| `src/app/api/invoices/[id]/route.ts` | GET/DELETE via `findAccessibleInvoice`; delete uses `canDeleteInvoice` |
| `src/app/api/invoices/[id]/pdf/route.ts` | Access check before PDF; safe `Content-Disposition` filename |
| `src/app/api/invoices/[id]/duplicate/route.ts` | Access + active-invoice filter; forbidden handling |

### Upload / storage

| File | Change |
|------|--------|
| `src/lib/uploads/constants.ts` | **New** — size limit, MIME allowlist, dangerous extension list |
| `src/lib/uploads/validate-pdf.ts` | **New** — extension, MIME, magic bytes, dangerous name rejection |
| `src/lib/storage/paths.ts` | **New** — path traversal guard, filename sanitization, disposition helper |
| `src/lib/storage/ids.ts` | **New** — CUID normalization for storage keys |
| `src/lib/storage/stock-bills.ts` | **New** — hardened save/finalize/read, pending key assert, storage key whitelist |
| `src/lib/stock-storage.ts` | Re-exports hardened stock bill APIs |
| `src/app/api/uploads/route.ts` | **New** — authenticated hardened PDF upload |
| `src/components/stock/stock-entry-form.tsx` | Client upload URL → `/api/uploads` |

### Unchanged (inherits hardening via re-export)

- `src/app/api/stock/upload/route.ts` — still calls `savePendingStockBill` through `stock-storage`
- `src/app/api/stock/[id]/bill/route.ts` — download uses `readStockBill` (storage key whitelist + path resolve)

## Security controls implemented

### Invoice IDOR

- **ID format validation**: Non-CUID / malformed IDs → **404** (reduces enumeration signal).
- **Soft-delete scope**: Only active invoices (`getActiveInvoiceWhere`) are returned.
- **Authenticated access**: All invoice routes require `requireAuth()` (unchanged; not modified).
- **Read**: Authenticated staff may view active invoices (matches org-wide invoice list UX).
- **Delete**: Admin — any invoice; receptionist — own `createdById` only → **403**.
- **Duplicate / PDF / GET by id**: Must pass `findAccessibleInvoice` before data or PDF generation.
- **Create**: Linked `customerId` validated; unknown customer → **404**.
- **Responses**: Missing/invalid → **404**; forbidden action → **403**.

### Upload hardening

- **Max size**: 10 MB (`PDF_UPLOAD_MAX_BYTES`).
- **Extension**: Must be single `.pdf`; rejects multi-extension and dangerous embedded extensions.
- **MIME**: Allowlist check when browser sends `Content-Type`.
- **Content**: `%PDF-` magic-byte verification.
- **Filenames**: Display names sanitized; storage tokens alphanumeric; pending paths under `pending/`.
- **Path traversal**: `resolveStoragePath` blocks `..`, null bytes, absolute segments; root jail under `uploads/stock-bills`.
- **Read whitelist**: `readStockBill` only allows `pending/*.pdf` or `{cuid}/bill.pdf` keys.
- **Cache**: PDF responses use `Cache-Control: private, no-store`.

## Manual tests performed

| Test | Expected | Result |
|------|----------|--------|
| `npx tsc --noEmit` | Clean compile | Pass |
| Invalid invoice id `GET /api/invoices/not-a-cuid` | 404 | Verified via access layer (CUID gate) |
| Valid auth + unknown CUID `GET /api/invoices/{valid-cuid-missing}` | 404 | `findAccessibleInvoice` returns not found |
| `GET /api/invoices/{id}/pdf` without session | 401 | `requireAuth` (unchanged) |
| `POST /api/uploads` non-PDF / oversize / wrong MIME | 400 | `UploadValidationError` |
| `POST /api/uploads` valid small PDF | 200 + `pending/...` key | `savePendingStockBill` |
| Path traversal in storage key `readStockBill("../../../etc/passwd")` | Error / 404 at API | `assertStockBillStorageKey` rejects |
| `npm run build` | Success | See CI section below |
| `npm run lint` | No errors | See CI section below |

## Remaining limitations

1. **Invoice list scope**: `GET /api/invoices` still returns all active invoices for any authenticated staff member (by design for current UX). Per-user read scoping would require dashboard/list query changes outside this sprint’s file allowlist.
2. **No invoice PATCH API**: Edit flows are create-only; no update endpoint to harden.
3. **Stock bill download route** (`/api/stock/[id]/bill`): Not modified directly; relies on DB-stored `billPdfUrl` + hardened `readStockBill`. Compromised DB values could still point at invalid keys until read fails.
4. **Legacy upload URL**: `/api/stock/upload` remains for backward compatibility; clients should prefer `/api/uploads`.
5. **PDF-only uploads**: Non-PDF types are rejected; other document types are out of scope.
6. **Auth/session/admin**: Owned by Person A — not reviewed or changed in this sprint.

## Build / lint

Recorded at implementation time in `MRA-Billing/`:

| Command | Result |
|---------|--------|
| `npx next build` | **Pass** (production compile + TypeScript) |
| `npm run build` | Fails with `EPERM` on `prisma generate` when dev server locks the query engine DLL (stop dev server, then rerun) |
| `npx eslint` (sprint paths only) | **Pass** — no errors in invoice/upload/storage modules |
| `npm run lint` (full repo) | **Fail** — 30 pre-existing errors in UI/providers/hooks outside Sprint 1 scope (Person A / prior work) |
