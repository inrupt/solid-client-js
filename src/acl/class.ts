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
  WithAcl,
  Access,
  AclDataset,
  AclRule,
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
  hasResourceAcl,
  hasFallbackAcl,
  internal_removeEmptyAclRules,
  internal_initialiseAclRule,
  internal_duplicateAclRule,
} from "./acl";
import { removeIri, removeAll } from "../thing/remove";
import { getThingAll, setThing } from "../thing/thing";
import { setIri } from "../thing/set";

/**
 * ```{note}
 * This function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Returns the Access Modes granted to the public in general for a Resource.
 *
 * This function does not return Access Modes granted to specific Agents
 * through other ACL (Access Control List) rules, e.g., agent- or group-specific permissions.
 *
 * @param resourceInfo Information about the Resource to which the given Agent may have been granted access.
 * @returns Access Modes granted to the public in general for the Resource, or `null` if it could not be determined (e.g. because the current user does not have Control Access to a given Resource or its Container).
 */
export function getPublicAccess(
  resourceInfo: WithAcl & WithResourceInfo
): Access | null {
  if (hasResourceAcl(resourceInfo)) {
    return getPublicResourceAccess(resourceInfo.internal_acl.resourceAcl);
  }
  if (hasFallbackAcl(resourceInfo)) {
    return getPublicDefaultAccess(resourceInfo.internal_acl.fallbackAcl);
  }
  return null;
}

/**
 * ```{note}
 * This function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Returns the Access Modes granted to the public in general for the Resource
 * associated with an ACL (Access Control List).
 *
 * This function does not return:
 * - Access Modes granted to specific Agents through other ACL rules, e.g., agent- or group-specific permissions.
 * - Access Modes to child Resources if the associated Resource is a Container (see [[getPublicDefaultAccess]] instead).
 *
 * @param aclDataset The SolidDataset that contains Access Control List rules.
 * @returns Access Modes granted to the public in general for the Resource associated with the `aclDataset`.
 */
