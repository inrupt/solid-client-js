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

import { internal_accessModeIriStrings } from "../acl/acl.internal";
import { acp, rdf } from "../constants";
import { internal_isValidUrl, isNamedNode } from "../datatypes";
import { SolidDataset, ThingPersisted, Url, UrlString } from "../interfaces";
import { internal_toIriString } from "../interfaces.internal";
import { getSourceUrl } from "../resource/resource";
import { addIri } from "../thing/add";
import { getIriAll } from "../thing/get";
import { removeAll } from "../thing/remove";
import { setUrl } from "../thing/set";
import {
  asUrl,
  createThing,
  getThing,
  getThingAll,
  isThingLocal,
  removeThing,
  setThing,
} from "../thing/thing";
import { WithAccessibleAcr } from "./acp";
import {
  addAcrPolicyUrl,
  addPolicyUrl,
  getAcrPolicyUrlAll,
  getPolicyUrlAll,
  removeAcrPolicyUrl,
  removePolicyUrl,
} from "./control";
import { internal_getAcr, internal_setAcr } from "./control.internal";
import {
  getNoneOfRuleUrlAll,
  getAnyOfRuleUrlAll,
  getAllOfRuleUrlAll,
} from "./rule";

/**
 * A Policy can be applied to Resources to grant or deny [[AccessModes]] to users who match the Policy's [[Rule]]s.
 * @since 1.6.0
 */
export type Policy = ThingPersisted;
/**
 * A Resource Policy is like a regular [[Policy]], but rather than being re-used for different Resources, it is used for a single Resource and is stored in that Resource's Access Control Resource.
 * @since 1.6.0
 */
export type ResourcePolicy = ThingPersisted;
/**
 * The different Access Modes that a [[Policy]] can allow or deny for a Resource.
 * @since 1.6.0
 */
export type AccessModes = {
  read: boolean;
  append: boolean;
  write: boolean;
};

/**
 * @param thing the [[Thing]] to check to see if it's an ACP Policy or not
 */
