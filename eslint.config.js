// eslint.config.js
const eslint = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const globals = require('globals');

module.exports = [
    {
        ignores: ['node_modules/**', 'dist/**', 'coverage/**', 'doc/**', 'examples/**'],
    },
    {
        files: ['**/*.ts'],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'module',
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2023,
                sourceType: 'module',
            },
            globals: {
                ...globals.node,
                ...globals.es2023,
                ...globals.browser,
                ...globals.jest,
                HeadersInit: 'readonly',
                RequestInit: 'readonly',
                RequestInfo: 'readonly',
                BodyInit: 'readonly',
                NodeJS: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
        },
        rules: {
            ...eslint.configs.recommended.rules,
            ...tseslint.configs.recommended.rules,

            '@typescript-eslint/explicit-function-return-type': 'warn',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/ban-ts-comment': 'off',
            'no-prototype-builtins': 'off',
            'no-constant-condition': 'warn',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
        },
    },
];
