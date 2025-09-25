import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import vue from '@vitejs/plugin-vue'
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { execSync } from 'child_process'

export default ({ mode }) => {
  process.env = {...process.env, ...loadEnv(mode, process.cwd(), '')};

  loadGitInfo()

  if(!process.env.VITE_REALM) {
    throw new Error("No VITE_REALM environment variable set")
  }

  return defineConfig({
    plugins: [
      sentryVitePlugin({
        disable: mode != "build" || process.env.SENTRY_AUTH_TOKEN === undefined,
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
      host: true,
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

function loadGitInfo() {
  const commitDate = execSync('git log -1 --format=%cI').toString().trimEnd();
  const branchName = execSync('git rev-parse --abbrev-ref HEAD').toString().trimEnd();
  const commitHash = execSync('git rev-parse HEAD').toString().trimEnd();
  const lastCommitMessage = execSync('git show -s --format=%s').toString().trimEnd();

  process.env.VITE_GIT_COMMIT_DATE = commitDate;
  process.env.VITE_GIT_BRANCH_NAME = branchName;
  process.env.VITE_GIT_COMMIT_HASH = commitHash;
  process.env.VITE_GIT_LAST_COMMIT_MESSAGE = lastCommitMessage;
}
