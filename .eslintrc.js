/* eslint-disable license-header/header */

module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:jest/recommended",
    "plugin:jest/style",
  ],
  globals: {
    Atomics: "readonly",
    SharedArrayBuffer: "readonly",
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.eslint.json"],
  },
  plugins: ["@typescript-eslint", "jest", "license-header"],
  rules: {
    // There's a TypeScript-specific version of this rule;
    // we disable the generic one, because it thinks imported types are unused
    // when they're not:
    "no-unused-vars": "off",
    "@typescript-eslint/no-floating-promises": "error",
    "license-header/header": ["error", "./resources/license-header.js"],
  },
};
