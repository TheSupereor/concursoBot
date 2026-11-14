module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  overrides: [
    {
      // Jest mocks and fakes legitimately trip these rules.
      files: ['*.spec.ts', 'src/shared/testing/**'],
      rules: {
        '@typescript-eslint/unbound-method': 'off',
        '@typescript-eslint/require-await': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-confusing-void-expression': 'off',
        '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      },
    },
  ],
  ignorePatterns: ['.eslintrc.js', 'dist', 'coverage', 'scripts'],
  rules: {
    'no-console': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    // NestJS controllers and decorated classes often have no instance state.
    '@typescript-eslint/no-extraneous-class': 'off',
    // Decorators such as @Action/@Command are the framework's entry points.
    '@typescript-eslint/no-unsafe-call': 'error',
    // Template literals with numbers are fine in log and user messages.
    '@typescript-eslint/restrict-template-expressions': [
      'error',
      { allowNumber: true },
    ],
  },
};
