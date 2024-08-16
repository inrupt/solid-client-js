// The following is only possible from Node 18 onwards
import pkg from "./package.json" with { type: "json" };
import sharedConfig from "@inrupt/base-rollup-config";
import typescript from '@rollup/plugin-typescript';

const config = sharedConfig(pkg);

config[0].output.push(
  {
    dir: "dist",
    entryFileNames: "[name].mjs",
    format: "esm",
    preserveModules: true,
  },
  {
    dir: "dist",
    entryFileNames: "[name].umd.js",
    format: "umd",
    name: "SolidClient",
  }
)

export default config;
