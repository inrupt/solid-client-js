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

import { acp } from "../constants";
import {
  internal_toIriString,
  SolidDataset,
  File,
  Url,
  UrlString,
  WithServerResourceInfo,
  WithAcl,
  hasAccessibleAcl,
} from "../interfaces";
import { getFile } from "../resource/nonRdfData";
import {
  getResourceInfo,
  getSourceUrl,
  internal_defaultFetchOptions,
  internal_fetchAcl,
} from "../resource/resource";
import { getSolidDataset } from "../resource/solidDataset";
import {
  AccessControlResource,
  getAccessControlAll,
  getMemberPolicyUrlAll,
  getPolicyUrlAll,
  hasLinkedAcr,
} from "./control";
import { PolicyDataset } from "./policy";

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Fetch a SolidDataset, its associated Access Control Resource (if available to the current user),
 * and all the Access Control Policies referred to therein, if available to the current user.
 *
 * @param url URL of the SolidDataset to fetch.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns A SolidDataset and the ACR that applies to it, if available to the authenticated user, and the APRs that are referred to therein, if available to the authenticated user.
 */
export async function getSolidDatasetWithAcp(
  url: Url | UrlString,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<SolidDataset & WithAcp> {
  const urlString = internal_toIriString(url);
  const config = {
    ...internal_defaultFetchOptions,
    ...options,
  };

  const solidDataset = await getSolidDataset(urlString, config);
  const acp = await fetchAcp(solidDataset, config);
  return Object.assign(solidDataset, acp);
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Fetch a file, its associated Access Control Resource (if available to the current user),
 * and all the Access Control Policies referred to therein, if available to the current user.
 *
 * @param url URL of the file to fetch.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns A file and the ACR that applies to it, if available to the authenticated user, and the APRs that are referred to therein, if available to the authenticated user.
 */
export async function getFileWithAcp(
  url: Url | UrlString,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<File & WithAcp> {
  const urlString = internal_toIriString(url);
  const config = {
    ...internal_defaultFetchOptions,
    ...options,
  };

  const file = await getFile(urlString, config);
  const acp = await fetchAcp(file, config);
  return Object.assign(file, acp);
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Retrieve information about a Resource, its associated Access Control Resource (if available to
 * the current user), and all the Access Control Policies referred to therein, if available to the
 * current user, without fetching the Resource itself.
 *
 * @param url URL of the Resource about which to fetch its information.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns Metadata describing a Resource, and the ACR that applies to it, if available to the authenticated user, and the APRs that are referred to therein, if available to the authenticated user.
 */
export async function getResourceInfoWithAcp(
  url: Url | UrlString,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<WithServerResourceInfo & WithAcp> {
  const urlString = internal_toIriString(url);
  const config = {
    ...internal_defaultFetchOptions,
    ...options,
  };

  const resourceInfo = await getResourceInfo(urlString, config);
  const acp = await fetchAcp(resourceInfo, config);
  return Object.assign(resourceInfo, acp);
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Fetch a SolidDataset, and:
 * - if the Resource is governed by an ACR: its associated Access Control Resource (if available to
 *                                          the current user), and all the Access Control Policies
 *                                          referred to therein, if available to the current user.
 * - if the Resource is governed by an ACL: its associated Resource ACL (if available to the current
 *                                          user), or its Fallback ACL if it does not exist.
 *
 * @param url URL of the SolidDataset to fetch.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns A SolidDataset and either the ACL access data or the ACR access data, if available to the current user.
 */
export async function getSolidDatasetWithAccessDatasets(
  url: Url | UrlString,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<SolidDataset & (WithAcp | WithAcl)> {
  const urlString = internal_toIriString(url);
  const config = {
    ...internal_defaultFetchOptions,
    ...options,
  };

  const solidDataset = await getSolidDataset(urlString, config);
  if (hasAccessibleAcl(solidDataset)) {
    const acl = await internal_fetchAcl(solidDataset, config);
    return Object.assign(solidDataset, { internal_acl: acl });
  } else {
    const acp = await fetchAcp(solidDataset, config);
    return Object.assign(solidDataset, acp);
  }
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Fetch a File, and:
 * - if the Resource is governed by an ACR: its associated Access Control Resource (if available to
 *                                          the current user), and all the Access Control Policies
 *                                          referred to therein, if available to the current user.
 * - if the Resource is governed by an ACL: its associated Resource ACL (if available to the current
 *                                          user), or its Fallback ACL if it does not exist.
 *
 * @param url URL of the File to fetch.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns A File and either the ACL access data or the ACR access data, if available to the current user.
 */
export async function getFileWithAccessDatasets(
  url: Url | UrlString,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<File & (WithAcp | WithAcl)> {
  const urlString = internal_toIriString(url);
  const config = {
    ...internal_defaultFetchOptions,
    ...options,
  };

  const file = await getFile(urlString, config);
  if (hasAccessibleAcl(file)) {
    const acl = await internal_fetchAcl(file, config);
    return Object.assign(file, { internal_acl: acl });
  } else {
    const acp = await fetchAcp(file, config);
    return Object.assign(file, acp);
  }
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Fetch information about a Resource, and:
 * - if the Resource is governed by an ACR: its associated Access Control Resource (if available to
 *                                          the current user), and all the Access Control Policies
 *                                          referred to therein, if available to the current user.
 * - if the Resource is governed by an ACL: its associated Resource ACL (if available to the current
 *                                          user), or its Fallback ACL if it does not exist.
 *
 * @param url URL of the Resource information about which to fetch.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns Information about a Resource and either the ACL access data or the ACR access data, if available to the current user.
 */
export async function getResourceInfoWithAccessDatasets(
  url: Url | UrlString,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<WithServerResourceInfo & (WithAcp | WithAcl)> {
  const urlString = internal_toIriString(url);
  const config = {
    ...internal_defaultFetchOptions,
    ...options,
  };

  const resourceInfo = await getResourceInfo(urlString, config);
  if (hasAccessibleAcl(resourceInfo)) {
    const acl = await internal_fetchAcl(resourceInfo, config);
    return Object.assign(resourceInfo, { internal_acl: acl });
  } else {
    const acp = await fetchAcp(resourceInfo, config);
    return Object.assign(resourceInfo, acp);
  }
}

export type WithAcp = {
  internal_acp:
    | {
        acr: AccessControlResource;
        aprs: Record<UrlString, PolicyDataset | null>;
      }
    | {
        acr: null;
      };
};
export type WithAccessibleAcr = WithAcp & {
  internal_acp: {
    acr: Exclude<WithAcp["internal_acp"]["acr"], null>;
  };
};

/**
 * @param resource Resource of which to check whether it has an Access Control Resource attached.
 * @returns Boolean representing whether the given Resource has an Access Control Resource attached for use in e.g. [[getAccessControl]].
 */
export function hasAccessibleAcr(
  resource: WithAcp
): resource is WithAccessibleAcr {
  return (
    typeof resource.internal_acp === "object" &&
    typeof resource.internal_acp.acr === "object"
  );
}

async function fetchAcp(
  resource: WithServerResourceInfo,
  options: Partial<typeof internal_defaultFetchOptions>
): Promise<WithAcp> {
  if (!hasLinkedAcr(resource)) {
    return {
      internal_acp: {
        acr: null,
      },
    };
  }
  let acr: SolidDataset;
  try {
    acr = await getSolidDataset(
      // Whereas a Resource can generally have multiple linked Resources for the same relation,
      // it can only have one Access Control Resource for that ACR to be valid.
      // Hence the accessing of [0] directly:
      resource.internal_resourceInfo.linkedResources[acp.accessControl][0],
      options
    );
  } catch (e: unknown) {
    return {
      internal_acp: {
        acr: null,
      },
    };
  }

  const resourceUrl = getSourceUrl(resource);
  const acrUrl = getSourceUrl(acr);
  const acrDataset: AccessControlResource = Object.assign(acr, {
    accessTo: getSourceUrl(resource),
  });
  const policyUrls = getReferencedPolicyUrls(acrDataset)
    // Prevent the Resource itself, and the Access Control Resource, from being fetched again:
    .filter((policyUrl) => ![resourceUrl, acrUrl].includes(policyUrl));
  const policyDatasets = await Promise.all(
    policyUrls.map((url) => fetchPolicyDataset(url, options))
  );
  const acpInfo: WithAccessibleAcr = {
    internal_acp: {
      acr: acrDataset,
      aprs: {},
    },
  };
  policyUrls.forEach((policyUrl, i) => {
    acpInfo.internal_acp.aprs[policyUrl] = policyDatasets[i];
  });
  return acpInfo;
}

async function fetchPolicyDataset(
  url: UrlString,
  options: Partial<typeof internal_defaultFetchOptions>
): Promise<PolicyDataset | null> {
  try {
    return await getSolidDataset(url, options);
  } catch (e) {
    // We expect fetching of Access Policy Resources to fail often,
    // specifically when the current user does not have access to that Resource.
    return null;
  }
}

function getReferencedPolicyUrls(acr: AccessControlResource): UrlString[] {
  const policyUrls: UrlString[] = [];

  const controls = getAccessControlAll({
    internal_acp: { acr: acr, aprs: {} },
  });
  controls.forEach((control) => {
    policyUrls.push(...getPolicyUrlAll(control).map(getResourceUrl));
    policyUrls.push(...getMemberPolicyUrlAll(control).map(getResourceUrl));
  });

  const uniqueUrls = Array.from(new Set(policyUrls));
  return uniqueUrls;
}

/**
 * To verify whether two URLs are at the same location, we need to strip the hash.
 * This function does that.
 */
function getResourceUrl(urlWithHash: UrlString): UrlString {
  const url = new URL(urlWithHash);
  url.hash = "";
  return url.href;
}
