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

/**
 * @jest-environment node
 */

import { foaf, schema } from "rdf-namespaces";
import {
  getSolidDataset,
  setThing,
  getThing,
  getStringNoLocale,
  setDatetime,
  setStringNoLocale,
  saveSolidDatasetAt,
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
} from "../index";

describe.each([
  ["https://lit-e2e-test.inrupt.net/public/"],
  ["https://ldp.demo-ess.inrupt.com/105177326598249077653/test-data/"],
])("End-to-end tests against %s", (rootContainer) => {
  // Tests that should only run against either NSS or ESS,
  // e.g. because something is not (properly) implemented on the other.
  const on_ess_it = rootContainer.includes("demo-ess") ? it : it.skip;
  const on_nss_it = rootContainer.includes("demo-ess") ? it.skip : it;

  // FIXME: ESS currently has enabled Access Control Policies,
  // resulting in this Pod no longer being publicly writeable.
  // We can re-enable it once we can write to ESS Pods again in Node.js.
  // (Either via a working solid-client-authn-node,
  // or because the Pod has been made publicly-writable using ACPs.)
  on_nss_it("should be able to read and update data in a Pod", async () => {
    const randomNick = "Random nick " + Math.random();

    const dataset = await getSolidDataset(`${rootContainer}lit-pod-test.ttl`);
    const existingThing = getThing(
      dataset,
      `${rootContainer}lit-pod-test.ttl#thing1`
    );

    if (existingThing === null) {
      throw new Error(
        `The test data did not look like we expected it to. Check whether \`${rootContainer}lit-pod-test.ttl#thing1\` exists.`
      );
    }

    // See FIXME above to explain specific setup.
    // eslint-disable-next-line jest/no-standalone-expect
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
    // See FIXME above to explain specific setup.
    // eslint-disable-next-line jest/no-standalone-expect
    expect(savedThing).not.toBeNull();
    // See FIXME above to explain specific setup.
    // eslint-disable-next-line jest/no-standalone-expect
    expect(getStringNoLocale(savedThing!, foaf.name)).toBe(
      "Thing for first end-to-end test"
    );
    // See FIXME above to explain specific setup.
    // eslint-disable-next-line jest/no-standalone-expect
    expect(getStringNoLocale(savedThing!, foaf.nick)).toBe(randomNick);
  });

  // FIXME: An NSS bug prevents it from understand our changing of booleans,
  // and thus causes this test to fail.
  // Once the bug is fixed, it can be enabled for NSS again.
  // See https://github.com/solid/node-solid-server/issues/1468.
  // FIXME: Additionally, ESS currently has enabled Access Control Policies,
  // resulting in this Pod no longer being publicly writeable.
  // We can re-enable it once we can write to ESS Pods again in Node.js.
  // (Either via a working solid-client-authn-node,
  // or because the Pod has been made publicly-writable using ACPs.)
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip("can read and write booleans", async () => {
    const dataset = await getSolidDataset(`${rootContainer}lit-pod-test.ttl`);
    const existingThing = getThing(
      dataset,
      `${rootContainer}lit-pod-test.ttl#thing2`
    );

    if (existingThing === null) {
      throw new Error(
        `The test data did not look like we expected it to. Check whether \`${rootContainer}lit-pod-test.ttl#thing2\` exists.`
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

  // FIXME: An ESS bug regading PUTting containes prevents this test from passing.
  // Once the bug is fixed, `on_nss_it` should be replaced by a regular `it` again.
  on_nss_it("can create and remove empty Containers", async () => {
    const newContainer1 = await createContainerAt(
      `${rootContainer}container-test/some-container/`
    );
    const newContainer2 = await createContainerInContainer(
      "https://lit-e2e-test.inrupt.net/public/container-test/",
      { slugSuggestion: "some-other-container" }
    );

    // See FIXME above to explain specific setup
    // eslint-disable-next-line jest/no-standalone-expect
    expect(getSourceUrl(newContainer1)).toBe(
      `${rootContainer}container-test/some-container/`
    );

    await deleteFile(`${rootContainer}container-test/some-container/`);
    await deleteFile(getSourceUrl(newContainer2));
  });

  // ESS currently has enabled Access Control Policies,
  // and Web Access Control has been turned off.
  // Thus, only run this against Node Solid Server
  // until a WAC-enabled ESS instance is set up again.
  on_nss_it("should be able to read and update ACLs", async () => {
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

  // ESS currently has enabled Access Control Policies,
  // and Web Access Control has been turned off.
  // Thus, only run this against Node Solid Server
  // until a WAC-enabled ESS instance is set up again.
  on_nss_it(
    "can copy default rules from the fallback ACL as Resource rules to a new ACL",
    async () => {
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
    }
  );

  it("can fetch a non-RDF file and its metadata", async () => {
    const jsonFile = await getFile(`${rootContainer}arbitrary.json`);

    expect(getContentType(jsonFile)).toEqual("application/json");

    const data = JSON.parse(await jsonFile.text());
    expect(data).toEqual({ arbitrary: "json data" });
  });
});
