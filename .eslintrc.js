require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
  extends: ["@inrupt/eslint-config-lib"],
  parserOptions: {
    project: "./tsconfig.eslint.json",
  },
  rules: {
    camelcase: [
      "error",
      {
        allow: [
          "^internal_",
          "^acp_ess_",
          "^acp_v*",
          "^access_v*",
          "^Quad_*",
          "^reexport_*",
          "^latest_*",
          "^legacy_*",
        ],
      },
    ],

    // Temporarily fix the Jest shadowing warnings
    "no-shadow": [
      "warn",
      {
        allow: ["describe", "it", "jest", "expect"],
      },
    ],

    // We use a lot of named exports:
    "import/prefer-default-export": "off",
    // Made warning due to src/thing/thing.ts
    "max-classes-per-file": "warn",

    "no-underscore-dangle": "warn",
    "no-param-reassign": "warn",

    // Currently the typings for the Object type in src/rdfjs.internal.js specs
    // the property of it's object as partial, though it may not be:
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/ban-ts-comment": "error",
    "@typescript-eslint/no-use-before-define": "off",
    "@typescript-eslint/no-explicit-any": "error",
  },
  overrides: [
    {
      files: "*.test.ts",
      rules: {
        "no-nested-ternary": "warn",
        "@typescript-eslint/no-explicit-any": "off",

        // TODO: Refactor to https://github.com/SamVerschueren/tsd
        "@typescript-eslint/ban-ts-comment": "off",
        "no-param-reassign": "off",
        "no-shadow": "off"
      },
    },
  ],
};
