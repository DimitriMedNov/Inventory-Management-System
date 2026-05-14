## Realidad antes de empezar

Elegiste seguir editando en Lovable + reescribir historial + sustituir el AI Gateway. Hay un punto que choca y debes saberlo:

> Mientras edites desde Lovable, **cada commit nuevo seguirá apareciendo con `lovable-dev[bot]` como co-author y un trailer `X-Lovable-Edit-ID`** en el cuerpo del commit. Reescribir el historial limpia el pasado, pero no el futuro. La única forma de evitarlo es desconectar la sincronización con GitHub o trabajar en local. Asumiendo que aceptas esto, este es el plan.

---

## 1. Limpieza visible dentro del repo

Cosas que sí puedo tocar sin romper la preview:

- **`README.md`** (no existe) → crear uno escrito en primera persona con tu nombre, descripción del proyecto, stack, capturas, instrucciones de instalación y deploy. Es lo que más "humaniza" un repo.
- **`package.json`** → renombrar `name` de `tanstack_start_ts` a algo tuyo (p. ej. `inventariopro`).
- **`vite.config.ts`** → quitar el comentario que menciona `@lovable.dev/vite-tanstack-config` y dejarlo neutro. **El plugin en sí debe quedarse**, porque es el que hace que Vite arranque dentro de Lovable; quitarlo rompe la preview.
- **`public/llms.txt`** → crear uno propio para que asistentes de IA describan tu proyecto con tu narrativa.
- **`.lovable/plan.md`** → añadir `.lovable/` al `.gitignore` para que no viaje al repo.
- **Badge "Edit with Lovable"** del sitio publicado → ocultarlo (requiere plan Pro).

Cosas que **no** voy a tocar porque rompen la edición desde Lovable:
- El plugin `@lovable.dev/vite-tanstack-config` en `package.json` y `vite.config.ts`.
- Los archivos auto-generados `src/integrations/supabase/*` y `src/routeTree.gen.ts`.

## 2. Sustituir el AI Gateway por proveedor directo

Archivo: `src/lib/inventory-analysis.functions.ts`.

- Cambiar el endpoint `https://ai.gateway.lovable.dev/v1/chat/completions` por uno de:
  - **Gemini directo** → `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` con `GEMINI_API_KEY`.
  - **OpenAI directo** → `https://api.openai.com/v1/chat/completions` con `OPENAI_API_KEY`.
- Reemplazar la lectura de `process.env.LOVABLE_API_KEY` por la variable correspondiente.
- Pediré el secret con el formulario seguro de Lovable Cloud cuando empecemos a implementar (no me lo pegues en el chat). Necesito que me digas cuál prefieres: **Gemini** (más barato y formato JSON nativo, recomendado) o **OpenAI**.
- Mantener el mismo contrato de salida (`AnalisisInventarioResultado`) para no tocar la UI.

## 3. Reescribir el historial de Git (lo haces tú en local)

Esto **no** lo puede hacer Lovable: requiere `git filter-repo` y un `git push --force` desde tu máquina. Te dejo el script exacto en el README. Resumen:

```bash
# Una sola vez, en un clon limpio del repo:
pip install git-filter-repo

# Reautorar todos los commits a tu nombre y borrar trailer + co-author bot
git filter-repo --commit-callback '
  commit.author_name = b"Tu Nombre"
  commit.author_email = b"tu@email.com"
  commit.committer_name = b"Tu Nombre"
  commit.committer_email = b"tu@email.com"
  msg = commit.message.decode("utf-8", "replace")
  msg = "\n".join(
    l for l in msg.splitlines()
    if not l.startswith("X-Lovable-Edit-ID")
    and not l.startswith("Co-authored-by: lovable-dev")
  )
  commit.message = msg.encode("utf-8")
'

git remote add origin git@github.com:tu-usuario/tu-repo.git
git push --force --all
git push --force --tags
```

Avisos:
- Cualquier clon o fork existente se rompe.
- Tras esto, si vuelves a editar desde Lovable, los commits nuevos volverán a salir marcados → tendrás que repetir la limpieza periódicamente, o cambiar a flujo local.

## 4. "Que se vea que no fue hecho con IA"

Esto es 80% narrativa, 20% código:

- README en primera persona, contando tus decisiones (por qué TanStack Start, por qué multi-tenant, etc.).
- Mensajes de commit propios cuando hagas cambios en local.
- Pequeñas firmas tuyas: footer del login con tu nombre, comentario en el header del proyecto, favicon propio.
- Quitar comentarios verbosos típicos de IA en el código (los reviso al pasar).

No prometo invisibilidad total: los buscadores de "X-Lovable-Edit-ID" en GitHub seguirán encontrando proyectos hasta que ejecutes el filter-repo, y un revisor experto reconoce patrones de shadcn + TanStack. Pero el repo dejará de gritar "Lovable" en cuanto hagamos los pasos 1–3.

---

## Detalle técnico de los cambios de archivos

| Archivo | Cambio |
|---|---|
| `README.md` | Crear desde cero, en español, en primera persona |
| `package.json` | `name`: `tanstack_start_ts` → `inventariopro` |
| `vite.config.ts` | Quitar comentario que menciona `@lovable.dev` |
| `.gitignore` | Añadir `.lovable/` |
| `public/llms.txt` | Crear con resumen del proyecto |
| `src/lib/inventory-analysis.functions.ts` | Cambiar endpoint + variable de entorno + parseo de respuesta |
| Badge "Edit with Lovable" | Toggle en publish settings (te lo aplico al final) |

## Lo que necesito de ti antes de implementar

1. **Proveedor de IA**: ¿Gemini o OpenAI?
2. **Nombre y email** que quieres usar en los commits (para el script de filter-repo, lo dejo en el README).
3. **Confirmación** de que entiendes que los commits futuros desde Lovable seguirán marcados a menos que desconectes la sincronización.
