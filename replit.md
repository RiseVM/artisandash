# Artisan Showroom Dashboard

## Overview

A comprehensive showroom management system for Artisan Tile, allowing staff to manage tile sample inventory, customer information, sample checkouts with due date tracking, and contract management. The application tracks when samples are checked out to customers, monitors overdue items, manages returns, and handles contract generation and signing.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, Zustand available for client state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme variables for Artisan Tile branding
- **Build Tool**: Vite

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful JSON API under `/api/*` routes
- **Database ORM**: Drizzle ORM with PostgreSQL dialect

### Data Model
Three main entities:
1. **Customers** - Name, email, phone, Stripe payment info
2. **Inventory** - Tile samples with name, SKU, category, quantity
3. **Checkouts** - Links customers to inventory items with checkout/due dates and status (checked_out, overdue, returned)

### Key Design Patterns
- Shared schema definitions in `/shared/schema.ts` using Drizzle and Zod for type-safe validation
- Database storage abstraction layer in `/server/storage.ts` with interface for easy testing/swapping
- API hooks in `/client/src/hooks/use-api.ts` centralize all data fetching logic
- Form validation uses react-hook-form with Zod resolver

### Build System
- Development: Vite dev server with HMR for client, tsx for server
- Production: esbuild bundles server, Vite builds client to `dist/public`
- Server serves static files from built client in production

## External Dependencies

### Database
- **PostgreSQL** via `DATABASE_URL` environment variable
- **Drizzle Kit** for schema migrations (`db:push` command)
- **connect-pg-simple** for session storage

### Payment Processing
- **Stripe** integration planned (customer schema includes Stripe fields)
- Fields for customer ID, payment method, and card details

### Email/Notifications
- **Nodemailer** available for email notifications
- Environment variables for SMTP configuration referenced in attached assets

### UI Libraries
- Full shadcn/ui component set with Radix UI primitives
- Lucide React for icons
- date-fns for date formatting
- embla-carousel for carousels
- cmdk for command palette