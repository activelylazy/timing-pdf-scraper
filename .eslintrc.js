module.exports = {
  plugins: ['jest'],
  env: {
    browser: true,
    es2021: true,
    'jest/globals': true,
  },
  extends: 'airbnb-base',
  overrides: [
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-plusplus': 'off',
  },
};
