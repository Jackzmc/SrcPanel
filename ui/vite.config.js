import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import vue from '@vitejs/plugin-vue'
import { sentryVitePlugin } from "@sentry/vite-plugin";


export default ({ mode }) => {
  process.env = {...process.env, ...loadEnv(mode, process.cwd(), '')};
  if(!process.env.VITE_REALM) {
    throw new Error("No VITE_REALM environment variable set")
  }
  return defineConfig({
    plugins: [
      sentryVitePlugin({
        disable: process.env.SENTRY_AUTH_TOKEN === undefined,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: "jackzmc",
        project: "l4d2-admin-panel",
        errorHandler: (err) => {
          console.error("[Sentry] ", err)
        }
      }),
      vue({ defineModel: true }),
    ],
    server: {
      port: 8080,
      allowedHosts: "all",
      proxy: {
        '^/api': {
          target: process.env.VITE_REALM,
          changeOrigin: true,
          ws: true
        }
      }
    },
    resolve: {
      alias: [
        {
          find: '@',
          replacement: path.resolve(__dirname, 'src')
        }
      ]
    },
    build: {
      sourcemap: true,
      chunkSizeWarningLimit: 600,
      cssCodeSplit: false
    },
    define: {
      BUILD_TIMESTAMP: Date.now(),
      __VUE_PROD_DEVTOOLS__: process.env.NODE_ENV !== 'production'
    }
  });

}
