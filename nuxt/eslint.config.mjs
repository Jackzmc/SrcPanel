// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // Your custom configs here
  {
    rules: {
      // "@stylistic/quotes": 'off',
      // "@stylistic/semi": ["error", 'never'],
      // "@stylistic/comma-dangle": ["error", "only-multiline"],
      "vue/max-attributes-per-line": ["error", { singleline: 5, multiline: 1 }],
      "@eslint/no-explicit-any": "off",
      "vue/multiline-html-element-content-newline": "off",
      "@stylistic/arrow-parens": "off"
    },
  }
)
