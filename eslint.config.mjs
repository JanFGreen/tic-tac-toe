import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules', 'dist', '.vite-cache', 'coverage', 'data'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
      parserOptions: { projectService: { allowDefaultProject: ['*.mjs'] }, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    // The game domain is pure: no UI, server or I/O imports (portable and testable).
    files: ['src/domain/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['react', 'react-*', 'fastify', '@fastify/*', 'node:*'], message: 'src/domain must stay pure TypeScript.' },
          { group: ['@/ui/*', '@/server/*', '../ui/*', '../server/*'], message: 'src/domain must not depend on outer layers.' },
        ],
      }],
    },
  },
  {
    files: ['src/ui/**', 'src/main.tsx'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['@/server/*', '../server/*', 'fastify', '@fastify/*', 'node:*'], message: 'Client code must not import server code.' }] }],
    },
  },
  {
    files: ['src/server/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['react', 'react-*', '@/ui/*', '../ui/*'], message: 'Server code must not import client code.' }] }],
    },
  },
  {
    // Size and complexity limits (docs/ENGINEERING.md): small units an agent can read and test whole.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'max-params': ['error', 4],
      'max-nested-callbacks': ['error', 3],
      'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // Tests are long tables of cases; keep them flat rather than short.
    files: ['src/**/*.test.{ts,tsx}'],
    rules: {
      'max-lines-per-function': 'off',
      'max-params': 'off',
      'max-nested-callbacks': ['error', 4],
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
    },
  },
  { files: ['**/*.mjs'], ...tseslint.configs.disableTypeChecked },
);
