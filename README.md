# MR Academy Billing System

Internal billing and operations platform for managing academy subscriptions, invoicing, collections, and inventory.

## Overview

A web-based application for day-to-day billing workflows: creating GST invoices, tracking students, recording expenses, closing daily collections, and generating operational reports. Designed for front-desk and administrative staff with role-based access.

## User Roles

| Role | Access |
|------|--------|
| **Administrator** | Full access — settings, reports, user management, financial summaries, backups |
| **Receptionist** | Operational access — invoices, students, stock, expenses; no admin or report areas |

## Modules

### Dashboard
- Role-specific overview with key counts and recent invoice activity
- Quick links to common tasks (new invoice, collections, etc.)

### Invoices
- Create and manage GST invoices for subscriptions, coaching packages, and products
- Support for full, partial, and pending payment status
- Invoice PDF generation and reprint
- Soft-delete with restore (permission-based)
- Invoice search and history

### Students (Customer Records)
- Student directory with search and status filters
- Service/subscription filtering
- Soft-delete and admin restore for removed records
- Membership ID and contact details

### Stock Inventory
- Purchase records for academy supplies
- Quantity and total cost tracking (no per-unit pricing)
- Optional supplier bill PDF attachment
- Category and supplier filtering

### Expenses
- Record daily operational expenses
- Payment mode tracking (cash / UPI)
- Admin edit and delete; receptionists can create entries

### Daily Collection
- End-of-day collection closing with revenue and expense snapshot
- Cash denomination reconciliation
- Collection edit history and audit trail
- Admin-only access

### Reports
- Revenue, GST, and student reports (admin)
- Daily collection and revenue analytics
- Export capabilities for revenue data

### Administration
- User management (create, disable, password reset)
- Subscription and product catalog management
- Academy settings (branding, GST defaults, bank details)
- Database backup export and restore
- Security event log

## Technology

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Auth.js (credentials-based, JWT sessions)
- **PDF:** Server-side invoice generation

## Getting Started

Configuration and deployment steps are documented separately to avoid exposing environment-specific details in this file.

1. Copy `.env.example` to `.env` and configure required variables locally.
2. See [DEPLOY.md](./DEPLOY.md) for database setup, build, and deployment procedures.

### Development

```bash
npm install
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

### Database

```bash
npm run db:deploy   # apply migrations (production)
npm run db:migrate  # develop migrations locally
npm run test        # run unit tests
```

## File Storage

Stock bill PDFs can be stored on the local filesystem (development) or Cloudflare R2 (recommended for serverless hosting). Invoice PDFs and branding assets are generated from application resources and do not require external object storage.

## License

Proprietary — internal use only. Unauthorized distribution is prohibited.
