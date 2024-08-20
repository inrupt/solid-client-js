//
// Copyright Inrupt Inc.
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

import type { Session } from "@inrupt/solid-client-authn-node";
import {
  getNodeTestingEnvironment,
  setupTestResources,
  teardownTestResources,
  getAuthenticatedSession,
  getPodRoot,
  createFetch,
} from "@inrupt/internal-test-env";
import Link from "http-link-header";
import { DEFAULT_TYPE } from "@inrupt/solid-client-errors";
import {
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
import { getPublicAccess } from "../../src/universal/getPublicAccess";
import { setPublicAccess } from "../../src/universal/setPublicAccess";
import { hasAccessibleAcr } from "../../src/acp/acp";
import { DataFactory } from "../../src/rdfjs.internal";

const TEST_SLUG = "solid-client-test-e2e-acp";

const env = getNodeTestingEnvironment();

if (env?.features?.ACP === "false" || env?.features?.ACP === "") {
  // eslint-disable-next-line jest/no-focused-tests
  test.only(`Skipping unsupported ACP tests in ${env.environment}`, () => {});
}

const NO_ACCESS = {
  read: false,
  append: false,
  write: false,
  controlRead: false,
  controlWrite: false,
};
const ALL_ACCESS = {
  read: true,
  append: true,
  write: true,
  controlRead: true,
  controlWrite: true,
};
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
const READ_AND_APPEND_ACCESS = {
  read: true,
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
      fetchOptions,
    );
  });

  it("advertises its ACLs as ACP AccessControlResources", async () => {
    expect(await acp_ess_2.isAcpControlled(sessionResource, fetchOptions)).toBe(
      true,
    );
  });

  it("can read ACP access controls", async () => {
    const resourceWithAcr = await acp_ess_2.getSolidDatasetWithAcr(
      sessionResource,
      fetchOptions,
    );
    expect(resourceWithAcr).toBeDefined();
    if (!hasAccessibleAcr(resourceWithAcr)) {
      throw new Error(
        `${getSourceUrl(resourceWithAcr)} has no accessible ACR.`,
      );
    }
    const accessControlUrlArray = getAccessControlUrlAll(resourceWithAcr);
    expect(accessControlUrlArray).toHaveLength(1);
  });

  // TODO: re-enable once there is support for external access controls.
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip("understands an Access Control Resource's default agent access", async () => {
    expect(
      await getAgentAccess(sessionResource, session.info.webId!, fetchOptions),
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
      fetchOptions,
    );
    expect(agentAccess).toStrictEqual(READ_ONLY_ACCESS);
    expect(
      await getAgentAccess(sessionResource, agent, fetchOptions),
    ).toStrictEqual(READ_ONLY_ACCESS);
  });

  it("can get and set access for multiple agents", async () => {
    const alice = "https://example.org/alice";
    const bob = "https://example.org/bob";
    const aliceAccess = await setAgentAccess(
      sessionResource,
      alice,
      { read: true },
      fetchOptions,
    );
    const bobAccess = await setAgentAccess(
      sessionResource,
      bob,
      { append: true },
      fetchOptions,
    );
    expect(bobAccess).toStrictEqual(APPEND_ONLY_ACCESS);
    expect(aliceAccess).toStrictEqual(READ_ONLY_ACCESS);
    expect(
      await getAgentAccess(sessionResource, alice, fetchOptions),
    ).toStrictEqual(READ_ONLY_ACCESS);
    expect(
      await getAgentAccess(sessionResource, bob, fetchOptions),
    ).toStrictEqual(APPEND_ONLY_ACCESS);

    const bobUpdatedAccess = await setAgentAccess(
      sessionResource,
      bob,
      { read: true },
      fetchOptions,
    );
    expect(bobUpdatedAccess).toStrictEqual(READ_AND_APPEND_ACCESS);
    expect(
      await getAgentAccess(sessionResource, bob, fetchOptions),
    ).toStrictEqual(READ_AND_APPEND_ACCESS);
  });

  it("can get access for multiple agents with externally modified access", async () => {
    const alice = "https://example.org/alice";
    const bob = "https://example.org/bob";
    const agent = DataFactory.namedNode("http://www.w3.org/ns/solid/acp#agent");

    const aliceAccess = await setAgentAccess(
      sessionResource,
      alice,
      { append: true },
      fetchOptions,
    );
    expect(aliceAccess).toStrictEqual(APPEND_ONLY_ACCESS);
    expect(
      await getAgentAccess(sessionResource, alice, fetchOptions),
    ).toStrictEqual(APPEND_ONLY_ACCESS);
    expect(
      await getAgentAccess(sessionResource, bob, fetchOptions),
    ).toStrictEqual(NO_ACCESS);

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
      { fetch: session.fetch },
    );

    if (!datasetWithAcr.internal_acp.acr) {
      throw new Error("No ACR found");
    }

    await saveSolidDatasetAt(acrUrl, fromRdfJsDataset(rdfjs), {
      fetch: session.fetch,
    });

    expect(
      await getAgentAccess(sessionResource, alice, fetchOptions),
    ).toStrictEqual(APPEND_ONLY_ACCESS);
    expect(
      await getAgentAccess(sessionResource, bob, fetchOptions),
    ).toStrictEqual(APPEND_ONLY_ACCESS);
  });

  (env.features?.acp ? it : it.skip)(
    "can get and set read access for the public",
    async () => {
      await expect(
        getSolidDataset(sessionResource, fetchOptions),
      ).resolves.toEqual(expect.objectContaining({ graphs: { default: {} } }));

      await expect(getSolidDataset(sessionResource)).rejects.toThrow();

      const access = await setPublicAccess(
        sessionResource,
        { read: true },
        fetchOptions,
      );

      expect(access).toStrictEqual(READ_ONLY_ACCESS);
      expect(
        await getPublicAccess(sessionResource, fetchOptions),
      ).toStrictEqual(READ_ONLY_ACCESS);

      try {
        await expect(getSolidDataset(sessionResource)).resolves.toEqual(
          expect.objectContaining({ graphs: { default: {} } }),
        );
      } catch (e) {
        console.error(
          `"Making a resource public with the universal API fails in environment ${env.environment}`,
        );
      }
    },
  );

  it("can get and set full access for an agent", async () => {
    const agent = "https://example.org/alice";
    const agentAccess = await setAgentAccess(
      sessionResource,
      agent,
      ALL_ACCESS,
      fetchOptions,
    );
    expect(agentAccess).toStrictEqual(ALL_ACCESS);
    expect(
      await getAgentAccess(sessionResource, agent, fetchOptions),
    ).toStrictEqual(ALL_ACCESS);
  });

  it("can remove access for an agent", async () => {
    const agent = "https://example.org/malika";
    await setAgentAccess(sessionResource, agent, ALL_ACCESS, fetchOptions);
    const removedAgentAccess = await setAgentAccess(
      sessionResource,
      agent,
      READ_AND_APPEND_ACCESS,
      fetchOptions,
    );
    expect(removedAgentAccess).toStrictEqual(READ_AND_APPEND_ACCESS);
    expect(
      await getAgentAccess(sessionResource, agent, fetchOptions),
    ).toStrictEqual(READ_AND_APPEND_ACCESS);
  });

  it("raises an error getting agent access if service returns an error response", async () => {
    const headResponse = await session.fetch(sessionResource, {
      method: "HEAD",
    });

    const responseLinks = headResponse.headers.get("Link");
    if (!responseLinks) {
      throw new Error("No Link header found");
    }

    const links = Link.parse(responseLinks.toString());
    const acrUrl = links?.get("rel", "acl")[0].uri;

    const customFetch: typeof fetch = async (
      info: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      return fetchOptions.fetch(info, {
        ...init,
        method: "INVALID",
      });
    };

    const agent = "https://example.org/bob";
    // This request should produce an error
    const error = await getAgentAccess(acrUrl, agent, {
      fetch: customFetch,
    }).catch((err) => err);

    expect(error.statusCode).toBe(405);
    expect(error.message).toContain(
      `Fetching the metadata of the Resource at [${acrUrl}] failed: [405]`,
    );
    expect(error.statusText).toBe("Method Not Allowed");

    expect(error.problemDetails.type).toBe(DEFAULT_TYPE);
    expect(error.problemDetails.title).toBe("Method Not Allowed");
    expect(error.problemDetails.status).toBe(405);
    expect(error.problemDetails.detail).toBeUndefined();
    expect(error.problemDetails.instance).toBeUndefined();
  });

  it("silently ignores setting agent access if service returns an error response", async () => {
    const customFetch: typeof fetch = async (
      info: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      // Only change the PATCH request that updates the ACR
      if (init?.method === "PATCH") {
        return fetchOptions.fetch(info, {
          ...init,
          body: "Invalid Content",
        });
      }
      // All other requests fallback to the original fetch
      return fetchOptions.fetch(info, init);
    };

    const agent = "https://example.org/bob";

    // Agent does not have any access to the resource
    await expect(
      getAgentAccess(sessionResource, agent, fetchOptions),
    ).resolves.toEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });

    // This operation should fail and produce an 400 error to the client. It doesn't as the error is not propagated.
    // This is legacy behaviour which is not consistent with other functions from the access control module. This
    // maybe changed in a future major version of the library. For now this test is just proving that nothing changed
    // on the ACR. This is problematic as a client may think the set access was successful.
    await expect(
      setAgentAccess(
        sessionResource,
        agent,
        { read: true },
        { fetch: customFetch },
      ),
    ).resolves.not.toThrow();

    // Agent still does not have any access to the resource
    await expect(
      getAgentAccess(sessionResource, agent, fetchOptions),
    ).resolves.toEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("silently ignores getting public access modes if service returns an error response", async () => {
    // Provide an invalid Accept header to the GET request to get the server to return a 406 error
    const customFetch: typeof fetch = async (
      info: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      // Only change the GET request
      if (init?.method === "GET") {
        return fetchOptions.fetch(info, {
          ...init,
          headers: {
            ...init?.headers,
            Accept: "invalid-mime-type",
          },
        });
      }
      // All other requests fallback to the original fetch
      return fetchOptions.fetch(info, init);
    };

    // This operation should fail and produce an 400 error to the client. It doesn't as the error is not propagated.
    // This is legacy behaviour which is not consistent with other functions from the access control module. This
    // maybe changed in a future major version of the library. For now this test is just proving that there is no
    // public access to the resource. This is problematic as a client will think there is just no public access.
    await expect(
      getPublicAccess(sessionResource, { fetch: customFetch }),
    ).resolves.toEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("silently ignores setting public access modes if service returns an error response", async () => {
    // Provide invalid body content to the PATCH request to get the server to return a 400 error
    const customFetch: typeof fetch = async (
      info: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      // Only change the PATCH request
      if (init?.method === "PATCH") {
        return fetchOptions.fetch(info, {
          ...init,
          body: "Invalid content",
        });
      }
      // All other requests fallback to the original fetch
      return fetchOptions.fetch(info, init);
    };

    // This operation should fail and produce an 400 error to the client. It doesn't as the error is not propagated.
    // This is legacy behaviour which is not consistent with other functions from the access control module. This
    // maybe changed in a future major version of the library. For now this test is just proving that there is no
    // public access to the resource set. This is problematic as a client will think the operation worked.
    await expect(
      setPublicAccess(sessionResource, { read: true }, { fetch: customFetch }),
    ).resolves.toBeNull();

    // Check that no public access was set
    await expect(
      getPublicAccess(sessionResource, { fetch: customFetch }),
    ).resolves.toEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });
});
