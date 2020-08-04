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
  unstable_Access,
  unstable_AclDataset,
  unstable_AclRule,
  unstable_WithAcl,
  WebId,
  WithChangeLog,
  WithResourceInfo,
} from "../interfaces";
import { getIriOne, getIriAll } from "../thing/get";
import { acl } from "../constants";
import {
  duplicateAclRule,
  initialiseAclRule,
  internal_combineAccessModes,
  internal_getAccess,
  internal_getAccessByIri,
  internal_getAclRules,
  internal_getAclRulesForIri,
  internal_getDefaultAclRulesForResource,
  internal_getResourceAclRulesForResource,
  internal_removeEmptyAclRules,
  unstable_getFallbackAcl,
  unstable_getResourceAcl,
  unstable_hasFallbackAcl,
  unstable_hasResourceAcl,
} from "./acl";
import { getThingAll, setThing } from "../thing/thing";
import { removeIri, removeAll } from "../thing/remove";
import { setIri } from "../thing/set";

export type unstable_AgentAccess = Record<WebId, unstable_Access>;

/**
 * Find out what Access Modes have been granted to a given Agent specifically for a given Resource.
 *
 * Keep in mind that this function will not tell you what access the given Agent has through other ACL rules, e.g. public or group-specific permissions.
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param resourceInfo Information about the Resource to which the given Agent may have been granted access.
 * @param agent WebID of the Agent for which to retrieve what access it has to the Resource.
 * @returns Which Access Modes have been granted to the Agent specifically for the given LitDataset, or `null` if it could not be determined (e.g. because the current user does not have Control Access to a given Resource or its Container).
 */
export function unstable_getAgentAccessOne(
  resourceInfo: unstable_WithAcl & WithResourceInfo,
  agent: WebId
): unstable_Access | null {
  if (unstable_hasResourceAcl(resourceInfo)) {
    return unstable_getAgentResourceAccessOne(
      resourceInfo.internal_acl.resourceAcl,
      agent
    );
  }
  if (unstable_hasFallbackAcl(resourceInfo)) {
    return unstable_getAgentDefaultAccessOne(
      resourceInfo.internal_acl.fallbackAcl,
      agent
    );
  }
  return null;
}

/**
 * Find out what Access Modes have been granted to specific Agents for a given Resource.
 *
 * Keep in mind that this function will not tell you what access arbitrary Agents might have through other ACL rules, e.g. public or group-specific permissions.
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param resourceInfo Information about the Resource to which Agents may have been granted access.
 * @returns Which Access Modes have been granted to which Agents specifically for the given LitDataset, or `null` if it could not be determined (e.g. because the current user does not have Control Access to a given Resource or its Container).
 */
export function unstable_getAgentAccessAll(
  resourceInfo: unstable_WithAcl & WithResourceInfo
): unstable_AgentAccess | null {
  if (unstable_hasResourceAcl(resourceInfo)) {
    const resourceAcl = unstable_getResourceAcl(resourceInfo);
    return unstable_getAgentResourceAccessAll(resourceAcl);
  }
  if (unstable_hasFallbackAcl(resourceInfo)) {
    const fallbackAcl = unstable_getFallbackAcl(resourceInfo);
    return unstable_getAgentDefaultAccessAll(fallbackAcl);
  }
  return null;
}

/**
 * Given an ACL LitDataset, find out which access modes it provides to an Agent for its associated Resource.
 *
 * Keep in mind that this function will not tell you:
 * - what access the given Agent has through other ACL rules, e.g. public or group-specific permissions.
 * - what access the given Agent has to child Resources, in case the associated Resource is a Container (see [[unstable_getAgentDefaultAccessModesOne]] for that).
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param aclDataset The LitDataset that contains Access-Control List rules.
 * @param agent WebID of the Agent for which to retrieve what access it has to the Resource.
 * @returns Which Access Modes have been granted to the Agent specifically for the Resource the given ACL LitDataset is associated with.
 */