export function getPublicResourceAccess(aclDataset: AclDataset): Access {
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
 * ```{note}
 * This function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Returns the Access Modes granted to the public in general for the child Resources
 * of the Container associated with an ACL (Access Control List).
 *
 * This function does not return:
 * - Access Modes granted to Agents through other ACL rules, e.g., agent- or group-specific permissions.
 * - Access Modes to the Container Resource itself (see [[getPublicResourceAccess]] instead).
 *
 * @param aclDataset The SolidDataset that contains Access Control List rules for a certain Container.
 * @returns Access Modes granted to the public in general for the children of the Container associated with the given `aclDataset`.
 */
export function getPublicDefaultAccess(aclDataset: AclDataset): Access {
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
 * ```{note}
 * This function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Modifies the resource ACL (Access Control List) to set the Access Modes for the public.
 * Specifically, the function returns a new resource ACL (Access Control List) initialised
 * with the given resource ACL and new rules for the given public access.
 *
 * If rules for public access already exist in the given ACL, in the *returned* ACL,
 * they are replaced by the new rules.
 *
 * This function does not modify:
 * - Access Modes granted to Agents through other ACL rules, e.g., agent- or group-specific permissions.
 * - Access Modes to child Resources if the associated Resource is a Container.
 * - The original ACL.
 *
 * @param aclDataset The SolidDataset that contains Access Control List rules.
 * @param access The Access Modes to grant to the public.
 * @returns A new resource ACL initialised with the given `aclDataset` and public `access`.
 */
export function setPublicResourceAccess(
  aclDataset: AclDataset,
  access: Access
): AclDataset & WithChangeLog {
  // First make sure that none of the pre-existing rules in the given ACL SolidDataset
  // give the public access to the Resource:
  let filteredAcl = aclDataset;
  getThingAll(aclDataset).forEach((aclRule) => {
    // Obtain both the Rule that no longer includes the public,
    // and a new Rule that includes all ACL Quads
    // that do not pertain to the given Public-Resource combination.
    // Note that usually, the latter will no longer include any meaningful statements;
    // we'll clean them up afterwards.
    const [filteredRule, remainingRule] = removePublicFromRule(
      aclRule,
      aclDataset.internal_accessTo,
      "resource"
    );
    filteredAcl = setThing(filteredAcl, filteredRule);
    filteredAcl = setThing(filteredAcl, remainingRule);
  });

  // Create a new Rule that only grants the public the given Access Modes:
  let newRule = internal_initialiseAclRule(access);
  newRule = setIri(newRule, acl.accessTo, aclDataset.internal_accessTo);
  newRule = setIri(newRule, acl.agentClass, foaf.Agent);
  const updatedAcl = setThing(filteredAcl, newRule);

  // Remove any remaining Rules that do not contain any meaningful statements:
  return internal_removeEmptyAclRules(updatedAcl);
}

/**
 * ```{note}
 * This function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Modifies the default ACL (Access Control List) to set the public's default Access Modes
 * to child resources. Specifically, the function returns a new default ACL initialised
 * with the given default ACL and new rules for the given public access.
 *
 * If rules for public access already exist in the given ACL, in the *returned* ACL,
 * they are replaced by the new rules.
 *
 * This function does not modify:
 * - Access Modes granted to Agents through other ACL rules, e.g., agent- or group-specific permissions.
 * - Access Modes to Container Resource itself.
 * - The original ACL.
 *
 * @param aclDataset The SolidDataset that contains Access Control List rules.
 * @param access The Access Modes to grant to the public.
 * @returns A new default ACL initialised with the given `aclDataset` and public `access`.
 */
export function setPublicDefaultAccess(
  aclDataset: AclDataset,
  access: Access
): AclDataset & WithChangeLog {
  // First make sure that none of the pre-existing rules in the given ACL SolidDataset
  // give the public default access to the Resource:
  let filteredAcl = aclDataset;
  getThingAll(aclDataset).forEach((aclRule) => {
    // Obtain both the Rule that no longer includes the public,
    // and a new Rule that includes all ACL Quads
    // that do not pertain to the given Public-Resource default combination.
    // Note that usually, the latter will no longer include any meaningful statements;
    // we'll clean them up afterwards.
    const [filteredRule, remainingRule] = removePublicFromRule(
      aclRule,
      aclDataset.internal_accessTo,
      "default"
    );
    filteredAcl = setThing(filteredAcl, filteredRule);
    filteredAcl = setThing(filteredAcl, remainingRule);
  });

  // Create a new Rule that only grants the public the given default Access Modes:
  let newRule = internal_initialiseAclRule(access);
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
function removePublicFromRule(
  rule: AclRule,
  resourceIri: IriString,
  ruleType: "resource" | "default"
): [AclRule, AclRule] {
  // If the existing Rule does not apply to the given Agent, we don't need to split up.
  // Without this check, we'd be creating a new rule for the given Agent (ruleForOtherTargets)
  // that would give it access it does not currently have:
  if (!getIriAll(rule, acl.agentClass).includes(foaf.Agent)) {
    const emptyRule = internal_initialiseAclRule({
      read: false,
      append: false,
      write: false,
      control: false,
    });
    return [rule, emptyRule];
  }
  // The existing rule will keep applying to other Agent Classes:
  const ruleWithoutPublic = removeIri(rule, acl.agentClass, foaf.Agent);
  // The public might have been given other access in the existing rule, so duplicate it...
  let ruleForOtherTargets = internal_duplicateAclRule(rule);
  // ...but remove access to the original Resource...
  ruleForOtherTargets = removeIri(
    ruleForOtherTargets,
    ruleType === "resource" ? acl.accessTo : acl.default,
    resourceIri
  );
  // Prevents the legacy predicate 'acl:defaultForNew' to lead to privilege escalation
  if (ruleType === "default") {
    ruleForOtherTargets = removeIri(
      ruleForOtherTargets,
      acl.defaultForNew,
      resourceIri
    );
  }
  // ...and only apply the new Rule to the Public (because the existing Rule covers other Agents):
  ruleForOtherTargets = setIri(ruleForOtherTargets, acl.agentClass, foaf.Agent);
  ruleForOtherTargets = removeAll(ruleForOtherTargets, acl.agent);
  ruleForOtherTargets = removeAll(ruleForOtherTargets, acl.agentGroup);
  ruleForOtherTargets = removeAll(ruleForOtherTargets, acl.origin);

  return [ruleWithoutPublic, ruleForOtherTargets];
}

function getClassAclRulesForClass(
  aclRules: AclRule[],
  agentClass: IriString
): AclRule[] {
  return aclRules.filter((rule) => appliesToClass(rule, agentClass));
}

function appliesToClass(aclRule: AclRule, agentClass: IriString): boolean {
  return getIriAll(aclRule, acl.agentClass).includes(agentClass);
}
