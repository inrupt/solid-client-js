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

import { acp, rdf, solid } from "../constants";
import { internal_isValidUrl, isNamedNode } from "../datatypes";
import {
  SolidDataset,
  Thing,
  ThingPersisted,
  Url,
  UrlString,
  WebId,
} from "../interfaces";
import { internal_toIriString } from "../interfaces.internal";
import { getSourceUrl } from "../resource/resource";
import { addIri, addStringNoLocale } from "../thing/add";
import { getIriAll, getStringNoLocaleAll } from "../thing/get";
import { removeIri, removeStringNoLocale } from "../thing/remove";
import { setIri, setUrl } from "../thing/set";
import {
  asUrl,
  createThing,
  getThing,
  getThingAll,
  removeThing,
  setThing,
} from "../thing/thing";
import { WithAccessibleAcr } from "./acp";
import { internal_getAcr, internal_setAcr } from "./control.internal";
import { Policy, ResourcePolicy } from "./policy";

/**
 * A Matcher can be applied to a [[Policy]] to determine under what circumstances that Policy is applied to a Resource.
 * @since Not released yet.
 */
export type Matcher = ThingPersisted;
/**
 * A ResourceMatcher is like a [[Matcher]], but applied to a [[ResourcePolicy]] and therefore not re-used across different Resources, but only used for a single Resource and stored in that Resource's Access Control Resource.
 * @since Not released yet.
 */
export type ResourceMatcher = ThingPersisted;

/**
 * @param thing the [[Thing]] to check to see if it's an ACP Matcher or not
 */
