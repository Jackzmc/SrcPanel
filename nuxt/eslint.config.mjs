// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import stylistic from '@stylistic/eslint-plugin'

export default withNuxt(
  // Your custom configs here
  {
    rules: {
      "@stylistic/quotes": 'off',
      "vue/max-attributes-per-line": ["error", { singleline: 5, multiline: 1 }],
      "@eslint/no-explicit-any": "off",
      "vue/multiline-html-element-content-newline": "off",
      "@stylistic/arrow-parens": "off"
    },
  }
)
