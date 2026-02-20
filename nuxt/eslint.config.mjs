// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // Your custom configs here
  {
    rules: {
      "@stylistic/quotes": 'off',
      "vue/max-attributes-per-line": ["error", { singleline: 5, multiline: 1 }]
    }
  }
)
