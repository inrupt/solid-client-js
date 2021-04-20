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

import { jest, describe, it, expect } from "@jest/globals";

import { foaf, schema } from "rdf-namespaces";
import { Session } from "@inrupt/solid-client-authn-node";
import { config } from "dotenv-flow";
import {
  getSolidDataset,
  setThing,
  getThing,
  getStringNoLocale,
  setDatetime,
  setStringNoLocale,
  setTerm,
  saveSolidDatasetAt,
  overwriteFile,
  isRawData,
  getContentType,
  getResourceInfoWithAcl,
  getSolidDatasetWithAcl,
  hasResourceAcl,
  getPublicAccess,
  getAgentAccess,
  getFallbackAcl,
  getResourceAcl,
  getAgentResourceAccess,
  setAgentResourceAccess,
  saveAclFor,
  hasFallbackAcl,
  hasAccessibleAcl,
  createAclFromFallbackAcl,
  getPublicDefaultAccess,
  getPublicResourceAccess,
  getFile,
  getSourceUrl,
  deleteFile,
  createContainerAt,
  createContainerInContainer,
  getBoolean,
  setBoolean,
  createThing,
  createSolidDataset,
  deleteSolidDataset,
  UrlString,
  acp_v3 as acp,
  FetchError,
} from "../index";
// Functions from this module have to be imported from the module directly,
// because their names overlap with access system-specific versions,
// and therefore aren't exported from the package root:
import {
  getAgentAccess as getAgentAccessUniversal,
  getPublicAccess as getPublicAccessUniversal,
  setPublicAccess as setPublicAccessUniversal,
} from "../access/universal";
import openidClient from "openid-client";
import { blankNode } from "@rdfjs/dataset";

