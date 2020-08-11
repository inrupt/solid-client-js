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

import {
  Url,
  UrlString,
  SolidDataset,
  WithResourceInfo,
  internal_toIriString,
} from "../interfaces";
import { getSolidDataset, createSolidDataset } from "./solidDataset";
import { getFile } from "./nonRdfData";

type Unpromisify<T> = T extends Promise<infer R> ? R : T;

/**
 * Function for use in unit tests to mock a persisted [[SolidDataset]].
 *
 * Warning: do not use this function in actual production code.
 * This function initialises a new SolidDataset but, as opposed to [[createSolidDataset]],
 * it adds metadata that would also have been present had an empty SolidDataset been fetched from
 * the given URL. This is useful to mock a SolidDataset in tests of code that call e.g.
 * [[getSourceUrl]].
 *
 * @param url The URL from which the mocked SolidDataset pretends to be retrieved.
 * @returns A mocked SolidDataset.
 * @since Not released yet.
 */
export function mockSolidDatasetFrom(
  url: Url | UrlString
): Unpromisify<ReturnType<typeof getSolidDataset>> {
  const solidDataset = createSolidDataset();
  const solidDatasetWithResourceInfo: SolidDataset &
    WithResourceInfo = Object.assign(solidDataset, {
    internal_resourceInfo: {
      sourceIri: internal_toIriString(url),
      isRawData: false,
      contentType: "text/turtle",
    },
  });

  return solidDatasetWithResourceInfo;
}

/**
 * Function for use in unit tests to mock a persisted [[SolidDataset]] representing a Container.
 *
 * Warning: do not use this function in actual production code.
 * This function initialises a new SolidDataset but, as opposed to [[createSolidDataset]],
 * it adds metadata that would also have been present had an empty SolidDataset been fetched from
 * the given URL, and was a Container. This is useful to mock a SolidDataset in tests of code that
 * call e.g. [[isContainer]].
 *
 * @param url The URL from which the mocked Container pretends to be retrieved — this should end in a slash.
 * @returns A mocked SolidDataset.
 * @since Not released yet.
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
 * Function for use in unit tests to mock a persisted File.
 *
 * Warning: do not use this function in actual production code.
 * This function initialises a new File, and adds metadata that would also have been present had an
 * empty file been fetched from the given URL. This is useful to mock a File in tests of code that
 * call e.g. [[getSourceUrl]].
 *
 * @param url The URL from which the mocked File pretends to be retrieved.
 * @Returns A mocked File.
 * @since Not released yet.
 */
export function mockFileFrom(
  url: Url | UrlString,
  options?: Partial<{
    contentType: WithResourceInfo["internal_resourceInfo"]["contentType"];
  }>
): Unpromisify<ReturnType<typeof getFile>> {
  const file = new Blob();
  const fileWithResourceInfo: Blob & WithResourceInfo = Object.assign(file, {
    internal_resourceInfo: {
      sourceIri: internal_toIriString(url),
      isRawData: true,
      contentType: options?.contentType,
    },
  });

  return fileWithResourceInfo;
}
