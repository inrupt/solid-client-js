// Copyright Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

export default {
  compilerOptions: {
    skipLibCheck: true,
  },
  out: "docs/api/",
  entryPoints: [
    // The source files of everything listed under `exports` in our package.json
    // (i.e. public API's that should be documented) should be listed here:
    "src/interfaces.ts",
    "src/resource/resource.ts",
    "src/resource/solidDataset.ts",
    "src/resource/file.ts",
    "src/resource/mock.ts",
    "src/thing/thing.ts",
    "src/thing/get.ts",
    "src/thing/set.ts",
    "src/thing/add.ts",
    "src/thing/remove.ts",
    "src/thing/build.ts",
    "src/thing/mock.ts",
    "src/acl/acl.ts",
    "src/acl/agent.ts",
    "src/acl/group.ts",
    "src/acl/class.ts",
    "src/acl/mock.ts",
    "src/universal/index.ts",
    "src/acp/ess2.ts",
    "src/rdfjs.ts",
    "src/profile/jwks.ts",
    "src/profile/webid.ts",
    "src/formats/index.ts",
  ],
  exclude: [
    "node_modules/**",
    "**/*.test.ts",
    // Internal helpers:
    "**/*.internal.ts",
    // End-to-end tests:
    "e2e/**",
    // Re-exported functions are already documented in their own modules:
    "src/index.ts",
    // Constants are only used internally:
    "src/constants.ts",
    // Helper methods for working with raw RDF internally:
    "src/datatypes.ts",
    // Behind-the-scenes auto-detection of the right fetcher to use:
    "src/fetcher.ts",
    // Helper methods for working with raw Turtle internally:
    "src/formats/turtle.ts",
    "src/formats/jsonLd.ts",
  ],
};
