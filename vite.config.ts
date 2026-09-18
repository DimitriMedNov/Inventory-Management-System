import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Este proyecto se despliega en Vercel. La configuración de Lovable deja el build
// en dist/ con el formato de Cloudflare, y entonces Vercel no encuentra nada que
// servir y responde 404 en todas las rutas. Aquí se le pide a Nitro que escriba
// directamente el formato que Vercel espera: estáticos en static/ y el servidor
// como función en functions/__server.func/.
export default defineConfig({
  nitro: {
    preset: "vercel",
    output: {
      dir: ".vercel/output",
      publicDir: ".vercel/output/static",
      serverDir: ".vercel/output/functions/__server.func",
    },
  },
});
