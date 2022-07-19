/* Config file to run just end-to-end tests */

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testRegex: "e2e/node/.*.test.ts",
  clearMocks: true,
  // Increase timeout to accomodate variable network latency
  testTimeout: 30000,
  injectGlobals: false,
  setupFiles: ["<rootDir>/e2e/node/setup.ts"],
};
