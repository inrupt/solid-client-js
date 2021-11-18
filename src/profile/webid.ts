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
  getThing,
  getThingAll,
  SolidDataset,
  WebId,
  WithServerResourceInfo,
} from "..";
import { foaf } from "../constants";
import {
  getSourceIri,
  internal_defaultFetchOptions,
} from "../resource/resource";

export type ProfileAll<T extends SolidDataset & WithServerResourceInfo> = {
  webIdProfile: T;
  altProfileAll: Array<SolidDataset & WithServerResourceInfo>;
};

/**
 * Get all the Profile Resources discoverable from a WebID Profile.
 *
 * A WebID Profile may be any RDF resource on the Web, it doesn't have
 * to be a Solid resource. That is why, in order to expose a Solid-enabled part
 * of their profile, some WebID profiles link to a Profile Resource, which may
 * be a Solid resource.
 *
 * @param webId WebID of the agent you want the profile of.
 * @param options Optional parameter
 *  - `options.webIdProfile`: The data retrieved when looking up the WebID. This
 *    will be fetched if not provided.
 *  - `options.fetch`: An alternative `fetch` function to make the HTTP request,
 *    compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns Promise resolving to an array of [[SolidDataset]], each corresponding
 *  to a personal profile document discoverable from the WebID Profile Document.
 *  If none are found, the WebID profile document itself is returned.
 * @since 1.16.0
 */
export async function getProfileAll<
  T extends SolidDataset & WithServerResourceInfo
>(
  webId: WebId,
  options: Partial<
    typeof internal_defaultFetchOptions & {
      webIdProfile: T;
    }
  > = internal_defaultFetchOptions
): Promise<ProfileAll<T>> {
  const {
    fetch,
    webIdProfile = (await getSolidDataset(webId, { fetch })) as T,
  } = options;

  const webIdThing = getThing(webIdProfile, webId);

  const altProfilesIri = getThingAll(webIdProfile)
    .filter((thing) => getIriAll(thing, foaf.primaryTopic).length > 0)
    .map(asIri)
    .concat(webIdThing ? getIriAll(webIdThing, foaf.isPrimaryTopicOf) : [])
    .filter((profileIri) => profileIri !== getSourceIri(webIdProfile));

  // Ensure that each given profile only appears once.
  const altProfileAll = await Promise.all(
    Array.from(new Set(altProfilesIri)).map((uniqueProfileIri) =>
      getSolidDataset(uniqueProfileIri, { fetch })
    )
  );

  return {
    webIdProfile,
    altProfileAll,
  };
}
