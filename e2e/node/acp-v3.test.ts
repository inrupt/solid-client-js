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

import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";

import { Session } from "@inrupt/solid-client-authn-node";
import { config } from "dotenv-flow";
import {
  getSolidDataset,
  setThing,
  saveSolidDatasetAt,
  overwriteFile,
  getFile,
  getSourceUrl,
  deleteFile,
  createSolidDataset,
  deleteSolidDataset,
  UrlString,
  acp_v3 as acp,
  FetchError,
} from "../../src/index";
import { getTestingEnvironment, TestingEnvironment } from "./util/getTestingEnvironment";
import { getAuthenticatedSession } from "./util/getAuthenticatedSession";

let env: TestingEnvironment;

beforeAll(() => {
  config({
    path: __dirname,
    // Disable warning messages in CI
    silent: process.env.CI === "true",
  });
  env = getTestingEnvironment();
});

describe(`Authenticated end-to-end ACP V3 tests against environment ${env.environment}`, () => {
  if (!env.feature.acp) {
    return;
  }

  let options: { fetch: typeof global.fetch };
  let session: Session;
  let sessionResource: string;

  beforeEach(async () => {
    session = await getAuthenticatedSession(env);
    sessionResource = `${env.pod}solid-client-tests/node/acp-v3-test-dataset-${session.info.sessionId}`;
    options = { fetch: session.fetch };
    await saveSolidDatasetAt(sessionResource, createSolidDataset(), options);
  });

  afterEach(async () => {
    await deleteSolidDataset(sessionResource, options);
    await session.logout();
  });

  async function initialisePolicyResource(
    policyResourceUrl: UrlString,
    session: Session
  ) {
    let publicRule = acp.createRule(policyResourceUrl + "#rule-public");
    publicRule = acp.setPublic(publicRule);

    let publicReadPolicy = acp.createPolicy(
      policyResourceUrl + "#policy-publicRead"
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

    let selfRule = acp.createRule(policyResourceUrl + "#rule-self");
    selfRule = acp.addAgent(selfRule, session.info.webId!);
    // This policy denies write access to the current user,
    // but allows write access so the Resource can still be removed afterwards:
    let selfWriteNoReadPolicy = acp.createPolicy(
      policyResourceUrl + "#policy-selfWriteNoRead"
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

    return saveSolidDatasetAt(policyResourceUrl, policyResource, options);
  }

  async function applyPolicyToPolicyResource(
    resourceUrl: UrlString,
    policyUrl: UrlString
  ) {
    const resourceWithAcr = await acp.getSolidDatasetWithAcr(resourceUrl, options);
    if (!acp.hasAccessibleAcr(resourceWithAcr)) {
      throw new Error(
        `The test Resource at [${getSourceUrl(
          resourceWithAcr
        )}] does not appear to have a readable Access Control Resource. Please check the Pod setup.`
      );
    }
    const changedResourceWithAcr = acp.addPolicyUrl(
      resourceWithAcr,
      policyUrl
    );
    return acp.saveAcrFor(changedResourceWithAcr, options);
  }

  it("can deny Read access", async () => {
    // Create a Resource containing Access Policies and Rules:
    await initialisePolicyResource(sessionResource, session);

    // Verify that we can fetch the Resource before Denying Read access:
    await expect(
      getSolidDataset(sessionResource, options)
    ).resolves.not.toBeNull();

    // In the Resource's Access Control Resource, apply the Policy
    // that just so happens to be defined in the Resource itself,
    // and that denies Read access to the current user:
    await applyPolicyToPolicyResource(
      sessionResource,
      sessionResource + "#policy-selfWriteNoRead"
    );

    // Verify that indeed, the current user can no longer read it:
    await expect(
      getSolidDataset(sessionResource, options)
    ).rejects.toThrow(expect.objectContaining({ statusCode: 403 }));
  });

  it("can allow public Read access", async () => {
    // Create a Resource containing Access Policies and Rules:
    await initialisePolicyResource(sessionResource, session);

    // Verify that we cannot fetch the Resource before adding public Read access
    // when not logged in (i.e. not passing the session's fetch):
    await expect(
      getSolidDataset(sessionResource)
    ).rejects.toThrow(expect.objectContaining({ statusCode: 401 }));

    // In the Resource's Access Control Resource, apply the Policy
    // that just so happens to be defined in the Resource itself,
    // and provides Read access to the public:
    await applyPolicyToPolicyResource(
      sessionResource,
      sessionResource + "#policy-publicRead"
    );

    // Verify that indeed, an unauthenticated user can now read it:
    await expect(
      getSolidDataset(sessionResource)
    ).resolves.not.toBeNull();
  });

  it("can set public Access", async () => {
    await overwriteFile(sessionResource, Buffer.from("To-be-public Resource"), options);

    const resourceInfoWithAcr = await acp.getResourceInfoWithAcr(sessionResource, options);
    if (!acp.hasAccessibleAcr(resourceInfoWithAcr)) {
      throw new Error(
        `The end-to-end tests expect the end-to-end test user to be able to access Access Control Resources, but the ACR of [${sessionResource}] was not accessible.`
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
    await expect(getFile(sessionResource)).rejects.toThrow(
      // Unauthorised:
      // @ts-ignore-next
      expect.objectContaining({ statusCode: 401 }) as FetchError
    );

    await acp.saveAcrFor(updatedResourceInfoWithAcr, options);

    // Verify that indeed, an unauthenticated user can now read it:
    await expect(getFile(sessionResource)).resolves.not.toBeNull();
  });
});
