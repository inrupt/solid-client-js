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

import {
  WithServerResourceInfo,
  IriString,
  UrlString,
  WithChangeLog,
} from "../interfaces";
import {
  AclDataset,
  Access,
  AclRule,
  hasResourceAcl,
  hasFallbackAcl,
  getResourceAcl,
  getFallbackAcl,
  WithAcl,
} from "./acl";
import {
  internal_getAclRules,
  internal_getDefaultAclRulesForResource,
  internal_getAccess,
  internal_combineAccessModes,
  internal_getResourceAclRulesForResource,
  internal_getAclRulesForIri,
  internal_getAccessByIri,
  internal_setActorAccess,
} from "./acl.internal";

import { acl } from "../constants";

/**
 * ```{note} This function is still experimental and subject to change, even in a non-major release.
 * ```
 * Returns a Group's explicity-granted Access Modes for a given Resource.
 *
 * The function does not return Access Modes granted indirectly to the Group through other
 * ACL rules, e.g., public permissions.
 *
 * @param resourceInfo Information about the Resource to which the given Group may have been granted access.
 * @param group URL of the Group for which to retrieve what access it has to the Resource.
 * @returns Access Modes that have been explicitly granted to the `group` for the given Resource, or `null` if it could not be determined (e.g. because the current user does not have Control Access to a given Resource or its Container).
 */
export function getGroupAccess(
  resourceInfo: WithAcl & WithServerResourceInfo,
  group: UrlString
): Access | null {
  if (hasResourceAcl(resourceInfo)) {
    return getGroupResourceAccess(resourceInfo.internal_acl.resourceAcl, group);
  }
  if (hasFallbackAcl(resourceInfo)) {
    return getGroupDefaultAccess(resourceInfo.internal_acl.fallbackAcl, group);
  }
  return null;
}

/**
 * ```{note} This function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Returns all explicitly-granted Access Modes per Group for the given Resource.
 *
 * The function does not return Access Modes granted indirectly to the Group through other
 * ACL rules, e.g., public permissions.
 *
 * @param resourceInfo Information about the Resource to which the given Group may have been granted access.
 * @returns Access Modes per Group that have been explicitly granted for the given Resource, or `null` if it could not be determined (e.g. because the current user does not have Control Access to a given Resource or its Container).
 */
export function getGroupAccessAll(
  resourceInfo: WithAcl & WithServerResourceInfo
): Record<IriString, Access> | null {
  if (hasResourceAcl(resourceInfo)) {
    const resourceAcl = getResourceAcl(resourceInfo);
    return getGroupResourceAccessAll(resourceAcl);
  }
  if (hasFallbackAcl(resourceInfo)) {
    const fallbackAcl = getFallbackAcl(resourceInfo);
    return getGroupDefaultAccessAll(fallbackAcl);
  }
  return null;
}

/**
 * ```{note} This function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Returns the Access Modes explicitly granted to a Group for the Resource
 * associated with an ACL (Access Control List).
 *
 * The function does not return:
 * - Access Modes granted indirectly to the Group through other ACL rules, e.g., public permissions.
 * - Access Modes granted to the Group for the child Resources if the associated Resource is a Container
 *   (see [[getGroupDefaultAccess]] instead).
 *
 * @param aclDataset The SolidDataset that contains Access Control List rules.
 * @param group URL of the Group for which to retrieve what access it has to the Resource.
 * @returns Access Modes explicitly granted to a Group for the Resource associated with an ACL.
 */
export function getGroupResourceAccess(
  aclDataset: AclDataset,
  group: UrlString
): Access {
  const allRules = internal_getAclRules(aclDataset);
  const resourceRules = internal_getResourceAclRulesForResource(
    allRules,
    aclDataset.internal_accessTo
  );
  const groupResourceRules = getGroupAclRuleForGroup(resourceRules, group);
  const groupAccessModes = groupResourceRules.map(internal_getAccess);
  return internal_combineAccessModes(groupAccessModes);
}

/**
 * ```{note} This function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Returns the explicitly granted Access Modes per Group for the Resource associated
 * with an ACL (Access Control List).
 *
 * The function does not return:
 * - Access Modes granted indirectly to the Group through other ACL rules, e.g., public permissions.
 * - Access Modes granted to Groups for the child Resources if the associated Resource is a Container.
 *
 * @param aclDataset The SolidDataset that contains Access Control List rules.
 * @returns Access Modes per Group that have been explicitly granted for the Resource associated with an ACL.
 */
export function getGroupResourceAccessAll(
  aclDataset: AclDataset
): Record<UrlString, Access> {
  const allRules = internal_getAclRules(aclDataset);
  const resourceRules = internal_getResourceAclRulesForResource(
    allRules,
    aclDataset.internal_accessTo
  );
  return getAccessByGroup(resourceRules);
}

