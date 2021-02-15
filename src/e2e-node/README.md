# End-to-end tests for solid-client in Node.js

This directory contains our Node.js-based end-to-end tests.

## Running the tests

To run the tests:

1. At the root, run `npm install`, followed by `npm run build`.
2. Run `npx @inrupt/generate-oidc-token`.
3. Copy `.env.defaults` to `.env.local` and update the values you generated from
   step 2.
4. You can now run `npm run e2e-test-node` from the root.
