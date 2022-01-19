import { config } from "dotenv-flow";

config({
  path: __dirname.concat("/../env/"),
  // Disable warning messages in CI
  silent: process.env.CI === "true",
});