function isMatcher(thing: Thing): thing is Matcher {
  return getIriAll(thing, rdf.type).includes(acp.Matcher);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Add a Matcher that refines the scope of a given the [[Policy]]. If an agent
 * requesting access to a resource is **not** present in **any** of the "All Of" Matchers,
 * they will not be granted access.
 *
 * Also see [[addAnyOfMatcherUrl]] and [[addNoneOfMatcherUrl]].
 *
 * @param policy The [[Policy]] to which the Matcher should be added.
 * @param matcher The Matcher to add to the policy.
 * @returns A new [[Policy]] clone of the original one, with the new Matcher added.
 * @since Not released yet.
 */
export function addAllOfMatcherUrl<P extends Policy | ResourcePolicy>(
  policy: P,
  matcher: Matcher | Url | UrlString
): P {
  return addIri(policy, acp.allOf, matcher);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Removes a Matcher that refines the scope of a given the [[Policy]]. If an agent
 * requesting access to a resource is **not** present in **any** of the "All Of" Matchers,
 * they will not be granted access.
 * @param policy The [[Policy]] from which the Matcher should be removed.
 * @param matcher The Matcher to remove from the policy.
 * @returns A new [[Policy]] clone of the original one, with the Matcher removed.
 * @since Not released yet.
 */
export function removeAllOfMatcherUrl<P extends Policy | ResourcePolicy>(
  policy: P,
  matcher: Matcher | Url | UrlString
): P {
  return removeIri(policy, acp.allOf, matcher);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Overwrites the Matcher refining the scope of a given the [[Policy]]. If an agent
 * requesting access to a resource is **not** present in **any** of the "All Of" Matchers,
 * they will not be granted access.
 * @param policy The [[Policy]] to which the Matcher should be added.
 * @param matcher The Matcher to set for the Policy.
 * @returns A new [[Policy]] clone of the original one, with the "All Of" Matchers replaced.
 * @since Not released yet.
 */
export function setAllOfMatcherUrl<P extends Policy | ResourcePolicy>(
  policy: P,
  matcher: Matcher | Url | UrlString
): P {
  return setIri(policy, acp.allOf, matcher);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Get the "All Of" [[Matcher]]s for the given [[Policy]]
 * @param policy The [[policy]] from which the Matchers should be read.
 * @returns A list of the "All Of" [[Matcher]]s
 * @since Not released yet.
 */
export function getAllOfMatcherUrlAll<P extends Policy | ResourcePolicy>(
  policy: P
): UrlString[] {
  return getIriAll(policy, acp.allOf);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Add a Matcher that extends the scope of a given the [[Policy]]. If an agent
 * requesting access to a resource is present in **any** of the "Any Of" Matchers,
 * they will be granted access.
 *
 * Also see [[addAllOfMatcherUrl]] and [[addNoneOfMatcherUrl]].
 *
 * @param policy The [[Policy]] to which the Matcher should be added.
 * @param matcher The Matcher to add to the policy.
 * @returns A new [[Policy]] clone of the original one, with the new Matcher added.
 * @since Not released yet.
 */
export function addAnyOfMatcherUrl<P extends Policy | ResourcePolicy>(
  policy: P,
  matcher: Matcher | Url | UrlString
): P {
  return addIri(policy, acp.anyOf, matcher);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Removes a Matcher that extends the scope of a given the [[Policy]]. If an agent
 * requesting access to a resource is present in **any** of the "Any Of" Matchers,
 * they will be granted access.
 * @param policy The [[Policy]] from which the Matcher should be removed.
 * @param matcher The Matcher to remove from the policy.
 * @returns A new [[Policy]] clone of the original one, with the Matcher removed.
 * @since Not released yet.
 */
export function removeAnyOfMatcherUrl<P extends Policy | ResourcePolicy>(
  policy: P,
  matcher: Matcher | Url | UrlString
): P {
  return removeIri(policy, acp.anyOf, matcher);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Overwrite the Matcher extending the scope of a given the [[Policy]]. If an agent
 * requesting access to a resource is present in **any** of the "Any Of" Matchers,
 * they will be granted access.
 * @param policy The [[Policy]] to which the Matcher should be added.
 * @param matcher The Matcher to set for the Policy.
 * @returns A new [[Policy]] clone of the original one, with the "Any Of" Matchers replaced.
 * @since Not released yet.
 */
export function setAnyOfMatcherUrl<P extends Policy | ResourcePolicy>(
  policy: P,
  matcher: Matcher | Url | UrlString
): P {
  return setIri(policy, acp.anyOf, matcher);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Get the "Any Of" [[Matcher]]s for the given [[Policy]]
 * @param policy The [[policy]] from which the Matchers should be read.
 * @returns A list of the "Any Of" [[Matcher]]s
 * @since Not released yet.
 */
export function getAnyOfMatcherUrlAll<P extends Policy | ResourcePolicy>(
  policy: P
): UrlString[] {
  return getIriAll(policy, acp.anyOf);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Add a Matcher that restricts the scope of a given the [[Policy]]. If an agent
 * requesting access to a resource is matched by another Matcher, but **also**
 * by the given Matcher, they will **not** be granted access.
 *
 * Also see [[addAllOfMatcherUrl]] and [[addAnyOfMatcherUrl]].
 *
 * @param policy The [[Policy]] to which the Matcher should be added.
 * @param matcher The Matcher to add to the policy.
 * @returns A new [[Policy]] clone of the original one, with the new Matcher added.
 * @since Not released yet.
 */
export function addNoneOfMatcherUrl<P extends Policy | ResourcePolicy>(
  policy: P,
  matcher: Matcher | Url | UrlString
): P {
  return addIri(policy, acp.noneOf, matcher);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Removes a Matcher that restricts the scope of a given the [[Policy]]. If an agent
 * requesting access to a resource is matched by another Matcher, but **also**
 * in any of the "None Of" Matchers, they will **not** be granted access.
 *
 * @param policy The [[Policy]] from which the Matcher should be removed.
 * @param matcher The Matcher to remove from the policy.
 * @returns A new [[Policy]] clone of the original one, with the Matcher removed.
 * @since Not released yet.
 */
export function removeNoneOfMatcherUrl<P extends Policy | ResourcePolicy>(
  policy: P,
  matcher: Matcher | Url | UrlString
): P {
  return removeIri(policy, acp.noneOf, matcher);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Set the Matchers restricting the scope of a given [[Policy]]. If an agent
 * requesting access to a resource is matched by another Matcher, but **also**
 * by any of the "None Of" Matchers, they will not be granted access.
 *
 * @param policy The [[Policy]] to which the Matcher should be added.
 * @param matcher The Matcher to set for the Policy.
 * @returns A new [[Policy]] clone of the original one, with the "None Of" Matchers replaced.
 * @since Not released yet.
 */
export function setNoneOfMatcherUrl<P extends Policy | ResourcePolicy>(
  policy: P,
  matcher: Matcher | Url | UrlString
): P {
  return setIri(policy, acp.noneOf, matcher);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Get the "None Of" [[Matcher]]s for the given [[Policy]]
 * @param policy The [[policy]] from which the Matchers should be read.
 * @returns A list of the forbidden [[Matcher]]s
 * @since Not released yet.
 */
export function getNoneOfMatcherUrlAll<P extends Policy | ResourcePolicy>(
  policy: P
): UrlString[] {
  return getIriAll(policy, acp.noneOf);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Initialise a new, empty [[Matcher]].
 *
 * @param url URL that identifies this [[Matcher]].
 * @since Not released yet.
 */
export function createMatcher(url: Url | UrlString): Matcher {
  const stringUrl = internal_toIriString(url);
  let matcherThing = createThing({ url: stringUrl });
  matcherThing = setUrl(matcherThing, rdf.type, acp.Matcher);
  return matcherThing;
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Initialise a new, empty [[ResourceMatcher]] for the given Resource.
 *
 * @param resourceWithAcr The Resource to which the new Matcher is to apply.
 * @param name Name that identifies this [[Matcher]].
 * @since Not released yet.
 */
export function createResourceMatcherFor(
  resourceWithAcr: WithAccessibleAcr,
  name: string
): ResourceMatcher {
  const acr = internal_getAcr(resourceWithAcr);
  const url = new URL(getSourceUrl(acr));
  url.hash = `#${name}`;
  let matcherThing = createThing({ url: url.href });
  matcherThing = setUrl(matcherThing, rdf.type, acp.Matcher);
  return matcherThing;
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Get the [[Matcher]] with the given URL from an [[SolidDataset]].
 *
 * @param matcherResource The Resource that contains the given [[Matcher]].
 * @param url URL that identifies this [[Matcher]].
 * @returns The requested [[Matcher]], if it exists, or `null` if it does not.
 * @since Not released yet.
 */
export function getMatcher(
  matcherResource: SolidDataset,
  url: Url | UrlString
): Matcher | null {
  const foundThing = getThing(matcherResource, url);
  if (foundThing === null || !isMatcher(foundThing)) {
    return null;
  }
  return foundThing;
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Get the [[ResourceMatcher]] with the given name from an Resource's Access Control
 * Resource.
 *
 * @param resourceWithAcr The Resource whose Access Control Resource contains the given [[ResourceMatcher]].
 * @param name Name that identifies this [[ResourceMatcher]].
 * @returns The requested [[ResourceMatcher]], if it exists, or `null` if it does not.
 * @since Not released yet.
 */
export function getResourceMatcher(
  resourceWithAcr: WithAccessibleAcr,
  name: string
): ResourceMatcher | null {
  const acr = internal_getAcr(resourceWithAcr);
  const acrUrl = getSourceUrl(acr);
  const url = new URL(acrUrl);
  url.hash = `#${name}`;
  const foundThing = getThing(acr, url.href);
  if (foundThing === null || !isMatcher(foundThing)) {
    return null;
  }
  return foundThing;
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Gets the [[Matcher]]s from a [[SolidDataset]].
 *
 * @param matcherResource The Resource that contains (zero or more) [[Matcher]]s.
 * @returns The [[Matcher]]s contained in this resource.
 * @since Not released yet.
 */
export function getMatcherAll(matcherResource: SolidDataset): Matcher[] {
  const things = getThingAll(matcherResource);
  return things.filter(isMatcher);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Gets the [[ResourceMatcher]]s from a Resource's Access Control Resource.
 *
 * @param resourceWithAcr The Resource whose Access Control Resource contains (zero or more) [[ResourceMatcher]]s.
 * @returns The [[ResourceMatcher]]s contained in this Resource's Access Control Resource.
 * @since Not released yet.
 */
export function getResourceMatcherAll(
  resourceWithAcr: WithAccessibleAcr
): ResourceMatcher[] {
  const acr = internal_getAcr(resourceWithAcr);
  const things = getThingAll(acr);
  return things.filter(isMatcher);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Removes the given [[Matcher]] from the given [[SolidDataset]].
 *
 * @param matcherResource The Resource that contains (zero or more) [[Matcher]]s.
 * @returns A new SolidDataset equal to the given Matcher Resource, but without the given Matcher.
 * @since Not released yet.
 */
export function removeMatcher<Dataset extends SolidDataset>(
  matcherResource: Dataset,
  matcher: Url | UrlString | Matcher
): Dataset {
  return removeThing(matcherResource, matcher);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Removes the given [[ResourceMatcher]] from the given Resource's Access Control Resource.
 *
 * @param resourceWithAcr The Resource whose Access Control Resource contains (zero or more) [[ResourceMatcher]]s.
 * @returns A new Resource equal to the given Resource, but without the given Matcher in its ACR.
 * @since Not released yet.
 */
export function removeResourceMatcher<ResourceExt extends WithAccessibleAcr>(
  resourceWithAcr: ResourceExt,
  matcher: string | Url | UrlString | ResourceMatcher
): ResourceExt {
  const acr = internal_getAcr(resourceWithAcr);
  let matcherToRemove: UrlString;
  if (typeof matcher === "string") {
    if (internal_isValidUrl(matcher)) {
      matcherToRemove = matcher;
    } else {
      // If the given Matcher to remove is the name of the Matcher,
      // resolve it to its full URL — developers usually refer to either the
      // Matcher itself, or by its name, as they do not have access to the ACR
      // directly.
      const matcherUrl = new URL(getSourceUrl(acr));
      matcherUrl.hash = `#${matcher}`;
      matcherToRemove = matcherUrl.href;
    }
  } else if (isNamedNode(matcher)) {
    matcherToRemove = internal_toIriString(matcher);
  } else {
    matcherToRemove = asUrl(matcher);
  }

  // Check whether the actual Matcher (i.e. with the Matcher type) exists:
  const matchingMatcher = getResourceMatcher(
    resourceWithAcr,
    new URL(matcherToRemove).hash.substring(1)
  );
  if (matchingMatcher === null) {
    // No such Matcher exists yet, so return the Resource+ACR unchanged:
    return resourceWithAcr;
  }

  const updatedAcr = removeThing(acr, matchingMatcher);
  const updatedResource = internal_setAcr(resourceWithAcr, updatedAcr);
  return updatedResource;
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Insert the given [[Matcher]] into the given [[SolidDataset]], replacing previous
 * instances of that Matcher.
 *
 * @param matcherResource The Resource that contains (zero or more) [[Matcher]]s.
 * @returns A new SolidDataset equal to the given Matcher Resource, but with the given Matcher.
 * @since Not released yet.
 */
export function setMatcher<Dataset extends SolidDataset>(
  matcherResource: Dataset,
  matcher: Matcher
): Dataset {
  return setThing(matcherResource, matcher);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Insert the given [[ResourceMatcher]] into the given Resource's Access Control Resource,
 * replacing previous instances of that Matcher.
 *
 * @param resourceWithAcr The Resource whose Access Control Resource contains (zero or more) [[ResourceMatcher]]s.
 * @returns A new Resource equal to the given Resource, but with the given Matcher in its ACR.
 * @since Not released yet.
 */
export function setResourceMatcher<ResourceExt extends WithAccessibleAcr>(
  resourceWithAcr: ResourceExt,
  matcher: ResourceMatcher
): ResourceExt {
  const acr = internal_getAcr(resourceWithAcr);
  const updatedAcr = setThing(acr, matcher);
  const updatedResource = internal_setAcr(resourceWithAcr, updatedAcr);
  return updatedResource;
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * List all the agents a [[Matcher]] applies **directly** to. This will not include agents
 * that are matched on a property other than their WebID.
 *
 * @param matcher The matcher from which agents are read.
 * @returns A list of the WebIDs of agents included in the matcher.
 * @since Not released yet.
 */
export function getAgentAll(matcher: Matcher): WebId[] {
  return getIriAll(matcher, acp.agent).filter(
    (agent: WebId) =>
      agent !== acp.PublicAgent &&
      agent !== acp.AuthenticatedAgent &&
      agent !== acp.CreatorAgent
  );
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Overwrite the agents the [[Matcher]] applies to with the provided agents.
 *
 * @param matcher The matcher for which agents are set.
 * @param agent The agent the matcher should apply to.
 * @returns A copy of the input matcher, applying to a different set of agents.
 * @since Not released yet.
 */
export function setAgent(matcher: Matcher, agent: WebId): Matcher {
  // Preserve the special agent classes authenticated and public, which we
  // don't want to overwrite with this function.
  const isPublic = hasPublic(matcher);
  const isAuthenticated = hasAuthenticated(matcher);
  const isCreator = hasCreator(matcher);
  let result = setIri(matcher, acp.agent, agent);
  // Restore public and authenticated
  if (isPublic) {
    result = setPublic(result);
  }
  if (isAuthenticated) {
    result = setAuthenticated(result);
  }
  if (isCreator) {
    result = setCreator(result);
  }
  return result;
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Apply the [[Matcher]] to an additional agent.
 *
 * @param matcher The [[Matcher]] to be applied to an additional agent.
 * @param agent The agent the [[Matcher]] should apply to.
 * @returns A copy of the [[Matcher]], applying to an additional agent.
 * @since Not released yet.
 */
export function addAgent(matcher: Matcher, agent: WebId): Matcher {
  return addIri(matcher, acp.agent, agent);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Prevent the [[Matcher]] from applying to a given agent directly. This will not
 * prevent the agent from matching on other properties than its WebID.
 *
 * @param matcher The [[Matcher]] that should no longer apply to a given agent.
 * @param agent The agent the Matcher should no longer apply to.
 * @returns A copy of the Matcher, not applying to the given agent.
 * @since Not released yet.
 */
export function removeAgent(matcher: Matcher, agent: WebId): Matcher {
  return removeIri(matcher, acp.agent, agent);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Check if the Matcher applies to any agent.
 *
 * @param matcher The Matcher checked for public access.
 * @returns Whether the Matcher applies to any agent or not.
 * @since Not released yet.
 */
export function hasPublic(matcher: Matcher): boolean {
  return (
    getIriAll(matcher, acp.agent).filter((agent) => agent === acp.PublicAgent)
      .length > 0
  );
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Set a Matcher to apply to any Agent.
 *
 * @param matcher The Matcher being modified.
 * @returns A copy of the Matcher, updated to apply to any agent.
 * @since Not released yet.
 */
export function setPublic(matcher: Matcher): Matcher {
  // The second argument should not be part of the function signature,
  // so it's not in the parameter list:
  // eslint-disable-next-line prefer-rest-params
  if (typeof arguments === "object" && typeof arguments[1] === "boolean") {
    throw new Error(
      "The function `setPublic` no longer takes a second parameter. It is now used together with `removePublic` instead."
    );
  }
  return addIri(matcher, acp.agent, acp.PublicAgent);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Set a Matcher to no longer apply to any Agent.
 *
 * @param matcher The Matcher being modified.
 * @returns A copy of the Matcher, updated to no longer apply to any agent.
 * @since Not released yet.
 */
export function removePublic(matcher: Matcher): Matcher {
  return removeIri(matcher, acp.agent, acp.PublicAgent);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Check if the Matcher applies to any authenticated agent.
 *
 * @param matcher The Matcher checked for authenticated access.
 * @returns Whether the Matcher applies to any authenticated agent or not.
 * @since Not released yet.
 */
export function hasAuthenticated(matcher: Matcher): boolean {
  return (
    getIriAll(matcher, acp.agent).filter(
      (agent) => agent === acp.AuthenticatedAgent
    ).length > 0
  );
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Set a Matcher to apply to any authenticated Agent.
 *
 * @param matcher The Matcher being modified.
 * @returns A copy of the Matcher, updated to apply to any authenticated Agent.
 * @since Not released yet.
 */
export function setAuthenticated(matcher: Matcher): Matcher {
  // The second argument should not be part of the function signature,
  // so it's not in the parameter list:
  // eslint-disable-next-line prefer-rest-params
  if (typeof arguments === "object" && typeof arguments[1] === "boolean") {
    throw new Error(
      "The function `setAuthenticated` no longer takes a second parameter. It is now used together with `removeAuthenticated` instead."
    );
  }
  return addIri(matcher, acp.agent, acp.AuthenticatedAgent);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Set a Matcher to no longer apply to any authenticated Agent.
 *
 * @param matcher The Matcher being modified.
 * @returns A copy of the Matcher, updated to apply/not apply to any authenticated agent.
 * @since Not released yet.
 */
export function removeAuthenticated(matcher: Matcher): Matcher {
  return removeIri(matcher, acp.agent, acp.AuthenticatedAgent);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Check if the Matcher applies to the creator of the Resource.
 *
 * @param matcher The Matcher checked for authenticated access.
 * @returns Whether the Matcher applies to the creator of the Resource or not.
 * @since Not released yet.
 */
export function hasCreator(matcher: Matcher): boolean {
  return (
    getIriAll(matcher, acp.agent).filter((agent) => agent === acp.CreatorAgent)
      .length > 0
  );
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Set a Matcher to apply to the creator of a Resource.
 *
 * @param matcher The Matcher being modified.
 * @returns A copy of the Matcher, updated to apply to the creator of a Resource.
 * @since Not released yet.
 */
export function setCreator(matcher: Matcher): Matcher {
  // The second argument should not be part of the function signature,
  // so it's not in the parameter list:
  // eslint-disable-next-line prefer-rest-params
  if (typeof arguments === "object" && typeof arguments[1] === "boolean") {
    throw new Error(
      "The function `setCreator` no longer takes a second parameter. It is now used together with `removeCreator` instead."
    );
  }
  return addIri(matcher, acp.agent, acp.CreatorAgent);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Set a Matcher to no longer apply to the creator of a Resource.
 *
 * @param matcher The Matcher being modified.
 * @returns A copy of the Matcher, updated to apply/not apply to the creator of a Resource.
 * @since Not released yet.
 */
export function removeCreator(matcher: Matcher): Matcher {
  return removeIri(matcher, acp.agent, acp.CreatorAgent);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * List all the clients a [[Matcher]] applies **directly** to. This will not include
 * specific client classes, such as public clients.
 *
 * @param matcher The Matcher from which clients are read.
 * @returns A list of the WebIDs of clients included in the Matcher.
 * @since Not released yet.
 */
export function getClientAll(matcher: Matcher): WebId[] {
  return getIriAll(matcher, acp.client)
    .filter((client: WebId) => client !== solid.PublicOidcClient)
    .concat(getStringNoLocaleAll(matcher, acp.client));
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Overwrite the clients the [[Matcher]] applies to with the provided Client.
 *
 * @param matcher The Matcher for which clients are set.
 * @param client The Client the Matcher should apply to.
 * @returns A copy of the input Matcher, applying to a different set of Clients.
 */
export function setClient(matcher: Matcher, client: Url | string): Matcher {
  // Preserve the special "any client" class, which we
  // don't want to overwrite with this function.
  const anyClientEnabled = hasAnyClient(matcher);
  let result = setIri(matcher, acp.client, client);
  // Restore the "any client" class
  if (anyClientEnabled) {
    result = setAnyClient(result);
  }
  return result;
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Apply the [[Matcher]] to an additional Client.
 *
 * @param matcher The [[Matcher]] to be applied to an additional Client.
 * @param client The Client the [[Matcher]] should apply to.
 * @returns A copy of the [[Matcher]], applying to an additional Client.
 * @since Not released yet.
 */
export function addClient(matcher: Matcher, client: Url | string): Matcher {
  if (!internal_isValidUrl(client)) {
    return addStringNoLocale(matcher, acp.client, client);
  }
  return addIri(matcher, acp.client, client);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Prevent the [[Matcher]] from applying to a given Client directly.
 *
 * @param matcher The [[Matcher]] that should no longer apply to a given Client.
 * @param client The Client the Matcher should no longer apply to.
 * @returns A copy of the Matcher, not applying to the given Client.
 * @since Not released yet.
 */
export function removeClient(matcher: Matcher, client: Url | string): Matcher {
  if (!internal_isValidUrl(client)) {
    return removeStringNoLocale(matcher, acp.client, client);
  }
  return removeIri(matcher, acp.client, client);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Check if the Matcher applies to any client, i.e. all the applications
 * regardless of their identifier.
 *
 * @param matcher The Matcher checked for authenticated access.
 * @returns Whether the Matcher applies to public clients.
 * @since Not released yet.
 * @deprecated
 */
export function hasAnyClient(matcher: Matcher): boolean {
  return (
    getIriAll(matcher, acp.client).filter(
      (client) => client === solid.PublicOidcClient
    ).length > 0
  );
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Make the [[Matcher]] apply to any client application.
 *
 * @param matcher The Matcher for which clients are set.
 * @returns A copy of the Matcher, updated to apply to any client
 * @since Not released yet.
 * @deprecated
 */
export function setAnyClient(matcher: Matcher): Matcher {
  return addIri(matcher, acp.client, solid.PublicOidcClient);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Make the [[Matcher]] no longer apply to any client application.
 *
 * @param matcher The Matcher for which clients are set.
 * @returns A copy of the Matcher, updated to no longer apply to any client
 * @since Not released yet.
 * @deprecated
 */
export function removeAnyClient(matcher: Matcher): Matcher {
  return removeIri(matcher, acp.client, solid.PublicOidcClient);
}

/**
 * Gets a human-readable representation of the given [[Matcher]] to aid debugging.
 *
 * Note that changes to the exact format of the return value are not considered a breaking change;
 * it is intended to aid in debugging, not as a serialisation method that can be reliably parsed.
 *
 * @param matcher The Matcher to get a human-readable representation of.
 * @since Not released yet.
 * @deprecated
 */
export function matcherAsMarkdown(matcher: Matcher): string {
  let markdown = `## Matcher: ${asUrl(matcher)}\n\n`;

  let targetEnumeration = "";
  if (hasPublic(matcher)) {
    targetEnumeration += "- Everyone\n";
  }
  if (hasAuthenticated(matcher)) {
    targetEnumeration += "- All authenticated agents\n";
  }
  if (hasCreator(matcher)) {
    targetEnumeration += "- The creator of this resource\n";
  }
  if (hasAnyClient(matcher)) {
    targetEnumeration += "- Users of any client application\n";
  }
  const targetAgents = getAgentAll(matcher);
  if (targetAgents.length > 0) {
    targetEnumeration += "- The following agents:\n  - ";
    targetEnumeration += `${targetAgents.join("\n  - ")}\n`;
  }
  const targetClients = getClientAll(matcher);
  if (targetClients.length > 0) {
    targetEnumeration += "- Users of the following client applications:\n  - ";
    targetEnumeration += `${targetClients.join("\n  - ")}\n`;
  }

  markdown +=
    targetEnumeration.length > 0
      ? `This Matcher matches:\n${targetEnumeration}`
      : "<empty>\n";

  return markdown;
}
