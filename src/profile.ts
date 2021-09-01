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

import { internal_isValidUrl } from "./datatypes";
import { Iri, IriString, JWK, WebId, WithResourceInfo } from "./interfaces";
import { internal_toIriString } from "./interfaces.internal";
import { getFile, overwriteFile } from "./resource/file";
import {
  getContentType,
  internal_defaultFetchOptions,
} from "./resource/resource";
import { getSolidDataset, saveSolidDatasetAt } from "./resource/solidDataset";
import { addUrl } from "./thing/add";
import { getUrl } from "./thing/get";
import {
  getThing,
  setThing,
  ValidPropertyUrlExpectedError,
} from "./thing/thing";

/**
 * Adds a public key to a public WebID profile.
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param publicKey The public key value to set.
 * @param webId The WebID of the profile to add the public key.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 */
export async function setPublicKeyToProfile(
  publicKey: JWK,
  webId: WebId,
  jwksIri: Iri | IriString,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<Blob & WithResourceInfo> {
  if (!internal_isValidUrl(jwksIri)) {
    throw new ValidPropertyUrlExpectedError(jwksIri);
  }
  jwksIri = internal_toIriString(jwksIri);

  const profileDataset = await getSolidDataset(webId, {
    fetch: options.fetch,
  });
  if (profileDataset === null) {
    throw new Error(`Could not find public profile at url [${webId}]`);
  }

  // get profile data "Thing" in the profile dataset.
  const profile = getThing(profileDataset, webId);
  if (profile === null) {
    throw new Error(`Could not find public profile at url [${webId}]`);
  }

  // check for triple <webid, sec:publicKey, jwksIri>
  const iri = getUrl(profile, "https://w3id.org/security#publicKey");

  // if none or different IRI - create triple, save
  if (iri === null || iri !== jwksIri) {
    const updatedProfile = addUrl(
      profile,
      "https://w3id.org/security#publicKey",
      jwksIri
    );
    const updatedProfileDataset = setThing(profileDataset, updatedProfile);

    await saveSolidDatasetAt(webId, updatedProfileDataset, {
      fetch: options.fetch,
    });
  }

  // fetch JWKS
  const jwksIriFile = await getFile(jwksIri, {
    fetch: options.fetch,
  });
  if (jwksIriFile === null) {
    throw new Error(`Could not find JWKS at IRI [${jwksIri}]`);
  }
  console.log(getContentType(jwksIriFile));

  // read file
  const jwks = await jwksIriFile.text();

  // dereference the JWKS, add new JWK
  const updatedJwks = JSON.parse(jwks);
  updatedJwks.keys.append(publicKey);

  // save
  return overwriteFile(
    jwksIri,
    new Blob([JSON.stringify(updatedJwks)], { type: "application/json" }),
    { contentType: "text/plain", fetch: options.fetch }
  );
}
