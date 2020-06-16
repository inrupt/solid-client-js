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
  DatasetInfo,
  LitDataset,
  WebId,
  unstable_Acl,
  unstable_AclDataset,
  unstable_AccessModes,
  unstable_AclRule,
} from "../interfaces";
import { getIriOne, getIriAll } from "../thing/get";
import { acl } from "../constants";
import {
  internal_getAclRules,
  internal_getResourceAclRulesForResource,
  internal_getDefaultAclRulesForResource,
  internal_getAccessModes,
  internal_combineAccessModes,
  unstable_hasResourceAcl,
  unstable_getResourceAcl,
  unstable_hasFallbackAcl,
  unstable_getFallbackAcl,
} from "../acl";

export type unstable_AgentAccess = Record<WebId, unstable_AccessModes>;

/**
 * Find out what Access Modes have been granted to a given Agent specifically for a given LitDataset.
 *
 * Keep in mind that this function will not tell you what access the given Agent has through other ACL rules, e.g. public or group-specific permissions.
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param dataset The LitDataset to which the given Agent may have been granted access.
 * @param agent WebID of the Agent for which to retrieve what access it has to the Resource.
 * @returns Which Access Modes have been granted to the Agent specifically for the given LitDataset, or `null` if it could not be determined (e.g. because the current user does not have Control Access to a given Resource or its Container).
 */
export function unstable_getAgentAccessModesOne(
  dataset: LitDataset & DatasetInfo & unstable_Acl,
  agent: WebId
): unstable_AccessModes | null {
  if (unstable_hasResourceAcl(dataset)) {
    const resourceAcl = unstable_getResourceAcl(dataset);
    return unstable_getAgentResourceAccessModesOne(resourceAcl, agent);
  }
  if (unstable_hasFallbackAcl(dataset)) {
    const fallbackAcl = unstable_getFallbackAcl(dataset);
    return unstable_getAgentDefaultAccessModesOne(fallbackAcl, agent);
  }
  return null;
}

/**
 * Find out what Access Modes have been granted to specific Agents for a given LitDataset.
 *
 * Keep in mind that this function will not tell you what access arbitrary Agents might have through other ACL rules, e.g. public or group-specific permissions.
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param dataset The LitDataset to which Agents may have been granted access.
 * @returns Which Access Modes have been granted to which Agents specifically for the given LitDataset, or `null` if it could not be determined (e.g. because the current user does not have Control Access to a given Resource or its Container).
 */
export function unstable_getAgentAccessModesAll(
  dataset: LitDataset & DatasetInfo & unstable_Acl
): unstable_AgentAccess | null {
  if (unstable_hasResourceAcl(dataset)) {
    const resourceAcl = unstable_getResourceAcl(dataset);
    return unstable_getAgentResourceAccessModesAll(resourceAcl);
  }
  if (unstable_hasFallbackAcl(dataset)) {
    const fallbackAcl = unstable_getFallbackAcl(dataset);
    return unstable_getAgentDefaultAccessModesAll(fallbackAcl);
  }
  return null;
}

/**
 * Given an ACL LitDataset, find out which access modes it provides to an Agent for its associated Resource.
 *
 * Keep in mind that this function will not tell you:
 * - what access the given Agent has through other ACL rules, e.g. public or group-specific permissions.
 * - what access the given Agent has to child Resources, in case the associated Resource is a Container.
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param aclDataset The LitDataset that contains Access-Control List rules.
 * @param agent WebID of the Agent for which to retrieve what access it has to the Resource.
 * @returns Which Access Modes have been granted to the Agent specifically for the Resource the given ACL LitDataset is associated with.
 */
export function unstable_getAgentResourceAccessModesOne(
  aclDataset: unstable_AclDataset,
  agent: WebId
): unstable_AccessModes {
  const allRules = internal_getAclRules(aclDataset);
  const resourceRules = internal_getResourceAclRulesForResource(
    allRules,
    aclDataset.accessTo
  );
  const agentResourceRules = getAgentAclRulesForAgent(resourceRules, agent);
  const agentAccessModes = agentResourceRules.map(internal_getAccessModes);
  return internal_combineAccessModes(agentAccessModes);
}

