/**
 * ESLint Configuration
 * Shared config for SnowRail monorepo
 * 
 * ARCHITECTURAL RULE: packages/* MUST NOT import from apps/*
 */

module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended'
  ],
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    'no-console': 'off',
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    // Boundary rule: prevent packages from importing apps
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['**/apps/**', '@snowrail/backend', '@snowrail/frontend'],
          message: 'Packages must not import from apps. Use ports/interfaces instead.'
        }
      ]
    }]
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '*.js',
    '*.d.ts'
  ],
  overrides: [
    {
      // Apps CAN import from packages
      files: ['apps/**/*.ts', 'apps/**/*.tsx'],
      rules: {
        'no-restricted-imports': 'off'
      }
    }
  ]
};
