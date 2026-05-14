# InventarioPro

> Plataforma multi-empresa de gestión de inventario, solicitudes y movimientos de almacén con análisis de IA.

InventarioPro es una aplicación web full-stack que cualquier empresa puede desplegar para llevar control de productos, ubicaciones, categorías, movimientos y solicitudes de almacén. Incluye un módulo de análisis de inventario con IA que recomienda frecuencia de recompra y estima fechas de agotamiento.

## Características principales

- **Multi-tenant**: cada empresa tiene su propio espacio aislado por RLS.
- **Gestión de productos** con SKU, stock mínimo, unidades y categorías.
- **Movimientos de inventario** (entradas, salidas, ajustes) con histórico.
- **Solicitudes** entre roles (admin, almacenista, solicitante).
- **Análisis IA** del inventario: consumo diario, días restantes, fecha estimada de agotamiento y cantidad sugerida de recompra.
- **Auth** con email/password y Google.
- **PWA** instalable en móvil/escritorio.

## Stack

- **Frontend**: React 19, TanStack Router/Start, Tailwind v4, shadcn/ui.
- **Backend**: TanStack server functions sobre Cloudflare Workers.
- **Base de datos / Auth**: Supabase (Postgres + RLS).
- **IA**: Google Gemini (`gemini-2.5-flash`).

## Requisitos

- Node 20+ y `bun` (o `npm`/`pnpm`).
- Una cuenta de [Supabase](https://supabase.com) (gratuita).
- Una API key de [Google AI Studio](https://aistudio.google.com/app/apikey) para el módulo de IA.

## Variables de entorno

Crea un `.env` en la raíz:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=ey...
VITE_SUPABASE_PROJECT_ID=xxxx

# Server-only
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=ey...
SUPABASE_SERVICE_ROLE_KEY=ey...
GEMINI_API_KEY=AIza...
```

## Instalación

```bash
bun install
bun run dev
```

La app queda en `http://localhost:8080`.

## Build de producción

```bash
bun run build
```

El bundle se genera en `dist/` listo para Cloudflare Workers o cualquier runtime compatible.

## Migraciones de base de datos

Las migraciones SQL están en `supabase/migrations/`. Aplícalas con la CLI de Supabase:

```bash
supabase db push
```

## Estructura

```
src/
├── components/      Componentes UI (shadcn + custom)
├── routes/          Rutas (file-based routing)
├── lib/             Server functions y utilidades
├── integrations/    Cliente Supabase
└── styles.css       Tokens de diseño
```

## Personalización

El nombre, logo y colores se cambian desde:

- `public/manifest.webmanifest` — nombre PWA.
- `src/styles.css` — tokens de color (oklch).
- `src/components/AppLayout.tsx` — sidebar y branding.

## Licencia

MIT — úsalo, modifícalo y véndelo.

---

## Apéndice: limpiar metadatos de un repo importado

Si clonaste este repo y quieres reescribir el historial bajo tu nombre:

```bash
pip install git-filter-repo

git filter-repo --commit-callback '
  commit.author_name = b"Tu Nombre"
  commit.author_email = b"tu@email.com"
  commit.committer_name = b"Tu Nombre"
  commit.committer_email = b"tu@email.com"
  msg = commit.message.decode("utf-8", "replace")
  msg = "\n".join(
    l for l in msg.splitlines()
    if not l.startswith("X-Lovable-Edit-ID")
    and not l.lower().startswith("co-authored-by: lovable")
  )
  commit.message = msg.encode("utf-8")
'

git remote add origin git@github.com:tu-usuario/tu-repo.git
git push --force --all
git push --force --tags
```
