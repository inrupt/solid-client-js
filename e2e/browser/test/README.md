# End-to-end tests for solid-client in the browser

This directory contains our browser-based end-to-end tests. The interaction
between the test script, which runs on the command line in Node, and the system
under test, which runs in the browser, is a bit involved, so here's a short
description of our setup.

There are two main parts:

- The system under test, which you can find under ../test-app in the
  root of this repository.
- The test code, which you can find in this directory.

## The system under test

The system under test is a small NextJS app enabling basic interactions with the Pod.
One thing to note is that its dependency on solid-client should be on the code
_inside this repository_, rather than fetched from npm. This means that you will
first need to run `npm run build` at the root of this repository, followed by
`npm run test:e2e:browser:build`. You may run the app manually with `npm run dev`
from the `../test-app` directory.

## The test code

We use [Playwright](https://playwright.dev) to run our
browser-based end-to-end tests. It is configured in `playwright.config.ts` in
the `e2e/browser/test`. It also points to `e2e/browser/test/globalSetup.ts`, where
it is told how to setup the environment before running the test.

Essentially, the tests open the system under test in a browser, go through the
login procedure if they intend to make authenticated requests, and then interact
with elements on the page.

Note that the tests need the URL of an OIDC Provider and user credentials to log
in to it. These can be set via environment variables, or by creating a file
`.env.*.local` in this directory - see `e2e/env/` for examples.

## Running the tests

To run the tests, run at the root:

1. `npm ci` to install the test runner and the dependencies of the local code.
2. `npm run build` to build the local code for the tests to depend on.
3. `npx playwright install` to download the latest versions of all browsers the
   tests run in.
4. `npm run test:e2e:browser:build` to install the dependencies of the
   application under test.
5. `npm run test:e2e:browser` to run the tests.

If you want to actually see the interactive parts, set `headless: false` in
`e2e/browser/test/playwright.config.ts`.

To only run tests in a specific browser, run one of:

    npm run test:e2e:browser -- --project=firefox
    npm run test:e2e:browser -- --project=chromium
    npm run test:e2e:browser -- --project=webkit
