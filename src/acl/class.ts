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
  IriString,
  WithServerResourceInfo,
  WithChangeLog,
} from "../interfaces";
import { acl, foaf } from "../constants";
import { getIriAll } from "../thing/get";
import {
  hasResourceAcl,
  hasFallbackAcl,
  Access,
  AclDataset,
  AclRule,
  WithAcl,
} from "./acl";
import {
  internal_getAclRules,
  internal_getResourceAclRulesForResource,
  internal_getDefaultAclRulesForResource,
  internal_getAccess,
  internal_combineAccessModes,
  internal_setActorAccess,
} from "./acl.internal";

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
  resourceInfo: WithAcl & WithServerResourceInfo
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
  return internal_setActorAccess(
    aclDataset,
    access,
    acl.agentClass,
    "resource",
    foaf.Agent
  );
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
  return internal_setActorAccess(
    aclDataset,
    access,
    acl.agentClass,
    "default",
    foaf.Agent
  );
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