// This block of end-to-end tests should be removed once solid-client-authn-node works against NSS,
// and the other `describe` block has credentials for an NSS server:
describe.each([
  ["https://lit-e2e-test.inrupt.net/public/"],
  // Since ESS switched to ACPs we no longer have a convenient way to prepare the tests data
  // with the proper permissions (i.e. public-read-write).
  // Therefore, end-to-end tests against ESS have been disabled for now.
  // We can re-enable them once we have a Node library with which we can authenticate,
  // after which we can set the relevant permissions in the tests themselves:
  // ["https://ldp.demo-ess.inrupt.com/105177326598249077653/test-data/"],
])(
  "End-to-end tests with pre-existing data against resources in [%s]:",
  (rootContainer) => {
    it("should be able to read and update data in a Pod", async () => {
      const randomNick = "Random nick " + Math.random();

      const dataset = await getSolidDataset(`${rootContainer}lit-pod-test.ttl`);
      const existingThing = getThing(
        dataset,
        `${rootContainer}lit-pod-test.ttl#thing1`
      );

      if (existingThing === null) {
        throw new Error(
          `The test data did not look like we expected it to. Check whether [${rootContainer}lit-pod-test.ttl#thing1] exists.`
        );
      }

      expect(getStringNoLocale(existingThing, foaf.name)).toBe(
        "Thing for first end-to-end test"
      );

      let updatedThing = setDatetime(
        existingThing,
        schema.dateModified,
        new Date()
      );
      updatedThing = setStringNoLocale(updatedThing, foaf.nick, randomNick);

      const updatedDataset = setThing(dataset, updatedThing);
      const savedDataset = await saveSolidDatasetAt(
        `${rootContainer}lit-pod-test.ttl`,
        updatedDataset
      );

      const savedThing = getThing(
        savedDataset,
        `${rootContainer}lit-pod-test.ttl#thing1`
      );
      expect(savedThing).not.toBeNull();
      expect(getStringNoLocale(savedThing!, foaf.name)).toBe(
        "Thing for first end-to-end test"
      );
      expect(getStringNoLocale(savedThing!, foaf.nick)).toBe(randomNick);
    });

    it("can read and write booleans", async () => {
      const dataset = await getSolidDataset(`${rootContainer}lit-pod-test.ttl`);
      const existingThing = getThing(
        dataset,
        `${rootContainer}lit-pod-test.ttl#thing2`
      );

      if (existingThing === null) {
        throw new Error(
          `The test data did not look like we expected it to. Check whether [${rootContainer}lit-pod-test.ttl#thing2] exists.`
        );
      }

      const currentValue = getBoolean(
        existingThing,
        "https://example.com/boolean"
      );
      const updatedThing = setBoolean(
        existingThing,
        "https://example.com/boolean",
        !currentValue
      );

      const updatedDataset = setThing(dataset, updatedThing);
      const savedDataset = await saveSolidDatasetAt(
        `${rootContainer}lit-pod-test.ttl`,
        updatedDataset
      );

      const savedThing = getThing(
        savedDataset,
        `${rootContainer}lit-pod-test.ttl#thing2`
      );

      expect(savedThing).not.toBeNull();
      expect(getBoolean(savedThing!, "https://example.com/boolean")).toBe(
        !currentValue
      );
    });

    it("can differentiate between RDF and non-RDF Resources", async () => {
      const rdfResourceInfo = await getResourceInfoWithAcl(
        `${rootContainer}lit-pod-resource-info-test/litdataset.ttl`
      );
      const nonRdfResourceInfo = await getResourceInfoWithAcl(
        `${rootContainer}lit-pod-resource-info-test/not-a-litdataset.png`
      );
      expect(isRawData(rdfResourceInfo)).toBe(false);
      expect(isRawData(nonRdfResourceInfo)).toBe(true);
    });

    it("can create and remove empty Containers", async () => {
      const newContainer1 = await createContainerAt(
        `${rootContainer}container-test/some-container/`
      );
      const newContainer2 = await createContainerInContainer(
        "https://lit-e2e-test.inrupt.net/public/container-test/",
        { slugSuggestion: "some-other-container" }
      );

      expect(getSourceUrl(newContainer1)).toBe(
        `${rootContainer}container-test/some-container/`
      );

      await deleteFile(`${rootContainer}container-test/some-container/`);
      await deleteFile(getSourceUrl(newContainer2));
    });

    it("should be able to read and update ACLs", async () => {
      const fakeWebId =
        "https://example.com/fake-webid#" +
        Date.now().toString() +
        Math.random().toString();

      const datasetWithAcl = await getSolidDatasetWithAcl(
        `${rootContainer}lit-pod-acl-test/passthrough-container/resource-with-acl.ttl`
      );
      const datasetWithoutAcl = await getSolidDatasetWithAcl(
        `${rootContainer}lit-pod-acl-test/passthrough-container/resource-without-acl.ttl`
      );

      expect(hasResourceAcl(datasetWithAcl)).toBe(true);
      expect(hasResourceAcl(datasetWithoutAcl)).toBe(false);
      expect(getPublicAccess(datasetWithAcl)).toEqual({
        read: true,
        append: true,
        write: true,
        control: true,
      });
      expect(
        getAgentAccess(
          datasetWithAcl,
          "https://vincentt.inrupt.net/profile/card#me"
        )
      ).toEqual({
        read: false,
        append: true,
        write: false,
        control: false,
      });
      expect(
        getAgentAccess(
          datasetWithoutAcl,
          "https://vincentt.inrupt.net/profile/card#me"
        )
      ).toEqual({
        read: true,
        append: false,
        write: false,
        control: false,
      });
      const fallbackAclForDatasetWithoutAcl = getFallbackAcl(datasetWithoutAcl);
      expect(fallbackAclForDatasetWithoutAcl?.internal_accessTo).toBe(
        `${rootContainer}lit-pod-acl-test/`
      );

      if (!hasResourceAcl(datasetWithAcl)) {
        throw new Error(
          `The Resource at ${rootContainer}lit-pod-acl-test/passthrough-container/resource-with-acl.ttl does not seem to have an ACL. The end-to-end tests do expect it to have one.`
        );
      }
      const acl = getResourceAcl(datasetWithAcl);
      const updatedAcl = setAgentResourceAccess(acl, fakeWebId, {
        read: true,
        append: false,
        write: false,
        control: false,
      });
      const savedAcl = await saveAclFor(datasetWithAcl, updatedAcl);
      const fakeWebIdAccess = getAgentResourceAccess(savedAcl, fakeWebId);
      expect(fakeWebIdAccess).toEqual({
        read: true,
        append: false,
        write: false,
        control: false,
      });

      // Cleanup
      const cleanedAcl = setAgentResourceAccess(savedAcl, fakeWebId, {
        read: false,
        append: false,
        write: false,
        control: false,
      });
      await saveAclFor(datasetWithAcl, cleanedAcl);
    });

    it("can copy default rules from the fallback ACL as Resource rules to a new ACL", async () => {
      const dataset = await getSolidDatasetWithAcl(
        `${rootContainer}lit-pod-acl-initialisation-test/resource.ttl`
      );
      if (
        !hasFallbackAcl(dataset) ||
        !hasAccessibleAcl(dataset) ||
        hasResourceAcl(dataset)
      ) {
        throw new Error(
          `The Resource at ${rootContainer}lit-pod-acl-initialisation-test/resource.ttl appears to not have an accessible fallback ACL, or it already has an ACL, which the end-to-end tests do not expect.`
        );
      }
      const newResourceAcl = createAclFromFallbackAcl(dataset);
      const existingFallbackAcl = getFallbackAcl(dataset);
      expect(getPublicDefaultAccess(existingFallbackAcl)).toEqual(
        getPublicResourceAccess(newResourceAcl)
      );
    });

    it("can fetch a non-RDF file and its metadata", async () => {
      const jsonFile = await getFile(`${rootContainer}arbitrary.json`);

      expect(getContentType(jsonFile)).toEqual("application/json");

      const data = JSON.parse(await jsonFile.text());
      expect(data).toEqual({ arbitrary: "json data" });
    });
  }
);

