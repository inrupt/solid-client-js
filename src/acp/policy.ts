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

import { acp, rdf } from "../constants";
import {
  internal_toIriString,
  SolidDataset,
  ThingPersisted,
  Url,
  UrlString,
} from "../interfaces";
import { internal_defaultFetchOptions } from "../resource/resource";
import {
  createSolidDataset,
  saveSolidDatasetAt,
} from "../resource/solidDataset";
import { getUrl, getUrlAll } from "../thing/get";
import { setUrl } from "../thing/set";
import {
  createThing,
  getThing,
  getThingAll,
  isThingLocal,
  removeThing,
  setThing,
} from "../thing/thing";

export type PolicyDataset = SolidDataset;
export type Policy = ThingPersisted;

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Initialise a new empty [[SolidDataset]] to story [[Policy]]'s in.
 */
export const createPolicyDataset = createSolidDataset;

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Mark a given [[SolidDataset]] as containing [[Policy]]'s, and save it to the given URL.
 *
 * @param url URL to save this Access Policy SolidDataset at.
 * @param dataset The SolidDataset containing Access Policies to save.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 */
export async function savePolicyDatasetAt(
  url: Url | UrlString,
  dataset: PolicyDataset,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): ReturnType<typeof saveSolidDatasetAt> {
  url = internal_toIriString(url);
  let datasetThing = getThing(dataset, url) ?? createThing({ url: url });
  datasetThing = setUrl(datasetThing, rdf.type, acp.AccessPolicyResource);
  dataset = setThing(dataset, datasetThing);

  return saveSolidDatasetAt(url, dataset, options);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Initialise a new, empty [[Policy]].
 *
 * @param url URL that identifies this Access Policy.
 */
export function createPolicy(url: Url | UrlString): Policy {
  const stringUrl = internal_toIriString(url);
  let policyThing = createThing({ url: stringUrl });
  policyThing = setUrl(policyThing, rdf.type, acp.AccessPolicy);

  return policyThing;
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Get the [[Policy]] with the given URL from an [[PolicyDataset]].
 *
 * @param policyResource The Resource that contains the given Access Policy.
 * @param url URL that identifies this Access Policy.
 * @returns The requested Access Policy, if it exists, or `null` if it does not.
 */
export function getPolicy(
  policyResource: PolicyDataset,
  url: Url | UrlString
): Policy | null {
  const foundThing = getThing(policyResource, url);
  if (
    foundThing === null ||
    getUrl(foundThing, rdf.type) !== acp.AccessPolicy
  ) {
    return null;
  }

  return foundThing;
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Get all [[Policy]]'s in a given [[PolicyDataset]].
 *
 * @param policyResource The Resource that contains Access Policies.
 */
export function getPolicyAll(policyResource: PolicyDataset): Policy[] {
  const foundThings = getThingAll(policyResource);
  const foundPolicies = foundThings.filter(
    (thing) =>
      !isThingLocal(thing) &&
      getUrlAll(thing, rdf.type).includes(acp.AccessPolicy)
  ) as Policy[];
  return foundPolicies;
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Remove the given [[Policy]] from the given [[PolicyDataset]].
 *
 * @param policyResource The Resource that contains Access Policies.
 * @param policy The Access Policy to remove from the Access Policy Resource.
 */
export function removePolicy(
  policyResource: PolicyDataset,
  policy: Url | UrlString | Policy
): PolicyDataset {
  return removeThing(policyResource, policy);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Insert the given [[Policy]] into the given [[PolicyDataset]], replacing previous instances of that Policy.
 *
 * @param policyResource The Resource that contains Access Policies.
 * @param policy The Access Policy to insert into the Access Policy Resource.
 * @returns A new Access Policy Resource equal to the given Access Policy Resource, but with the given Access Policy.
 */
export function setPolicy(
  policyResource: PolicyDataset,
  policy: Policy
): PolicyDataset {
  return setThing(policyResource, policy);
}
