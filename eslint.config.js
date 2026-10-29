import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/', 'node_modules/'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['scripts/**/*.mjs', 'tests/**/*.mjs', '*.js'],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Use textContent/DOM APIs (CLAUDE.md §8).' },
        { property: 'outerHTML', message: 'Use textContent/DOM APIs (CLAUDE.md §8).' },
        { property: 'insertAdjacentHTML', message: 'Use textContent/DOM APIs (CLAUDE.md §8).' },
        { object: 'document', property: 'write', message: 'Não use document.write.' },
      ],
    },
  },
];
