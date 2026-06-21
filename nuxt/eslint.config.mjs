// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";
import stylistic from "@stylistic/eslint-plugin"

export default withNuxt(
  // Your custom configs here
  {
    plugins: {
      "@stylistic": stylistic
    },
    rules: {
      // "@stylistic/quotes": 'off',
      "@stylistic/semi": "off",
      "@stylistic/comma-dangle": ["error", "only-multiline"],
      "@stylistic/multiline-ternary": "off",
      "@stylistic/brace-style": ["error", "1tbs", { allowSingleLine: true }],
      "@stylistic/arrow-parens": "off",

      "vue/max-attributes-per-line": ["error", { singleline: 5, multiline: 1 }],
      "vue/multiline-html-element-content-newline": "off",
      "vue/return-in-computed-property": "off",
      "vue/first-attribute-linebreak": ["error", {
        singleline: "ignore",
        multiline: "below",
      }],
      "vue/require-default-prop": "off",

      "@eslint/no-explicit-any": "off",

      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/unified-signatures": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", {
        varsIgnorePattern: "(^_|props)",
      }]
    },
  },
);
