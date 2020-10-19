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

import { age } from "rdf-namespaces/dist/foaf";
import { acp, rdf } from "../constants";
import {
  internal_toIriString,
  SolidDataset,
  ThingPersisted,
  Url,
  UrlString,
  WebId,
} from "../interfaces";
import { internal_defaultFetchOptions } from "../resource/resource";
import {
  createSolidDataset,
  saveSolidDatasetAt,
} from "../resource/solidDataset";
import { addIri } from "../thing/add";
import { getIri, getIriAll, getUrl } from "../thing/get";
import { removeAll, removeIri } from "../thing/remove";
import { setIri, setUrl } from "../thing/set";
import { cloneThing, createThing, getThing, setThing } from "../thing/thing";
import { Policy } from "./policy";

export type RuleDataset = SolidDataset;
export type Rule = ThingPersisted;

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Add a rule that refines the scope of a given the [[Policy]]. If an agent
 * requesting access to a resource is **not** present in **any** of the required rules,
 * they will not be granted access.
 * @param policy The [[Policy]] to which the rule should be added.
 * @param rule The rule to add to the policy.
 * @returns A new [[Policy]] clone of the original one, with the new rule added.
 * @since Unreleased
 */
export function addRequiredRuleToPolicy(policy: Policy, rule: Rule): Policy {
  return addIri(policy, acp.allOf, rule);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Removes a rule that refines the scope of a given the [[Policy]]. If an agent
 * requesting access to a resource is **not** present in **any** of the required rules,
 * they will not be granted access.
 * @param policy The [[Policy]] from which the rule should be removed.
 * @param rule The rule to remove from the policy.
 * @returns A new [[Policy]] clone of the original one, with the rule removed.
 * @since Unreleased
 */
export function removeRequiredRuleFromPolicy(
  policy: Policy,
  rule: Rule
): Policy {
  return removeIri(policy, acp.allOf, rule);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Overwrites the rule refining the scope of a given the [[Policy]]. If an agent
 * requesting access to a resource is **not** present in **any** of the required rules,
 * they will not be granted access.
 * @param policy The [[Policy]] to which the rule should be added.
 * @param rules The rules the policy requires.
 * @returns A new [[Policy]] clone of the original one, with the required rules replaced.
 * @since Unreleased
 */
export function setRequiredRuleOnPolicy(policy: Policy, rule: Rule): Policy {
  return setIri(policy, acp.allOf, rule);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Get the [[Rule]]'s required by the given [[Policy]]
 * @param policy The [[policy]] from which the rules should be read.
 * @returns A list of the required [[Rule]]'s
 * @since unreleased
 */
export function getRequiredRuleOnPolicyAll(policy: Policy): UrlString[] {
  return getIriAll(policy, acp.allOf);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Add a rule that extends the scope of a given the [[Policy]]. If an agent
 * requesting access to a resource is present in **any** of the required rules,
 * they will be granted access.
 * @param policy The [[Policy]] to which the rule should be added.
 * @param rule The rule to add to the policy.
 * @returns A new [[Policy]] clone of the original one, with the new rule added.
 * @since Unreleased
 */
export function addOptionalRuleToPolicy(policy: Policy, rule: Rule): Policy {
  return addIri(policy, acp.anyOf, rule);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Removes a rule that extends the scope of a given the [[Policy]]. If an agent
 * requesting access to a resource is present in **any** of the required rules,
 * they will be granted access.
 * @param policy The [[Policy]] from which the rule should be removed.
 * @param rule The rule to remove from the policy.
 * @returns A new [[Policy]] clone of the original one, with the rule removed.
 * @since Unreleased
 */
export function removeOptionalRuleFromPolicy(
  policy: Policy,
  rule: Rule
): Policy {
  return removeIri(policy, acp.anyOf, rule);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Overwrite the rule extending the scope of a given the [[Policy]]. If an agent
 * requesting access to a resource is present in **any** of the required rules,
 * they will be granted access.
 * @param policy The [[Policy]] to which the rule should be added.
 * @param rules The rules the policy accepts.
 * @returns A new [[Policy]] clone of the original one, with the optional rules replaced.
 * @since Unreleased
 */
export function setOptionalRuleOnPolicy(policy: Policy, rule: Rule): Policy {
  return setIri(policy, acp.anyOf, rule);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Get the [[Rule]]'s accepted by the given [[Policy]]
 * @param policy The [[policy]] from which the rules should be read.
 * @returns A list of the optional [[Rule]]'s
 * @since unreleased
 */
export function getOptionalRuleOnPolicyAll(policy: Policy): UrlString[] {
  return getIriAll(policy, acp.anyOf);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Add a rule that restricts the scope of a given the [[Policy]]. If an agent
 * requesting access to a resource is present in **any** of the forbidden rules,
 * they will **not** be granted access.
 * @param policy The [[Policy]] to which the rule should be added.
 * @param rule The rule to add to the policy.
 * @returns A new [[Policy]] clone of the original one, with the new rule added.
 * @since Unreleased
 */
export function addForbiddenRuleToPolicy(policy: Policy, rule: Rule): Policy {
  return addIri(policy, acp.noneOf, rule);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Removes a rule that restricts the scope of a given the [[Policy]]. If an agent
 * requesting access to a resource is present in **any** of the forbidden rules,
 * they will **not** be granted access.
 * @param policy The [[Policy]] from which the rule should be removed.
 * @param rule The rule to remove from the policy.
 * @returns A new [[Policy]] clone of the original one, with the rule removed.
 * @since Unreleased
 */
export function removeForbiddenRuleFromPolicy(
  policy: Policy,
  rule: Rule
): Policy {
  return removeIri(policy, acp.noneOf, rule);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Set the rules restrincting the scope of a given the [[Policy]]. If an agent
 * requesting access to a resource is present in **any** of the required rules,
 * they will not be granted access.
 * @param policy The [[Policy]] to which the rule should be added.
 * @param rules The rules the policy accepts.
 * @returns A new [[Policy]] clone of the original one, with the optional rules replaced.
 * @since Unreleased
 */
export function setForbiddenRuleOnPolicy(policy: Policy, rule: Rule): Policy {
  return setIri(policy, acp.noneOf, rule);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Get the [[Rule]]'s forbidden by the given [[Policy]]
 * @param policy The [[policy]] from which the rules should be read.
 * @returns A list of the forbidden [[Rule]]'s
 * @since unreleased
 */
export function getForbiddenRuleOnPolicyAll(policy: Policy): UrlString[] {
  return getIriAll(policy, acp.noneOf);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Initialise a new empty [[SolidDataset]] to store [[Rule]]'s in.
 */
export const createRuleDataset = createSolidDataset;

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Initialise a new, empty [[Rule]].
 *
 * @param url URL that identifies this [[Rule]].
 */
export function createRule(url: Url | UrlString): Rule {
  const stringUrl = internal_toIriString(url);
  let ruleThing = createThing({ url: stringUrl });
  ruleThing = setUrl(ruleThing, rdf.type, acp.Rule);
  return ruleThing;
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Get the [[Rule]] with the given URL from an [[RuleDataset]].
 *
 * @param ruleResource The Resource that contains the given [[Rule]].
 * @param url URL that identifies this [[Rule]].
 * @returns The requested [[Rule]], if it exists, or `null` if it does not.
 */
export function getRule(
  ruleResource: RuleDataset,
  url: Url | UrlString
): Policy | null {
  const foundThing = getThing(ruleResource, url);
  if (foundThing === null || getUrl(foundThing, rdf.type) !== acp.Rule) {
    return null;
  }
  return foundThing;
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * List all the agents a [[Rule]] applies **directly** to. This will not include agents
 * that are part of a group the [[Rule]] applies to, nor will it include specific agent
 * classes, such as authenticated or public agents.
 *
 * @param rule The rule from which agents are read.
 * @returns A list of the WebIDs of agents included in the rule.
 * @since Unreleased
 */
export function getAgentForRuleAll(rule: Rule): WebId[] {
  return getIriAll(rule, acp.agent).filter(
    (agent: string) =>
      agent !== acp.PublicAgent && agent !== acp.AuthenticatedAgent
  );
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Overrite the agents the [[Rule]] applies to with the provided agents.
 *
 * @param rule The rule for which agents are set.
 * @param agents The list of agents the rule should apply to.
 * @returns A copy of the input rule, applying to a different set of agents.
 * @since Unreleased
 */
export function setAgentInRule(rule: Rule, agents: WebId[]): Rule {
  // Preserve the special agent classes authenticated and public, which we
  // don't want to overwrite with this function.
  // NB: This raises the question wether the named agents and agent classes should
  // be linked to with the same predicate.
  const isPublic = hasPublicInRule(rule);
  const isAuthenticated = hasAuthenticatedInRule(rule);
  let result = cloneThing(rule);
  if (agents.length === 0) {
    result = removeAll(rule, acp.agent);
  } else {
    result = setIri(rule, acp.agent, agents[0]);
    agents.slice(1).forEach((agent) => {
      result = addIri(result, acp.agent, agent);
    });
  }
  // Restore public and authenticated
  result = setPublicForRule(result, isPublic);
  result = setAuthenticatedForRule(result, isAuthenticated);
  return result;
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Apply the [[Rule]] to an additional agent.
 *
 * @param rule The [[Rule]] to be applied to an additional agent.
 * @param agent The agent the [[Rule]] should apply to.
 * @returns A copy of the [[Rule]], applying to an additional agent.
 * @since Unreleased
 */
export function addAgentToRule(rule: Rule, agent: WebId): Rule {
  return addIri(rule, acp.agent, agent);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Prevent the [[Rule]] from applying to a given agent directly. This will not
 * remove the agent from any groups the rule applies to.
 *
 * @param rule The [[Rule]] that should no longer apply to a given agent.
 * @param agent The agent the rule should no longer apply to.
 * @returns A copy of the rule, not applying to the given agent.
 * @since Unreleased
 */
export function removeAgentFromRule(rule: Rule, agent: WebId): Rule {
  return removeIri(rule, acp.agent, agent);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Lists all the groups a [[Rule]] applies to.
 *
 * @param rule The rule from which groups are read.
 * @returns A list of the [[URL]]'s of groups included in the rule.
 * @since Unreleased
 */
export function getGroupForRuleAll(rule: Rule): UrlString[] {
  return getIriAll(rule, acp.group);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Overrite the groups the [[Rule]] applies to with the provided groups.
 *
 * @param rule The rule for which groups are set.
 * @param agents The list of groups the rule should apply to.
 * @returns A copy of the input rule, applying to a different set of groups.
 * @since Unreleased
 */
export function setGroupInRule(rule: Rule, groups: UrlString[]): Rule {
  if (groups.length === 0) {
    return removeAll(rule, acp.group);
  }
  let result = setIri(rule, acp.group, groups[0]);
  groups.slice(1).forEach((group: UrlString) => {
    result = addIri(result, acp.group, group);
  });
  return result;
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Apply the [[Rule]] to an additional group.
 *
 * @param rule The [[Rule]] to be applied to an additional group.
 * @param agent The group the [[Rule]] should apply to.
 * @returns A copy of the [[Rule]], applying to an additional group.
 * @since Unreleased
 */
export function addGroupToRule(rule: Rule, group: UrlString): Rule {
  return addIri(rule, acp.group, group);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Prevent the [[Rule]] from applying to a given group.
 *
 * @param rule The [[Rule]] that should no longer apply to a given group.
 * @param agent The group the rule should no longer apply to.
 * @returns A copy of the rule, not applying to the given group.
 * @since Unreleased
 */
export function removeGroupFromRule(rule: Rule, group: UrlString): Rule {
  return removeIri(rule, acp.group, group);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Check if the rule applies to any agent.
 *
 * @param rule The rule checked for public access.
 * @returns Whether the rule applies to any agent or not.
 */
export function hasPublicInRule(rule: Rule): boolean {
  return (
    getIriAll(rule, acp.agent).filter((agent) => agent === acp.PublicAgent)
      .length > 0
  );
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Enable or disable a rule from applying to any agent.
 *
 * @param rule The rule being modified.
 * @param hasPublic A boolean indicating whether the rule should apply or not to any agent.
 * @returns A copy of the rule, updated to apply/not apply to any agent.
 * @status Unreleased
 */
export function setPublicForRule(rule: Rule, hasPublic: boolean): Rule {
  if (!hasPublic) {
    return removeIri(rule, acp.agent, acp.PublicAgent);
  }
  return addIri(rule, acp.agent, acp.PublicAgent);
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Check if the rule applies to any authenticated agent.
 *
 * @param rule The rule checked for authenticated access.
 * @returns Whether the rule applies to any authenticated agent or not.
 */
export function hasAuthenticatedInRule(rule: Rule): boolean {
  return (
    getIriAll(rule, acp.agent).filter(
      (agent) => agent === acp.AuthenticatedAgent
    ).length > 0
  );
}

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Enable or disable a rule from applying to any authenticated agent.
 *
 * @param rule The rule being modified.
 * @param hasPublic A boolean indicating whether the rule should apply or not to any authenticated agent.
 * @returns A copy of the rule, updated to apply/not apply to any authenticated agent.
 * @status Unreleased
 */
export function setAuthenticatedForRule(
  rule: Rule,
  authenticated: boolean
): Rule {
  if (!authenticated) {
    return removeIri(rule, acp.agent, acp.AuthenticatedAgent);
  }
  return addIri(rule, acp.agent, acp.AuthenticatedAgent);
}
