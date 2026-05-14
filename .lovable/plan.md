
# Plan: De Diprolam a SaaS multi-tenant de inventario

Transforma la app actual (cerrada para Diprolam Bjx) en un producto vendible donde **cada empresa cliente tiene su propio espacio aislado, con su nombre, logo y colores**. Una empresa nunca ve datos de otra.

## Nombre del producto (propuestas)

Como no diste nombre, propongo estas opciones para usar mientras tanto. Puedes cambiarlo cuando quieras:

1. **StockFlow** — corto, internacional, descriptivo
2. **Almacenia** — en español, suena a marca
3. **InventaPro** — claro y directo
4. **Bodegapp** — moderno, latinoamericano

El plan asume **StockFlow** como placeholder; dime si prefieres otro y lo cambio antes de implementar.

---

## Arquitectura nueva

```text
┌─────────────────────────────────────────────┐
│  Super Admin (tú, dueño del SaaS)           │
│   └─ crea Empresas y su primer admin        │
└─────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────┐  ┌──────────────────────┐
│ Empresa A (Diprolam) │  │ Empresa B (Cliente2) │
│  - logo, colores     │  │  - logo, colores     │
│  - admin, almacén,   │  │  - admin, almacén,   │
│    solicitantes      │  │    solicitantes      │
│  - sus productos,    │  │  - sus productos,    │
│    solicitudes, etc. │  │    solicitudes, etc. │
└──────────────────────┘  └──────────────────────┘
```

## Cambios en la base de datos

**Tabla nueva `empresas`:**
- nombre, slug (identificador URL), logo_url, color_primario, color_sidebar, activo

**Nuevo rol `super_admin`** en el enum `app_role` — solo tú; puede crear/editar empresas y crear el primer admin de cada una.

**Columna `empresa_id`** agregada a: `profiles`, `productos`, `categorias`, `ubicaciones`, `proyectos`, `solicitudes`, `movimientos_inventario`, `user_roles`.

**RLS reescrita** para que cada query filtre por `empresa_id = empresa_id_actual()` (función security-definer que lee la empresa del usuario logueado). Super admin ve todo.

**Storage bucket `branding`** público para subir logos.

**Función `crear_empresa_con_admin(...)`** que en una sola transacción crea la empresa + el primer usuario admin + perfil.

## Cambios en frontend

**Branding dinámico:**
- Al hacer login, cargar empresa del usuario y aplicar `--primary`, `--sidebar`, logo en CSS variables.
- Reemplazar `diprolamIcon` y `diprolamLogo` hardcoded en `AppLayout.tsx` por los de la empresa.
- `<title>` y manifest dinámicos según empresa.

**Pantallas nuevas (solo super_admin):**
- `/empresas` — lista, crear, activar/desactivar, editar branding (subir logo, elegir colores).
- Login propio para super_admin (mismo `/login`, redirige a `/empresas` en vez de `/dashboard`).

**Pantallas existentes** siguen funcionando igual para admin/almacén/solicitante de cada empresa, solo que filtradas a su tenant.

**Rebrand global:** quitar "Diprolam Bjx" de textos, títulos, manifest PWA, README. Reemplazar por "StockFlow" (o el nombre que elijas).

**PWA:** manifest sigue siendo uno solo a nivel app (StockFlow), no por empresa — el branding por empresa solo aplica adentro de la app.

## Datos demo

Borro los datos actuales (productos, solicitudes, movimientos, categorías, ubicaciones, proyectos, profiles excepto el tuyo) y siembro:

- **Empresa "Demo Corp"** con logo placeholder y colores neutros azules.
- 3 cuentas demo (admin@demo.com, almacen@demo.com, solicitante@demo.com — password `demo1234`).
- ~15 productos en 4 categorías, 3 ubicaciones, 2 proyectos, 5 solicitudes en distintos estados.

Tu cuenta actual se promueve a **super_admin** para que puedas crear más empresas.

## Lo que NO incluye este plan

- Landing pública de venta del producto (la pedimos en otra iteración).
- Pagos / suscripciones / planes.
- Dominio personalizado por empresa (todas viven en el mismo dominio por ahora).
- Onboarding self-service (por ahora solo el super_admin crea empresas).

## Riesgos

- **Migración compleja:** agregar `empresa_id` a 8 tablas y reescribir RLS toca todo. Es la única forma correcta de aislar datos.
- **Datos actuales se pierden:** confirmaste que sí, pero quedará respaldado en una migración por si lo necesitas restaurar manualmente.
- **Pruebas:** después de la migración hay que probar cada rol en cada pantalla — esto puede destapar bugs de RLS que iremos puliendo.

## Preguntas pendientes antes de implementar

1. **¿Confirmas el nombre "StockFlow"** o prefieres otro de la lista (o uno propio)?
2. **¿Tu cuenta de Diprolam debe quedar como super_admin** del SaaS o quieres que cree una cuenta nueva separada para ese rol?

Responde esas dos y procedo.
