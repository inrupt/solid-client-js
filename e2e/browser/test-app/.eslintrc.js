module.exports = {
  extends: ["../../../.eslintrc.js", "next/core-web-vitals"],
  rules: {
    // Prevents from having to install the e2e app on linting.
    "import/no-unresolved": "warn",
  },
};
