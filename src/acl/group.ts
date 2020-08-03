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
  AclDataset,
  Access,
  AclRule,
  WithAcl,
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
  hasResourceAcl,
  hasFallbackAcl,
  getResourceAcl,
  getFallbackAcl,
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
export function getGroupAccessOne(
  resourceInfo: WithAcl & WithResourceInfo,
  group: UrlString
): Access | null {
  if (hasResourceAcl(resourceInfo)) {
    return getGroupResourceAccessOne(
      resourceInfo.internal_acl.resourceAcl,
      group
    );
  }
  if (hasFallbackAcl(resourceInfo)) {
    return getGroupDefaultAccessOne(
      resourceInfo.internal_acl.fallbackAcl,
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
export function getGroupAccessAll(
  resourceInfo: WithAcl & WithResourceInfo
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
 * Given an ACL LitDataset, find out which access modes it provides to a Group for its associated Resource.
 *
 * Keep in mind that this function will not tell you:
 * - what access members of the given Group have through other ACL rules, e.g. public permissions.
 * - what access members of the given Group have to child Resources, in case the associated Resource is a Container (see [[getGroupDefaultAccessModesOne]] for that).
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param aclDataset The LitDataset that contains Access-Control List rules.
 * @param group URL of the Group for which to retrieve what access it has to the Resource.
 * @returns Which Access Modes have been granted to the Group specifically for the Resource the given ACL LitDataset is associated with.
 */
export function getGroupResourceAccessOne(
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
 * Given an ACL LitDataset, find out which access modes it provides to a given Group for the associated Container Resource's child Resources.
 *
 * Keep in mind that this function will not tell you:
 * - what access members of the given Group have through other ACL rules, e.g. public permissions.
 * - what access members of the given Group have to the Container Resource itself (see [[getGroupResourceAccessOne]] for that).
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param aclDataset The LitDataset that contains Access-Control List rules for a certain Container.
 * @param group URL of the Group for which to retrieve what access it has to the child Resources of the given Container.
 * @returns Which Access Modes have been granted to the Group specifically for the children of the Container associated with the given ACL LitDataset.
 */
export function getGroupDefaultAccessOne(
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
 * Given an ACL LitDataset, find out which access modes it provides to specific Groups for the associated Container Resource's child Resources.
 *
 * Keep in mind that this function will not tell you:
 * - what access arbitrary members of these Groups have through other ACL rules, e.g. public permissions.
 * - what access arbitrary members of these Groups have to the Container Resource itself (see [[getGroupResourceAccessAll]] for that).
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param aclDataset The LitDataset that contains Access-Control List rules for a certain Container.
 * @returns Which Access Modes have been granted to which Groups specifically for the children of the Container associated with the given ACL LitDataset.
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
