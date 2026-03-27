module.exports = {
    extends: ['../.eslintrc.js', 'plugin:react-hooks/recommended'],
    env: { node: false, es6: true, browser: true },
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: ['front/tsconfig.json', 'front/tsconfig.node.json'],
    },
    plugins: ['react-refresh'],
    rules: {
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
}
