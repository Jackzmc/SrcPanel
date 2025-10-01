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
      globals: {
        ...globals.browser,
        BUILD_TIMESTAMP: "readonly",
        "RequestInit": "readonly"
      },
      parserOptions: {
        parser: typescriptEslint.parser,
      },
    },
    rules: {
      "vue/no-unused-vars": "warn",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/prefer-as-const": "warn",
      "no-useless-escape": "warn",
      "prefer-const": ["warn", { destructuring: "all" }],
      "no-empty": "warn",
      "no-unused-private-class-members": "warn",

      "prefer-const": "off",
      "vue/multi-word-component-names": "off",
      "semi": "off",
      'vue/require-default-prop': "off",
      'vue/first-attribute-linebreak': "off",
      "vue/no-template-shadow": "off", // Useful, but is OK majority of time
      "vue/html-closing-bracket-newline": "off",
      "vue/no-v-html": ["error", { "ignorePattern": "(^html|HTML\(.*\))" }],
      "vue/v-on-event-hyphenation": "off",
      "vue/html-quotes": "off",
      "vue/multiline-html-element-content-newline": "off",
      "vue/singleline-html-element-content-newline": "off",
      "vue/html-self-closing": "off",
      "vue/html-indent": "off",
      "vue/max-attributes-per-line": "off",
    },
  }
)
