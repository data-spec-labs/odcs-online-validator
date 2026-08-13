// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import indexnow from 'astro-indexnow';

export default defineConfig({
  site: 'https://odcs-validator.com',
  integrations: [
    react(),
    sitemap(),
    indexnow({
      host: 'odcs-validator.com',
      key: '92d80210d05a43389115b51dc03baef0'
    })
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
