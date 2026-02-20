import { resolve } from 'path'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
  ],

  alias: {
    '@common': resolve(__dirname, '../common-types'),
  },

  devtools: {
    enabled: true,
  },

  css: ['~/assets/css/main.css',],

  icon: {
    serverBundle: {
      collections: ['lucide', 'ri', 'simple-icons'],
    },
    clientBundle: {
      scan: true,
      // Nuxt UI internal icons that the scanner won't find in node_modules
      icons: [
        'lucide:sun',
        'lucide:moon',
        'lucide:menu',
        'lucide:chevron-down',
        'lucide:chevron-right',
        'lucide:chevron-left',
        'lucide:chevron-up',
        'lucide:x',
        'lucide:check',
        'lucide:circle-check',
        'lucide:circle-x',
        'lucide:info',
        'lucide:loader-circle',
        'lucide:search',
      ],
    },
  },

  runtimeConfig: {
    apiInternalUrl: 'http://localhost:8081',
    public: {
      apiBase: '/api',
    },
  },

  routeRules: {
    '/': { prerender: true, },
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    routeRules: {
      // Exclude Nuxt's internal icon endpoint from being proxied to Fastify
      '/api/_nuxt_icon/**': {},
      '/api/**': { proxy: 'http://localhost:8081/api/**', },
    },
  },

  eslint: {
    config: {
      stylistic: {
        braceStyle: '1tbs',
      },
    },
  },
},)
