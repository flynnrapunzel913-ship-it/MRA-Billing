# MR Academy Billing System

Production-ready GST invoice and billing management system for MR Academy Swimming.

## Tech Stack

- **Frontend:** Next.js 15+, TypeScript, TailwindCSS, ShadCN-style UI
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth (Credentials)
- **PDF:** React-PDF
- **State:** Zustand
- **Forms:** React Hook Form + Zod

## Features

- Customer management with search, history, and active packages
- GST invoices (MRA-YYYY-00001 auto numbering)
- CGST 9% + SGST 9% calculations
- Branded PDF invoices matching MR Academy letterhead
- Dashboard with revenue charts and KPIs
- Reports (Revenue, GST, Customers, Package Sales) with Excel export
- Role-based access (Admin / Receptionist)
- WhatsApp sharing, email invoice, duplicate invoice, UPI QR support
- Dark mode and mobile responsive UI

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Setup

```bash
cd mr-academy-billing
cp .env.example .env
# Edit DATABASE_URL, DIRECT_URL (Neon: non-pooler URL), and AUTH_SECRET in .env

npm install
# Stop `npm run dev` before migrating (avoids lock + EPERM on generate)
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Default Login

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@mraacademy.com | admin123 |
| Receptionist | reception@mraacademy.com | reception123 |

## Invoice PDF Branding

Letterhead assets from the original document are stored in `public/branding/`:

- `logo.png` - Academy logo
- `address-panel.jpeg` - Header contact panel
- `footer-curves.jpeg` - Footer branding

Brand color: `#0070C0`

Update academy details, bank info, and asset URLs in **Settings**.

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/     # Protected pages
│   ├── api/             # REST API routes
│   └── login/
├── components/
│   ├── layout/
│   ├── pdf/
│   └── ui/
├── lib/                 # Auth, prisma, validations, utilities
└── stores/              # Zustand stores
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npx prisma studio` | Open database GUI |
| `npx prisma db seed` | Seed default data |

## License

Private - MR Academy
