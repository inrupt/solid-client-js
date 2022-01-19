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
} from "../../src/index";
// Functions from this module have to be imported from the module directly,
// because their names overlap with access system-specific versions,
// and therefore aren't exported from the package root:
import {
  getPublicAccess as getPublicAccessUniversal,
  setPublicAccess as setPublicAccessUniversal,
} from "../../src/access/universal";

import { blankNode } from "@rdfjs/dataset";
import { getTestingEnvironment, TestingEnvironment } from "./util/getTestingEnvironment";
import { getAuthenticatedSession } from "./util/getAuthenticatedSession";

let env: TestingEnvironment;
let options: { fetch: typeof global.fetch };
let session: Session;
let sessionResource: string;
const sessionResourcePrefix: string = "solid-client-tests/node/e2e-";

beforeAll(() => {
  config({
    path: __dirname,
    // Disable warning messages in CI
    silent: process.env.CI === "true",
  });
  env = getTestingEnvironment();
});

beforeEach(async () => {
  session = await getAuthenticatedSession(env);
  sessionResource = `${env.pod}${sessionResourcePrefix}${session.info.sessionId}`;
  options = { fetch: session.fetch };
  await saveSolidDatasetAt(sessionResource, createSolidDataset(), options);
});

afterEach(async () => {
  await deleteSolidDataset(sessionResource, options);
  await session.logout();
});

describe(`Authenticated end-to-end`, () => {
  it("can create, read, update, delete and re-create a resource", async () => {
    const arbitraryPredicate = "https://arbitrary.vocab/predicate";

    let newThing = createThing({ name: "e2e-test-thing" });
    newThing = setBoolean(newThing, arbitraryPredicate, true);
    let newDataset = createSolidDataset();
    newDataset = setThing(newDataset, newThing);

    await saveSolidDatasetAt(sessionResource, newDataset, options);

    const firstSavedDataset = await getSolidDataset(sessionResource, options);
    const firstSavedThing = getThing(
      firstSavedDataset,
      sessionResource + "#e2e-test-thing"
    )!;
    expect(firstSavedThing).not.toBeNull();
    expect(getBoolean(firstSavedThing, arbitraryPredicate)).toBe(true);

    const updatedThing = setBoolean(
      firstSavedThing,
      arbitraryPredicate,
      false
    );
    const updatedDataset = setThing(firstSavedDataset, updatedThing);
    await saveSolidDatasetAt(sessionResource, updatedDataset, options);

    const secondSavedDataset = await getSolidDataset(sessionResource, {
      fetch: session.fetch,
    });
    const secondSavedThing = getThing(
      secondSavedDataset,
      sessionResource + "#e2e-test-thing"
    )!;
    expect(secondSavedThing).not.toBeNull();
    expect(getBoolean(secondSavedThing, arbitraryPredicate)).toBe(false);

    await deleteSolidDataset(sessionResource, options);
    await expect(() =>
      getSolidDataset(sessionResource, options)
    ).rejects.toEqual(
      expect.objectContaining({
        statusCode: 404,
      })
    );

    await saveSolidDatasetAt(sessionResource, createSolidDataset(), options);
  });

  it("can create, delete, and differentiate between RDF and non-RDF Resources", async () => {
    const fileUrl = `${sessionResource}.txt`;

    const sessionFile = await overwriteFile(fileUrl, Buffer.from("test"), {
      fetch: session.fetch,
    });
    const sessionDataset = await getSolidDataset(sessionResource, {
      fetch: session.fetch,
    });

    expect(isRawData(sessionDataset)).toBe(false);
    expect(isRawData(sessionFile)).toBe(true);

    await deleteFile(fileUrl, options);
  });

  it("can create and remove Containers", async () => {
    const containerUrl = `${env.pod}solid-client-tests/node/container-test/container1-${session.info.sessionId}/`;
    const containerContainerUrl = `${env.pod}solid-client-tests/node/container-test/`;
    const containerName = `container2-${session.info.sessionId}`;
    const newContainer1 = await createContainerAt(containerUrl, options);
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

  it("can update Things containing Blank Nodes in different instances of the same SolidDataset", async () => {
    const regularPredicate = "https://arbitrary.vocab/regular-predicate";
    const blankNodePredicate = "https://arbitrary.vocab/blank-node-predicate";

    let newThing = createThing({ name: "e2e-test-thing-with-blank-node" });
    newThing = setBoolean(newThing, regularPredicate, true);
    newThing = setTerm(newThing, blankNodePredicate, blankNode());
    let newDataset = createSolidDataset();
    newDataset = setThing(newDataset, newThing);

    await saveSolidDatasetAt(sessionResource, newDataset, options);

    // Fetch the initialised SolidDataset for the first time,
    // and change the non-blank node value:
    const initialisedDataset = await getSolidDataset(sessionResource, options);
    const initialisedThing = getThing(
      initialisedDataset,
      sessionResource + "#e2e-test-thing-with-blank-node"
    )!;

    const updatedThing = setBoolean(
      initialisedThing,
      regularPredicate,
      false
    );

    // Now fetch the Resource again, and try to insert the updated Thing into it:
    const refetchedDataset = await getSolidDataset(sessionResource, options);
    const updatedDataset = setThing(refetchedDataset, updatedThing);
    await expect(
      saveSolidDatasetAt(sessionResource, updatedDataset, {
        fetch: session.fetch,
      })
    ).resolves.not.toThrow();
  });

  it("cannot fetch non public resources unauthenticated", async () => {
    await expect(getSolidDataset(sessionResource)).rejects.toThrow();
  });

  it("can read and change access to a resource", async () => {
    await expect(
      getPublicAccessUniversal(sessionResource, options)
    ).resolves.toStrictEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });

    const publicAccess = await setPublicAccessUniversal(
      sessionResource,
      { read: true },
      options
    );
    expect(publicAccess).toStrictEqual({
      read: true,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });

    // Fetching the public resource unauthenticated:
    try {
      const publicDataset = await getSolidDataset(sessionResource);
      expect(publicDataset).not.toBeNull();
    } catch (e) {
      console.error(
        "Unauthenticated fetch is not supported even for public resources"
      );

      // FIXME: The following should work.
      // const publicDataset = await getSolidDataset(datasetUrl, {
      //   fetch: session.fetch
      // });

      // // eslint-disable-next-line jest/no-conditional-expect, jest/no-try-expect
      // expect(getEffectiveAccess(publicDataset).public).toStrictEqual({
      //   read: true,
      //   append: false,
      //   write: false
      // });
    }

    await expect(
      getPublicAccessUniversal(sessionResource, options)
    ).resolves.toStrictEqual({
      read: true,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });
});
