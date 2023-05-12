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
  setupTestResources,
  teardownTestResources,
  getAuthenticatedSession,
  getPodRoot,
  createFetch,
} from "@inrupt/internal-test-env";
import Link from "http-link-header";
import {
  acp_v4 as acp,
  acp_ess_2,
  fromRdfJsDataset,
  getSolidDataset,
  getSourceUrl,
  saveSolidDatasetAt,
  toRdfJsDataset,
} from "../../src/index";
import { getAccessControlUrlAll } from "../../src/acp/accessControl/getAccessControlUrlAll";
import { getAgentAccess } from "../../src/universal/getAgentAccess";
import { setAgentAccess } from "../../src/universal/setAgentAccess";
import { getPublicAccess as latest_getPublicAccess } from "../../src/universal/getPublicAccess";
import { setPublicAccess as latest_setPublicAccess } from "../../src/universal/setPublicAccess";
import {
  setPublicAccess as legacy_setPublicAccess,
  getPublicAccess as legacy_getPublicAccess,
} from "../../src/access/universal";
import { hasAccessibleAcr } from "../../src/acp/acp";
import { DataFactory } from "../../src/rdfjs.internal";

const TEST_SLUG = "solid-client-test-e2e-acp";

const env = getNodeTestingEnvironment();

if (env?.features?.acp !== true) {
  // eslint-disable-next-line jest/no-focused-tests
  test.only(`Skipping unsupported ACP tests in ${env.environment}`, () => {});
}

const READ_ONLY_ACCESS = {
  read: true,
  append: false,
  write: false,
  controlRead: false,
  controlWrite: false,
};
const APPEND_ONLY_ACCESS = {
  read: false,
  append: true,
  write: false,
  controlRead: false,
  controlWrite: false,
};

