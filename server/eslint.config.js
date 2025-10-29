// @ts-check
import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
    {
        ignores: ['**/*.js'],
        tsconfigRootDir: import.meta.dirname
    },
    globalIgnores(["dist/**/*"], "Ignore Build Directory"),
    eslint.configs.recommended,
    tseslint.configs.recommended,
    { 
        rules: {
            // TODO: enable these later
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
            
        },
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: import.meta.dirname
            }
        }
    }
    // f  tseslint.configs.stylistic,
);