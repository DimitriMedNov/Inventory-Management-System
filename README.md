# Inventory Management System

Inventory and internal requisition system for a company with several sites and projects.

## What it does

**Inventory** — products organized by category and by location, with every entry, exit
and adjustment written to a movements table instead of overwriting a stock number.
Current stock is the sum of its movements, so the history is always auditable.

**Requisitions** — a request (`solicitudes`) carries its line items (`detalle_solicitud`),
goes through states, and is charged against a project (`proyectos`), which is how the
cost lands where it belongs.

**Multi-company** — `empresas` separates the operation of each company in the group, and
`ubicaciones` separates warehouses within a company.

**Roles** — permissions live in `user_roles`, separate from the user profile, so someone
can request without being able to approve.

## Data model

10 tables: `empresas`, `ubicaciones`, `categorias`, `productos`,
`movimientos_inventario`, `proyectos`, `solicitudes`, `detalle_solicitud`, `profiles`
and `user_roles`, all protected with Row Level Security.

## Why movements instead of a stock column

A stock column is a single number that any bug can corrupt silently and that nobody can
audit afterwards. A movements ledger lets you answer *how* you got to today's number,
recalculate it from scratch, and find the exact entry that broke it.

## Stack

React · TypeScript · Vite · Tailwind CSS · shadcn/ui · Supabase (PostgreSQL, Auth)

## Run it locally

```bash
npm install
cp .env.example .env
npm run dev
```

## Roadmap

- Weighted-average cost per product
- Purchase orders linked to requisitions
- Tests for the movements ledger and the role policies

## Demo account

The login screen shows an **Entrar como invitado** button when `VITE_DEMO_EMAIL` and
`VITE_DEMO_PASSWORD` are set, so anyone can walk through the system without asking for
access. The guest signs in as an `admin` of the demo company, so the whole system is visible:
catalog, stock movements, requisition approval and user management. Access is scoped to
that company by Row Level Security, so the account cannot reach any other tenant's data.

`supabase/seed-demo.sql` loads the sample data behind it: 20 products across 5 categories
and 3 locations, 27 stock movements over the last three months, 4 projects and 5
requisitions covering every status. All of it invented — no real company data.
