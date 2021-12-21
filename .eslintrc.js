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
  extends: ["@inrupt/eslint-config-base"],
  ignorePatterns: ["**/dist/**/*", "**/coverage/**/*"],
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  globals: {
    Atomics: "readonly",
    SharedArrayBuffer: "readonly",
  },
  settings: {
    "import/resolver": {
      node: {
        extensions: [".js", ".ts"],
        paths: ["node_modules/", "node_modules/@types"],
      },
    },
  },
  plugins: ["jest", "license-header"],
  rules: {
    "license-header/header": [
      process.env.CI ? "error" : "warn",
      "./resources/license-header.js",
    ],
    // This package has its own File type, and fetch is supplied via context
    "no-shadow": ["error", { allow: ["fetch", "File"] }],
    // this can be resolved using: https://github.com/alexgorbatchev/eslint-import-resolver-typescript
    "import/no-unresolved": ["error", { ignore: ["@rdfjs/types"] }],
  },
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: "./tsconfig.eslint.json",
      },
      extends: [
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
      ],
      rules: {
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
        // TODO: Re-enable progressively
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/ban-types": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-floating-promises": "off",
        "@typescript-eslint/no-misused-promises": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/unbound-method": "off",
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/require-await": "off",
        "@typescript-eslint/restrict-plus-operands": "off",
        "@typescript-eslint/restrict-template-expressions": "off",
        "class-methods-use-this": "off",
        "import/prefer-default-export": "off",
        "no-use-before-define": "off",
        "require-await": "off",
      },
    },
    {
      files: ["*.test.ts"],
      rules: {
        // TODO: Re-enable progressively (and remove override)
        "@typescript-eslint/await-thenable": "off",
        "@typescript-eslint/no-empty-function": "off",
        camelcase: "off",
        "consistent-return": "off",
        "no-console": "off",
        "no-nested-ternary": "off",
        "no-param-reassign": "off",
        "no-shadow": "off",
        "no-useless-concat": "off",
      },
    },
    {
      files: ["*.testcafe.ts"],
      rules: {
        // TODO: Re-enable progressively (and remove override)
        camelcase: "off",
        "jest/no-test-callback": "off",
      },
    },
    {
      files: ["*.config.js"],
      rules: {
        // TODO: Re-enable progressively (and remove override)
        "global-require": "off",
        "import/extensions": "off",
      },
    },
  ],
};
