import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import eslintPluginVue from 'eslint-plugin-vue';
import globals from 'globals'
import typescriptEslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['*.d.ts', '**/coverage', '**/dist'] },

  {
    extends: [
       eslint.configs.recommended,
      ...typescriptEslint.configs.recommended,
      ...eslintPluginVue.configs['flat/recommended'],
    ],
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        parser: typescriptEslint.parser,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [ "warn", {
          args: "none",
          argsIgnorePattern: "^_",
          caughtErrors: "none",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: ".*",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true
      }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/prefer-as-const": "warn",
      "no-useless-escape": "warn",
      "prefer-const": ["warn", { destructuring: "all" }],
      "no-empty": "warn",
      "no-unused-private-class-members": "warn",

      "vue/multi-word-component-names": "off",
      "semi": "off",
      "vue/no-template-key": "off",
      "vue/no-v-for-template-key": "off"
    },
  }
)
