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

import { security } from "../constants";
import {
  Iri,
  IriString,
  Jwk,
  Jwks,
  SolidDataset,
  ThingPersisted,
  UrlString,
  WebId,
  WithResourceInfo,
} from "../interfaces";
import { overwriteFile } from "../resource/file";
import {
  getSourceUrl,
  internal_defaultFetchOptions,
} from "../resource/resource";
import { getSolidDataset } from "../resource/solidDataset";
import { getUrl } from "../thing/get";
import { setIri } from "../thing/set";
import { getThing, setThing } from "../thing/thing";

function getProfileFromProfileDoc(
  profileDataset: SolidDataset,
  webId: WebId
): ThingPersisted {
  const profile = getThing(profileDataset, webId);
  if (profile === null) {
    throw new Error(
      `Profile document [${getSourceUrl(
        profileDataset
      )}] does not include WebID [${webId}]`
    );
  }
  return profile;
}

/**
 * Set a JWKS IRI associated with a WebID in a profile document.
 *
 * @param profileDocument The profile document dataset.
 * @param webId The WebID associated with the profile document.
 * @param jwksIri The JWKS IRI to be set.
 * @returns A modified copy of the profile document, with the JWKS IRI set.
 * @since 1.12.0
 */
export function setProfileJwks<Dataset extends SolidDataset>(
  profileDocument: Dataset,
  webId: WebId,
  jwksIri: Iri | IriString
): Dataset {
  return setThing(
    profileDocument,
    setIri(
      getProfileFromProfileDoc(profileDocument, webId),
      security.publicKey,
      jwksIri
    )
  );
}

/**
 * Look for a JWKS IRI optionally advertized from a profile document.
 *
 * @param profileDocument The profile document.
 * @param webId The WebID featured in the profile document.
 * @returns The JWKS IRI associated with the WebID, if any.
 * @since 1.12.0
 */
export function getProfileJwksIri(
  profileDocument: SolidDataset,
  webId: WebId
): UrlString | null {
  return getUrl(
    getProfileFromProfileDoc(profileDocument, webId),
    security.publicKey
  );
}

const isJwks = (jwksDocument: Jwks | unknown): jwksDocument is Jwks => {
  return typeof (jwksDocument as Jwks).keys !== "undefined";
};

/**
 * Fetch a JWKS at a given IRI, and add the given JWK to the obtained key set.
 *
 * @param jwk The JWK to add to the set.
 * @param jwksIri The IRI where the key set should be looked up.
 * @param options @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns Promise resolving to a JWKS where the given key has been added.
 * @since 1.12.0
 */
export async function addJwkToJwks(
  jwk: Jwk,
  jwksIri: IriString,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<Jwks> {
  const config = {
    ...internal_defaultFetchOptions,
    ...options,
  };
  const jwksResponse = await config.fetch(jwksIri);
  if (!jwksResponse.ok) {
    throw new Error(
      `Fetching [${jwksIri}] returned an error: ${jwksResponse.status} ${jwksResponse.statusText}`
    );
  }
  try {
    const jwksDocument = await jwksResponse.json();
    if (!isJwks(jwksDocument)) {
      throw new Error(
        `[${jwksIri}] does not dereference to a valid JWKS: ${JSON.stringify(
          jwksDocument
        )}`
      );
    }
    return {
      keys: [...jwksDocument.keys, jwk],
    };
  } catch (e) {
    throw new Error(`Parsing the document at [${jwksIri}] failed: ${e}`);
  }
}

/**
 * Adds a public key to the JWKS listed in the profile associated to the given WebID.
 * Retrieves the profile document for the specified WebID and looks up the associated
 * JWKS. Having added the given key to the JWKS, this function overwrites the
 * previous JWKS so that the new version is saved. This assumes the JWKS is hosted
 * at a read-write IRI, such as in a Solid Pod.
 *
 * @param publicKey The public key value to set.
 * @param webId The WebID whose profile document references the key set to which we wish to add the specified public key.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @since 1.12.0
 */
export async function addPublicKeyToProfileJwks(
  publicKey: Jwk,
  webId: WebId,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<Blob & WithResourceInfo> {
  const profileDataset = await getSolidDataset(webId, {
    fetch: options.fetch,
  });
  if (profileDataset === null) {
    throw new Error(
      `The profile document associated with WebID [${webId}] could not be retrieved.`
    );
  }

  const jwksIri = getProfileJwksIri(profileDataset, webId);

  if (jwksIri === null) {
    throw new Error(
      `No key set is declared for the property [${security.publicKey}] in the profile of [${webId}]`
    );
  }

  const updatedJwks = await addJwkToJwks(publicKey, jwksIri, options);

  return overwriteFile(jwksIri, new Blob([JSON.stringify(updatedJwks)]), {
    contentType: "application/json",
    fetch: options.fetch,
  });
}
