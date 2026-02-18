# Artisan Tile — Project Dashboard

Full-stack business management platform for Artisan Tile Kitchen & Bath.

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query, Wouter
- **Backend:** Express, Drizzle ORM, PostgreSQL
- **Build:** Vite (client), esbuild (server)
- **Deploy:** Railway

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm

### Setup

```bash
# Install dependencies
npm install

# Copy env file and fill in values
cp .env.example .env

# Push database schema
npm run db:push

# Start dev server
npm run dev
```

The app will be running at `http://localhost:5000`.

### Default Admin Account

On first run, a default admin user is seeded:
- Email: `admin@artisantile.com` (or whatever `ADMIN_EMAIL` is set to)
- Password: `ChangeMe123!` (or whatever `ADMIN_DEFAULT_PASSWORD` is set to)

**Change this immediately after first login.**

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run check` | TypeScript type check |
| `npm run db:push` | Push schema changes to database |

## Deploy to Railway

1. Push to GitHub
2. Connect repo in Railway dashboard
3. Add PostgreSQL plugin
4. Set environment variables (see `.env.example`)
5. Deploy — Railway auto-detects `railway.toml` config

## Project Structure

```
artisan-tile/
├── client/src/
│   ├── features/       # Domain modules (auth, customers, projects, etc.)
│   ├── components/
│   │   ├── ui/         # shadcn/ui component library
│   │   ├── layout/     # Layout, Sidebar, Header
│   │   └── shared/     # Cross-module components
│   └── lib/            # Query client, API wrapper, utilities
├── server/
│   ├── middleware/      # Auth, validation, error handling, pagination
│   ├── modules/        # Domain-split routes + storage
│   └── services/       # Email, Google Drive, file uploads, PDF
├── shared/
│   └── schema.ts       # Drizzle tables, Zod schemas, TypeScript types
└── db/
    └── index.ts        # PostgreSQL pool + Drizzle instance
```
