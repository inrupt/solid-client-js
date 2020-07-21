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
  unstable_AclDataset,
  unstable_Access,
  unstable_AclRule,
  unstable_WithAcl,
  WithResourceInfo,
  IriString,
  UrlString,
} from "../interfaces";
import {
  internal_getAclRules,
  internal_getDefaultAclRulesForResource,
  internal_getAccess,
  internal_combineAccessModes,
  internal_getResourceAclRulesForResource,
  unstable_hasResourceAcl,
  unstable_hasFallbackAcl,
  unstable_getResourceAcl,
  unstable_getFallbackAcl,
  internal_getAclRulesForIri,
  internal_getAccessByIri,
} from "./acl";

import { acl } from "../constants";

/**
 * Find out what Access Modes have been granted to a given Group of agents specifically for a given Resource.
 *
 * Keep in mind that this function will not tell you what access members of the given Group have through other ACL rules, e.g. public permissions.
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param resourceInfo Information about the Resource to which the given Group may have been granted access.
 * @param group URL of the Group for which to retrieve what access it has to the Resource.
 * @returns Which Access Modes have been granted to the Group specifically for the given Resource, or `null` if it could not be determined (e.g. because the current user does not have Control Access to a given Resource or its Container).
 */
export function unstable_getGroupAccessOne(
  resourceInfo: unstable_WithAcl & WithResourceInfo,
  group: UrlString
): unstable_Access | null {
  if (unstable_hasResourceAcl(resourceInfo)) {
    return unstable_getGroupResourceAccessOne(
      resourceInfo.acl.resourceAcl,
      group
    );
  }
  if (unstable_hasFallbackAcl(resourceInfo)) {
    return unstable_getGroupDefaultAccessOne(
      resourceInfo.acl.fallbackAcl,
      group
    );
  }
  return null;
}

/**
 * Find out what Access Modes have been granted to specific Groups of agents for a given Resource.
 *
 * Keep in mind that this function will not tell you what access members of each Group have through other ACL rules, e.g. public permissions.
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param resourceInfo Information about the Resource to which the given Group may have been granted access.
 * @returns Which Access Modes have been granted to which Groups specifically for the given Resource, or `null` if it could not be determined (e.g. because the current user does not have Control Access to a given Resource or its Container).
 */
export function unstable_getGroupAccessAll(
  resourceInfo: unstable_WithAcl & WithResourceInfo
): Record<IriString, unstable_Access> | null {
  if (unstable_hasResourceAcl(resourceInfo)) {
    const resourceAcl = unstable_getResourceAcl(resourceInfo);
    return unstable_getGroupResourceAccessAll(resourceAcl);
  }
  if (unstable_hasFallbackAcl(resourceInfo)) {
    const fallbackAcl = unstable_getFallbackAcl(resourceInfo);
    return unstable_getGroupDefaultAccessAll(fallbackAcl);
  }
  return null;
}

/**
 * Given an ACL LitDataset, find out which access modes it provides to a Group for its associated Resource.
 *
 * Keep in mind that this function will not tell you:
 * - what access members of the given Group have through other ACL rules, e.g. public permissions.
 * - what access members of the given Group have to child Resources, in case the associated Resource is a Container (see [[unstable_getGroupDefaultAccessModesOne]] for that).
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param aclDataset The LitDataset that contains Access-Control List rules.
 * @param group URL of the Group for which to retrieve what access it has to the Resource.
 * @returns Which Access Modes have been granted to the Group specifically for the Resource the given ACL LitDataset is associated with.
 */
export function unstable_getGroupResourceAccessOne(
  aclDataset: unstable_AclDataset,
  group: UrlString
): unstable_Access {
  const allRules = internal_getAclRules(aclDataset);
  const resourceRules = internal_getResourceAclRulesForResource(
    allRules,
    aclDataset.accessTo
  );
  const groupResourceRules = getGroupAclRuleForGroup(resourceRules, group);
  const groupAccessModes = groupResourceRules.map(internal_getAccess);
  return internal_combineAccessModes(groupAccessModes);
}

/**
 * Given an ACL LitDataset, find out which access modes it provides to specific Groups for the associated Resource.
 *
 * Keep in mind that this function will not tell you:
 * - what access arbitrary members of these Groups might have been given through other ACL rules, e.g. public permissions.
 * - what access arbitrary members of these Groups have to child Resources, in case the associated Resource is a Container.
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param aclDataset The LitDataset that contains Access-Control List rules.
 * @returns Which Access Modes have been granted to which Groups specifically for the Resource the given ACL LitDataset is associated with.
 */
export function unstable_getGroupResourceAccessAll(
  aclDataset: unstable_AclDataset
): Record<UrlString, unstable_Access> {
  const allRules = internal_getAclRules(aclDataset);
  const resourceRules = internal_getResourceAclRulesForResource(
    allRules,
    aclDataset.accessTo
  );
  return getAccessByGroup(resourceRules);
}

/**
 * Given an ACL LitDataset, find out which access modes it provides to a given Group for the associated Container Resource's child Resources.
 *
 * Keep in mind that this function will not tell you:
 * - what access members of the given Group have through other ACL rules, e.g. public permissions.
 * - what access members of the given Group have to the Container Resource itself (see [[unstable_getGroupResourceAccessOne]] for that).
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param aclDataset The LitDataset that contains Access-Control List rules for a certain Container.
 * @param group URL of the Group for which to retrieve what access it has to the child Resources of the given Container.
 * @returns Which Access Modes have been granted to the Group specifically for the children of the Container associated with the given ACL LitDataset.
 */
export function unstable_getGroupDefaultAccessOne(
  aclDataset: unstable_AclDataset,
  group: UrlString
): unstable_Access {
  const allRules = internal_getAclRules(aclDataset);
  const defaultRules = internal_getDefaultAclRulesForResource(
    allRules,
    aclDataset.accessTo
  );
  const groupDefaultRules = getGroupAclRuleForGroup(defaultRules, group);
  const groupAccessModes = groupDefaultRules.map(internal_getAccess);
  return internal_combineAccessModes(groupAccessModes);
}

/**
 * Given an ACL LitDataset, find out which access modes it provides to specific Groups for the associated Container Resource's child Resources.
 *
 * Keep in mind that this function will not tell you:
 * - what access arbitrary members of these Groups have through other ACL rules, e.g. public permissions.
 * - what access arbitrary members of these Groups have to the Container Resource itself (see [[unstable_getGroupResourceAccessAll]] for that).
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param aclDataset The LitDataset that contains Access-Control List rules for a certain Container.
 * @returns Which Access Modes have been granted to which Groups specifically for the children of the Container associated with the given ACL LitDataset.
 */
export function unstable_getGroupDefaultAccessAll(
  aclDataset: unstable_AclDataset
): Record<UrlString, unstable_Access> {
  const allRules = internal_getAclRules(aclDataset);
  const defaultRules = internal_getDefaultAclRulesForResource(
    allRules,
    aclDataset.accessTo
  );
  return getAccessByGroup(defaultRules);
}

function getGroupAclRuleForGroup(
  rules: unstable_AclRule[],
  group: UrlString
): unstable_AclRule[] {
  return internal_getAclRulesForIri(rules, group, acl.agentGroup);
}

function getAccessByGroup(
  aclRules: unstable_AclRule[]
): Record<IriString, unstable_Access> {
  return internal_getAccessByIri(aclRules, acl.agentGroup);
}
