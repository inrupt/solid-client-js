//
// Copyright 2022 Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  test,
} from "@jest/globals";

import { Session } from "@inrupt/solid-client-authn-node";
import {
  getNodeTestingEnvironment,
  getPodRoot,
  getAuthenticatedSession,
} from "@inrupt/internal-test-env";
import fetchCookie from 'fetch-cookie';
import {
  getSolidDatasetWithAcl,
  hasResourceAcl,
  getPublicAccess,
  getAgentAccess,
  getFallbackAcl,
  getResourceAcl,
  getAgentResourceAccess,
  setAgentResourceAccess,
  saveAclFor,
  deleteSolidDataset,
  saveSolidDatasetAt,
  createSolidDataset,
} from "../../src/index";
// Functions from this module have to be imported from the module directly,
// because their names overlap with access system-specific versions,
// and therefore aren't exported from the package root:
import {
  getAgentAccess as getAgentAccessUniversal,
  setPublicAccess as setPublicAccessUniversal,
} from "../../src/access/universal";

const env = getNodeTestingEnvironment();
const sessionResourcePrefix = "solid-client-tests/node/wac-";
if (env.features?.WAC === "false" || env.features?.WAC === "") {
  // eslint-disable-next-line jest/no-focused-tests
  test.only(`Skipping unsupported WAC tests in ${env.environment}`, () => {});
}

const location = (res: Response) => typeof res.headers.get('location') === 'string'
  ? new URL(res.headers.get('location')!, res.url)
  : new URL(res.url);

// Log into Node Solid Server v5.7.7
export async function getNssSession(options: { oidcIssuer: string; username: string; password: string }) {
  const session = new Session();
  const url = await new Promise<string>(res => session.login({
    oidcIssuer: options.oidcIssuer,
    redirectUrl: 'http://localhost:3000/',
    handleRedirect: res
  }));

  const cFetch = fetchCookie(fetch);
  
  const form = new URLSearchParams({
    username: options.username,
    password: options.password,
    response_type: "code",
    scope: "openid+offline_access+webid",
    client_id: new URL(url).searchParams.get('client_id')!,
    redirect_uri: "http://localhost:3000/",
    state: new URL(url).searchParams.get('state')!
  });

  const fetchOptions: (() => RequestInit) = () => ({
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    redirect: 'manual'
  })

  // Submit login details
  let pwdRes = await cFetch(new URL('/login/password', options.oidcIssuer), fetchOptions());
  let nextUrl: URL | false;

  // Follow redirects. Terminate early if the next Location pointer contains the code.
  while (pwdRes.status === 302 && !(nextUrl = location(pwdRes)).searchParams.has('code')) {
    pwdRes = await cFetch(nextUrl, { redirect: 'manual' });
  }

  // Submit consent form if this is our first time logging into the given server
  if (pwdRes.status !== 302) {
    for (const mode of ['Read', 'Write', 'Append'])
      form.append('access_mode', mode)
    form.append('consent', 'true')

    pwdRes = await cFetch(location(pwdRes).origin + location(pwdRes).pathname, fetchOptions());
  }

  // Follow redirects. Terminate early if the next Location pointer contains the code.
  while (pwdRes.status === 302 && !(nextUrl = location(pwdRes)).searchParams.has('code')) {
    pwdRes = await cFetch(nextUrl, { redirect: 'manual' });
  }

  await session.handleIncomingRedirect(location(pwdRes).toString());
  return session;
}

describe("Authenticated end-to-end WAC", () => {
  let options: { fetch: typeof global.fetch };
  let session: Session;
  let sessionResource: string;
  let pod: string;

  beforeEach(async () => {
    session = await getNssSession({
      oidcIssuer: env.idp,
      username: "ownerName",
      password: "ownerPassword1@",
    });
    // session = await getAuthenticatedSession(env);
    pod = await getPodRoot(session);
    sessionResource = `${pod}${sessionResourcePrefix}${session.info.sessionId}`;
    options = { fetch: session.fetch };
    await saveSolidDatasetAt(sessionResource, createSolidDataset(), options);
  }, 20_000);

  afterEach(async () => {
    await deleteSolidDataset(sessionResource, options);
    await session.logout();
  });

  it("can read the user's access to their profile with WAC", async () => {
    const webId = session.info.webId!;
    const agentAccess = await getAgentAccessUniversal(webId, webId, options);
    expect(agentAccess).toStrictEqual({
      read: true,
      append: true,
      write: true,
      controlRead: true,
      controlWrite: true,
    });
  }, 60_000);

  it("can read and update ACLs", async () => {
    const fakeWebId = `https://example.com/fake-webid#${session.info.sessionId}`;

    const datasetWithAcl = await getSolidDatasetWithAcl(pod, options);
    const datasetWithoutAcl = await getSolidDatasetWithAcl(
      sessionResource,
      options
    );

    expect(hasResourceAcl(datasetWithAcl)).toBe(true);
    expect(hasResourceAcl(datasetWithoutAcl)).toBe(false);

    expect(getPublicAccess(datasetWithAcl)).toEqual({
      read: env.environment === "CSS",
      append: false,
      write: false,
      control: false,
    });
    expect(getAgentAccess(datasetWithAcl, session.info.webId!)).toEqual({
      read: true,
      append: true,
      write: true,
      control: true,
    });
    expect(getAgentAccess(datasetWithoutAcl, session.info.webId!)).toEqual({
      read: true,
      append: true,
      write: true,
      control: true,
    });
    const fallbackAclForDatasetWithoutAcl = getFallbackAcl(datasetWithoutAcl);
    expect(fallbackAclForDatasetWithoutAcl?.internal_accessTo).toBe(pod);

    if (!hasResourceAcl(datasetWithAcl)) {
      throw new Error(
        `The Resource at [${pod}] does not seem to have an ACL. The end-to-end tests do expect it to have one.`
      );
    }
    const acl = getResourceAcl(datasetWithAcl);
    const updatedAcl = setAgentResourceAccess(acl, fakeWebId, {
      read: true,
      append: false,
      write: false,
      control: false,
    });
    const sentAcl = await saveAclFor(datasetWithAcl, updatedAcl, {
      fetch: session.fetch,
    });
    const fakeWebIdAccess = getAgentResourceAccess(sentAcl, fakeWebId);
    expect(fakeWebIdAccess).toEqual({
      read: true,
      append: false,
      write: false,
      control: false,
    });

    // Cleanup
    const cleanedAcl = setAgentResourceAccess(sentAcl, fakeWebId, {
      read: false,
      append: false,
      write: false,
      control: false,
    });
    await saveAclFor(datasetWithAcl, cleanedAcl, options);
  });

  it("throws an error when trying to set different values for controlRead and controlWrite on a WAC-powered Pod", async () => {
    await expect(
      setPublicAccessUniversal(
        sessionResource,
        { controlRead: true, controlWrite: false },
        options
      )
    ).rejects.toThrow(
      `When setting access for a Resource in a Pod implementing Web Access Control (i.e. [${sessionResource}]), ` +
        "`controlRead` and `controlWrite` should have the same value."
    );
  });
});
