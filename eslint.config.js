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
            security: require('eslint-plugin-security'),
        },
        rules: {
            ...eslint.configs.recommended.rules,
            ...tseslint.configs.recommended.rules,

            'security/detect-object-injection': 'off', // много мест где не срабатывает ошибочно
            'security/detect-non-literal-fs-filename': 'off', // Пока отрубаем, так как ожидается что все пути задаст сам программист, и сделает это адекватно
            'security/detect-unsafe-regex': 'warn',

            '@typescript-eslint/explicit-function-return-type': 'warn',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/ban-ts-comment': 'off',

            'require-atomic-updates': 'error',
            'max-lines-per-function': ['warn', { max: 75 }],
            'no-prototype-builtins': 'warn',
            'no-constant-condition': 'warn',
            'no-unused-vars': 'off', // ругается на абстрактные классы и интерфейсы
            'no-fallthrough': 'error',
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-func': 'error',
            'no-constant-binary-expression': 'error',
            'prefer-const': 'error',
            'no-param-reassign': 'warn',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
        },
    },
    {
        files: ['tests/**/*.test.ts', 'tests/**/*.ts'],
        rules: {
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            'require-atomic-updates': 'off',
            'max-lines-per-function': ['off'],
        },
    },
];
