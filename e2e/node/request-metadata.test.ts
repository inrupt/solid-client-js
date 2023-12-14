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
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  test,
  jest,
} from "@jest/globals";

import type { Session } from "@inrupt/solid-client-authn-node";
import {
  getNodeTestingEnvironment,
  getPodRoot,
  getAuthenticatedSession,
} from "@inrupt/internal-test-env";
import { getSolidDataset } from "../../src";

const env = getNodeTestingEnvironment();

if (
  env.features?.APPLICATION_DEFINED_REQUEST_METADATA === "true" &&
  typeof env.features?.APPLICATION_DEFINED_REQUEST_METADATA_HEADERS !== "string"
) {
  throw new Error(
    "Missing E2E_TEST_FEATURE_APPLICATION_DEFINED_REQUEST_METADATA_HEADERS environment variable.",
  );
}

if (
  typeof env.features?.APPLICATION_DEFINED_REQUEST_METADATA_HEADERS === "string"
) {
  const headers: Record<string, string>[] = [];
  try {
    const rawHeaders = JSON.parse(
      env.features?.APPLICATION_DEFINED_REQUEST_METADATA_HEADERS,
    );
    for (const [key, value] of Object.entries(rawHeaders)) {
      if (typeof value !== "string") {
        throw new Error();
      }
      headers.push({ [key]: value });
    }
  } catch {
    throw new Error(
      `E2E_TEST_FEATURE_APPLICATION_DEFINED_REQUEST_METADATA_HEADERS is malformed: expected a JSON key:value map, found ${env.features?.APPLICATION_DEFINED_REQUEST_METADATA_HEADERS}`,
    );
  }
  const customizeHeaders = (
    customizedFetch: typeof fetch,
    requestHeaders: Record<string, string>,
    responseHeaders: (h: Headers) => void,
  ) => {
    return async (
      info: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      const response = await customizedFetch(info, {
        ...init,
        headers: {
          ...init?.headers,
          ...requestHeaders,
        },
      });
      responseHeaders(response.headers);
      return response;
    };
  };

  // If these tests should be skipped, the table used by the .each is empty, which fails the test.
  // The dummy header on the next line is therefore never actually used, but it prevents jest
  // from complaining.
  describe.each(headers)(
    "End-to-end application-defined request metadata: %s",
    (returnedHeaders: Record<string, string>) => {
      let session: Session;
      let pod: string;
      let profileUrl: string;

      const requestHeaders = {
        ...returnedHeaders,
        "non-returned-header": "some-non-returned-value",
      };

      beforeAll(async () => {
        session = await getAuthenticatedSession(env);
        if (session.info.webId === undefined) {
          throw new Error("Authentication of end-to-end test session failed");
        }
        pod = await getPodRoot(session);
        profileUrl = session.info.webId;
      });

      afterAll(async () => {
        await session.logout();
      });

      describe("authenticated", () => {
        it("can read back predefined headers set by the client on a successful request", async () => {
          let responseHeaders: Headers = new Headers();
          const readHeaders = (headers: Headers) => {
            responseHeaders = headers;
          };
          const spiedFetch = jest.spyOn(session, "fetch");
          const customFetch = customizeHeaders(
            session.fetch,
            requestHeaders,
            readHeaders,
          );

          await expect(
            getSolidDataset(pod, { fetch: customFetch }),
          ).resolves.not.toThrow();

          expect(spiedFetch).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              headers: expect.objectContaining({
                [Object.keys(returnedHeaders)[0]]:
                  Object.values(returnedHeaders)[0],
                "non-returned-header": "some-non-returned-value",
              }),
            }),
          );
          expect(
            responseHeaders.get(Object.keys(returnedHeaders)[0]),
          ).toContain(Object.values(returnedHeaders)[0]);
          expect(responseHeaders.get("non-returned-header")).toBeNull();
        });

        it("can read back predefined headers set by the client on a failed request", async () => {
          let responseHeaders: Headers = new Headers();
          const readHeaders = (headers: Headers) => {
            responseHeaders = headers;
          };
          const spiedFetch = jest.spyOn(session, "fetch");
          const customFetch = customizeHeaders(
            session.fetch,
            requestHeaders,
            readHeaders,
          );

          // The response will be a 404
          await expect(() =>
            getSolidDataset(new URL("non-existing-resource", pod).href, {
              fetch: customFetch,
            }),
          ).rejects.toThrow();

          expect(spiedFetch).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              headers: expect.objectContaining({
                [Object.keys(returnedHeaders)[0]]:
                  Object.values(returnedHeaders)[0],
              }),
            }),
          );
          expect(
            responseHeaders.get(Object.keys(returnedHeaders)[0]),
          ).toContain(Object.values(returnedHeaders)[0]);
          expect(responseHeaders.get("non-returned-header")).toBeNull();
        });
      });

      describe("unauthenticated", () => {
        it("can read back predefined headers set by the client on a successful request", async () => {
          let responseHeaders: Headers = new Headers();
          const readHeaders = (headers: Headers) => {
            responseHeaders = headers;
          };
          const spiedFetch = jest.spyOn(globalThis, "fetch");
          const customFetch = customizeHeaders(
            fetch,
            requestHeaders,
            readHeaders,
          );

          // The response will be a 401.
          await expect(
            getSolidDataset(profileUrl, {
              fetch: customFetch,
            }),
          ).resolves.not.toThrow();

          expect(spiedFetch).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              headers: expect.objectContaining({
                [Object.keys(returnedHeaders)[0]]:
                  Object.values(returnedHeaders)[0],
              }),
            }),
          );
          expect(
            responseHeaders.get(Object.keys(returnedHeaders)[0]),
          ).toContain(Object.values(returnedHeaders)[0]);
          expect(responseHeaders.get("non-returned-header")).toBeNull();
        });

        it("can read back predefined headers set by the client on a failed request", async () => {
          let responseHeaders: Headers = new Headers();
          const readHeaders = (headers: Headers) => {
            responseHeaders = headers;
          };
          const spiedFetch = jest.spyOn(globalThis, "fetch");
          const customFetch = customizeHeaders(
            fetch,
            requestHeaders,
            readHeaders,
          );

          // The response will be a 401
          await expect(() =>
            getSolidDataset(new URL("non-existing-resource", pod).href, {
              fetch: customFetch,
            }),
          ).rejects.toThrow();

          expect(spiedFetch).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              headers: expect.objectContaining({
                [Object.keys(returnedHeaders)[0]]:
                  Object.values(returnedHeaders)[0],
              }),
            }),
          );
          expect(
            responseHeaders.get(Object.keys(returnedHeaders)[0]),
          ).toContain(Object.values(returnedHeaders)[0]);
          expect(responseHeaders.get("non-returned-header")).toBeNull();
        });
      });
    },
  );
} else {
  // eslint-disable-next-line jest/expect-expect, jest/no-focused-tests
  test.only(`Skipping unsupported application-defined request metadata tests in ${env.environment}`, () => {});
}
