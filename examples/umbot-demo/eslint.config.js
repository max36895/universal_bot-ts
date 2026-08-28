// Минимальная конфигурация ESLint для демо-проекта.
// Правила совпадают по духу с корневым eslint.config.js umbot,
// но без type-checked правил, чтобы демо оставалось лёгким.
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const globals = require('globals');

module.exports = [
    {
        ignores: ['node_modules/**', 'dist/**', 'data/**', 'logs/**', 'coverage/**'],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts'],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'commonjs',
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-func': 'error',
            'prefer-const': 'error',
        },
    },
    {
        // Служебные CommonJS-файлы (конфиги jest/eslint)
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'commonjs',
            globals: {
                ...globals.node,
            },
        },
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
];
