module.exports = {
  extends: ['./.eslintrc.js'],
  env: {
    node: true,
    es6: true
  },
  rules: {
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-unused-vars': 'warn'
  }
}