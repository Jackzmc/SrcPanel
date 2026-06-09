import { execSync } from 'child_process'

const buildDate = new Date().toLocaleString("en-US", { timeZone: 'UTC' })
const buildCommit = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'DEV'
  }
})()

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/image',
    '@nuxt/content',
    '@sentry/nuxt/module',
  ],

  vue: {
    compilerOptions: {
      isCustomElement: () => false, 
    },
  },
  vite: {
    define: {
      __BUILD_DATE__: JSON.stringify(buildDate),
      __BUILD_COMMIT__: JSON.stringify(buildCommit),
      __VUE_PROD_DEVTOOLS__: true,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: true,
    },
    optimizeDeps: {
      include: [
        'steamid'
      ]
    },
    build: {
      sourcemap: process.env.NODE_ENV != 'production',
      rollupOptions: {
        output: {
          manualChunks: undefined // let Rollup decide, can help memory
        }
      }
    }
  },

  css: ['~/assets/css/main.css',],

  icon: {
    localApiEndpoint: "/_nuxt_icon",
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
        'lucide:chevrons-left',
        'lucide:chevrons-right',
        'lucide:x',
        'lucide:check',
        'lucide:circle',
        'lucide:square',
        'lucide:circle-check',
        'lucide:circle-x',
        'lucide:info',
        'lucide:loader-circle',
        'lucide:search',
        'lucide:door-open',
        'lucide:sparkle',
        'lucide:activity',
        'lucide:message-circle',
        'lucide:message-circle-more',
        'lucide:globe',
        'lucide:edit',
        'lucide:move-right',
        'lucide:heart-pulse',
        'lucide:hand',
        'lucide:arrow-big-right',
        'lucide:arrow-big-right-dash',
        'lucide:eye-off',
        'lucide:circle-small',
        'lucide:radio-off',
        'lucide:radio',
        'lucide:arrow-up-down',
      ],
    },
  },

  runtimeConfig: {
    apiInternalUrl: 'http://localhost:8081',
    public: {
      apiBase: '/api',
      // In dev, steam auth must go directly to the API server so Fastify sets
      // the session cookie itself (same localhost, shared across ports).
      // In prod, nginx proxies /api so this should be left unset/empty.
      apiPublicUrl: '',
      apiAuthUrl: '' // same as apiPublicUrl if not set
    },
  },

  routeRules: {
    // '/docs/**': { prerender: true, }
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    routeRules: {
      '/api/_nuxt_icon/**': {},
      // '/api/**': { proxy: 'http://localhost:8081/api/**' }
    }
  },

  sentry: {
    org: 'jackzmc',
    project: 'admin-panel-ui',
  },

  sourcemap: {
    client: 'hidden',
  },
})