describe("An ACP Solid server", () => {
  let fetchOptions: { fetch: typeof global.fetch };
  let session: Session;
  let sessionResource: string;
  let sessionContainer: string;

  beforeEach(async () => {
    session = await getAuthenticatedSession(env);
    const pod = await getPodRoot(session);

    fetchOptions = { fetch: createFetch(session, TEST_SLUG) };
    const testsetup = await setupTestResources(pod, fetchOptions);
    sessionResource = testsetup.resourceUrl;
    sessionContainer = testsetup.containerUrl;
  });

  afterEach(async () => {
    await teardownTestResources(
      session,
      sessionContainer,
      sessionResource,
      fetchOptions
    );
  });

  it("advertises its ACLs as ACP AccessControlResources", async () => {
    expect(await acp.isAcpControlled(sessionResource, fetchOptions)).toBe(true);
  });

  it("can read ACP access controls", async () => {
    const resourceWithAcr = await acp.getSolidDatasetWithAcr(
      sessionResource,
      fetchOptions
    );
    expect(resourceWithAcr).toBeDefined();
    if (!hasAccessibleAcr(resourceWithAcr)) {
      throw new Error(
        `${getSourceUrl(resourceWithAcr)} has no accessible ACR.`
      );
    }
    const accessControlUrlArray = getAccessControlUrlAll(resourceWithAcr);
    expect(accessControlUrlArray).toHaveLength(1);
  });

  // TODO: re-enable once there is support for external access controls.
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip("understands an Access Control Resource's default agent access", async () => {
    expect(
      await getAgentAccess(sessionResource, session.info.webId!, fetchOptions)
    ).toEqual({
      read: true,
      append: false,
      write: true,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("can get and set read access for an agent", async () => {
    const agent = "https://example.org/bob";
    const agentAccess = await setAgentAccess(
      sessionResource,
      agent,
      { read: true },
      fetchOptions
    );
    expect(agentAccess).toStrictEqual(READ_ONLY_ACCESS);
    expect(
      await getAgentAccess(sessionResource, agent, fetchOptions)
    ).toStrictEqual(READ_ONLY_ACCESS);
  });

  it("can get and set access for multiple agents", async () => {
    const alice = "https://example.org/alice";
    const bob = "https://example.org/bob";
    const aliceAccess = await setAgentAccess(
      sessionResource,
      alice,
      { read: true },
      fetchOptions
    );
    const bobAccess = await setAgentAccess(
      sessionResource,
      bob,
      { append: true },
      fetchOptions
    );
    expect(bobAccess).toStrictEqual(APPEND_ONLY_ACCESS);
    expect(aliceAccess).toStrictEqual(READ_ONLY_ACCESS);
    expect(
      await getAgentAccess(sessionResource, alice, fetchOptions)
    ).toStrictEqual(READ_ONLY_ACCESS);
    expect(
      await getAgentAccess(sessionResource, bob, fetchOptions)
    ).toStrictEqual(APPEND_ONLY_ACCESS);

    const bobUpdatedAccess = await setAgentAccess(
      sessionResource,
      bob,
      { read: true },
      fetchOptions
    );
    expect(bobUpdatedAccess).toStrictEqual({
      read: true,
      append: true,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
    expect(
      await getAgentAccess(sessionResource, bob, fetchOptions)
    ).toStrictEqual({
      read: true,
      append: true,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("can get access for multiple agents with externally modified access", async () => {
    const alice = "https://example.org/alice";
    const bob = "https://example.org/bob";
    const agent = DataFactory.namedNode("http://www.w3.org/ns/solid/acp#agent");

    const aliceAccess = await setAgentAccess(
      sessionResource,
      alice,
      { append: true },
      fetchOptions
    );
    expect(aliceAccess).toStrictEqual(APPEND_ONLY_ACCESS);
    expect(
      await getAgentAccess(sessionResource, alice, fetchOptions)
    ).toStrictEqual(APPEND_ONLY_ACCESS);
    expect(
      await getAgentAccess(sessionResource, bob, fetchOptions)
    ).toStrictEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });

    const headResponse = await session.fetch(sessionResource, {
      method: "HEAD",
    });

    const responseLinks = headResponse.headers.get("Link");
    if (!responseLinks) {
      throw new Error("No Link header found");
    }

    const links = Link.parse(responseLinks.toString());
    const acrUrl = links?.get("rel", "acl")[0].uri;
    const acrDataset = await getSolidDataset(acrUrl, { fetch: session.fetch });
    const rdfjs = toRdfJsDataset(acrDataset);

    // Find the policies applying to alice and also apply them to bob
    for (const p of rdfjs.match(null, agent, DataFactory.namedNode(alice))) {
      rdfjs.add(DataFactory.quad(p.subject, agent, DataFactory.namedNode(bob)));
    }

    const datasetWithAcr = await acp_ess_2.getSolidDatasetWithAcr(
      sessionResource,
      { fetch: session.fetch }
    );

    if (!datasetWithAcr.internal_acp.acr) {
      throw new Error("No ACR found");
    }

    await saveSolidDatasetAt(acrUrl, fromRdfJsDataset(rdfjs), {
      fetch: session.fetch,
    });

    expect(
      await getAgentAccess(sessionResource, alice, fetchOptions)
    ).toStrictEqual(APPEND_ONLY_ACCESS);
    expect(
      await getAgentAccess(sessionResource, bob, fetchOptions)
    ).toStrictEqual(APPEND_ONLY_ACCESS);
  });

  it("can get and set read access for the public", async () => {
    const setPublicAccess = env.features?.acp
      ? latest_setPublicAccess
      : legacy_setPublicAccess;
    const getPublicAccess = env.features?.acp
      ? latest_getPublicAccess
      : legacy_getPublicAccess;

    await expect(
      getSolidDataset(sessionResource, fetchOptions)
    ).resolves.toEqual(expect.objectContaining({ graphs: { default: {} } }));

    await expect(getSolidDataset(sessionResource)).rejects.toThrow();

    const access = await setPublicAccess(
      sessionResource,
      { read: true },
      fetchOptions
    );

    expect(access).toStrictEqual({
      read: true,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });

    expect(await getPublicAccess(sessionResource, fetchOptions)).toStrictEqual({
      read: true,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });

    try {
      await expect(getSolidDataset(sessionResource)).resolves.toEqual(
        expect.objectContaining({ graphs: { default: {} } })
      );
    } catch (e) {
      console.error(
        `"Making a resource public with the universal API fails in environment ${env.environment}`
      );
    }
  });

  it("can get and set full access for an agent", async () => {
    const agent = "https://example.org/alice";
    const agentAccess = await setAgentAccess(
      sessionResource,
      agent,
      {
        read: true,
        append: true,
        write: true,
        controlRead: true,
        controlWrite: true,
      },
      fetchOptions
    );
    expect(agentAccess).toStrictEqual({
      read: true,
      append: true,
      write: true,
      controlRead: true,
      controlWrite: true,
    });
    expect(
      await getAgentAccess(sessionResource, agent, fetchOptions)
    ).toStrictEqual({
      read: true,
      append: true,
      write: true,
      controlRead: true,
      controlWrite: true,
    });
  });

  it("can remove access for an agent", async () => {
    const agent = "https://example.org/malika";
    const agentAccess = await setAgentAccess(
      sessionResource,
      agent,
      {
        read: true,
        append: true,
        write: true,
        controlRead: true,
        controlWrite: true,
      },
      fetchOptions
    );
    const removedAgentAccess = await setAgentAccess(
      sessionResource,
      agent,
      {
        read: true,
        append: true,
        write: false,
        controlRead: false,
        controlWrite: false,
      },
      fetchOptions
    );
    expect(removedAgentAccess).toStrictEqual({
      read: true,
      append: true,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
    expect(
      await getAgentAccess(sessionResource, agent, fetchOptions)
    ).toStrictEqual({
      read: true,
      append: true,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });
});
