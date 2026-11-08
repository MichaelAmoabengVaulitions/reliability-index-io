import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'coverage', 'public', 'scripts']),
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'jsx-a11y': jsxA11y,
      import: importPlugin,
    },
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      prettier,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.app.json',
        },
        node: true,
      },
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      ...importPlugin.configs.recommended.rules,
      // TS already validates named imports; the plugin's version produces false positives on TS.
      'import/named': 'off',
      // Vite resolves leading-slash URLs against public/; the lint resolver can't follow that.
      'import/no-unresolved': ['error', { ignore: ['^/'] }],
      // CLAUDE.md rule 4: no `any`.
      '@typescript-eslint/no-explicit-any': 'error',
      // CLAUDE.md rule 2: no dead code.
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      // CLAUDE.md rule 3: constants live in src/config.ts. Tiny whitelist for the truly common values.
      'no-magic-numbers': [
        'warn',
        { ignore: [-1, 0, 1, 2, 100], ignoreArrayIndexes: true, enforceConst: true },
      ],
      // CLAUDE.md rule 5: external → @/... → relative, blank line between groups.
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [{ pattern: '@/**', group: 'internal', position: 'before' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-default-export': 'error',
      'no-warning-comments': ['warn', { terms: ['todo', 'fixme', 'hack'], location: 'anywhere' }],
      eqeqeq: 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['src/routes/**/*.{ts,tsx}', 'src/main.tsx', 'vite.config.ts', 'tailwind.config.ts'],
    rules: {
      'import/no-default-export': 'off',
    },
  },
  {
    // Test files inherently exercise specific values (boundary cases, fixture amounts);
    // hoisting every literal into a named constant adds noise without catching real bugs.
    files: ['**/*.test.{ts,tsx}', 'src/test-utils/**/*.{ts,tsx}'],
    rules: {
      'no-magic-numbers': 'off',
    },
  },
]);
