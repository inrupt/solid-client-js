/**
 * Copyright 2021 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

module.exports = {
  extends: ["@inrupt/eslint-config-lib"],
  overrides: [
    {
      files: ["**/*"],
      parserOptions: {
        project: "./tsconfig.eslint.json",
      },
    },
  ],
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  globals: {
    Atomics: "readonly",
    SharedArrayBuffer: "readonly",
  },
  plugins: ["jest", "license-header"],
  rules: {
    // There's a TypeScript-specific version of this rule;
    // we disable the generic one, because it thinks imported types are unused
    // when they're not:
    "no-unused-vars": "off",
    "@typescript-eslint/no-floating-promises": "error",
    "license-header/header": [
      process.env.CI ? "error" : "warn",
      "./resources/license-header.js",
    ],
    camelcase: [
      "error",
      {
        allow: [
          "^internal_",
          "^Quad_",
          // ACP & Access use prefixes for versioning:
          "^acp_",
          "^access_",
        ],
      },
    ],
    // FIXME: these are deviations in this package to our general rules:
    // This could improve code quality, but probably isn't really useful for now:
    "import/prefer-default-export": "warn",
    // This package has its own File type, and fetch is supplied via context
    "no-shadow": ["error", { allow: ["fetch", "File"] }],
    // this can be resolved using: https://github.com/alexgorbatchev/eslint-import-resolver-typescript
    "import/no-unresolved": ["error", { ignore: ["@rdfjs/types"] }],
  },
};
