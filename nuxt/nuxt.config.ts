// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
  ],

  devtools: {
    enabled: true,
  },

  css: ['~/assets/css/main.css',],

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
