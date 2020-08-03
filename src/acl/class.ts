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

import {
  IriString,
  WithResourceInfo,
  unstable_WithAcl,
  unstable_Access,
  unstable_AclDataset,
  unstable_AclRule,
  WithChangeLog,
} from "../interfaces";
import { acl, foaf } from "../constants";
import { getIriAll } from "../thing/get";
import {
  internal_getAclRules,
  internal_getResourceAclRulesForResource,
  internal_getDefaultAclRulesForResource,
  internal_getAccess,
  internal_combineAccessModes,
  unstable_hasResourceAcl,
  unstable_hasFallbackAcl,
  internal_removeEmptyAclRules,
  initialiseAclRule,
  duplicateAclRule,
} from "./acl";
import { getThingAll, removeIri, setIri, setThing } from "..";

/**
 * Find out what Access Modes have been granted to everyone for a given Resource.
 *
 * Keep in mind that this function will not tell you what access specific Agents have through other ACL rules, e.g. agent- or group-specific permissions.
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param resourceInfo Information about the Resource to which the given Agent may have been granted access.
 * @returns Which Access Modes have been granted to everyone for the given LitDataset, or `null` if it could not be determined (e.g. because the current user does not have Control Access to a given Resource or its Container).
 */
export function unstable_getPublicAccess(
  resourceInfo: unstable_WithAcl & WithResourceInfo
): unstable_Access | null {
  if (unstable_hasResourceAcl(resourceInfo)) {
    return unstable_getPublicResourceAccess(
      resourceInfo.internal_acl.resourceAcl
    );
  }
  if (unstable_hasFallbackAcl(resourceInfo)) {
    return unstable_getPublicDefaultAccess(
      resourceInfo.internal_acl.fallbackAcl
    );
  }
  return null;
}

/**
 * Given an ACL LitDataset, find out which access modes it provides to everyone for its associated Resource.
 *
 * Keep in mind that this function will not tell you:
 * - what access specific Agents have through other ACL rules, e.g. agent- or group-specific permissions.
 * - what access anyone has to child Resources, in case the associated Resource is a Container (see [[unstable_getDefaultResourceAccess]] for that).
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param aclDataset The LitDataset that contains Access-Control List rules.
 * @returns Which Access Modes have been granted to everyone for the Resource the given ACL LitDataset is associated with.
 */
export function unstable_getPublicResourceAccess(
  aclDataset: unstable_AclDataset
): unstable_Access {
  const allRules = internal_getAclRules(aclDataset);
  const resourceRules = internal_getResourceAclRulesForResource(
    allRules,
    aclDataset.internal_accessTo
  );
  const publicResourceRules = getClassAclRulesForClass(
    resourceRules,
    foaf.Agent
  );
  const publicAccessModes = publicResourceRules.map(internal_getAccess);
  return internal_combineAccessModes(publicAccessModes);
}

/**
 * Given an ACL LitDataset, find out which access modes it provides to everyone for the associated Container Resource's child Resources.
 *
 * Keep in mind that this function will not tell you:
 * - what access specific Agents have through other ACL rules, e.g. agent- or group-specific permissions.
 * - what access anyone has to the Container Resource itself (see [[unstable_getPublicResourceAccess]] for that).
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param aclDataset The LitDataset that contains Access-Control List rules for a certain Container.
 * @returns Which Access Modes have been granted to everyone for the children of the Container associated with the given ACL LitDataset.
 */
export function unstable_getPublicDefaultAccess(
  aclDataset: unstable_AclDataset
): unstable_Access {
  const allRules = internal_getAclRules(aclDataset);
  const resourceRules = internal_getDefaultAclRulesForResource(
    allRules,
    aclDataset.internal_accessTo
  );
  const publicResourceRules = getClassAclRulesForClass(
    resourceRules,
    foaf.Agent
  );
  const publicAccessModes = publicResourceRules.map(internal_getAccess);
  return internal_combineAccessModes(publicAccessModes);
}

/**
 * Given an ACL LitDataset, modify the ACL Rules to set specific Access Modes for the public.
 *
 * If the given ACL LitDataset already includes ACL Rules that grant a certain set of Access Modes
 * to the public, those will be overridden by the given Access Modes.
 *
 * Keep in mind that this function will not modify:
 * - access arbitrary Agents might have been given through other ACL rules, e.g. agent- or group-specific permissions.
 * - what access arbitrary Agents have to child Resources.
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param aclDataset The LitDataset that contains Access-Control List rules.
 * @param access The Access Modes to grant to the public.
 */
export function unstable_setPublicResourceAccess(
  aclDataset: unstable_AclDataset,
  access: unstable_Access
): unstable_AclDataset & WithChangeLog {
  // First make sure that none of the pre-existing rules in the given ACL LitDataset
  // give the public access to the Resource:
  let filteredAcl = aclDataset;
  getThingAll(aclDataset).forEach((aclRule) => {
    // Obtain both the Rule that no longer includes the public,
    // and a new Rule that includes all ACL Quads
    // that do not pertain to the given Public-Resource combination.
    // Note that usually, the latter will no longer include any meaningful statements;
    // we'll clean them up afterwards.
    const [filteredRule, remainingRule] = removePublicFromResourceRule(
      aclRule,
      aclDataset.internal_accessTo
    );
    filteredAcl = setThing(filteredAcl, filteredRule);
    filteredAcl = setThing(filteredAcl, remainingRule);
  });

  // Create a new Rule that only grants the public the given Access Modes:
  let newRule = initialiseAclRule(access);
  newRule = setIri(newRule, acl.accessTo, aclDataset.internal_accessTo);
  newRule = setIri(newRule, acl.agentClass, foaf.Agent);
  const updatedAcl = setThing(filteredAcl, newRule);

  // Remove any remaining Rules that do not contain any meaningful statements:
  return internal_removeEmptyAclRules(updatedAcl);
}

