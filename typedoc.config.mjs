/* Project-Specific Configuration
  - Project name
  - Custom navigation links
  - Output path
  - Entry points
  - Exclusions
  - Category order
  - Repository URL
  */
export default {
  "name": "@inrupt/solid-client API Documentation",
  "navigationLinks": {
    "Inrupt Documentation": "https://docs.inrupt.com/",
    "GitHub": "https://github.com/inrupt/solid-client-js"
  },
  "out": "docs",
  "entryPoints": [
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
    "src/formats/index.ts"
  ],
  "exclude": [
    "node_modules/**",
    "**/*.test.ts",
    "**/*.internal.ts",
    "e2e/**",
    "src/index.ts",
    "src/constants.ts",
    "src/datatypes.ts",
    "src/fetcher.ts",
    "src/formats/turtle.ts",
    "src/formats/jsonLd.ts"
  ],
  "categoryOrder": [
    "Core",
    "Resource",
    "Thing",
    "Access Control",
    "Formats",
    "Profile",
    "*"
  ],

// Base Configuration includes the theme and other options that are common to all projects.
  "theme": "default",
  "includeVersion": true,
  "readme": "README.md",
  "hideGenerator": true,
  "plugin": [],
  "skipErrorChecking": true, // to bypass errors which we may need to resolve
  "validation": {
    "invalidLink": true,
    "notDocumented": true
  },
  "visibilityFilters": {
    "protected": false,
    "private": false,
    "inherited": true,
    "external": false
  },
  "categorizeByGroup": false,
  "searchInComments": true,
  "cleanOutputDir": true
}