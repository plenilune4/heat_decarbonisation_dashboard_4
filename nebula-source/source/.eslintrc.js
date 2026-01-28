module.exports = {
    root: true,
    parserOptions: {
        ecmaVersion: 2020, // Use the latest ECMAScript standard
        sourceType: 'module', // Allows for the use of imports
    },
    env: {
        node: true, // Defines environment globals for Node.js
        browser: true, // Defines environment globals for browsers
        es6: true, // Enables ES6 features
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
    ],
    ignorePatterns: ['.eslintrc.js', 'node_modules/', 'dist/', 'build/', '*.min.js', '**/build.ts'],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    rules: {
        'max-len': [
            'warn',
            {
                code: 150,
            },
        ],
        'no-console': 1,
        'no-extra-boolean-cast': 0,
        '@typescript-eslint/restrict-plus-operands': 0,
        '@typescript-eslint/explicit-module-boundary-types': 0,
        '@typescript-eslint/no-floating-promises': 0,
        '@typescript-eslint/no-unsafe-member-access': 0,
        '@typescript-eslint/no-unsafe-assignment': 0,
        '@typescript-eslint/unbound-method': 0,
    },
}
