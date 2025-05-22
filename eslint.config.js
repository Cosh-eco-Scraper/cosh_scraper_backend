import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.ts'],
    plugins: {
      prettier: prettier
    },
    rules: {
      'no-unused-vars': 'error',
      'no-unused-imports': 'error',
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
      sourceType: 'module'
    }
  }
];