/**
 * ```{note} This function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Returns a Group's Access Modes explicitly granted for the children of the
 * Container associated with an ACL (Access ControlList).
 *
 * The function does not return:
 * - Access Modes granted indirectly to the Group through other ACL rules, e.g. public permissions.
 * - Access Modes granted to the Group for the Container Resource itself (see [[getGroupResourceAccess]] instead).
 *
 * @param aclDataset The SolidDataset that contains ACL rules for a certain Container.
 * @param group URL of the Group for which to retrieve what access it has to the child Resources of the given Container.
 * @returns Access Modes that have been explicitly granted to the Group for the children of the Container associated with the given ACL.
 */
export function getGroupDefaultAccess(
  aclDataset: AclDataset,
  group: UrlString
): Access {
  const allRules = internal_getAclRules(aclDataset);
  const defaultRules = internal_getDefaultAclRulesForResource(
    allRules,
    aclDataset.internal_accessTo
  );
  const groupDefaultRules = getGroupAclRuleForGroup(defaultRules, group);
  const groupAccessModes = groupDefaultRules.map(internal_getAccess);
  return internal_combineAccessModes(groupAccessModes);
}

/**
 * ```{note} This function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Returns the Access Modes, per Group, that have been explicitly granted for the children
 * of the Container associated with the given ACL (Access Control List).
 *
 * The function does not return:
 * - Access Modes granted indirectly to the Groups through other ACL rules, e.g. public permissions.
 * - Access Modes granted to the Groups for the Container Resource itself (see [[getGroupResourceAccessAll]] instead).
 *
 * @param aclDataset The SolidDataset that contains Access Control List rules for a certain Container.
 * @returns Access Modes per Group that have been explicitly granted for the children of the Container associated with the given ACL SolidDataset.
 */
export function getGroupDefaultAccessAll(
  aclDataset: AclDataset
): Record<UrlString, Access> {
  const allRules = internal_getAclRules(aclDataset);
  const defaultRules = internal_getDefaultAclRulesForResource(
    allRules,
    aclDataset.internal_accessTo
  );
  return getAccessByGroup(defaultRules);
}

function getGroupAclRuleForGroup(
  rules: AclRule[],
  group: UrlString
): AclRule[] {
  return internal_getAclRulesForIri(rules, group, acl.agentGroup);
}

function getAccessByGroup(aclRules: AclRule[]): Record<IriString, Access> {
  return internal_getAccessByIri(aclRules, acl.agentGroup);
}

/**
 * ```{note}
 * This function is still experimental and subject to change, even in a non-major release.
 * ```
 * Modifies the resource ACL (Access Control List) to set the Access Modes for the given Group.
 * Specifically, the function returns a new resource ACL initialised with the given ACL and
 * new rules for the Group's access.
 *
 * If rules for Groups's access already exist in the given ACL, in the returned ACL,
 * they are replaced by the new rules.
 *
 * This function does not modify:
 *
 * - Access Modes granted indirectly to Groups through other ACL rules, e.g., public or Agent-specific permissions.
 * - Access Modes granted to Groups for the child Resources if the associated Resource is a Container.
 * - The original ACL.
 *
 * @param aclDataset The SolidDataset that contains Access-Control List rules.
 * @param group The Group to grant specific Access Modes.
 * @param access The Access Modes to grant to the Group for the Resource.
 * @returns A new resource ACL initialised with the given `aclDataset` and `access` for the `group`.
 * @since 1.4.0
 */
export function setGroupResourceAccess(
  aclDataset: AclDataset,
  group: UrlString,
  access: Access
): AclDataset & WithChangeLog {
  return internal_setActorAccess(
    aclDataset,
    access,
    acl.agentGroup,
    "resource",
    group
  );
}

/**
 * ```{note}
 * This function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Modifies the default ACL (Access Control List) to set a Group's Access Modes for the Container's children.
 * Specifically, the function returns a new default ACL initialised with the given ACL and
 * new rules for the Group's access.
 *
 * If rules already exist for the Group in the given ACL, in the returned ACL, they are replaced by the new rules.
 *
 * This function does not modify:
 * - Access Modes granted indirectly to the Group through other ACL rules, e.g., public or Agent-specific permissions.
 * - Access Modes granted to the Group for the Container Resource itself.
 * - The original ACL.
 *
 * @param aclDataset The SolidDataset that contains Access-Control List rules.
 * @param group The Group to grant specific Access Modes.
 * @param access The Access Modes to grant to the Group.
 * @returns A new default ACL initialised with the given `aclDataset` and `access` for the `group`.
 * @since 1.4.0
 */
export function setGroupDefaultAccess(
  aclDataset: AclDataset,
  group: UrlString,
  access: Access
): AclDataset & WithChangeLog {
  return internal_setActorAccess(
    aclDataset,
    access,
    acl.agentGroup,
    "default",
    group
  );
}
