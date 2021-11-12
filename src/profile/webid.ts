/**
 * Copyright 2021 Inrupt Inc.
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
  asIri,
  getIriAll,
  getSolidDataset,
  getThingAll,
  IriString,
  SolidDataset,
  WebId,
  WithResourceInfo,
} from "..";
import { foaf } from "../constants";
import {
  getSourceIri,
  internal_defaultFetchOptions,
} from "../resource/resource";

/**
 * Get all the personal profiles discoverable from a WebID profile document.
 *
 * A WebID profile document may be any RDF resource on the Web, it doesn't have
 * to be a Solid resource. That is why, in order to expose a Solid-enabled part
 * of their profile, some WebID profile documents link to a personal profile
 * documents, which may be a Solid resource.
 *
 * @param webIdDocument data from the WebID profile document
 * @param options Optional parameter `options.fetch`: An alternative `fetch`
 *  function to make the HTTP request, compatible with the browser-native
 *  [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns Promise resolving to an array of [[SolidDataset]], each corresponding
 *  to a personal profile document discoverable from the WebID Profile Document.
 *  If none are found, the WebID profile document itself is returned.
 */
export async function getWebIdProfileAll(
  webIdDocument: SolidDataset & WithResourceInfo,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<SolidDataset[]> {
  const foundProfiles = await Promise.all(
    getThingAll(webIdDocument)
      .filter((thing) => getIriAll(thing, foaf.primaryTopic).length > 0)
      // This assumes that getSourceIri returns the IRI which has been fetched to
      // get the profile document.
      .filter((thing) => asIri(thing) !== getSourceIri(webIdDocument))
      .map(
        async (primaryThing) =>
          await getSolidDataset(asIri(primaryThing), { fetch: options.fetch })
      )
  );
  return foundProfiles.length > 0 ? foundProfiles : [webIdDocument];
}

/**
 * Get a personal profiles discoverable from a WebID profile document.
 *
 * A WebID profile document may be any RDF resource on the Web, it doesn't have
 * to be a Solid resource. That is why, in order to expose a Solid-enabled part
 * of their profile, some WebID profile documents link to a personal profile
 * documents, which may be a Solid resource.
 *
 * @param webIdDocument data from the WebID profile document
 * @param options Optional parameter `options.fetch`: An alternative `fetch`
 *  function to make the HTTP request, compatible with the browser-native
 *  [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns Promise resolving to a [[SolidDataset]] corresponding to a personal
 *  profile document discoverable from the WebID Profile Document. If several exist,
 *  one is arbitrarily chosen.
 *  If none are found, the WebID profile document itself is returned.
 */
export async function getWebIdProfile(
  webIdDocument: SolidDataset & WithResourceInfo,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<SolidDataset> {
  // Arbitrarily pick a subject of a triple <s, foaf:primaryTopic, o>
  const [primaryThing] = getThingAll(webIdDocument)
    .filter((thing) => getIriAll(thing, foaf.primaryTopic).length > 0)
    // This assumes that getSourceIri returns the IRI which has been fetched to
    // get the profile document.
    .filter((thing) => asIri(thing) !== getSourceIri(webIdDocument));
  return primaryThing === undefined
    ? webIdDocument
    : getSolidDataset(asIri(primaryThing), { fetch: options.fetch });
}
