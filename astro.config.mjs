import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  output: 'server',
  // API routes authenticate writes themselves and must accept non-browser
  // clients such as curl and webhook callers.
  security: { checkOrigin: false },
  adapter: cloudflare({ imageService: 'passthrough' }),
  integrations: [react()],
  vite: {
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  },
});