/**
 * Given an ACL LitDataset, find out which access modes it provides to specific Agents for the associated Resource.
 *
 * Keep in mind that this function will not tell you:
 * - what access arbitrary Agents might have been given through other ACL rules, e.g. public or group-specific permissions.
 * - what access arbitrary Agents have to child Resources, in case the associated Resource is a Container.
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param aclDataset The LitDataset that contains Access-Control List rules.
 * @returns Which Access Modes have been granted to which Agents specifically for the Resource the given ACL LitDataset is associated with.
 */
export function unstable_getAgentResourceAccessModesAll(
  aclDataset: unstable_AclDataset
): unstable_AgentAccess {
  const allRules = internal_getAclRules(aclDataset);
  const resourceRules = internal_getResourceAclRulesForResource(
    allRules,
    aclDataset.accessTo
  );
  const agentResourceRules = getAgentAclRules(resourceRules);
  return getAccessModesByAgent(agentResourceRules);
}

/**
 * Given an ACL LitDataset, find out which access modes it provides to an Agent for the associated Container Resource's child Resources.
 *
 * Keep in mind that this function will not tell you:
 * - what access the given Agent has through other ACL rules, e.g. public or group-specific permissions.
 * - what access the given Agent has to Container Resource itself (see [[unstable_getAgentResourceAccessModesOne]] for that).
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param aclDataset The LitDataset that contains Access-Control List rules for a certain Container.
 * @param agent WebID of the Agent for which to retrieve what access it has to the Container's children.
 * @returns Which Access Modes have been granted to the Agent specifically for the children of the Container associated with the given ACL LitDataset.
 */
export function unstable_getAgentDefaultAccessModesOne(
  aclDataset: unstable_AclDataset,
  agent: WebId
): unstable_AccessModes {
  const allRules = internal_getAclRules(aclDataset);
  const resourceRules = internal_getDefaultAclRulesForResource(
    allRules,
    aclDataset.accessTo
  );
  const agentResourceRules = getAgentAclRulesForAgent(resourceRules, agent);
  const agentAccessModes = agentResourceRules.map(internal_getAccessModes);
  return internal_combineAccessModes(agentAccessModes);
}

/**
 * Given an ACL LitDataset, find out which access modes it provides to specific Agents for the associated Container Resource's child Resources.
 *
 * Keep in mind that this function will not tell you:
 * - what access arbitrary Agents might have been given through other ACL rules, e.g. public or group-specific permissions.
 * - what access arbitrary Agents have to the Container Resource itself (see [[unstable_getAgentResourceAccessModesAll]] for that).
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param aclDataset The LitDataset that contains Access-Control List rules.
 * @returns Which Access Modes have been granted to which Agents specifically for the children of the Container associated with the given ACL LitDataset.
 */
export function unstable_getAgentDefaultAccessModesAll(
  aclDataset: unstable_AclDataset
): unstable_AgentAccess {
  const allRules = internal_getAclRules(aclDataset);
  const resourceRules = internal_getDefaultAclRulesForResource(
    allRules,
    aclDataset.accessTo
  );
  const agentResourceRules = getAgentAclRules(resourceRules);

  return getAccessModesByAgent(agentResourceRules);
}

function getAgentAclRulesForAgent(
  aclRules: unstable_AclRule[],
  agent: WebId
): unstable_AclRule[] {
  return aclRules.filter((rule) => appliesToAgent(rule, agent));
}

function appliesToAgent(aclRule: unstable_AclRule, agent: WebId): boolean {
  return getIriAll(aclRule, acl.agent).includes(agent);
}

function getAgentAclRules(aclRules: unstable_AclRule[]): unstable_AclRule[] {
  return aclRules.filter(isAgentAclRule);
}

function isAgentAclRule(aclRule: unstable_AclRule): boolean {
  return getIriOne(aclRule, acl.agent) !== null;
}

function getAccessModesByAgent(
  aclRules: unstable_AclRule[]
): unstable_AgentAccess {
  const agentAccess: unstable_AgentAccess = {};

  aclRules.forEach((rule) => {
    const ruleAgents = getIriAll(rule, acl.agent);
    const accessModes = internal_getAccessModes(rule);

    // A rule might apply to multiple agents. If multiple rules apply to the same agent, the Access
    // Modes granted by those rules should be combined:
    ruleAgents.forEach((agent) => {
      agentAccess[agent] =
        typeof agentAccess[agent] === "undefined"
          ? accessModes
          : internal_combineAccessModes([agentAccess[agent], accessModes]);
    });
  });
  return agentAccess;
}
