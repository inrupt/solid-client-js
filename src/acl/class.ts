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
} from "../acl";

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
    return unstable_getPublicResourceAccess(resourceInfo.acl.resourceAcl);
  }
  if (unstable_hasFallbackAcl(resourceInfo)) {
    return unstable_getPublicDefaultAccess(resourceInfo.acl.fallbackAcl);
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
    aclDataset.accessTo
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
    aclDataset.accessTo
  );
  const publicResourceRules = getClassAclRulesForClass(
    resourceRules,
    foaf.Agent
  );
  const publicAccessModes = publicResourceRules.map(internal_getAccess);
  return internal_combineAccessModes(publicAccessModes);
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
