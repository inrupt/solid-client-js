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

// BEGIN-EXAMPLE-LOGIN

import {
  Session,
  getClientAuthnWithDependencies
} from '@inrupt/solid-client-authn-browser'
import { getSolidDataset } from "@inrupt/solid-client":

// Build a session
const session = new Session({
    clientAuthn: getClientAuthnWithDependencies({})},
    "mySession"
);

if (!session.sessionInfo.isLoggedIn) {
  // Redirect the user to their identity provider:
  // (This moves the user away from the current page.)
  session.login({
      // The URL of the user's OIDC issuer. Specify your OIDC issuer URL.
      oidcIssuer: 'https://inrupt.net',
      // The URL the system should redirect to after login. Specify your redirect URL.
      redirectUrl: 'https://example.com/redirect',
  });
}

// At your redirect site (e.g., https://example.com/redirect):
if (!session.sessionInfo.isLoggedIn) {
  await session.handleIncomingRedirect(new URL(window.location.href));
}

// You can now make authenticated requests by passing session.fetch, for example:
getSolidDataset(session.sessionInfo.webId, { fetch: session.fetch });

// END-EXAMPLE-LOGIN
