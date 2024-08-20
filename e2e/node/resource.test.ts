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

import { File as NodeFile, Blob as NodeBlob } from "buffer";
import {
  jest,
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
import { DataFactory } from "n3";
import { DEFAULT_TYPE, type ProblemDetails } from "@inrupt/solid-client-errors";
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
  getWellKnownSolid,
} from "../../src/index";

const { blankNode } = DataFactory;

const env = getNodeTestingEnvironment();

if (env.environment === "NSS") {
  // eslint-disable-next-line jest/no-focused-tests
  test.only(`Skipping Unauth NSS tests in ${env.environment}`, () => {});
}

const TEST_SLUG = "solid-client-test-e2e-resource";

const nodeVersion = process.versions.node.split(".");
const nodeMajor = Number(nodeVersion[0]);

describe("Authenticated end-to-end", () => {
  let fetchOptions: { fetch: typeof fetch };
  let session: Session;
  let sessionContainer: string;
  let sessionResource: string;
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
      fetchOptions,
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
      `${datasetUrl}#e2e-test-thing`,
    )!;
    expect(firstSavedThing).not.toBeNull();
    expect(getBoolean(firstSavedThing, arbitraryPredicate)).toBe(true);

    const updatedThing = setBoolean(firstSavedThing, arbitraryPredicate, false);
    const updatedDataset = setThing(firstSavedDataset, updatedThing);
    await saveSolidDatasetAt(datasetUrl, updatedDataset, fetchOptions);

    const secondSavedDataset = await getSolidDataset(datasetUrl, fetchOptions);
    const secondSavedThing = getThing(
      secondSavedDataset,
      `${datasetUrl}#e2e-test-thing`,
    )!;
    expect(secondSavedThing).not.toBeNull();
    expect(getBoolean(secondSavedThing, arbitraryPredicate)).toBe(false);

    await deleteSolidDataset(datasetUrl, fetchOptions);

    // As the dataset was deleted retrieving it should produce an error.
    const error = await getSolidDataset(datasetUrl, fetchOptions).catch(
      (err) => err,
    );

    expect(error.statusCode).toBe(404);
    expect(error.message).toContain(
      `Fetching the Resource at [${datasetUrl}] failed:`,
    );
    expect(error.statusText).toContain("Not Found");

    expect(error.problemDetails.type).toBe(DEFAULT_TYPE);
    expect(error.problemDetails.title).toBe("Not Found");
    expect(error.problemDetails.status).toBe(404);
    expect(error.problemDetails.detail).toBe("Resource not found");
    expect(error.problemDetails.instance).toBeDefined();
  });

  it("can create, delete, and differentiate between RDF and non-RDF Resources using a Blob from the node Buffer package", async () => {
    const fileUrl = `${sessionResource}.txt`;

    const sessionFile = await overwriteFile(
      fileUrl,
      // We need to type cast because the buffer definition
      // of Blob does not have the prototype property expected
      // by the lib.dom.ts
      // See https://github.com/microsoft/TypeScript/issues/53668
      // and https://github.com/microsoft/TypeScript/issues/52166
      new NodeBlob(["test"], {
        type: "text/plain",
      }) as unknown as globalThis.Blob,
      fetchOptions,
    );
    const sessionDataset = await getSolidDataset(sessionResource, fetchOptions);

    expect(isRawData(sessionDataset)).toBe(false);
    expect(isRawData(sessionFile)).toBe(true);

    await deleteFile(fileUrl, fetchOptions);
  });

  it("can create, delete, and differentiate between RDF and non-RDF Resources using a Blob", async () => {
    const fileUrl = `${sessionResource}.txt`;

    const sessionFile = await overwriteFile(
      fileUrl,
      // We need to type cast because the buffer definition
      // of Blob does not have the prototype property expected
      // by the lib.dom.ts
      new Blob(["test"], {
        type: "text/plain",
      }),
      fetchOptions,
    );
    const sessionDataset = await getSolidDataset(sessionResource, fetchOptions);

    // Eslint isn't detecting the fact that this is inside an it statement
    // because of the conditional.
    // eslint-disable-next-line jest/no-standalone-expect
    expect(isRawData(sessionDataset)).toBe(false);
    // eslint-disable-next-line jest/no-standalone-expect
    expect(isRawData(sessionFile)).toBe(true);

    await deleteFile(fileUrl, fetchOptions);
  });

  // Cannot use file constructor in Node 18 and below
  (nodeMajor > 18 ? it : it.skip)(
    "can create, delete, and differentiate between RDF and non-RDF Resources using a File",
    async () => {
      const fileUrl = `${sessionResource}.txt`;

      const sessionFile = await overwriteFile(
        fileUrl,
        // We need to type cast because the buffer definition
        // of Blob does not have the prototype property expected
        // by the lib.dom.ts
        new File(["test"], fileUrl, { type: "text/plain" }),
        fetchOptions,
      );
      const sessionDataset = await getSolidDataset(
        sessionResource,
        fetchOptions,
      );

      // Eslint isn't detecting the fact that this is inside an it statement
      // because of the conditional.
      // eslint-disable-next-line jest/no-standalone-expect
      expect(isRawData(sessionDataset)).toBe(false);
      // eslint-disable-next-line jest/no-standalone-expect
      expect(isRawData(sessionFile)).toBe(true);

      await deleteFile(fileUrl, fetchOptions);
    },
  );

  it("can create, delete, and differentiate between RDF and non-RDF Resources using a File from the node Buffer package", async () => {
    const fileUrl = `${sessionResource}.txt`;

    const sessionFile = await overwriteFile(
      fileUrl,
      // We need to type cast because the buffer definition
      // of Blob does not have the prototype property expected
      // by the lib.dom.ts
      new NodeFile(["test"], fileUrl, { type: "text/plain" }),
      fetchOptions,
    );
    const sessionDataset = await getSolidDataset(sessionResource, fetchOptions);

    // Eslint isn't detecting the fact that this is inside an it statement
    // because of the conditional.
    // eslint-disable-next-line jest/no-standalone-expect
    expect(isRawData(sessionDataset)).toBe(false);
    // eslint-disable-next-line jest/no-standalone-expect
    expect(isRawData(sessionFile)).toBe(true);

    await deleteFile(fileUrl, fetchOptions);
  });

  it("can create and remove Containers", async () => {
    const containerUrl = `${pod}solid-client-tests/node/container-test/container1-${session.info.sessionId}/`;
    const containerContainerUrl = `${pod}solid-client-tests/node/container-test/`;
    const containerName = `container2-${session.info.sessionId}`;
    const newContainer1 = await createContainerAt(containerUrl, fetchOptions);
    const newContainer2 = await createContainerInContainer(
      containerContainerUrl,
      { ...fetchOptions, slugSuggestion: containerName },
    );

    expect(getSourceUrl(newContainer1)).toBe(containerUrl);
    expect(getSourceUrl(newContainer2)).toBe(
      `${containerContainerUrl}${containerName}/`,
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
        fetchOptions,
      );
      const initialisedThing = getThing(
        initialisedDataset,
        `${datasetUrl}#e2e-test-thing-with-blank-node`,
      )!;

      const updatedThing = setBoolean(
        initialisedThing,
        regularPredicate,
        false,
      );

      // Now fetch the Resource again, and try to insert the updated Thing into it:
      const refetchedDataset = await getSolidDataset(datasetUrl, fetchOptions);
      const updatedDataset = setThing(refetchedDataset, updatedThing);
      await expect(
        saveSolidDatasetAt(datasetUrl, updatedDataset, fetchOptions),
      ).resolves.not.toThrow();
    } finally {
      // Clean up after ourselves
      await deleteSolidDataset(datasetUrl, fetchOptions);
    }
  });

  it("cannot fetch non public resources unauthenticated", async () => {
    const error = await getSolidDataset(sessionResource).catch((err) => err);

    expect(error.statusCode).toBe(401);
    expect(error.message).toContain(
      `Fetching the Resource at [${sessionResource}] failed:`,
    );
    expect(error.statusText).toBe("Unauthorized");

    expect(error.problemDetails.type).toBe(DEFAULT_TYPE);
    expect(error.problemDetails.title).toBe("Unauthorized");
    expect(error.problemDetails.status).toBe(401);
    expect(error.problemDetails.detail).toBeDefined();
    expect(error.problemDetails.instance).toBeDefined();
  });

  it("can fetch getWellKnownSolid", async () => {
    // We don't really care for what the resulting dataset is, just that across
    // environments it reliably succeeds:
    await expect(getWellKnownSolid(sessionResource)).resolves.not.toThrow();
  });

  it("can customize the fetch to get and set HTTP headers", async () => {
    let headers: Headers = new Headers();
    const customFetch: typeof fetch = async (
      info: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      const response = await fetchOptions.fetch(info, {
        ...init,
        headers: {
          ...init?.headers,
          "User-Agent": "some-user-agent",
        },
      });
      if (info.toString() === sessionResource) {
        headers = response.headers;
      }
      return response;
    };
    const spiedFetch = jest.spyOn(fetchOptions, "fetch");
    await getSolidDataset(sessionResource, { fetch: customFetch });
    expect(spiedFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({
          "User-Agent": "some-user-agent",
        }),
      }),
    );
    expect(headers.get("Content-Type")).toContain("text/turtle");
  });

  it("raises error getting a resource if service returns an error response", async () => {
    const customFetch: typeof fetch = async (
      info: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      return fetchOptions.fetch(info, {
        ...init,
        headers: {
          ...init?.headers,
          Accept: "plain/text",
        },
      });
    };

    // This request should produce an error
    const error = await getSolidDataset(sessionResource, {
      fetch: customFetch,
    }).catch((err) => err);

    expect(error.statusCode).toBe(406);
    expect(error.message).toContain(
      `Fetching the Resource at [${sessionResource}] failed: [406]`,
    );
    expect(error.statusText).toBe("Not Acceptable");

    expect(error.problemDetails.type).toBe(DEFAULT_TYPE);
    expect(error.problemDetails.title).toBe("Not Acceptable");
    expect(error.problemDetails.status).toBe(406);
    expect(error.problemDetails.detail).toBeDefined();
    expect(error.problemDetails.instance).toBeDefined();
  });

  it("raises error creating a container if service returns an error response", async () => {
    // This operation should throw an error
    const error = await createContainerAt(sessionContainer, {
      fetch: serverToRespondWithAn400Error("PUT"),
    }).catch((err) => err);

    expect(error.statusCode).toBe(400);
    expect(error.message).toContain(
      `Creating the empty Container at [${sessionContainer}] failed: [400]`,
    );
    expect(error.statusText).toBe("Bad Request");

    expect400ProblemDetails(error.problemDetails);
  });

  it("raises error creating a container in a container if service returns an error response", async () => {
    // This operation should throw an error
    const error = await createContainerInContainer(sessionContainer, {
      fetch: serverToRespondWithAn400Error("POST"),
    }).catch((err) => err);

    expect(error.statusCode).toBe(400);
    expect(error.message).toContain(
      `Creating an empty Container in the Container at [${sessionContainer}] failed: [400]`,
    );
    expect(error.statusText).toBe("Bad Request");

    expect400ProblemDetails(error.problemDetails);
  });

  it("raises error deleting a resource if service returns an error response", async () => {
    // This operation should throw an error
    const error = await deleteFile(sessionResource, {
      fetch: serverToRespondWithAn405Error(),
    }).catch((err) => err);

    expect(error.statusCode).toBe(405);
    expect(error.message).toContain(
      `Deleting the file at [${sessionResource}] failed: [405]`,
    );
    expect(error.statusText).toBe("Method Not Allowed");

    expect405ProblemDetails(error.problemDetails);
  });

  it("raises error deleting a dataset if service returns an error response", async () => {
    // This operation should throw an error
    const error = await deleteSolidDataset(sessionResource, {
      fetch: serverToRespondWithAn405Error(),
    }).catch((err) => err);

    expect(error.statusCode).toBe(405);
    expect(error.message).toContain(
      `Deleting the SolidDataset at [${sessionResource}] failed: [405]`,
    );
    expect(error.statusText).toBe("Method Not Allowed");

    expect405ProblemDetails(error.problemDetails);
  });

  it("raises error retrieving a resource if service returns an error response", async () => {
    // This operation should throw an error
    const error = await getSolidDataset(sessionResource, {
      fetch: serverToRespondWithAn405Error(),
    }).catch((err) => err);

    expect(error.statusCode).toBe(405);
    expect(error.message).toContain(
      `Fetching the Resource at [${sessionResource}] failed: [405]`,
    );
    expect(error.statusText).toBe("Method Not Allowed");

    expect405ProblemDetails(error.problemDetails);
  });

  it("raises error overwriting a file if service returns an error response", async () => {
    // This operation should throw an error
    const error = await overwriteFile(
      sessionResource,
      // We need to type cast because the buffer definition
      // of Blob does not have the prototype property expected
      // by the lib.dom.ts
      new Blob(["test"], {
        type: "text/plain",
      }),
      {
        fetch: serverToRespondWithAn405Error(),
      },
    ).catch((err) => err);

    expect(error.statusCode).toBe(405);
    expect(error.message).toContain(
      `Overwriting the file at [${sessionResource}] failed: [405]`,
    );
    expect(error.statusText).toBe("Method Not Allowed");

    expect405ProblemDetails(error.problemDetails);
  });

  it("raises error saving a dataset if service returns an error response", async () => {
    // This operation should throw an error
    const error = await saveSolidDatasetAt(
      sessionResource,
      createSolidDataset(),
      { fetch: serverToRespondWithAn405Error() },
    ).catch((err) => err);

    expect(error.statusCode).toBe(405);
    expect(error.message).toContain(
      `Storing the Resource at [${sessionResource}] failed: [405]`,
    );
    expect(error.statusText).toBe("Method Not Allowed");

    expect405ProblemDetails(error.problemDetails);
  });

  function expect400ProblemDetails(problemDetails: ProblemDetails) {
    expect(problemDetails.type).toBe(DEFAULT_TYPE);
    expect(problemDetails.title).toBe("Bad Request");
    expect(problemDetails.status).toBe(400);
    expect(problemDetails.detail).toBeDefined();
    expect(problemDetails.instance).toBeDefined();
  }

  function expect405ProblemDetails(problemDetails: ProblemDetails) {
    expect(problemDetails.type).toBe(DEFAULT_TYPE);
    expect(problemDetails.title).toBe("Method Not Allowed");
    expect(problemDetails.status).toBe(405);
    expect(problemDetails.detail).toBeDefined();
    expect(problemDetails.instance).toBeDefined();
  }

  function serverToRespondWithAn405Error() {
    // Change to invalid method to get the server to return a 405 error
    const customFetch: typeof fetch = async (
      info: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      return fetchOptions.fetch(info, {
        ...init,
        method: "INVALID",
      });
    };
    return customFetch;
  }

  function serverToRespondWithAn400Error(method: string) {
    // Provide invalid body content to the PUT request to get the server to return a 400 error
    const customFetch: typeof fetch = async (
      info: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      // Only change the given method
      if (init?.method === method) {
        return fetchOptions.fetch(info, {
          ...init,
          body: "Invalid content",
        });
      }
      // All other requests fallback to the original fetch
      return fetchOptions.fetch(info, init);
    };
    return customFetch;
  }
});