// Load environment variables from .env.test.local if available:
config({
  path: __dirname,
  // In CI, actual environment variables will overwrite values from .env files.
  // We don't need warning messages in the logs for that:
  silent: process.env.CI === "true",
});

type OidcIssuer = string;
type ClientId = string;
type ClientSecret = string;
type RefreshToken = string;
type Pod = string;
type AuthDetails = [Pod, OidcIssuer, ClientId, ClientSecret, RefreshToken];
// Instructions for obtaining these credentials can be found here:
// https://github.com/inrupt/solid-client-authn-js/blob/1a97ef79057941d8ac4dc328fff18333eaaeb5d1/packages/node/example/bootstrappedApp/README.md
const serversUnderTest: AuthDetails[] = [
  // pod.inrupt.com:
  [
    // Cumbersome workaround, but:
    // Trim `https://` from the start of these URLs,
    // so that GitHub Actions doesn't replace them with *** in the logs.
    process.env.E2E_TEST_ESS_POD!.replace(/^https:\/\//, ""),
    process.env.E2E_TEST_ESS_IDP_URL!.replace(/^https:\/\//, ""),
    process.env.E2E_TEST_ESS_CLIENT_ID!,
    process.env.E2E_TEST_ESS_CLIENT_SECRET!,
    process.env.E2E_TEST_ESS_REFRESH_TOKEN!,
  ],
  // pod-compat.inrupt.com:
  [
    // Cumbersome workaround, but:
    // Trim `https://` from the start of these URLs,
    // so that GitHub Actions doesn't replace them with *** in the logs.
    process.env.E2E_TEST_ESS_COMPAT_POD!.replace(/^https:\/\//, ""),
    process.env.E2E_TEST_ESS_COMPAT_IDP_URL!.replace(/^https:\/\//, ""),
    process.env.E2E_TEST_ESS_COMPAT_CLIENT_ID!,
    process.env.E2E_TEST_ESS_COMPAT_CLIENT_SECRET!,
    process.env.E2E_TEST_ESS_COMPAT_REFRESH_TOKEN!,
  ],
  // inrupt.net
  // Unfortunately we cannot authenticate against Node Solid Server yet, due to this issue:
  // https://github.com/solid/node-solid-server/issues/1533
  // Once that is fixed, credentials can be added here, and the other `describe()` can be removed.
];

// End-to-end tests against ESS are temporarily disabled while we work out
// how to authenticate against it now that refresh tokens are rotated after
// every request:
// eslint-disable-next-line jest/no-disabled-tests
describe.skip.each(serversUnderTest)(
  "Authenticated end-to-end tests against Pod [%s] and OIDC Issuer [%s]:",
  (rootContainer, oidcIssuer, clientId, clientSecret, refreshToken) => {
    // Re-add `https://` at the start of these URLs, which we trimmed above
    // so that GitHub Actions doesn't replace them with *** in the logs.
    rootContainer = "https://" + rootContainer;
    oidcIssuer = "https://" + oidcIssuer;
    function supportsWac() {
      return (
        rootContainer.includes("pod-compat.inrupt.com") ||
        rootContainer.includes("inrupt.net") ||
        rootContainer.includes("solidcommunity.net")
      );
    }
    function supportsAcps() {
      return rootContainer.includes("pod.inrupt.com");
    }

    async function getSession() {
      const session = new Session();
      await session.login({
        oidcIssuer: oidcIssuer,
        clientId: clientId,
        clientName: "Solid Client End-2-End Test Client App - Node.js",
        clientSecret: clientSecret,
        refreshToken: refreshToken,
      });
      return session;
    }

    if (rootContainer.includes("pod-compat.inrupt.com")) {
      // pod-compat.inrupt.com seems to be experiencing some slowdowns processing POST requests,
      // so temporarily increase the timeouts for it:
      jest.setTimeout(30000);
      openidClient.custom.setHttpOptionsDefaults({ timeout: 5000 });
    }

    it("can create, read, update and delete data", async () => {
      const session = await getSession();
      const arbitraryPredicate = "https://arbitrary.vocab/predicate";

      let newThing = createThing({ name: "e2e-test-thing" });
      newThing = setBoolean(newThing, arbitraryPredicate, true);
      let newDataset = createSolidDataset();
      newDataset = setThing(newDataset, newThing);

      const datasetUrl = `${rootContainer}solid-client-tests/node/crud-dataset-${session.info.sessionId}.ttl`;
      await saveSolidDatasetAt(datasetUrl, newDataset, {
        fetch: session.fetch,
      });

      const firstSavedDataset = await getSolidDataset(datasetUrl, {
        fetch: session.fetch,
      });
      const firstSavedThing = getThing(
        firstSavedDataset,
        datasetUrl + "#e2e-test-thing"
      )!;
      expect(firstSavedThing).not.toBeNull();
      expect(getBoolean(firstSavedThing, arbitraryPredicate)).toBe(true);

      const updatedThing = setBoolean(
        firstSavedThing,
        arbitraryPredicate,
        false
      );
      const updatedDataset = setThing(firstSavedDataset, updatedThing);
      await saveSolidDatasetAt(datasetUrl, updatedDataset, {
        fetch: session.fetch,
      });

      const secondSavedDataset = await getSolidDataset(datasetUrl, {
        fetch: session.fetch,
      });
      const secondSavedThing = getThing(
        secondSavedDataset,
        datasetUrl + "#e2e-test-thing"
      )!;
      expect(secondSavedThing).not.toBeNull();
      expect(getBoolean(secondSavedThing, arbitraryPredicate)).toBe(false);

      await deleteSolidDataset(datasetUrl, { fetch: session.fetch });
      await expect(() =>
        getSolidDataset(datasetUrl, { fetch: session.fetch })
      ).rejects.toEqual(
        expect.objectContaining({
          statusCode: 404,
        })
      );
    });

    it("can create, delete, and differentiate between RDF and non-RDF Resources", async () => {
      const session = await getSession();
      const datasetUrl = `${rootContainer}solid-client-tests/node/dataset-${session.info.sessionId}.ttl`;
      const fileUrl = `${rootContainer}solid-client-tests/node/file-${session.info.sessionId}.txt`;

      const sentFile = await overwriteFile(fileUrl, Buffer.from("test"), {
        fetch: session.fetch,
      });
      const sentDataset = await saveSolidDatasetAt(
        datasetUrl,
        createSolidDataset(),
        { fetch: session.fetch }
      );

      expect(isRawData(sentDataset)).toBe(false);
      expect(isRawData(sentFile)).toBe(true);

      await deleteSolidDataset(datasetUrl, { fetch: session.fetch });
      await deleteFile(fileUrl, { fetch: session.fetch });
    });

    it("can create and remove Containers", async () => {
      const session = await getSession();
      const containerUrl = `${rootContainer}solid-client-tests/node/container-test/container1-${session.info.sessionId}/`;
      const containerContainerUrl = `${rootContainer}solid-client-tests/node/container-test/`;
      const containerName = `container2-${session.info.sessionId}`;
      const newContainer1 = await createContainerAt(containerUrl, {
        fetch: session.fetch,
      });
      const newContainer2 = await createContainerInContainer(
        containerContainerUrl,
        { slugSuggestion: containerName, fetch: session.fetch }
      );

      expect(getSourceUrl(newContainer1)).toBe(containerUrl);
      expect(getSourceUrl(newContainer2)).toBe(
        `${containerContainerUrl}${containerName}/`
      );

      await deleteFile(containerUrl, { fetch: session.fetch });
      await deleteFile(getSourceUrl(newContainer2), { fetch: session.fetch });
    });

    it("can read and update ACLs", async () => {
      if (!supportsWac()) {
        // pod.inrupt.com does not support WAC, so skip this test there.
        return;
      }
      const session = await getSession();
      const fakeWebId =
        "https://example.com/fake-webid#" + session.info.sessionId;
      const datasetWithoutAclUrl = `${rootContainer}solid-client-tests/node/acl-test-${session.info.sessionId}.ttl`;
      await saveSolidDatasetAt(datasetWithoutAclUrl, createSolidDataset(), {
        fetch: session.fetch,
      });

      const datasetWithAcl = await getSolidDatasetWithAcl(rootContainer, {
        fetch: session.fetch,
      });
      const datasetWithoutAcl = await getSolidDatasetWithAcl(
        datasetWithoutAclUrl,
        { fetch: session.fetch }
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
      expect(fallbackAclForDatasetWithoutAcl?.internal_accessTo).toBe(
        rootContainer
      );

      if (!hasResourceAcl(datasetWithAcl)) {
        throw new Error(
          `The Resource at [${rootContainer}] does not seem to have an ACL. The end-to-end tests do expect it to have one.`
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
      await saveAclFor(datasetWithAcl, cleanedAcl, { fetch: session.fetch });
      await deleteSolidDataset(datasetWithoutAclUrl, { fetch: session.fetch });
    });

    it("can update Things containing Blank Nodes in different instances of the same SolidDataset", async () => {
      const session = await getSession();
      const regularPredicate = "https://arbitrary.vocab/regular-predicate";
      const blankNodePredicate = "https://arbitrary.vocab/blank-node-predicate";

      // Prepare the Resource on the Pod
      let newThing = createThing({ name: "e2e-test-thing-with-blank-node" });
      newThing = setBoolean(newThing, regularPredicate, true);
      newThing = setTerm(newThing, blankNodePredicate, blankNode());
      let newDataset = createSolidDataset();
      newDataset = setThing(newDataset, newThing);

      const datasetUrl = `${rootContainer}solid-client-tests/node/blank-node-updates-${session.info.sessionId}`;
      try {
        await saveSolidDatasetAt(datasetUrl, newDataset, {
          fetch: session.fetch,
        });

        // Fetch the initialised SolidDataset for the first time,
        // and change the non-blank node value:
        const initialisedDataset = await getSolidDataset(datasetUrl, {
          fetch: session.fetch,
        });
        const initialisedThing = getThing(
          initialisedDataset,
          datasetUrl + "#e2e-test-thing-with-blank-node"
        )!;

        const updatedThing = setBoolean(
          initialisedThing,
          regularPredicate,
          false
        );

        // Now fetch the Resource again, and try to insert the updated Thing into it:
        const refetchedDataset = await getSolidDataset(datasetUrl, {
          fetch: session.fetch,
        });
        const updatedDataset = setThing(refetchedDataset, updatedThing);
        await expect(
          saveSolidDatasetAt(datasetUrl, updatedDataset, {
            fetch: session.fetch,
          })
        ).resolves.not.toThrow();
      } finally {
        // Clean up after ourselves
        await deleteSolidDataset(datasetUrl, { fetch: session.fetch });
      }
    });

    describe("Access Control Policies", () => {
      if (
        rootContainer.includes("inrupt.net") ||
        rootContainer.includes("pod-compat.inrupt.com")
      ) {
        // These servers do not support Access Control Policies,
        // so ACP tests can be skipped for them:
        return;
      }

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

        return saveSolidDatasetAt(policyResourceUrl, policyResource, {
          fetch: session.fetch,
        });
      }

      async function applyPolicyToPolicyResource(
        resourceUrl: UrlString,
        policyUrl: UrlString,
        session: Session
      ) {
        const resourceWithAcr = await acp.getSolidDatasetWithAcr(resourceUrl, {
          fetch: session.fetch,
        });
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
        return acp.saveAcrFor(changedResourceWithAcr, {
          fetch: session.fetch,
        });
      }

      it("can deny Read access", async () => {
        const session = await getSession();
        const policyResourceUrl =
          rootContainer +
          `solid-client-tests/node/acp/policy-deny-agent-read-${session.info.sessionId}.ttl`;

        // Create a Resource containing Access Policies and Rules:
        await initialisePolicyResource(policyResourceUrl, session);

        // Verify that we can fetch the Resource before Denying Read access:
        await expect(
          getSolidDataset(policyResourceUrl, { fetch: session.fetch })
        ).resolves.not.toBeNull();

        // In the Resource's Access Control Resource, apply the Policy
        // that just so happens to be defined in the Resource itself,
        // and that denies Read access to the current user:
        await applyPolicyToPolicyResource(
          policyResourceUrl,
          policyResourceUrl + "#policy-selfWriteNoRead",
          session
        );

        // Verify that indeed, the current user can no longer read it:
        await expect(
          getSolidDataset(policyResourceUrl, { fetch: session.fetch })
        ).rejects.toThrow(
          // Forbidden:
          expect.objectContaining({ statusCode: 403 }) as FetchError
        );

        // Clean up:
        await deleteSolidDataset(policyResourceUrl, { fetch: session.fetch });
      });

      it("can allow public Read access", async () => {
        const session = await getSession();
        const policyResourceUrl =
          rootContainer +
          `solid-client-tests/node/acp/policy-allow-public-read-${session.info.sessionId}.ttl`;

        // Create a Resource containing Access Policies and Rules:
        await initialisePolicyResource(policyResourceUrl, session);

        // Verify that we cannot fetch the Resource before adding public Read access
        // when not logged in (i.e. not passing the session's fetch):
        await expect(getSolidDataset(policyResourceUrl)).rejects.toThrow(
          // Unauthorised:
          expect.objectContaining({ statusCode: 401 }) as FetchError
        );

        // In the Resource's Access Control Resource, apply the Policy
        // that just so happens to be defined in the Resource itself,
        // and provides Read access to the public:
        await applyPolicyToPolicyResource(
          policyResourceUrl,
          policyResourceUrl + "#policy-publicRead",
          session
        );

        // Verify that indeed, an unauthenticated user can now read it:
        await expect(
          getSolidDataset(policyResourceUrl)
        ).resolves.not.toBeNull();

        // Clean up:
        await deleteSolidDataset(policyResourceUrl, { fetch: session.fetch });
      });

      it("can set Access from a Resource's ACR", async () => {
        const session = await getSession();
        const resourceUrl =
          rootContainer +
          `solid-client-tests/node/acp/resource-policies-and-rules-${session.info.sessionId}.ttl`;

        await overwriteFile(resourceUrl, Buffer.from("To-be-public Resource"), {
          fetch: session.fetch,
        });

        const resourceInfoWithAcr = await acp.getResourceInfoWithAcr(
          resourceUrl,
          { fetch: session.fetch }
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
          expect.objectContaining({ statusCode: 401 }) as FetchError
        );

        await acp.saveAcrFor(updatedResourceInfoWithAcr, {
          fetch: session.fetch,
        });

        // Verify that indeed, an unauthenticated user can now read it:
        await expect(getFile(resourceUrl)).resolves.not.toBeNull();

        // Clean up:
        await deleteFile(resourceUrl, { fetch: session.fetch });
      });
    });

    describe("Wrapper Access API's", () => {
      it("can read the user's access to their profile with WAC", async () => {
        if (!supportsWac()) {
          return;
        }
        const session = await getSession();
        const webId = session.info.webId!;
        const agentAccess = await getAgentAccessUniversal(webId, webId, {
          fetch: session.fetch,
        });
        expect(agentAccess).toStrictEqual({
          read: true,
          append: true,
          write: true,
          controlRead: true,
          controlWrite: true,
        });
      });

      it("can read and change access", async () => {
        const session = await getSession();
        const datasetUrl = `${rootContainer}solid-client-tests/node/access-wrapper/access-test-${session.info.sessionId}.ttl`;
        await saveSolidDatasetAt(datasetUrl, createSolidDataset(), {
          fetch: session.fetch,
        });

        // Fetching it unauthenticated (i.e. without passing session.fetch):
        await expect(getSolidDataset(datasetUrl)).rejects.toThrow();

        await expect(
          getPublicAccessUniversal(datasetUrl, { fetch: session.fetch })
        ).resolves.toStrictEqual({
          read: false,
          append: false,
          write: false,
          controlRead: false,
          controlWrite: false,
        });

        const publicAccess = await setPublicAccessUniversal(
          datasetUrl,
          { read: true },
          { fetch: session.fetch }
        );
        expect(publicAccess).toStrictEqual({
          read: true,
          append: false,
          write: false,
          controlRead: false,
          controlWrite: false,
        });

        // Fetching it unauthenticated again (i.e. without passing session.fetch):
        const publicDataset = await getSolidDataset(datasetUrl);
        expect(publicDataset).not.toBeNull();

        await expect(
          getPublicAccessUniversal(datasetUrl, { fetch: session.fetch })
        ).resolves.toStrictEqual({
          read: true,
          append: false,
          write: false,
          controlRead: false,
          controlWrite: false,
        });

        await deleteSolidDataset(datasetUrl, {
          fetch: session.fetch,
        });
      });

      it("throws an error when trying to set different values for controlRead and controlWrite on a WAC-powered Pod", async () => {
        if (!supportsWac()) {
          return false;
        }

        const session = await getSession();
        const datasetUrl = `${rootContainer}solid-client-tests/node/access-wrapper/different-control-values-${session.info.sessionId}.ttl`;
        await saveSolidDatasetAt(datasetUrl, createSolidDataset(), {
          fetch: session.fetch,
        });

        await expect(
          setPublicAccessUniversal(
            datasetUrl,
            { controlRead: true, controlWrite: false },
            { fetch: session.fetch }
          )
        ).rejects.toThrow(
          `When setting access for a Resource in a Pod implementing Web Access Control (i.e. [${datasetUrl}]), ` +
            "`controlRead` and `controlWrite` should have the same value."
        );

        await deleteSolidDataset(datasetUrl, {
          fetch: session.fetch,
        });
      });
    });
  }
);
