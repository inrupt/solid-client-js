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
  beforeEach,
  afterEach,
  describe,
  it,
  test,
  expect,
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
import {
  getSolidDataset,
  setThing,
  saveSolidDatasetAt,
  overwriteFile,
  getFile,
  getSourceUrl,
  createSolidDataset,
  deleteSolidDataset,
  UrlString,
  acp_v3 as acp,
  FetchError,
  deleteFile,
} from "../../src/index";

const TEST_SLUG = "solid-client-test-e2e-acp_v3";

const env = getNodeTestingEnvironment();

if (env.features?.ACP_V3 === 'false' || env.features?.ACP_V3 === '') {
  // eslint-disable-next-line jest/no-focused-tests
  test.only(`Skipping unsupported ACP V3 tests in ${env.environment}`, () => {});
}

describe("Authenticated end-to-end ACP V3", () => {
  let fetchOptions: { fetch: typeof global.fetch };
  let session: Session;
  let sessionResource: string;
  let sessionContainer: string;
  let pod: string;

  beforeEach(async () => {
    session = await getAuthenticatedSession(env);
    pod = await getPodRoot(session);
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

  async function initialisePolicyResource(
    policyResourceUrl: UrlString,
    session: Session
  ) {
    let publicRule = acp.createRule(`${policyResourceUrl}#rule-public`);
    publicRule = acp.setPublic(publicRule);

    let publicReadPolicy = acp.createPolicy(
      `${policyResourceUrl}#policy-publicRead`
    );
    // Note: we should think of a better name for "optional", as this isn't really optional.
    //       At least one "optional" rule should apply, and since this is the only rule for this
    //       policy, it will in practice be required.
    publicReadPolicy = acp.addAnyOfRuleUrl(publicReadPolicy, publicRule);
    publicReadPolicy = acp.setAllowModes(publicReadPolicy, {
      read: true,
      append: false,
      write: false,
    });

    let selfRule = acp.createRule(`${policyResourceUrl}#rule-self`);
    selfRule = acp.addAgent(selfRule, session.info.webId!);
    // This policy denies write access to the current user,
    // but allows write access so the Resource can still be removed afterwards:
    let selfWriteNoReadPolicy = acp.createPolicy(
      `${policyResourceUrl}#policy-selfWriteNoRead`
    );
    selfWriteNoReadPolicy = acp.addAllOfRuleUrl(
      selfWriteNoReadPolicy,
      selfRule
    );
    selfWriteNoReadPolicy = acp.setAllowModes(selfWriteNoReadPolicy, {
      read: false,
      append: true,
      write: true,
    });
    selfWriteNoReadPolicy = acp.setDenyModes(selfWriteNoReadPolicy, {
      read: true,
      append: false,
      write: false,
    });

    let policyResource = createSolidDataset();
    policyResource = setThing(policyResource, publicRule);
    policyResource = setThing(policyResource, publicReadPolicy);
    policyResource = setThing(policyResource, selfRule);
    policyResource = setThing(policyResource, selfWriteNoReadPolicy);

    return saveSolidDatasetAt(policyResourceUrl, policyResource, fetchOptions);
  }

  async function applyPolicyToPolicyResource(
    resourceUrl: UrlString,
    policyUrl: UrlString
  ) {
    const resourceWithAcr = await acp.getSolidDatasetWithAcr(
      resourceUrl,
      fetchOptions
    );
    if (!acp.hasAccessibleAcr(resourceWithAcr)) {
      throw new Error(
        `The test Resource at [${getSourceUrl(
          resourceWithAcr
        )}] does not appear to have a readable Access Control Resource. Please check the Pod setup.`
      );
    }
    const changedResourceWithAcr = acp.addPolicyUrl(resourceWithAcr, policyUrl);
    return acp.saveAcrFor(changedResourceWithAcr, fetchOptions);
  }

  it("can deny Read access", async () => {
    const policyResourceUrl = sessionResource.concat("-policy-deny");

    // Create a Resource containing Access Policies and Rules:
    await initialisePolicyResource(policyResourceUrl, session);

    // Verify that we can fetch the Resource before Denying Read access:
    await expect(
      getSolidDataset(policyResourceUrl, fetchOptions)
    ).resolves.not.toBeNull();

    // In the Resource's Access Control Resource, apply the Policy
    // that just so happens to be defined in the Resource itself,
    // and that denies Read access to the current user:
    await applyPolicyToPolicyResource(
      policyResourceUrl,
      `${policyResourceUrl}#policy-selfWriteNoRead`
    );

    // Verify that indeed, the current user can no longer read it:
    await expect(
      getSolidDataset(policyResourceUrl, fetchOptions)
    ).rejects.toThrow(
      // Forbidden:
      // @ts-ignore-next
      expect.objectContaining({ statusCode: 403 }) as FetchError
    );

    // Clean up:
    await deleteSolidDataset(policyResourceUrl, fetchOptions);
  });

  it("can allow public Read access", async () => {
    const policyResourceUrl = sessionResource.concat("-policy-allow");

    // Create a Resource containing Access Policies and Rules:
    await initialisePolicyResource(policyResourceUrl, session);

    // Verify that we cannot fetch the Resource before adding public Read access
    // when not logged in (i.e. not passing the session's fetch):
    await expect(getSolidDataset(policyResourceUrl)).rejects.toThrow(
      // Unauthorised:
      // @ts-ignore-next
      expect.objectContaining({ statusCode: 401 }) as FetchError
    );

    // In the Resource's Access Control Resource, apply the Policy
    // that just so happens to be defined in the Resource itself,
    // and provides Read access to the public:
    await applyPolicyToPolicyResource(
      policyResourceUrl,
      `${policyResourceUrl}#policy-publicRead`
    );

    // Verify that indeed, an unauthenticated user can now read it:
    await expect(getSolidDataset(policyResourceUrl)).resolves.not.toBeNull();

    // Clean up:
    await deleteSolidDataset(policyResourceUrl, fetchOptions);
  });

  it("can set Access from a Resource's ACR", async () => {
    const resourceUrl = sessionResource.concat("-resource");

    await overwriteFile(
      resourceUrl,
      Buffer.from("To-be-public Resource", "utf8"),
      fetchOptions
    );

    const resourceInfoWithAcr = await acp.getResourceInfoWithAcr(
      resourceUrl,
      fetchOptions
    );
    if (!acp.hasAccessibleAcr(resourceInfoWithAcr)) {
      throw new Error(
        `The end-to-end tests expect the end-to-end test user to be able to access Access Control Resources, but the ACR of [${resourceUrl}] was not accessible.`
      );
    }
    let publicRule = acp.createResourceRuleFor(
      resourceInfoWithAcr,
      "publicRule"
    );
    publicRule = acp.setPublic(publicRule);
    let publicReadPolicy = acp.createResourcePolicyFor(
      resourceInfoWithAcr,
      "publicReadPolicy"
    );
    publicReadPolicy = acp.addAllOfRuleUrl(publicReadPolicy, publicRule);
    publicReadPolicy = acp.setAllowModes(publicReadPolicy, {
      read: true,
      append: false,
      write: false,
    });

    let updatedResourceInfoWithAcr = acp.setResourceRule(
      resourceInfoWithAcr,
      publicRule
    );
    updatedResourceInfoWithAcr = acp.setResourcePolicy(
      updatedResourceInfoWithAcr,
      publicReadPolicy
    );

    // Verify that we cannot fetch the Resource before adding public Read access
    // when not logged in (i.e. not passing the session's fetch):
    await expect(getFile(resourceUrl)).rejects.toThrow(
      // Unauthorised:
      // @ts-ignore-next
      expect.objectContaining({ statusCode: 401 }) as FetchError
    );

    await acp.saveAcrFor(updatedResourceInfoWithAcr, fetchOptions);

    // Verify that indeed, an unauthenticated user can now read it:
    await expect(getFile(resourceUrl)).resolves.not.toBeNull();

    // Clean up:
    await deleteFile(resourceUrl, fetchOptions);
  });
});
