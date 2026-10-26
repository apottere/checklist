import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import { importX } from 'eslint-plugin-import-x';
import solid from 'eslint-plugin-solid/configs/typescript';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
    globalIgnores(['dist/', 'dev-dist/', 'coverage/']),
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { ...globals.browser, ...globals.node },
        },
        plugins: {
            'import-x': importX,
            'unused-imports': unusedImports,
        },
        rules: {
            'no-extra-boolean-cast': 'off',
            'import-x/no-commonjs': 'error',
            'import-x/no-default-export': 'error',
            'import-x/order': ['error', { groups: ['builtin', 'external'] }],
            'unused-imports/no-unused-imports': 'error',
        },
    },
    {
        files: ['**/*.{ts,tsx}'],
        extends: [tseslint.configs.recommended, solid],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { arguments: false } }],
            '@typescript-eslint/explicit-function-return-type': [
                'error',
                {
                    allowConciseArrowFunctionExpressionsStartingWithVoid: true,
                    allowExpressions: true,
                    allowTypedFunctionExpressions: true,
                },
            ],
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/no-non-null-assertion': 'error',
            '@typescript-eslint/ban-ts-comment': 'error',
            '@typescript-eslint/no-this-alias': 'error',
        },
    },
    {
        // Solid assigns `let el!: T; <div ref={el} />` at compile time.
        files: ['**/*.tsx'],
        rules: { 'no-unassigned-vars': 'off' },
    },
    {
        files: ['src/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        { group: ['.*'], message: 'Use aliased absolute imports (@/...) instead of relative' },
                        { group: ['\\/*'], message: 'Use aliased absolute imports (@/...) instead' },
                    ],
                },
            ],
        },
    },
    {
        files: ['test/**/*.ts'],
        rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
    },
    {
        // Tool configs are required to default-export.
        files: ['*.config.{js,ts}'],
        rules: { 'import-x/no-default-export': 'off' },
    },
    prettier,
]);
