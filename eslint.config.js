import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import eslintPluginAstro from 'eslint-plugin-astro';
import globals from 'globals';

export default [
  js.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
  {
    // Astro frontmatter is TypeScript — without this, astro-eslint-parser
    // falls back to a plain-JS parse of the frontmatter block and chokes
    // on `interface`/type annotations (see eslint-plugin-astro's own
    // "Parser Configuration" docs).
    files: ['**/*.astro'],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
        extraFileExtensions: ['.astro'],
      },
    },
  },
  {
    ignores: ['dist/', '.astro/'],
  },
];
