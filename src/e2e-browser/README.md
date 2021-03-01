# End-to-end tests for solid-client in the browser

This directory contains our browser-based end-to-end tests. The interaction
between the test script, which runs on the command line in Node, and the system
under test, which runs in the browser, is a bit involved, so here's a short
description of our setup.

There are two main parts:

- The system under test, which you can find under .codesandbox/sandbox in the
  root of this repository.
- The test code, which you can find in this directory.

## The system under test

The system under test is our existing CodeSandbox, which is also used to try our
library in the browser, and to verify whether the built code works after a pull
request.

Although it shares the project setup, the code that exercises our library in our
end-to-end test is isolated in end-to-end-test.html and the TypeScript files
reachable from there. Thus, whereas the demo project is at
`localhost:1234/`, the system under test is at
`localhost:1234/end-to-end-test.html`.

One thing to note is that its dependency on solid-client is on the code _inside
this repository_, rather than fetched from npm. This means that you will first
need to run `npm run build` at the root of this repository, followed by
`npm install` in .codesandbox/sandbox, if you want to run it locally.

The actual code is split in two files: `end-to-end-test.ts` and
`end-to-end-test-helpers.ts`. The former sets up form listeners, login
processing, etc. on import, whereas the latter only exports the functions that
actually call out to solid-client, i.e. that are run in the actual test. The
reason for this separation is that our test code can then import the function
signatures from `-helpers` without executing the code that sets up the
listeners. These helpers are then stored on the global variable `E2eHelpers` in
`end-to-end-test.ts`. Why this is needed will be explained in the next section.

## The test code

We use [TestCafe](https://devexpress.github.io/testcafe/) to run our
browser-based end-to-end tests. It is configured in `.testcaferc.json` in the
root of this repository, where it is setup to run all tests defined in files
suffixed with `.testcafe.ts` inside of /src/testcafe. This file is also the
place where it is told how to start the system under test before running the
test, waiting a couple of seconds for it to come up.

Essentially, the tests open the system under test in a browser, go through the
login procedure if they intend to make authenticated requests, and then call the
helpers mentioned above. However, this last step is somewhat involved. The
helpers are available in the browser, whereas the test scripts are running in
Node. To communicate between the two, we wrap our calls to the helpers in
TestCafe's `ClientFunction`. Now although it looks as if those functions are
part of the test code, what actually happens is that TestCafe injects them into
the browser page, executes them, serialises their return values, and passes
those back to our test code.

That means that code inside `ClientFunction` can access globals available on the
page, such as `E2eHelpers`, defined above. But since as far as TypeScript can
see, the code inside `ClientFunction` is part of the test code, we define an
empty object `E2eHelpers` in the context of that test code, and just tell
TypeScript that it contains the test helpers.

Note that the tests need the URL of a Pod and the credentials to log in to it.
These can be set via environment variables, or by creating a file
`.env.test.local` in this directory - see `.env.example` for an example.

## Running the tests

To run the tests, run:

1. `npm install` at the root to install the test runner.
2. `npm install` in `.codesandbox/sandbox` to install the dependencies of the
   application under test.

You can then run the tests using `npm run e2e-test-browser` at the root.

Note: if you want to run the end-to-end tests against your local code, then
before running the above command, run:

1. `npm run build` at the root.
2. `npm install ../../` in `.codesandbox/sandbox`.

If you want to actually see the interactive parts, remove `:headless` in
`.testcaferc.json`. That said, most of the tests involve running code without a
UI component.
