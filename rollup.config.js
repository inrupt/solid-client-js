import pkg from "./package.json";
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
    "n3",
    "jsonld",
  ],
};
