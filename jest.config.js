module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  testRegex: "/src/.*\\.test\\.ts$",
  clearMocks: true,
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
