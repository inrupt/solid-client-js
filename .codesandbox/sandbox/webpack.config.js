const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "development",

  entry: {
    index: path.resolve(__dirname, "./src/index.ts"),
    e2e: path.resolve(__dirname, "./src/end-to-end-test.ts"),
  },

  output: {
    path: path.resolve(__dirname, "./dist"),
    filename: "[name].js",
  },

  plugins: [
    new HtmlWebpackPlugin({
      chunks: ["index"],
      template: path.resolve(__dirname, "./index.html"),
      filename: "index.html",
    }),

    new HtmlWebpackPlugin({
      chunks: ["e2e"],
      template: path.resolve(__dirname, "./end-to-end-test.html"),
      filename: "end-to-end-test.html",
    }),
  ],

  module: {
    rules: [
      // all files with a `.ts` extension will be handled by `ts-loader`
      { test: /\.ts$/, loader: "ts-loader" },
    ],
  },

  devServer: {
    contentBase: path.join(__dirname, "dist"),
    compress: true,
    port: 1234,
  },

  resolve: {
    extensions: [".js", ".ts"],

    alias: {
      process: "process/browser",
    },

    // TODO: Remove Node polyfills once solid-client-authn-browser no longer needs them.
    fallback: {
      buffer: require.resolve("buffer/"),
      crypto: require.resolve("crypto-browserify"),
      events: require.resolve("events/"),
      process: require.resolve("process"),
      stream: require.resolve("stream-browserify"),
    },
  },
};
