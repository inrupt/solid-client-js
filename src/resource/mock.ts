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

import * as crossFetch from "cross-fetch";

import {
  Url,
  UrlString,
  SolidDataset,
  File,
  WithServerResourceInfo,
} from "../interfaces";
import { internal_toIriString } from "../interfaces.internal";
import { getSolidDataset, createSolidDataset } from "./solidDataset";
import { getFile } from "./file";
import { FetchError } from "./resource";

const { Response } = crossFetch;

type Unpromisify<T> = T extends Promise<infer R> ? R : T;

/**
 * ```{warning}
 * Do not use this function in production code. For use in **unit tests**.
 * ```
 *
 * This function initialises a new [[SolidDataset]] with metadata as though the
 * SolidDataset has been retrieved from the given URL. The mock SolidDataset can be used in
 * unit tests that require persisted SolidDatasets; e.g., unit tests that call [[getSourceUrl]].
 *
 * @param url The URL from which the returned SolidDataset appears to be retrieved.
 * @returns A mock SolidDataset that appears to be retrieved from the `url`.
 * @since 0.2.0
 */
export function mockSolidDatasetFrom(
  url: Url | UrlString
): Unpromisify<ReturnType<typeof getSolidDataset>> {
  const solidDataset = createSolidDataset();
  const solidDatasetWithResourceInfo: SolidDataset & WithServerResourceInfo = {
    ...solidDataset,
    internal_resourceInfo: {
      sourceIri: internal_toIriString(url),
      isRawData: false,
      contentType: "text/turtle",
      linkedResources: {},
    },
  };

  return solidDatasetWithResourceInfo;
}

/**
 * ```{warning}
 * Do not use this function in production code. For use in **unit tests**.
 * ```
 *
 * This function initialises a new Container [[SolidDataset]] with metadata as though the
 * Container has been retrieved from the given URL. The mock SolidDataset can be used in
 * unit tests that require persisted Containers; e.g., unit tests that call [[isContainer]].
 *
 * @param url The URL from which the returned Container appears to be retrieved. The `url` must end in a slash.
 * @returns A mock SolidDataset that appears to be retrieved from the `url`.
 * @since 0.2.0
 */
export function mockContainerFrom(
  url: Url | UrlString
): Unpromisify<ReturnType<typeof getSolidDataset>> {
  const sourceIri = internal_toIriString(url);
  if (!sourceIri.endsWith("/")) {
    throw new Error(
      "A Container's URL should end in a slash. Please update your tests."
    );
  }

  return mockSolidDatasetFrom(sourceIri);
}

/**
 * ```{warning}
 * Do not use this function in production code. For use in **unit tests**.
 * ```
 *
 * This function initialises a new File with metadata as though the
 * File has been retrieved from the given URL. The mock File can be used in
 * unit tests that require persisted Files; e.g. unit tests that call [[getSourceUrl]].
 *
 * @param url The URL from which the returned File appears to be retrieved.
 * @returns A mock File that appears to be retrieved from the `url`.
 * @since 0.2.0
 */
export function mockFileFrom(
  url: Url | UrlString,
  options?: Partial<{
    contentType: WithServerResourceInfo["internal_resourceInfo"]["contentType"];
  }>
): Unpromisify<ReturnType<typeof getFile>> {
  const file = new Blob();
  const fileWithResourceInfo: File & WithServerResourceInfo = Object.assign(
    file,
    {
      internal_resourceInfo: {
        sourceIri: internal_toIriString(url),
        isRawData: true,
        contentType: options?.contentType,
        linkedResources: {},
      },
    }
  );

  return fileWithResourceInfo;
}

/**
 * ```{warning}
 * Do not use this function in production code. For use in **unit tests**.
 * ```
 *
 * This function initialises a new Error object with metadata as though the
 * it was the result of getting a 404 when trying to fetch the Resource at the
 * given URL. The mock Error can be used in unit tests that require functions
 * that fetch Resources (like [[getSolidDataset]]) to fail.
 *
 * @param url The URL of the Resource that could not be fetched according to the error.
 * @param statusCode Optional status code (defaults to 404) that caused the error.
 * @returns A mock Error that represents not having been able to fetch the Resource at `url` due to a 404 Response.
 * @since 1.1.0
 */
export function mockFetchError(
  fetchedUrl: UrlString,
  statusCode = 404
): FetchError {
  const failedResponse = new Response(undefined, {
    status: statusCode,
  }) as Response & { ok: false };
  return new FetchError(
    `Fetching the Resource at [${fetchedUrl}] failed: [${failedResponse.status}] [${failedResponse.statusText}].`,
    failedResponse
  );
}
