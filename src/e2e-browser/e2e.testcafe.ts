/**
 * Copyright 2020 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { ClientFunction } from "testcafe";
import { config } from "dotenv-flow";
import { resolve } from "path";
import { essUser, essUserLogin } from "./roles";
import type { getHelpers } from "../../.codesandbox/sandbox/src/end-to-end-test-helpers";

// E2eHelpers is a global defined in .codesandbox/sandbox/src/end-to-end-helper.
// Since code inside of ClientFunction is executed in that context in the browser,
// that variable is available to it - but as far as TypeScript is concerned,
// it is executed in the context of this test file.
// Hence, we just declare this variable to be of the same type here.
const E2eHelpers: ReturnType<typeof getHelpers> = {} as any;

config({ path: __dirname });

fixture("End-to-end tests").page("http://localhost:1234");

/* eslint-disable jest/expect-expect, jest/no-done-callback -- We're not using Jest for these tests */

test("Manipulating Access Control Policies to set public access", async (t: TestController) => {
  /* Initialise client helpers: */
  const getSessionInfo = ClientFunction(() => E2eHelpers.getSessionInfo());
  const initialisePolicyResource = ClientFunction(() =>
    E2eHelpers.initialisePolicyResource()
  );
  const fetchPolicyResourceUnauthenticated = ClientFunction(
    (podRoot?: string) => E2eHelpers.fetchPolicyResourceUnauthenticated(podRoot)
  );
  const setAcrPublicRead = ClientFunction(() =>
    E2eHelpers.setPolicyResourcePublicRead()
  );
  const deletePolicyResource = ClientFunction(() =>
    E2eHelpers.deletePolicyResource()
  );

  /* Run the actual test: */
  const essUserPod = process.env.TESTCAFE_ESS_PROD_POD;
  await essUserLogin(t);
  // Create a Resource containing Access Policies and Rules:
  await initialisePolicyResource();
  // Verify that we cannot fetch that Resource yet with a user that is not logged in:
  await t
    .expect(
      (await returnErrors(() => fetchPolicyResourceUnauthenticated(essUserPod)))
        .errMsg
    )
    .match(/401 Unauthorized/);
  // In the Resource's Access Control Resource, apply the Policy
  // that just so happens to be defined in the Resource itself,
  // and that allows anyone to read it:
  await setAcrPublicRead();
  // Verify that indeed, someone who is not logged in can now read it:
  await t
    .expect(fetchPolicyResourceUnauthenticated(essUserPod))
    .typeOf("object");
  // Now delete the Resource, so that we can recreate it the next time we run this test:
  await deletePolicyResource();
});

test("Manipulating Access Control Policies to deny Read access", async (t: TestController) => {
  /* Initialise client helpers: */
  const initialisePolicyResource = ClientFunction(() =>
    E2eHelpers.initialisePolicyResource()
  );
  const fetchPolicyResourceAuthenticated = ClientFunction(() =>
    E2eHelpers.fetchPolicyResourceAuthenticated()
  );
  const setAcrSelfWriteNoRead = ClientFunction(() =>
    E2eHelpers.setPolicyResourceSelfWriteNoRead()
  );
  const deletePolicyResource = ClientFunction(() =>
    E2eHelpers.deletePolicyResource()
  );

  /* Run the actual test: */
  const essUserPod = process.env.TESTCAFE_ESS_PROD_POD;
  await essUserLogin(t);
  // Create a Resource containing Access Policies and Rules:
  await initialisePolicyResource();
  // Verify that we can fetch the Resource before Denying Read access:
  await t.expect(fetchPolicyResourceAuthenticated()).typeOf("object");
  // In the Resource's Access Control Resource, apply the Policy
  // that just so happens to be defined in the Resource itself,
  // and that denies Read access to the current user:
  await setAcrSelfWriteNoRead();
  // Verify that indeed, someone who is not logged in can now read it:
  await t
    .expect(
      (await returnErrors(() => fetchPolicyResourceAuthenticated())).errMsg
    )
    .match(/403 Forbidden/);
  // Now delete the Resource, so that we can recreate it the next time we run this test:
  await deletePolicyResource();
});

// eslint-disable-next-line jest/expect-expect, jest/no-done-callback
test("Creating and removing empty Containers", async (t: TestController) => {
  const createContainer = ClientFunction(() => E2eHelpers.createContainer());
  const deleteContainer = ClientFunction(() => E2eHelpers.deleteContainer());

  await essUserLogin(t);
  const createdContainer = await createContainer();
  await t.expect(createdContainer).notTypeOf("null");
  await deleteContainer();
});

/* eslint-enable jest/expect-expect, jest/no-done-callback */

/**
 * TestCafe doesn't provide an assertion to verify that calling a function throws an error,
 * so this function transforms thrown errors into a return value that can be asserted against.
 */
async function returnErrors(
  f: Function
): Promise<{ errMsg: string; isTestCafeError: true; code: string }> {
  try {
    return (await f()) as never;
  } catch (e) {
    return e;
  }
}
