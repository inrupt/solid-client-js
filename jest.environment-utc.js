const Environment = require("jest-environment-jsdom");

module.exports = class CustomTestEnvironment extends Environment.default {
  async setup() {
    await super.setup();
    process.env.TZ = 'UTC';
  }
};
