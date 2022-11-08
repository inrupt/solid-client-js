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

const env = getNodeTestingEnvironment({ acp_v3: false, wac: false, acp: true });
const sessionResourcePrefix = "solid-client-tests/node/wac-";
// if (env.features.wac !== true) {
//   // eslint-disable-next-line jest/no-focused-tests
//   test.only(`Skipping unsupported WAC tests in ${env.environment}`, () => {});
// }

describe("Authenticated end-to-end WAC", () => {
  let options: { fetch: typeof global.fetch };
  let session: Session;
  let sessionResource: string;
  let pod: string;

  beforeEach(async () => {
    session = await getAuthenticatedSession(env);
    pod = await getPodRoot(session);
    sessionResource = `${pod}${sessionResourcePrefix}${session.info.sessionId}`;
    options = { fetch: session.fetch };
    await saveSolidDatasetAt(sessionResource, createSolidDataset(), options);
  });

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
  });

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
      read: false,
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
