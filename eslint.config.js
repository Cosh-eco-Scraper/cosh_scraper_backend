import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import unusedImports from 'eslint-plugin-unused-imports';
import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.ts'],
    plugins: {
      prettier,
      'unused-imports': unusedImports,
      '@typescript-eslint': typescript
    },
    rules: {
      'no-unused-vars': 'error',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_'
        }
      ],
      'newline-before-return': 'error',
      'prettier/prettier': [
        'error',
        {
          bracketSpacing: true,
          semi: true,
          singleQuote: true,
          trailingComma: 'all'
        }
      ]
    },
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parser: tsParser,
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
        console: true
      }
    }
  }
];
