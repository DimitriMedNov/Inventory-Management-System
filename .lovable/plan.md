

## Plan: Instalación PWA básica (sin service worker)

### Cambios

**1. Crear `public/manifest.webmanifest`**
- `name`: "Diprolam Bjx — Inventario"
- `short_name`: "Diprolam"
- `start_url`: "/dashboard"
- `display`: "standalone"
- `background_color`: "#ffffff"
- `theme_color`: color del sidebar Diprolam (#58595B aprox)
- `orientation`: "any"
- `icons`: referencias a `/icon-192.png`, `/icon-512.png`, `/icon-512-maskable.png`

**2. Generar iconos PWA en `public/`** a partir del logo existente `src/assets/diprolam-icon.png`:
- `icon-192.png` (192×192)
- `icon-512.png` (512×512)
- `icon-512-maskable.png` (512×512 con padding para Android)
- `apple-touch-icon.png` (180×180 para iOS)

**3. Actualizar `src/routes/__root.tsx`** — agregar al `head()`:
- `<link rel="manifest" href="/manifest.webmanifest">`
- `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
- `<meta name="theme-color" content="#58595B">`
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
- `<meta name="apple-mobile-web-app-title" content="Diprolam">`

### Resultado
- **Android (Chrome):** menú ⋮ → "Instalar app".
- **iOS (Safari):** compartir → "Agregar a pantalla de inicio".
- **Laptop (Chrome/Edge):** ícono ⊕ en barra de direcciones → "Instalar Diprolam".
- La app se abre en pantalla completa, sin barra del navegador, con su propio icono.

### Lo que NO incluye
- ❌ Sin soporte offline (no hay service worker, intencionalmente para no romper el preview de Lovable).
- ❌ Sin notificaciones push.

### Nota sobre el preview
La instalación funcionará completamente en la **versión publicada** de la app. En el preview del editor de Lovable algunos navegadores pueden no mostrar el botón de instalar porque la app está dentro de un iframe; eso es normal y no afecta a los usuarios finales.

