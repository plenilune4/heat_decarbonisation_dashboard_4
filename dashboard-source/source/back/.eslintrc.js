module.exports = {
    extends: ['../.eslintrc.js'],
    env: { node: true, es6: true, browser: false },
    parserOptions: {
        project: 'back/tsconfig.json',
    },
}