export function unstable_getAgentResourceAccessOne(
  aclDataset: unstable_AclDataset,
  agent: WebId
): unstable_Access {
  const allRules = internal_getAclRules(aclDataset);
  const resourceRules = internal_getResourceAclRulesForResource(
    allRules,
    aclDataset.internal_accessTo
  );
  const agentResourceRules = getAgentAclRulesForAgent(resourceRules, agent);
  const agentAccessModes = agentResourceRules.map(internal_getAccess);
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
export function unstable_getAgentResourceAccessAll(
  aclDataset: unstable_AclDataset
): unstable_AgentAccess {
  const allRules = internal_getAclRules(aclDataset);
  const resourceRules = internal_getResourceAclRulesForResource(
    allRules,
    aclDataset.internal_accessTo
  );
  const agentResourceRules = getAgentAclRules(resourceRules);
  return getAccessByAgent(agentResourceRules);
}

/**
 * Given an ACL LitDataset, modify the ACL Rules to set specific Access Modes for a given Agent.
 *
 * If the given ACL LitDataset already includes ACL Rules that grant a certain set of Access Modes
 * to the given Agent, those will be overridden by the given Access Modes.
 *
 * Keep in mind that this function will not modify:
 * - access arbitrary Agents might have been given through other ACL rules, e.g. public or group-specific permissions.
 * - what access arbitrary Agents have to child Resources.
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param aclDataset The LitDataset that contains Access-Control List rules.
 * @param agent The Agent to grant specific Access Modes.
 * @param access The Access Modes to grant to the Agent.
 */
export function unstable_setAgentResourceAccess(
  aclDataset: unstable_AclDataset,
  agent: WebId,
  access: unstable_Access
): unstable_AclDataset & WithChangeLog {
  // First make sure that none of the pre-existing rules in the given ACL LitDataset
  // give the Agent access to the Resource:
  let filteredAcl = aclDataset;
  getThingAll(aclDataset).forEach((aclRule) => {
    // Obtain both the Rule that no longer includes the given Agent,
    // and a new Rule that includes all ACL Quads
    // that do not pertain to the given Agent-Resource combination.
    // Note that usually, the latter will no longer include any meaningful statements;
    // we'll clean them up afterwards.
    const [filteredRule, remainingRule] = removeAgentFromRule(
      aclRule,
      agent,
      aclDataset.internal_accessTo,
      "resource"
    );
    filteredAcl = setThing(filteredAcl, filteredRule);
    filteredAcl = setThing(filteredAcl, remainingRule);
  });

  // Create a new Rule that only grants the given Agent the given Access Modes:
  let newRule = initialiseAclRule(access);
  newRule = setIri(newRule, acl.accessTo, aclDataset.internal_accessTo);
  newRule = setIri(newRule, acl.agent, agent);
  const updatedAcl = setThing(filteredAcl, newRule);

  // Remove any remaining Rules that do not contain any meaningful statements:
  const cleanedAcl = internal_removeEmptyAclRules(updatedAcl);

  return cleanedAcl;
}

/**
 * Given an ACL LitDataset, find out which access modes it provides to an Agent for the associated Container Resource's child Resources.
 *
 * Keep in mind that this function will not tell you:
 * - what access the given Agent has through other ACL rules, e.g. public or group-specific permissions.
 * - what access the given Agent has to the Container Resource itself (see [[unstable_getAgentResourceAccessOne]] for that).
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param aclDataset The LitDataset that contains Access-Control List rules for a certain Container.
 * @param agent WebID of the Agent for which to retrieve what access it has to the Container's children.
 * @returns Which Access Modes have been granted to the Agent specifically for the children of the Container associated with the given ACL LitDataset.
 */
export function unstable_getAgentDefaultAccessOne(
  aclDataset: unstable_AclDataset,
  agent: WebId
): unstable_Access {
  const allRules = internal_getAclRules(aclDataset);
  const resourceRules = internal_getDefaultAclRulesForResource(
    allRules,
    aclDataset.internal_accessTo
  );
  const agentResourceRules = getAgentAclRulesForAgent(resourceRules, agent);
  const agentAccessModes = agentResourceRules.map(internal_getAccess);
  return internal_combineAccessModes(agentAccessModes);
}

/**
 * Given an ACL LitDataset, find out which access modes it provides to specific Agents for the associated Container Resource's child Resources.
 *
 * Keep in mind that this function will not tell you:
 * - what access arbitrary Agents might have been given through other ACL rules, e.g. public or group-specific permissions.
 * - what access arbitrary Agents have to the Container Resource itself (see [[unstable_getAgentResourceAccessAll]] for that).
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param aclDataset The LitDataset that contains Access-Control List rules.
 * @returns Which Access Modes have been granted to which Agents specifically for the children of the Container associated with the given ACL LitDataset.
 */
export function unstable_getAgentDefaultAccessAll(
  aclDataset: unstable_AclDataset
): unstable_AgentAccess {
  const allRules = internal_getAclRules(aclDataset);
  const resourceRules = internal_getDefaultAclRulesForResource(
    allRules,
    aclDataset.internal_accessTo
  );
  const agentResourceRules = getAgentAclRules(resourceRules);

  return getAccessByAgent(agentResourceRules);
}

/**
 * Given an ACL LitDataset, modify the ACL Rules to set specific default Access Modes for a given Agent.
 *
 * If the given ACL LitDataset already includes ACL Rules that grant a certain set of default Access Modes
 * to the given Agent, those will be overridden by the given Access Modes.
 *
 * Keep in mind that this function will not modify:
 * - access arbitrary Agents might have been given through other ACL rules, e.g. public or group-specific permissions.
 * - what access arbitrary Agents have to the Container itself.
 *
 * Also, please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param aclDataset The LitDataset that contains Access-Control List rules.
 * @param agent The Agent to grant specific Access Modes.
 * @param access The Access Modes to grant to the Agent.
 */
export function unstable_setAgentDefaultAccess(
  aclDataset: unstable_AclDataset,
  agent: WebId,
  access: unstable_Access
): unstable_AclDataset & WithChangeLog {
  // First make sure that none of the pre-existing rules in the given ACL LitDataset
  // give the Agent default access to the Resource:
  let filteredAcl = aclDataset;
  getThingAll(aclDataset).forEach((aclRule) => {
    // Obtain both the Rule that no longer includes the given Agent,
    // and a new Rule that includes all ACL Quads
    // that do not pertain to the given Agent-Resource default combination.
    // Note that usually, the latter will no longer include any meaningful statements;
    // we'll clean them up afterwards.
    const [filteredRule, remainingRule] = removeAgentFromRule(
      aclRule,
      agent,
      aclDataset.internal_accessTo,
      "default"
    );
    filteredAcl = setThing(filteredAcl, filteredRule);
    filteredAcl = setThing(filteredAcl, remainingRule);
  });

  // Create a new Rule that only grants the given Agent the given default Access Modes:
  let newRule = initialiseAclRule(access);
  newRule = setIri(newRule, acl.default, aclDataset.internal_accessTo);
  newRule = setIri(newRule, acl.agent, agent);
  const updatedAcl = setThing(filteredAcl, newRule);

  // Remove any remaining Rules that do not contain any meaningful statements:
  const cleanedAcl = internal_removeEmptyAclRules(updatedAcl);

  return cleanedAcl;
}

function getAgentAclRulesForAgent(
  aclRules: unstable_AclRule[],
  agent: WebId
): unstable_AclRule[] {
  return internal_getAclRulesForIri(aclRules, agent, acl.agent);
}

function getAgentAclRules(aclRules: unstable_AclRule[]): unstable_AclRule[] {
  return aclRules.filter(isAgentAclRule);
}

function isAgentAclRule(aclRule: unstable_AclRule): boolean {
  return getIriOne(aclRule, acl.agent) !== null;
}

/**
 * Given an ACL Rule, return two new ACL Rules that cover all the input Rule's use cases,
 * except for giving the given Agent access to the given Resource.
 *
 * @param rule The ACL Rule that should no longer apply for a given Agent to a given Resource.
 * @param agent The Agent that should be removed from the Rule for the given Resource.
 * @param resourceIri The Resource to which the Rule should no longer apply for the given Agent.
 * @returns A tuple with the original ACL Rule sans the given Agent, and a new ACL Rule for the given Agent for the remaining Resources, respectively.
 */
function removeAgentFromRule(
  rule: unstable_AclRule,
  agent: WebId,
  resourceIri: IriString,
  ruleType: "resource" | "default"
): [unstable_AclRule, unstable_AclRule] {
  // If the existing Rule does not apply to the given Agent, we don't need to split up.
  // Without this check, we'd be creating a new rule for the given Agent (ruleForOtherTargets)
  // that would give it access it does not currently have:
  if (!getIriAll(rule, acl.agent).includes(agent)) {
    const emptyRule = initialiseAclRule({
      read: false,
      append: false,
      write: false,
      control: false,
    });
    return [rule, emptyRule];
  }
  // The existing rule will keep applying to Agents other than the given one:
  const ruleWithoutAgent = removeIri(rule, acl.agent, agent);
  // The agent already had some access in the rule, so duplicate it...
  let ruleForOtherTargets = duplicateAclRule(rule);
  // ...but remove access to the original Resource:
  ruleForOtherTargets = removeIri(
    ruleForOtherTargets,
    ruleType === "resource" ? acl.accessTo : acl.default,
    resourceIri
  );
  // Only apply the new Rule to the given Agent (because the existing Rule covers the others)
  ruleForOtherTargets = setIri(ruleForOtherTargets, acl.agent, agent);
  ruleForOtherTargets = removeAll(ruleForOtherTargets, acl.agentClass);
  ruleForOtherTargets = removeAll(ruleForOtherTargets, acl.agentGroup);

  return [ruleWithoutAgent, ruleForOtherTargets];
}

function getAccessByAgent(aclRules: unstable_AclRule[]): unstable_AgentAccess {
  return internal_getAccessByIri(aclRules, acl.agent);
}
