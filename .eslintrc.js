module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier',
    ],
    rules: {
        "prettier/prettier": "error",
        "no-multiple-empty-lines": ["error", {"max": 2, "maxEOF": 1}],
        "curly": ["error", "all"],  // enforce braces everywhere, works well with Prettier
        "no-console": "off"         // allow console.log in Express backend
    },
    env: {
        node: true,
        es6: true,
    },
};