# End-to-end tests for solid-client in Node

## Running the tests

To run the tests locally:

1. At the root, run `npm install`.
2. Copy `.env.example` to `.env.test.local`.
3. Ask the Pod Provider hosting the test Pods to register your end-to-end test
   user as a client, and enter its client secret into `.env.test.local`.
4. You can now run `npm run e2e-test-node` from the root.

## Running these End-to-End-specific tests from an IDE

To run these tests from your IDE, you may need to setup your test configuration
to pick up the End-2-End-specific Jest configuration file from the root folder
of this mono-repo.

For example, in IntelliJ you may need to add `--config=jest.e2e.config.js` to
the Jest options of the 'Run/Debug Configurations' modal dialog box.
