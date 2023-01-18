const CPUs = require("os").cpus().length;

module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  testRegex: "/src/.*\\.test\\.ts$",
  clearMocks: true,
  // Increase workers on CI:
  maxWorkers: process.env.CI ? CPUs : Math.max(Math.floor(CPUs / 2), 1),
  collectCoverage: true,
  coverageReporters: process.env.CI ? ["text", "lcov"] : ["text"],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  injectGlobals: false,
};
