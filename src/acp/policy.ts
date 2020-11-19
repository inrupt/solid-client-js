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
import { SolidDataset, ThingPersisted, Url, UrlString } from "../interfaces";
import { internal_toIriString } from "../interfaces.internal";
import { addIri } from "../thing/add";
import { getIriAll, getUrl, getUrlAll } from "../thing/get";
import { removeAll } from "../thing/remove";
import { setUrl } from "../thing/set";
import {
  createThing,
  getThing,
  getThingAll,
  isThingLocal,
  removeThing,
  setThing,
} from "../thing/thing";

export type Policy = ThingPersisted;
export type AccessModes = {
  read: boolean;
  append: boolean;
  write: boolean;
};

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Initialise a new, empty [[Policy]].
 *
 * @param url URL that identifies this Policy.
 */
export function createPolicy(url: Url | UrlString): Policy {
  const stringUrl = internal_toIriString(url);
  let policyThing = createThing({ url: stringUrl });
  policyThing = setUrl(policyThing, rdf.type, acp.Policy);

  return policyThing;
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Get the [[Policy]] with the given URL from an [[PolicyDataset]].
 *
 * @param policyResource The Resource that contains the given Policy.
 * @param url URL that identifies this Policy.
 * @returns The requested Policy, if it exists, or `null` if it does not.
 */
export function getPolicy(
  policyResource: SolidDataset,
  url: Url | UrlString
): Policy | null {
  const foundThing = getThing(policyResource, url);
  if (foundThing === null || getUrl(foundThing, rdf.type) !== acp.Policy) {
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
export function getPolicyAll(policyResource: SolidDataset): Policy[] {
  const foundThings = getThingAll(policyResource);
  const foundPolicies = foundThings.filter(
    (thing) =>
      !isThingLocal(thing) && getUrlAll(thing, rdf.type).includes(acp.Policy)
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
 * @param policy The Policy to remove from the resource.
 */
export function removePolicy(
  policyResource: SolidDataset,
  policy: Url | UrlString | Policy
): SolidDataset {
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
 * @param policy The Policy to insert into the Resource.
 * @returns A new dataset equal to the given resource, but with the given Policy.
 */
export function setPolicy(
  policyResource: SolidDataset,
  policy: Policy
): SolidDataset {
  return setThing(policyResource, policy);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Given a [[Policy]] and a set of [[AccessModes]], return a new Policy based on the given
 * Policy, but with the given Access Modes allowed on it.
 *
 * @param policy The Policy on which to set the modes to allow.
 * @param modes Modes to allow for this Policy.
 */
export function setAllowModes(policy: Policy, modes: AccessModes): Policy {
  let newPolicy = removeAll(policy, acp.allow);

  if (modes.read === true) {
    newPolicy = addIri(newPolicy, acp.allow, acp.Read);
  }
  if (modes.append === true) {
    newPolicy = addIri(newPolicy, acp.allow, acp.Append);
  }
  if (modes.write === true) {
    newPolicy = addIri(newPolicy, acp.allow, acp.Write);
  }

  return newPolicy;
}
/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Given a [[Policy]], return which [[AccessModes]] it allows.
 *
 * @param policy The Policy for which you want to know the Access Modes it allows.
 */
export function getAllowModes(policy: Policy): AccessModes {
  const allowedModes = getIriAll(policy, acp.allow);
  return {
    read: allowedModes.includes(acp.Read),
    append: allowedModes.includes(acp.Append),
    write: allowedModes.includes(acp.Write),
  };
}
/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Given a [[Policy]] and a set of [[AccessModes]], return a new Policy based on the given
 * Policy, but with the given Access Modes disallowed on it.
 *
 * @param policy The Policy on which to set the modes to disallow.
 * @param modes Modes to disallow for this Policy.
 */
export function setDenyModes(policy: Policy, modes: AccessModes): Policy {
  let newPolicy = removeAll(policy, acp.deny);

  if (modes.read === true) {
    newPolicy = addIri(newPolicy, acp.deny, acp.Read);
  }
  if (modes.append === true) {
    newPolicy = addIri(newPolicy, acp.deny, acp.Append);
  }
  if (modes.write === true) {
    newPolicy = addIri(newPolicy, acp.deny, acp.Write);
  }

  return newPolicy;
}
/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Given a [[Policy]], return which [[AccessModes]] it disallows.
 *
 * @param policy The Policy on which you want to know the Access Modes it disallows.
 */
export function getDenyModes(policy: Policy): AccessModes {
  const deniedModes = getIriAll(policy, acp.deny);
  return {
    read: deniedModes.includes(acp.Read),
    append: deniedModes.includes(acp.Append),
    write: deniedModes.includes(acp.Write),
  };
}
