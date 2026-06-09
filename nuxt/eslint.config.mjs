// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt(
  // Your custom configs here
  {
    rules: {
      // "@stylistic/quotes": 'off',
      "@stylistic/semi": "off",
      // "@stylistic/comma-dangle": ["error", "only-multiline"],
      "vue/max-attributes-per-line": ["error", { singleline: 5, multiline: 1 }],
      "@eslint/no-explicit-any": "off",
      "vue/multiline-html-element-content-newline": "off",
      "@stylistic/arrow-parens": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/unified-signatures": "warn",
      "vue/return-in-computed-property": "off",
      "vue/first-attribute-linebreak": ["error", {
        singleline: "ignore",
        multiline: "below",
      }],
      "vue/require-default-prop": "off",
      "@typescript-eslint/no-unused-vars": ["warn", {
        varsIgnorePattern: "(^_|props)",
      }],
      "@stylistic/multiline-ternary": "off",
    },
  },
);