/**
 * Given an ACL LitDataset, modify the ACL Rules to set specific default Access Modes for the public.
 *
 * If the given ACL LitDataset already includes ACL Rules that grant a certain set of default Access Modes
 * to the public, those will be overridden by the given Access Modes.
 *
 * Keep in mind that this function will not modify:
 * - access arbitrary Agents might have been given through other ACL rules, e.g. public or group-specific permissions.
 * - what access arbitrary Agents have to the Container itself.
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param aclDataset The LitDataset that contains Access-Control List rules.
 * @param access The Access Modes to grant to the public.
 */
export function unstable_setPublicDefaultAccess(
  aclDataset: unstable_AclDataset,
  access: unstable_Access
): unstable_AclDataset & WithChangeLog {
  // First make sure that none of the pre-existing rules in the given ACL LitDataset
  // give the public default access to the Resource:
  let filteredAcl = aclDataset;
  getThingAll(aclDataset).forEach((aclRule) => {
    // Obtain both the Rule that no longer includes the public,
    // and a new Rule that includes all ACL Quads
    // that do not pertain to the given Public-Resource default combination.
    // Note that usually, the latter will no longer include any meaningful statements;
    // we'll clean them up afterwards.
    const [filteredRule, remainingRule] = removePublicFromDefaultRule(
      aclRule,
      aclDataset.internal_accessTo
    );
    filteredAcl = setThing(filteredAcl, filteredRule);
    filteredAcl = setThing(filteredAcl, remainingRule);
  });

  // Create a new Rule that only grants the public the given default Access Modes:
  let newRule = initialiseAclRule(access);
  newRule = setIri(newRule, acl.default, aclDataset.internal_accessTo);
  newRule = setIri(newRule, acl.agentClass, foaf.Agent);
  const updatedAcl = setThing(filteredAcl, newRule);

  // Remove any remaining Rules that do not contain any meaningful statements:
  const cleanedAcl = internal_removeEmptyAclRules(updatedAcl);

  return cleanedAcl;
}

/**
 * Given an ACL Rule, return two new ACL Rules that cover all the input Rule's use cases,
 * except for giving the public access to the given Resource.
 *
 * @param rule The ACL Rule that should no longer apply for the public to a given Resource.
 * @param resourceIri The Resource to which the Rule should no longer apply for the public.
 * @returns A tuple with the original ACL Rule sans the public, and a new ACL Rule for the public for the remaining Resources, respectively.
 */
function removePublicFromResourceRule(
  rule: unstable_AclRule,
  resourceIri: IriString
): [unstable_AclRule, unstable_AclRule] {
  // The existing rule will keep applying to the public:
  const ruleWithoutPublic = removeIri(rule, acl.agentClass, foaf.Agent);
  // The new rule will...
  let ruleForOtherTargets = duplicateAclRule(rule);
  // ...*only* apply to the public (because the existing Rule covers the others)...
  ruleForOtherTargets = setIri(ruleForOtherTargets, acl.agentClass, foaf.Agent);
  // ...but not to the given Resource:
  ruleForOtherTargets = removeIri(
    ruleForOtherTargets,
    acl.accessTo,
    resourceIri
  );
  return [ruleWithoutPublic, ruleForOtherTargets];
}

/**
 * Given an ACL Rule, return two new ACL Rules that cover all the input Rule's use cases,
 * except for giving the public default access to the given Container.
 *
 * @param rule The ACL Rule that should no longer apply for the public as default for a given Container.
 * @param containerIri The Container to which the Rule should no longer apply as default for the public.
 * @returns A tuple with the original ACL Rule sans the public, and a new ACL Rule for the public for the remaining Resources, respectively.
 */
function removePublicFromDefaultRule(
  rule: unstable_AclRule,
  containerIri: IriString
): [unstable_AclRule, unstable_AclRule] {
  // The existing rule will keep applying to the public:
  const ruleWithoutAgent = removeIri(rule, acl.agentClass, foaf.Agent);
  // The new rule will...
  let ruleForOtherTargets = duplicateAclRule(rule);
  // ...*only* apply to the public (because the existing Rule covers the others)...
  ruleForOtherTargets = setIri(ruleForOtherTargets, acl.agentClass, foaf.Agent);
  // ...but not as a default for the given Container:
  ruleForOtherTargets = removeIri(
    ruleForOtherTargets,
    acl.default,
    containerIri
  );
  return [ruleWithoutAgent, ruleForOtherTargets];
}

function getClassAclRulesForClass(
  aclRules: unstable_AclRule[],
  agentClass: IriString
): unstable_AclRule[] {
  return aclRules.filter((rule) => appliesToClass(rule, agentClass));
}

function appliesToClass(
  aclRule: unstable_AclRule,
  agentClass: IriString
): boolean {
  return getIriAll(aclRule, acl.agentClass).includes(agentClass);
}
