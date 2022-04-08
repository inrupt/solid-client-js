/**
 * Copyright 2022 Inrupt Inc.
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

import * as SolidClient from "@inrupt/solid-client";
import { Session } from "@inrupt/solid-client-authn-browser";
import { getHelpers } from "./helpers";

const session = new Session();

const loginButton = document.getElementsByTagName("button")[0];

loginButton.addEventListener("click", async (e) => {
  const idp = (document.getElementById("idp") as HTMLInputElement).value;
  await session.login({
    oidcIssuer: idp,
    redirectUrl: document.location.href,
  });
});

session
  .handleIncomingRedirect(window.location.href)
  .then(async () => {
    let podRoot = "<Pod root will be fetched after a successful login>";
    if (session.info.isLoggedIn) {
      const profileDoc = await SolidClient.getSolidDataset(session.info.webId!);
      const profile = SolidClient.getThing(profileDoc, session.info.webId!);
      podRoot = SolidClient.getIri(
        profile!,
        "http://www.w3.org/ns/pim/space#storage"
      )!;
    }

    // Make the helpers available to the end-to-end test runner:
    (globalThis as any).E2eHelpers = getHelpers(podRoot, session);

    const e2eNotification = document.createElement("div");
    e2eNotification.innerText = "End-to-end test helpers initialised.";
    e2eNotification.setAttribute("role", "alert");
    document.body.insertAdjacentElement("beforeend", e2eNotification);
  })
  .catch((err) => {
    console.error(err);
  });