function isPolicy(thing: ThingPersisted): thing is Policy {
  return getIriAll(thing, rdf.type).includes(acp.Policy);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Initialise a new, empty [[Policy]].
 *
 * @param url URL that identifies this Policy.
 * @since 1.6.0
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
 * Get the [[Policy]] with the given URL from an [[SolidDataset]].
 *
 * @param policyResource The Resource that contains the given Policy.
 * @param url URL that identifies this Policy.
 * @returns The requested Policy, if it exists, or `null` if it does not.
 * @since 1.6.0
 */
export function getPolicy(
  policyResource: SolidDataset,
  url: Url | UrlString
): Policy | null {
  const foundThing = getThing(policyResource, url);
  if (foundThing === null || !isPolicy(foundThing)) {
    return null;
  }

  return foundThing;
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Get all [[Policy]]'s in a given [[SolidDataset]].
 *
 * @param policyResource The Resource that contains Access Policies.
 * @since 1.6.0
 */
export function getPolicyAll(policyResource: SolidDataset): Policy[] {
  const foundThings = getThingAll(policyResource);
  const foundPolicies = foundThings.filter(
    (thing) => !isThingLocal(thing) && isPolicy(thing)
  ) as Policy[];
  return foundPolicies;
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Remove the given [[Policy]] from the given [[SolidDataset]].
 *
 * @param policyResource The Resource that contains Access Policies.
 * @param policy The Policy to remove from the resource.
 * @since 1.6.0
 */
export function removePolicy<Dataset extends SolidDataset>(
  policyResource: Dataset,
  policy: Url | UrlString | Policy
): Dataset {
  return removeThing(policyResource, policy);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Insert the given [[Policy]] into the given [[SolidDataset]], replacing previous instances of that Policy.
 *
 * @param policyResource The Resource that contains Access Policies.
 * @param policy The Policy to insert into the Resource.
 * @returns A new dataset equal to the given resource, but with the given Policy.
 * @since 1.6.0
 */
export function setPolicy<Dataset extends SolidDataset>(
  policyResource: Dataset,
  policy: Policy
): Dataset {
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
 * @since Not released yet.
 */
export function setAllowModesV2<P extends Policy | ResourcePolicy>(
  policy: P,
  modes: AccessModes
): P {
  let newPolicy = removeAll(policy, acp.allow);

  if (modes.read === true) {
    newPolicy = addIri(
      newPolicy,
      acp.allow,
      internal_accessModeIriStrings.read
    );
  }
  if (modes.append === true) {
    newPolicy = addIri(
      newPolicy,
      acp.allow,
      internal_accessModeIriStrings.append
    );
  }
  if (modes.write === true) {
    newPolicy = addIri(
      newPolicy,
      acp.allow,
      internal_accessModeIriStrings.write
    );
  }

  return newPolicy;
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
 * @since 1.6.0
 * @deprecated The Access Control Policies proposal will be updated to use a different vocabulary for allow- and deny-modes. To be compatible with servers that implement that, use [[setAllowModesV2]].
 */
export function setAllowModesV1<P extends Policy | ResourcePolicy>(
  policy: P,
  modes: AccessModes
): P {
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
 * See [[setAllowModesV1]]. Will be updated to point to [[setAllowModesV2]] when pod.inrupt.com is transitioned to the updated vocabulary.
 */
export const setAllowModes = setAllowModesV1;
/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Given a [[Policy]], return which [[AccessModes]] it allows.
 *
 * @param policy The Policy for which you want to know the Access Modes it allows.
 * @since Not released yet.
 */
export function getAllowModesV2<P extends Policy | ResourcePolicy>(
  policy: P
): AccessModes {
  const allowedModes = getIriAll(policy, acp.allow);
  return {
    read: allowedModes.includes(internal_accessModeIriStrings.read),
    append: allowedModes.includes(internal_accessModeIriStrings.append),
    write: allowedModes.includes(internal_accessModeIriStrings.write),
  };
}
/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Given a [[Policy]], return which [[AccessModes]] it allows.
 *
 * @param policy The Policy for which you want to know the Access Modes it allows.
 * @since 1.6.0
 * @deprecated The Access Control Policies proposal will be updated to use a different vocabulary for allow- and deny-modes. To be compatible with servers that implement that, use [[getAllowModesV2]].
 */
export function getAllowModesV1<P extends Policy | ResourcePolicy>(
  policy: P
): AccessModes {
  const allowedModes = getIriAll(policy, acp.allow);
  return {
    read: allowedModes.includes(acp.Read),
    append: allowedModes.includes(acp.Append),
    write: allowedModes.includes(acp.Write),
  };
}
/**
 * See [[getAllowModesV1]]. Will be updated to point to [[getAllowModesV2]] when pod.inrupt.com is transitioned to the updated vocabulary.
 */
export const getAllowModes = getAllowModesV1;
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
 * @since Not released yet.
 */
export function setDenyModesV2<P extends Policy | ResourcePolicy>(
  policy: P,
  modes: AccessModes
): P {
  let newPolicy = removeAll(policy, acp.deny);

  if (modes.read === true) {
    newPolicy = addIri(newPolicy, acp.deny, internal_accessModeIriStrings.read);
  }
  if (modes.append === true) {
    newPolicy = addIri(
      newPolicy,
      acp.deny,
      internal_accessModeIriStrings.append
    );
  }
  if (modes.write === true) {
    newPolicy = addIri(
      newPolicy,
      acp.deny,
      internal_accessModeIriStrings.write
    );
  }

  return newPolicy;
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
 * @since 1.6.0
 * @deprecated The Access Control Policies proposal will be updated to use a different vocabulary for allow- and deny-modes. To be compatible with servers that implement that, use [[setDenyModesV2]].
 */
export function setDenyModesV1<P extends Policy | ResourcePolicy>(
  policy: P,
  modes: AccessModes
): P {
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
 * See [[setDenyModesV1]]. Will be updated to point to [[setDenyModesV2]] when pod.inrupt.com is transitioned to the updated vocabulary.
 */
export const setDenyModes = setDenyModesV1;
/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Given a [[Policy]], return which [[AccessModes]] it disallows.
 *
 * @param policy The Policy on which you want to know the Access Modes it disallows.
 * @since Not released yet.
 */
export function getDenyModesV2<P extends Policy | ResourcePolicy>(
  policy: P
): AccessModes {
  const deniedModes = getIriAll(policy, acp.deny);
  return {
    read: deniedModes.includes(internal_accessModeIriStrings.read),
    append: deniedModes.includes(internal_accessModeIriStrings.append),
    write: deniedModes.includes(internal_accessModeIriStrings.write),
  };
}
/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Given a [[Policy]], return which [[AccessModes]] it disallows.
 *
 * @param policy The Policy on which you want to know the Access Modes it disallows.
 * @since 1.6.0
 * @deprecated The Access Control Policies proposal will be updated to use a different vocabulary for allow- and deny-modes. To be compatible with servers that implement that, use [[getDenyModesV2]].
 */
export function getDenyModesV1<P extends Policy | ResourcePolicy>(
  policy: P
): AccessModes {
  const deniedModes = getIriAll(policy, acp.deny);
  return {
    read: deniedModes.includes(acp.Read),
    append: deniedModes.includes(acp.Append),
    write: deniedModes.includes(acp.Write),
  };
}
/**
 * See [[getDenyModesV1]]. Will be updated to point to [[getDenyModesV2]] when pod.inrupt.com is transitioned to the updated vocabulary.
 */
export const getDenyModes = getDenyModesV1;

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Initialise a new, empty [[ResourcePolicy]] for the given Resource.
 *
 * @param resourceWithAcr The Resource to which the Policy is to apply.
 * @param name The name that identifies this Policy.
 * @since 1.6.0
 */
export function createResourcePolicyFor(
  resourceWithAcr: WithAccessibleAcr,
  name: string
): ResourcePolicy {
  const acr = internal_getAcr(resourceWithAcr);
  const url = new URL(getSourceUrl(acr));
  url.hash = `#${name}`;
  let policyThing = createThing({ url: url.href });
  policyThing = setUrl(policyThing, rdf.type, acp.Policy);

  return policyThing;
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Get the [[ResourcePolicy]] with the given name that applies to a Resource
 * from its Access Control Resource.
 *
 * @param resourceWithAcr The Resource whose ACR contains the given Policy.
 * @param name The name that identifies this Policy.
 * @returns The requested Policy, if it exists and applies to the given Resource, or `null` if it does not.
 * @since 1.6.0
 */
export function getResourcePolicy(
  resourceWithAcr: WithAccessibleAcr,
  name: string
): ResourcePolicy | null {
  const acr = internal_getAcr(resourceWithAcr);
  const acrUrl = getSourceUrl(acr);
  const url = new URL(acrUrl);
  url.hash = `#${name}`;
  const foundThing = getThing(acr, url.href);
  if (
    !getPolicyUrlAll(resourceWithAcr).includes(url.href) ||
    foundThing === null ||
    !isPolicy(foundThing)
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
 * Get the [[ResourcePolicy]] with the given name that applies to a Resource's
 * Access Control Resource from that Access Control Resource.
 *
 * @param resourceWithAcr The Resource whose ACR contains the given Policy.
 * @param name The name that identifies this Policy.
 * @returns The requested Policy, if it exists and applies to the Resource's ACR, or `null` if it does not.
 * @since 1.6.0
 */
export function getResourceAcrPolicy(
  resourceWithAcr: WithAccessibleAcr,
  name: string
): ResourcePolicy | null {
  const acr = internal_getAcr(resourceWithAcr);
  const acrUrl = getSourceUrl(acr);
  const url = new URL(acrUrl);
  url.hash = `#${name}`;
  const foundThing = getThing(acr, url.href);
  if (
    !getAcrPolicyUrlAll(resourceWithAcr).includes(url.href) ||
    foundThing === null ||
    !isPolicy(foundThing)
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
 * Get all [[ResourcePolicy]]'s that apply to a Resource in its Access Control
 * Resource.
 *
 * @param resourceWithAcr The Resource whose Access Control Resource contains Access Policies applying to it.
 * @since 1.6.0
 */
export function getResourcePolicyAll(
  resourceWithAcr: WithAccessibleAcr
): ResourcePolicy[] {
  const acr = internal_getAcr(resourceWithAcr);
  const policyUrls = getPolicyUrlAll(resourceWithAcr);
  const foundThings = policyUrls.map((policyUrl) => getThing(acr, policyUrl));
  const foundPolicies = foundThings.filter(
    (thing) => thing !== null && isPolicy(thing)
  ) as ResourcePolicy[];
  return foundPolicies;
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Get all [[ResourcePolicy]]'s that apply to a given Resource's Access Control
 * Resource from that Access Control Resource.
 *
 * @param resourceWithAcr The Resource whose Access Control Resource contains Access Policies.
 * @since 1.6.0
 */
export function getResourceAcrPolicyAll(
  resourceWithAcr: WithAccessibleAcr
): ResourcePolicy[] {
  const acr = internal_getAcr(resourceWithAcr);
  const policyUrls = getAcrPolicyUrlAll(resourceWithAcr);
  const foundThings = policyUrls.map((policyUrl) => getThing(acr, policyUrl));
  const foundPolicies = foundThings.filter(
    (thing) => thing !== null && isPolicy(thing)
  ) as ResourcePolicy[];
  return foundPolicies;
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Remove the given [[ResourcePolicy]] from the given Resource's Access Control
 * Resource.
 *
 * @param resourceWithAcr The Resource whose Access Control Resource contains Access Policies.
 * @param policy The Policy to remove from the Resource's Access Control Resource.
 * @since 1.6.0
 */
export function removeResourcePolicy<ResourceExt extends WithAccessibleAcr>(
  resourceWithAcr: ResourceExt,
  policy: string | Url | UrlString | ResourcePolicy
): ResourceExt {
  const acr = internal_getAcr(resourceWithAcr);
  let policyToRemove = policy;
  if (typeof policyToRemove === "string") {
    if (internal_isValidUrl(policyToRemove) === false) {
      // If the given Policy to remove is the name of the Policy,
      // resolve it to its full URL — developers usually refer to either the
      // Policy itself, or by its name, as they do not have access to the ACR
      // directly.
      const policyUrl = new URL(getSourceUrl(acr));
      policyUrl.hash = `#${policy}`;
      policyToRemove = policyUrl.href;
    }
  }
  let policyUrlString: UrlString;
  if (typeof policyToRemove === "string") {
    policyUrlString = policyToRemove;
  } else if (isNamedNode(policyToRemove)) {
    policyUrlString = internal_toIriString(policyToRemove);
  } else {
    policyUrlString = asUrl(policyToRemove, getSourceUrl(acr));
  }

  // Check whether the actual Policy (i.e. with the Policy type) exists:
  const matchingRule = getResourcePolicy(
    resourceWithAcr,
    new URL(policyUrlString).hash.substring(1)
  );
  if (matchingRule === null) {
    // No such Policy exists yet, so return the Resource+ACR unchanged:
    return resourceWithAcr;
  }

  const updatedAcr = removeThing(acr, policyToRemove);
  const updatedResource = internal_setAcr(resourceWithAcr, updatedAcr);
  return removePolicyUrl(updatedResource, policyUrlString);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Remove the given [[ResourcePolicy]] that applies to a given Resource's Access
 * Control Resource from that Access Control Resource.
 *
 * @param resourceWithAcr The Resource whose Access Control Resource contains Access Policies.
 * @param policy The ACR Policy to remove from the Resource's Access Control Resource.
 * @since 1.6.0
 */
export function removeResourceAcrPolicy<ResourceExt extends WithAccessibleAcr>(
  resourceWithAcr: ResourceExt,
  policy: string | Url | UrlString | ResourcePolicy
): ResourceExt {
  const acr = internal_getAcr(resourceWithAcr);
  let policyToRemove = policy;
  if (typeof policyToRemove === "string") {
    if (internal_isValidUrl(policyToRemove) === false) {
      // If the given Policy to remove is the name of the Policy,
      // resolve it to its full URL — developers usually refer to either the
      // Policy itself, or by its name, as they do not have access to the ACR
      // directly.
      const policyUrl = new URL(getSourceUrl(acr));
      policyUrl.hash = `#${policy}`;
      policyToRemove = policyUrl.href;
    }
  }

  let policyUrlString: string;
  if (typeof policyToRemove === "string") {
    policyUrlString = policyToRemove;
  } else if (isNamedNode(policyToRemove)) {
    policyUrlString = internal_toIriString(policyToRemove);
  } else {
    policyUrlString = asUrl(policyToRemove, getSourceUrl(acr));
  }

  // Check whether the actual Policy (i.e. with the Policy type) exists:
  const matchingRule = getResourceAcrPolicy(
    resourceWithAcr,
    new URL(policyUrlString).hash.substring(1)
  );
  if (matchingRule === null) {
    // No such Policy exists yet, so return the Resource+ACR unchanged:
    return resourceWithAcr;
  }

  const updatedAcr = removeThing(acr, policyToRemove);
  const updatedResource = internal_setAcr(resourceWithAcr, updatedAcr);
  return removeAcrPolicyUrl(updatedResource, policyUrlString);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Insert the given [[ResourcePolicy]] into the given Resource's Acccess Control
 * Resource, replacing previous instances of that Policy.
 *
 * @param resourceWithAcr The Resource whose Access Control Resource contains Access Policies.
 * @param policy The Policy to insert into the Resource's Access Control Resource.
 * @returns A new Resource equal to the given Resource, but with the given Policy in its Access Control Resource.
 * @since 1.6.0
 */
export function setResourcePolicy<ResourceExt extends WithAccessibleAcr>(
  resourceWithAcr: ResourceExt,
  policy: ResourcePolicy
): ResourceExt {
  const acr = internal_getAcr(resourceWithAcr);
  const updatedAcr = setThing(acr, policy);
  const updatedResource = internal_setAcr(resourceWithAcr, updatedAcr);
  const policyUrl = asUrl(policy, getSourceUrl(acr));
  return addPolicyUrl(updatedResource, policyUrl);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Insert the given [[ResourcePolicy]] into the given Resource's Acccess Control
 * Resource, replacing previous instances of that Policy, to apply to the Access
 * Control Resource itself.
 *
 * @param resourceWithAcr The Resource whose Access Control Resource contains Access Policies.
 * @param policy The Policy to insert into the Resource's Access Control Resource.
 * @returns A new Resource equal to the given Resource, but with the given Policy in its Access Control Resource, applying to that Access Control Resource.
 * @since 1.6.0
 */
export function setResourceAcrPolicy<ResourceExt extends WithAccessibleAcr>(
  resourceWithAcr: ResourceExt,
  policy: ResourcePolicy
): ResourceExt {
  const acr = internal_getAcr(resourceWithAcr);
  const updatedAcr = setThing(acr, policy);
  const updatedResource = internal_setAcr(resourceWithAcr, updatedAcr);
  const policyUrl = asUrl(policy, getSourceUrl(acr));
  return addAcrPolicyUrl(updatedResource, policyUrl);
}

/**
 * Gets a human-readable representation of the given [[Policy]] to aid debugging.
 *
 * Note that changes to the exact format of the return value are not considered a breaking change;
 * it is intended to aid in debugging, not as a serialisation method that can be reliably parsed.
 *
 * @param policy The Policy to get a human-readable representation of.
 * @since 1.6.0
 * @deprecated
 */
export function policyAsMarkdown(policy: Policy | ResourcePolicy): string {
  function getStatus(allow: boolean, deny: boolean): string {
    if (deny) {
      return "denied";
    }
    if (allow) {
      return "allowed";
    }
    return "unspecified";
  }
  const allowModes = getAllowModesV1(policy);
  const denyModes = getDenyModesV1(policy);
  let markdown = `## Policy: ${asUrl(policy)}\n\n`;
  markdown += `- Read: ${getStatus(allowModes.read, denyModes.read)}\n`;
  markdown += `- Append: ${getStatus(allowModes.append, denyModes.append)}\n`;
  markdown += `- Write: ${getStatus(allowModes.write, denyModes.write)}\n`;

  const allOfRules = getAllOfRuleUrlAll(policy);
  const anyOfRules = getAnyOfRuleUrlAll(policy);
  const noneOfRules = getNoneOfRuleUrlAll(policy);

  if (
    allOfRules.length === 0 &&
    anyOfRules.length === 0 &&
    noneOfRules.length === 0
  ) {
    markdown += "\n<no rules specified yet>\n";
  }
  if (allOfRules.length > 0) {
    markdown += "\nAll of these rules should match:\n";
    markdown += `- ${allOfRules.join("\n- ")}\n`;
  }
  if (anyOfRules.length > 0) {
    markdown += "\nAt least one of these rules should match:\n";
    markdown += `- ${anyOfRules.join("\n- ")}\n`;
  }
  if (noneOfRules.length > 0) {
    markdown += "\nNone of these rules should match:\n";
    markdown += `- ${noneOfRules.join("\n- ")}\n`;
  }

  return markdown;
}
