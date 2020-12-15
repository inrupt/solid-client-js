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

import { Role } from "testcafe";
import { IndexPage } from "./pageModels";
import { BrokerPage } from "./pageModels/broker";
import { CognitoPage } from "./pageModels/cognito";

export const essUser = Role("http://localhost:1234", async (t) => {
  return await essUserLogin(t);
});

/**
 * Unfortunately solid-client-authn-browser sessions, at the time of writing,
 * do not survive a page refresh.
 * Testcafe's "Role" functionality logs you in,
 * then redirects you back to where you wanted to be for the test.
 * To avoid this redirect, the login functionality is extracted into this single helper,
 * which we'll have to use instead of the Role for now.
 * Move this function into `essUser` and replace uses of it with uses of the Role
 * once this issue is resolved: https://github.com/inrupt/solid-client-authn-js/issues/423
 */
export const essUserLogin = async (_t: TestController) => {
  const indexPage = new IndexPage();
  await indexPage.startLogin(process.env.E2E_TEST_ESS_IDP_URL);

  const cognitoPage = new CognitoPage();
  await cognitoPage.login(
    process.env.E2E_TEST_ESS_COGNITO_USER!,
    process.env.E2E_TEST_ESS_COGNITO_PASSWORD!
  );

  const authorisePage = new BrokerPage();
  await authorisePage.authoriseOnce();

  await indexPage.handleRedirect();
};
