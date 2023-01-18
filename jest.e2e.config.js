/* Config file to run just end-to-end tests */
const CPUs = require("os").cpus().length;

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testRegex: "e2e/node/.*.test.ts",
  clearMocks: true,
  // Increase workers on CI:
  maxWorkers: process.env.CI ? CPUs : Math.max(Math.floor(CPUs / 2), 1),
  // Increase timeout to accomodate variable network latency
  testTimeout: 30000,
  injectGlobals: false,
  setupFiles: ["<rootDir>/e2e/node/setup.ts"],
};
