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

import { Quad } from "rdf-js";
import { ACL, RDF } from "@solid/lit-vocab-common-rdfext";

import { fetchLitDataset } from "./litDataset";
import {
  WithResourceInfo,
  unstable_AclDataset,
  unstable_hasAccessibleAcl,
  unstable_AclRule,
  unstable_Access,
  Thing,
  IriString,
  LitDataset,
  unstable_WithAcl,
  unstable_WithAccessibleAcl,
  unstable_WithResourceAcl,
  unstable_WithFallbackAcl,
} from "./interfaces";
import { getThingAll, removeThing, setThing } from "./thing";
import { getIriOne, getIriAll } from "./thing/get";
import { DataFactory, dataset } from "./rdfjs";
import { removeAll } from "./thing/remove";
import { setIri } from "./thing/set";
import {
  internal_defaultFetchOptions,
  internal_fetchResourceInfo,
  getFetchedFrom,
} from "./resource";

/** @internal */
export async function internal_fetchResourceAcl(
  dataset: WithResourceInfo,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<unstable_AclDataset | null> {
  if (!unstable_hasAccessibleAcl(dataset)) {
    return null;
  }

  try {
    const aclLitDataset = await fetchLitDataset(
      dataset.resourceInfo.unstable_aclUrl,
      options
    );
    return Object.assign(aclLitDataset, {
      accessTo: getFetchedFrom(dataset),
    });
  } catch (e) {
    // Since a Solid server adds a `Link` header to an ACL even if that ACL does not exist,
    // failure to fetch the ACL is expected to happen - we just return `null` and let callers deal
    // with it.
    return null;
  }
}

/** @internal */
export async function internal_fetchFallbackAcl(
  resource: unstable_WithAccessibleAcl,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<unstable_AclDataset | null> {
  const resourceUrl = new URL(getFetchedFrom(resource).value);
  const resourcePath = resourceUrl.pathname;
  // Note: we're currently assuming that the Origin is the root of the Pod. However, it is not yet
  //       set in stone that that will always be the case. We might need to check the Container's
  //       metadata at some point in time to check whether it is actually the root of the Pod.
  //       See: https://github.com/solid/specification/issues/153#issuecomment-624630022
  if (resourcePath === "/") {
    // We're already at the root, so there's no Container we can retrieve:
    return null;
  }

  const containerPath = getContainerPath(resourcePath);
  const containerIri = DataFactory.namedNode(
    new URL(containerPath, resourceUrl.origin).href
  );
  const containerInfo = {
    resourceInfo: await internal_fetchResourceInfo(containerIri, options),
  };

  if (!unstable_hasAccessibleAcl(containerInfo)) {
    // If the current user does not have access to this Container's ACL,
    // we cannot determine whether its ACL is the one that applies. Thus, return null:
    return null;
  }

  const containerAcl = await internal_fetchResourceAcl(containerInfo, options);
  if (containerAcl === null) {
    return internal_fetchFallbackAcl(containerInfo, options);
  }

  return containerAcl;
}

function getContainerPath(resourcePath: string): string {
  const resourcePathWithoutTrailingSlash =
    resourcePath.substring(resourcePath.length - 1) === "/"
      ? resourcePath.substring(0, resourcePath.length - 1)
      : resourcePath;

  const containerPath =
    resourcePath.substring(
      0,
      resourcePathWithoutTrailingSlash.lastIndexOf("/")
    ) + "/";

  return containerPath;
}

/**
 * Verify whether an ACL was found for the given Resource.
 *
 * A Resource fetched with its ACL (e.g. using [[unstable_fetchLitDatasetWithAcl]]) _might_ have a resource ACL attached, but
 * we cannot be sure: it might be that none exists for this specific Resource (in which case the
 * fallback ACL applies), or the currently authenticated user (if any) might not have Control access
 * to the fetched Resource.
 *
 * This function verifies that the Resource's ACL is accessible.
 *
 * @param resource A Resource that might have an ACL attached.
 * @returns Whether `dataset` has an ACL attached.
 */
export function unstable_hasResourceAcl<
  Resource extends unstable_WithAcl & WithResourceInfo
>(
  resource: Resource
): resource is Resource &
  unstable_WithResourceAcl &
  unstable_WithAccessibleAcl {
  // PMCB55: Need to be careful here - 'resource.resourceInfo.unstable_aclUrl'
  // may be undefined, so make sure we don't attempt to call '.equals()' on it.
  return (
    resource.acl.resourceAcl !== null &&
    getFetchedFrom(resource).equals(resource.acl.resourceAcl.accessTo) &&
    getFetchedFrom(resource.acl.resourceAcl).equals(
      resource.resourceInfo.unstable_aclUrl
    )
  );
}

/**
 * Access the ACL attached to a Resource.
 *
 * Given a Resource that has an ACL attached, this function will give you access to that ACL. To
 * verify whether the ACL is available, see [[unstable_hasResourceAcl]].
 *
 * @param resource A Resource with potentially an ACL attached.
 * @returns The ACL, if available, and undefined if not.
 */
export function unstable_getResourceAcl(
  resource: unstable_WithAcl & WithResourceInfo & unstable_WithResourceAcl
): unstable_AclDataset;
export function unstable_getResourceAcl(
  resource: unstable_WithAcl & WithResourceInfo
): unstable_AclDataset | null;
export function unstable_getResourceAcl(
  resource: unstable_WithAcl & WithResourceInfo
): unstable_AclDataset | null {
  if (!unstable_hasResourceAcl(resource)) {
    return null;
  }
  return resource.acl.resourceAcl;
}

/**
 * Verify whether a fallback ACL was found for the given Resource.
 *
 * A Resource fetched with its ACL (e.g. using [[unstable_fetchLitDatasetWithAcl]]) _might_ have a fallback ACL
 * attached, but we cannot be sure: the currently authenticated user (if any) might not have Control
 * access to one of the fetched Resource's Containers.
 *
 * This function verifies that the fallback ACL is accessible.
 *
 * @param resource A [[LitDataset]] that might have a fallback ACL attached.
 * @returns Whether `dataset` has a fallback ACL attached.
 */
export function unstable_hasFallbackAcl<Resource extends unstable_WithAcl>(
  resource: Resource
): resource is Resource & unstable_WithFallbackAcl {
  return resource.acl.fallbackAcl !== null;
}

/**
 * Access the fallback ACL attached to a Resource.
 *
 * Given a Resource that has a fallback ACL attached, this function will give you access to that
 * ACL. To verify whether the fallback ACL is available, see [[unstable_hasFallbackAcl]].
 *
 * @param resource A Resource with potentially a fallback ACL attached.
 * @returns The fallback ACL, or null if it coult not be accessed.
 */
export function unstable_getFallbackAcl(
  resource: unstable_WithFallbackAcl
): unstable_AclDataset;
export function unstable_getFallbackAcl(
  dataset: unstable_WithAcl
): unstable_AclDataset | null;
export function unstable_getFallbackAcl(
  dataset: unstable_WithAcl
): unstable_AclDataset | null {
  if (!unstable_hasFallbackAcl(dataset)) {
    return null;
  }
  return dataset.acl.fallbackAcl;
}

/**
 * Create a Resource ACL for a given Resource, setting the same access permissions that currently apply to it from its Container.
 *
 * @param resource A Resource that does not have its own ACL (see [[unstable_hasResourceAcl]]) and a known fallback ACL (see [[unstable_hasFallbackAcl]]).
 * @returns A Resource ACL for the given Resource, with the default ACL Rules from the fallback ACL applied as Resource Rules.
 */
export function unstable_createAclFromFallbackAcl(
  resource: unstable_WithFallbackAcl &
    WithResourceInfo &
    unstable_WithAccessibleAcl
): unstable_AclDataset {
  const emptyResourceAcl: unstable_AclDataset = Object.assign(dataset(), {
    accessTo: getFetchedFrom(resource),
    resourceInfo: {
      fetchedFrom: resource.resourceInfo.unstable_aclUrl,
      isLitDataset: true,
    },
  });

  const fallbackAclRules = internal_getAclRules(resource.acl.fallbackAcl);
  const defaultAclRules = internal_getDefaultAclRulesForResource(
    fallbackAclRules,
    resource.acl.fallbackAcl.accessTo
  );
  const resourceAclRules = defaultAclRules.map((rule) => {
    rule = removeAll(rule, ACL.default_);
    rule = setIri(rule, ACL.accessTo, getFetchedFrom(resource));
    return rule;
  });

  // Iterate over every ACL Rule we want to import, inserting them into `emptyResourceAcl` one by one:
  const initialisedResourceAcl = resourceAclRules.reduce(
    setThing,
    emptyResourceAcl
  );

  return initialisedResourceAcl;
}

/** @internal */
export function internal_isAclDataset(
  dataset: LitDataset
): dataset is unstable_AclDataset {
  // return typeof (dataset as unstable_AclDataset).accessTo === "string";
  return typeof (dataset as unstable_AclDataset).accessTo === "object";
}

/** @internal */
export function internal_getAclRules(
  aclDataset: unstable_AclDataset
): unstable_AclRule[] {
  const things = getThingAll(aclDataset);
  return things.filter(isAclRule);
}

function isAclRule(thing: Thing): thing is unstable_AclRule {
  // PMCB55: this only works for strings, for an array of objects we need to use
  // the `.equals()` method.
  // return getIriAll(thing, RDF.type).includes(ACL.Authorization);
  return getIriAll(thing, RDF.type).some((iri) =>
    iri.equals(ACL.Authorization)
  );
}

/** @internal */
export function internal_getResourceAclRules(
  aclRules: unstable_AclRule[]
): unstable_AclRule[] {
  return aclRules.filter(isResourceAclRule);
}

function isResourceAclRule(aclRule: unstable_AclRule): boolean {
  return getIriOne(aclRule, ACL.accessTo) !== null;
}

/** @internal */
export function internal_getResourceAclRulesForResource(
  aclRules: unstable_AclRule[],
  resource: IriString
): unstable_AclRule[] {
  return aclRules.filter((rule) => appliesToResource(rule, resource));
}

function appliesToResource(
  aclRule: unstable_AclRule,
  resource: IriString
): boolean {
  // PMCB55: this only works for strings, for an array of objects we need to use
  // the `.equals()` method.
  // return getIriAll(aclRule, ACL.accessTo).includes(resource);
  return getIriAll(aclRule, ACL.accessTo).some((iri) => iri.equals(resource));
}

/** @internal */
export function internal_getDefaultAclRules(
  aclRules: unstable_AclRule[]
): unstable_AclRule[] {
  return aclRules.filter(isDefaultAclRule);
}

function isDefaultAclRule(aclRule: unstable_AclRule): boolean {
  return getIriOne(aclRule, ACL.default_) !== null;
}

/** @internal */
export function internal_getDefaultAclRulesForResource(
  aclRules: unstable_AclRule[],
  resource: IriString
): unstable_AclRule[] {
  return aclRules.filter((rule) => isDefaultForResource(rule, resource));
}

function isDefaultForResource(
  aclRule: unstable_AclRule,
  resource: IriString
): boolean {
  // PMCB55: this only works for strings, for an array of objects we need to use
  // the `.equals()` method.
  // return getIriAll(aclRule, ACL.default_).includes(resource);
  return getIriAll(aclRule, ACL.default_).some((iri) => iri.equals(resource));
}

/** @internal */
export function internal_getAccess(rule: unstable_AclRule): unstable_Access {
  // PMCB55: this only works for strings, for an array of objects we need to use
  // the `.equals()` method.
  // const ruleAccessModes = getIriAll(rule, ACL.mode);
  // const writeAccess = ruleAccessModes.includes(
  //     internal_accessModeIriStrings.write
  // );
  const ruleAccessModes = getIriAll(rule, ACL.mode);
  const writeAccess = ruleAccessModes.some((iri) =>
    iri.equals(internal_accessModeIriStrings.write)
  );

  return writeAccess
    ? {
        read: ruleAccessModes.includes(internal_accessModeIriStrings.read),
        append: true,
        write: true,
        control: ruleAccessModes.includes(
          internal_accessModeIriStrings.control
        ),
      }
    : {
        read: ruleAccessModes.includes(internal_accessModeIriStrings.read),
        append: ruleAccessModes.includes(internal_accessModeIriStrings.append),
        write: false,
        control: ruleAccessModes.includes(
          internal_accessModeIriStrings.control
        ),
      };
}

/** @internal */
export function internal_combineAccessModes(
  modes: unstable_Access[]
): unstable_Access {
  return modes.reduce(
    (accumulator, current) => {
      const writeAccess = accumulator.write || current.write;
      return writeAccess
        ? {
            read: accumulator.read || current.read,
            append: true,
            write: true,
            control: accumulator.control || current.control,
          }
        : {
            read: accumulator.read || current.read,
            append: accumulator.append || current.append,
            write: false,
            control: accumulator.control || current.control,
          };
    },
    { read: false, append: false, write: false, control: false }
  );
}

/** @internal */
export function internal_removeEmptyAclRules<
  Dataset extends unstable_AclDataset
>(aclDataset: Dataset): Dataset {
  const aclRules = internal_getAclRules(aclDataset);
  const aclRulesToRemove = aclRules.filter(isEmptyAclRule);

  // Is this too clever? It iterates over aclRulesToRemove, one by one removing them from aclDataset.
  const updatedAclDataset = aclRulesToRemove.reduce(removeThing, aclDataset);

  return updatedAclDataset;
}

function isEmptyAclRule(aclRule: unstable_AclRule): boolean {
  // If there are Quads in there unrelated to Access Control,
  // this is not an empty ACL rule that can be deleted:
  if (Array.from(aclRule).some((quad) => !isAclQuad(quad))) {
    return false;
  }

  // If the rule does not apply to any Resource, it is no longer working:
  if (
    getIriOne(aclRule, ACL.accessTo) === null &&
    getIriOne(aclRule, ACL.default_) === null
  ) {
    return true;
  }

  // If the rule does not specify Access Modes, it is no longer working:
  if (getIriOne(aclRule, ACL.mode) === null) {
    return true;
  }

  // If the rule does not specify whom it applies to, it is no longer working:
  if (
    getIriOne(aclRule, ACL.agent) === null &&
    getIriOne(aclRule, ACL.agentGroup) === null &&
    getIriOne(aclRule, ACL.agentClass) === null
  ) {
    return true;
  }

  return false;
}

function isAclQuad(quad: Quad): boolean {
  const predicate = quad.predicate;
  const object = quad.object;
  if (predicate.equals(RDF.type) && object.equals(ACL.Authorization)) {
    return true;
  }
  if (predicate.equals(ACL.accessTo) || predicate.equals(ACL.default_)) {
    return true;
  }
  if (
    predicate.equals(ACL.mode) &&
    Object.values(internal_accessModeIriStrings).some((mode) =>
      object.equals(mode)
    )
  ) {
    return true;
  }
  if (
    predicate.equals(ACL.agent) ||
    predicate.equals(ACL.agentGroup) ||
    predicate.equals(ACL.agentClass)
  ) {
    return true;
  }
  if (predicate.equals(ACL.origin)) {
    return true;
  }
  return false;
}

/**
 * IRIs of potential Access Modes
 * @internal
 */
export const internal_accessModeIriStrings = {
  read: ACL.Read, //"http://www.w3.org/ns/auth/acl#Read",
  append: ACL.Append, //"http://www.w3.org/ns/auth/acl#Append",
  write: ACL.Write, //"http://www.w3.org/ns/auth/acl#Write",
  control: ACL.Control, //"http://www.w3.org/ns/auth/acl#Control",
} as const;
/** @internal */
type AccessModeIriString = typeof internal_accessModeIriStrings[keyof typeof internal_accessModeIriStrings];

/** @internal
 * This function finds, among a set of ACL rules, the ones granting access to a given entity (the target)
 * and identifying it with a specific predicate (`acl:agent` or `acl:agentGroup`).
 * @param aclRules The set of rules to filter
 * @param targetIri The IRI of the target
 * @param targetType The predicate linking the rule to the target
 */
export function internal_getAclRulesForIri(
  aclRules: unstable_AclRule[],
  targetIri: IriString,
  targetType: typeof ACL.agent | typeof ACL.agentGroup
): unstable_AclRule[] {
  // PMCB55: this only works for strings, for an array of objects we need to use
  // the `.equals()` method.
  // return aclRules.filter((rule) =>
  //     getIriAll(rule, targetType).includes(targetIri)
  // );
  return aclRules.filter((rule) =>
    getIriAll(rule, targetType).some((iri) => iri.equals(targetIri))
  );
}

/** @internal
 * This function transforms a given set of rules into a map associating the IRIs
 * of the entities to which permissions are granted by these rules, and the permissions
 * granted to them. Additionnally, it filters these entities based on the predicate
 * that refers to them in the rule.
 */
export function internal_getAccessByIri(
  aclRules: unstable_AclRule[],
  targetType: typeof ACL.agent | typeof ACL.agentGroup
): Record<string, unstable_Access> {
  const targetIriAccess: Record<string, unstable_Access> = {};

  aclRules.forEach((rule) => {
    const ruleTargetIri = getIriAll(rule, targetType);
    const access = internal_getAccess(rule);

    // A rule might apply to multiple agents. If multiple rules apply to the same agent, the Access
    // Modes granted by those rules should be combined:
    ruleTargetIri.forEach((targetIri) => {
      targetIriAccess[targetIri.value] =
        typeof targetIriAccess[targetIri.value] === "undefined"
          ? access
          : internal_combineAccessModes([
              targetIriAccess[targetIri.value],
              access,
            ]);
    });
  });

  return targetIriAccess;
}
