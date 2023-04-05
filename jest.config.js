const base = {
  preset: "ts-jest",
  injectGlobals: false,
  testEnvironment: "jsdom",
  clearMocks: true,
  testRegex: "/src/.*\\.test\\.ts$",
}

module.exports = {
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
  projects: [
    {
      ...base,
      testEnvironment: "./jest.environment-utc.js",
    },
    {
      ...base,
      testEnvironment: "./jest.environment-apac.js",
    }
  ]
};
