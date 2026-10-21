module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  // Keep this baseline intentionally non-invasive. Type-aware rule adoption can
  // happen incrementally without turning the workflow setup into a code rewrite.
  extends: [],
  ignorePatterns: ['dist/', 'node_modules/', 'functions/node_modules/', 'public/static/', 'public/assets/'],
  rules: {
    'no-debugger': 'error'
  }
};
