// The following is only possible from Node 18 onwards
// import pkg from "./package.json" assert { type: "json" };

// Until we only support Node 18+, this should be used instead
// (see https://rollupjs.org/guide/en/#importing-packagejson)
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const pkg = require("./package.json");

import typescript from "rollup-plugin-typescript2";

export default {
  input: "./src/index.ts",
  output: [
    {
      file: pkg.main,
      format: "cjs",
    },
    {
      file: pkg.module,
      entryFileNames: "[name].es.js",
      format: "esm",
    },
    {
      dir: "dist",
      entryFileNames: "[name].mjs",
      format: "esm",
      preserveModules: true,
    },
    {
      dir: "umd",
      format: "umd",
      name: "SolidClient",
    },
  ],
  plugins: [
    typescript({
      // Use our own version of TypeScript, rather than the one bundled with the plugin:
      typescript: require("typescript"),
      tsconfigOverride: {
        // Exclude tests:
        exclude: ["**/*.test.ts"],
        compilerOptions: {
          module: "esnext",
        },
      },
    }),
  ],
  external: [
    "cross-fetch",
    "http-link-header",
    "@rdfjs/dataset",
    "@rdfjs/data-model",
    "n3",
    "jsonld-context-parser",
    "jsonld-streaming-parser",
  ],
};
