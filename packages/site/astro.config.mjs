import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://aibubu.app',
  integrations: [sitemap()],
  build: {
    inlineStylesheets: 'always',
  },
})
