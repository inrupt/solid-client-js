const path = require("path");
module.exports = {
  mode: "development",
  entry: path.resolve(__dirname, "import.js"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "import.js",
  },
};
