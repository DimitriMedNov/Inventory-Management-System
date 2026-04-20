

## Plan: Adaptar la app a móvil, tablet y laptop

### Estado actual
- **Sidebar**: visible solo en `md+` (≥768px). En móvil **no existe ningún botón para abrirlo** → la navegación queda inaccesible.
- **Tablas** (productos, solicitudes, movimientos, usuarios, categorías, ubicaciones, proyectos): usan `overflow-x-auto` pero en celular obligan a scroll horizontal incómodo y no muestran toda la info.
- **Diálogos** (formularios de productos, solicitudes, etc.): usan `grid-cols-2` fijo → en celular los inputs salen apretados.
- **Header**: el bloque de usuario a la derecha se oculta en `<sm`, pero falta el botón de menú móvil.
- **Login y catálogo**: ya son razonablemente responsive.

### Cambios

**1. Navegación móvil (`src/components/AppLayout.tsx`)**
- Añadir botón hamburguesa visible solo en `<md` dentro del header.
- Implementar el sidebar móvil con el componente `Sheet` (lateral izquierdo) reutilizando los mismos items de `NAV` y conservando el branding Diprolam.
- Cerrar automáticamente el sheet al navegar a otra ruta.
- Ajustar el header en móvil: ocultar el subtítulo "Diprolam Bjx", reducir paddings (`px-4 md:px-6`) y compactar el botón "Salir" a solo icono en pantallas pequeñas.

**2. Tablas responsive (productos, solicitudes, movimientos, usuarios, categorías, ubicaciones, proyectos)**
- Patrón estándar: `hidden md:table` para la tabla + lista de **tarjetas apiladas** `md:hidden` con la información clave (nombre, estado, badges, acción principal).
- Cada tarjeta móvil mostrará: título principal + 2-3 datos secundarios + botones de acción táctiles (mín. 40px de alto).

**3. Diálogos / formularios**
- Cambiar `grid-cols-2` por `grid-cols-1 sm:grid-cols-2` en los formularios de productos, solicitudes, usuarios y demás modales.
- Asegurar `max-h-[90vh] overflow-y-auto` en todos los `DialogContent` para que en móvil se pueda hacer scroll dentro del modal.
- Footers de diálogo: `flex-col-reverse sm:flex-row` para que en celular el botón principal quede arriba.

**4. Dashboard (`src/routes/dashboard.tsx`)**
- Las métricas para admin/almacén pasan de `grid-cols-2 md:grid-cols-3 xl:grid-cols-6` a `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` (mejor uso del espacio en tablet).
- En las listas de "Movimientos recientes" y "Solicitudes recientes" reducir paddings en móvil (`px-3 md:px-5`).

**5. Catálogo (`src/routes/catalogo.tsx`)**
- Verificar que las tarjetas usen `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` y que el filtro/buscador se apile en móvil.

**6. Variables globales (`src/styles.css`)**
- Sin cambios estructurales; el sidebar fijo se mantiene en desktop y el `Sheet` se encarga del móvil.

### Resultado esperado
- **Móvil (≤640px)**: hamburguesa + sheet lateral, tablas convertidas en tarjetas apiladas, formularios en una sola columna, botones táctiles.
- **Tablet (640–1024px)**: sidebar visible si hay espacio (≥768px), tablas con scroll horizontal cómodo, formularios en 2 columnas.
- **Laptop/Desktop (≥1024px)**: layout actual sin cambios, máximo aprovechamiento del ancho.

### Archivos a modificar
- `src/components/AppLayout.tsx` (sidebar móvil + header responsive)
- `src/routes/productos.tsx` (cards móvil + form responsive)
- `src/routes/solicitudes.tsx` (cards móvil + diálogo responsive)
- `src/routes/movimientos.tsx` (cards móvil)
- `src/routes/usuarios.tsx` (cards móvil + diálogos responsive)
- `src/routes/categorias.tsx`, `ubicaciones.tsx`, `proyectos.tsx` (cards móvil)
- `src/routes/dashboard.tsx` (ajustes de grid)
- `src/routes/catalogo.tsx` (verificación de breakpoints)

