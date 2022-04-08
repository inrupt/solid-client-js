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
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  test,
} from "@jest/globals";
import {
  getSolidDataset,
  setThing,
  getThing,
  setTerm,
  saveSolidDatasetAt,
  overwriteFile,
  isRawData,
  getSourceUrl,
  deleteFile,
  createContainerAt,
  createContainerInContainer,
  getBoolean,
  setBoolean,
  createThing,
  createSolidDataset,
  deleteSolidDataset,
  getSourceIri,
  saveSolidDatasetInContainer,
} from "../../src/index";
import { blankNode } from "@rdfjs/dataset";
import { getNodeTestingEnvironment } from "../util/getTestingEnvironment";
import { getAuthenticatedSession } from "../util/getAuthenticatedSession";
import type { Session } from "@inrupt/solid-client-authn-node";
import { setupTestResources, teardownTestResources } from "./test-helpers";

const env = getNodeTestingEnvironment();
const sessionResourcePrefix: string = "solid-client-tests/node/e2e-";
if (env.environment === "NSS") {
  // eslint-disable-next-line jest/no-focused-tests
  test.only(`Skipping Unauth NSS tests in ${env.environment}`, () => {});
}

const TEST_SLUG = "solid-client-test-e2e-resource";

describe("Authenticated end-to-end", () => {
  let fetchOptions: { fetch: typeof global.fetch };
  let session: Session;
  let sessionContainer: string;
  let sessionResource: string;

  beforeEach(async () => {
    session = await getAuthenticatedSession(env);
    const testsetup = await setupTestResources(session, TEST_SLUG, env.pod);
    sessionResource = testsetup.resourceUrl;
    sessionContainer = testsetup.containerUrl;
    fetchOptions = { fetch: testsetup.fetchWithAgent };
  });

  afterEach(async () => {
    await teardownTestResources(
      session,
      sessionContainer,
      sessionResource,
      fetchOptions.fetch
    );
  });

  it("can create, read, update and delete data", async () => {
    const arbitraryPredicate = "https://arbitrary.vocab/predicate";

    let newThing = createThing({ name: "e2e-test-thing" });
    newThing = setBoolean(newThing, arbitraryPredicate, true);
    let newDataset = createSolidDataset();
    newDataset = setThing(newDataset, newThing);

    const datasetUrl = sessionResource.concat("-crud");
    await saveSolidDatasetAt(datasetUrl, newDataset, fetchOptions);

    const firstSavedDataset = await getSolidDataset(datasetUrl, fetchOptions);
    const firstSavedThing = getThing(
      firstSavedDataset,
      datasetUrl + "#e2e-test-thing"
    )!;
    expect(firstSavedThing).not.toBeNull();
    expect(getBoolean(firstSavedThing, arbitraryPredicate)).toBe(true);

    const updatedThing = setBoolean(firstSavedThing, arbitraryPredicate, false);
    const updatedDataset = setThing(firstSavedDataset, updatedThing);
    await saveSolidDatasetAt(datasetUrl, updatedDataset, fetchOptions);

    const secondSavedDataset = await getSolidDataset(datasetUrl, fetchOptions);
    const secondSavedThing = getThing(
      secondSavedDataset,
      datasetUrl + "#e2e-test-thing"
    )!;
    expect(secondSavedThing).not.toBeNull();
    expect(getBoolean(secondSavedThing, arbitraryPredicate)).toBe(false);

    await deleteSolidDataset(datasetUrl, fetchOptions);
    await expect(() =>
      getSolidDataset(datasetUrl, fetchOptions)
    ).rejects.toEqual(
      expect.objectContaining({
        statusCode: 404,
      })
    );
  });

  it("can create, delete, and differentiate between RDF and non-RDF Resources", async () => {
    const fileUrl = `${sessionResource}.txt`;

    const sessionFile = await overwriteFile(
      fileUrl,
      Buffer.from("test"),
      fetchOptions
    );
    const sessionDataset = await getSolidDataset(sessionResource, fetchOptions);

    expect(isRawData(sessionDataset)).toBe(false);
    expect(isRawData(sessionFile)).toBe(true);

    await deleteFile(fileUrl, fetchOptions);
  });

  it("can create and remove Containers", async () => {
    const containerUrl = `${env.pod}solid-client-tests/node/container-test/container1-${session.info.sessionId}/`;
    const containerContainerUrl = `${env.pod}solid-client-tests/node/container-test/`;
    const containerName = `container2-${session.info.sessionId}`;
    const newContainer1 = await createContainerAt(containerUrl, fetchOptions);
    const newContainer2 = await createContainerInContainer(
      containerContainerUrl,
      { ...fetchOptions, slugSuggestion: containerName }
    );

    expect(getSourceUrl(newContainer1)).toBe(containerUrl);
    expect(getSourceUrl(newContainer2)).toBe(
      `${containerContainerUrl}${containerName}/`
    );

    await deleteFile(containerUrl, fetchOptions);
    await deleteFile(getSourceUrl(newContainer2), fetchOptions);
  });

  it("can update Things containing Blank Nodes in different instances of the same SolidDataset", async () => {
    const regularPredicate = "https://arbitrary.vocab/regular-predicate";
    const blankNodePredicate = "https://arbitrary.vocab/blank-node-predicate";

    // Prepare the Resource on the Pod
    let newThing = createThing({ name: "e2e-test-thing-with-blank-node" });
    newThing = setBoolean(newThing, regularPredicate, true);
    newThing = setTerm(newThing, blankNodePredicate, blankNode());
    let newDataset = createSolidDataset();
    newDataset = setThing(newDataset, newThing);

    const datasetUrl = sessionResource.concat("-blank");
    try {
      await saveSolidDatasetAt(datasetUrl, newDataset, fetchOptions);

      // Fetch the initialised SolidDataset for the first time,
      // and change the non-blank node value:
      const initialisedDataset = await getSolidDataset(
        datasetUrl,
        fetchOptions
      );
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
      const refetchedDataset = await getSolidDataset(datasetUrl, fetchOptions);
      const updatedDataset = setThing(refetchedDataset, updatedThing);
      await expect(
        saveSolidDatasetAt(datasetUrl, updatedDataset, fetchOptions)
      ).resolves.not.toThrow();
    } finally {
      // Clean up after ourselves
      await deleteSolidDataset(datasetUrl, fetchOptions);
    }
  });

  it("cannot fetch non public resources unauthenticated", async () => {
    await expect(getSolidDataset(sessionResource)).rejects.toThrow();
  });
});
