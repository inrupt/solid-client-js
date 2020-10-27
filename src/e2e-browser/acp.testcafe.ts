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
// Hence, we just declare this variable to be of the  type here.
const E2eHelpers: ReturnType<typeof getHelpers> = {} as any;

config({ path: __dirname });

fixture("Access Control Policies").page("http://localhost:1234");

// eslint-disable-next-line jest/expect-expect, jest/no-done-callback
test("Manipulating Access Control Policies", async (t: TestController) => {
  /* Initialise client helpers: */
  const getSessionInfo = ClientFunction(() => E2eHelpers.getSessionInfo());
  const initialiseApr = ClientFunction(() => E2eHelpers.initialiseApr());
  const fetchAprUnauthenticated = ClientFunction((podRoot?: string) =>
    E2eHelpers.fetchAprUnauthenticated(podRoot)
  );
  const setAcrPublicRead = ClientFunction(() => E2eHelpers.setAprPublicRead());
  const deleteApr = ClientFunction(() => E2eHelpers.deleteApr());

  /* Run the actual test: */
  const essUserPod = process.env.TESTCAFE_ESS_PROD_POD;
  await essUserLogin(t);
  // Create a Resource containing Access Policies and Rules:
  await initialiseApr();
  // Verify that we cannot fetch that Resource yet with a user that is not logged in:
  await t
    .expect(
      (await returnErrors(() => fetchAprUnauthenticated(essUserPod))).errMsg
    )
    .match(/401 Unauthorized/);
  // In the Resource's Access Control Resource, apply the Policy
  // that just so happens to be defined in the Resource itself,
  // and that allows anyone to read it:
  await setAcrPublicRead();
  // Verify that indeed, someone who is not logged in can now read it:
  await t.expect(fetchAprUnauthenticated(essUserPod)).typeOf("object");
  // Now delete the Resource, so that we can recreate it the next time we run this test:
  await deleteApr();
});

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
