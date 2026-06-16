# MR Academy Billing — deployment

## 1. Environment

Copy `.env.example` to `.env` and set:

- `DATABASE_URL` — PostgreSQL connection string
- `AUTH_SECRET` — `openssl rand -base64 32`
- `AUTH_URL` — public app URL (e.g. `https://billing.example.com`)

Optional:

- `STORAGE_DRIVER=local` (default) or `r2` with R2 credentials

## 2. Database

```bash
cd MRA-Billing
npm install
npx prisma migrate deploy
npm run db:seed   # first deploy only
```

## 3. Build & run

```bash
npm run build
npm start
```

Dev:

```bash
npm run dev
```

## 4. Backups

- Export from **Settings → Database backup** (schema **S2-19**)
- Includes expenses, daily collections, and collection history
- Uploaded files (logos, stock PDFs) are **not** in JSON backup — back up `uploads/` or R2 bucket separately

## 5. Health checks

- Login as admin and receptionist
- Create invoice, mark daily collection, restore from backup on a staging DB first
