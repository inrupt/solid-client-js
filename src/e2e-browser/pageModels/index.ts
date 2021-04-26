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

import { t, ClientFunction, Selector } from "testcafe";
import { screen } from "@testing-library/testcafe";

export class IndexPage {
  idpInput;
  submitButton;

  constructor() {
    this.idpInput = screen.getByLabelText("Identity provider:");
    this.submitButton = screen.getByText("Log in");
  }

  async startLogin(idp = "https://broker.pod.inrupt.com") {
    await t
      .selectText(this.idpInput)
      .pressKey("delete")
      .typeText(this.idpInput, idp)
      .click(this.submitButton)
      // For some reason the login process does not seem to kicked off
      // directly in response to the form submission, but after a timeout or something.
      // Thus, we have to explicitly wait for it to start navigating:
      .wait(500);
  }

  async handleRedirect() {
    // It looks like testing-library selectors do not allow us to wait for the element to appear,
    // hence the use of TestCafe's native Selector:
    // const initialisationNotification = screen.getByText("End-to-end test helpers initialised.");
    const initialisationNotification = Selector("[role=alert]");
    await t
      .expect(initialisationNotification.exists)
      .ok(
        "solid-client-authn took too long to verify the query parameters after redirection.",
        { timeout: 30000 }
      );
  }
}

export async function isIndexPage() {
  // Pretend that `window` actually is defined (even though the `window`
  // referred to in the ClientFunction is actually in a different runtime),
  // so static analysis does not stumble over this:
  const window: any = undefined;
  return (
    (await ClientFunction(() => window.location.origin)()) ===
    "http://localhost:1234"
  );
}
