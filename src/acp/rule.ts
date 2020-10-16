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

import { acp } from "../constants";
import { SolidDataset, ThingPersisted, UrlString } from "../interfaces";
import { addIri } from "../thing/add";
import { getIriAll } from "../thing/get";
import { removeAll, removeIri } from "../thing/remove";
import { setIri } from "../thing/set";
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
 * Set the rules refining the scope of a given the [[Policy]]. If an agent
 * requesting access to a resource is **not** present in **any** of the required rules,
 * they will not be granted access.
 * @param policy The [[Policy]] to which the rule should be added.
 * @param rules The rules the policy requires.
 * @returns A new [[Policy]] clone of the original one, with the required rules replaced.
 * @since Unreleased
 */
export function setRequiredRuleOnPolicy(policy: Policy, rules: Rule[]): Policy {
  if (rules.length === 0) {
    return removeAll(policy, acp.allOf);
  }
  let updatedPolicy = setIri(policy, acp.allOf, rules[0]);
  rules.slice(1).forEach((ruleToAdd: Rule) => {
    updatedPolicy = addRequiredRuleToPolicy(updatedPolicy, ruleToAdd);
  });
  return updatedPolicy;
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
 * Set the rules extending the scope of a given the [[Policy]]. If an agent
 * requesting access to a resource is present in **any** of the required rules,
 * they will be granted access.
 * @param policy The [[Policy]] to which the rule should be added.
 * @param rules The rules the policy accepts.
 * @returns A new [[Policy]] clone of the original one, with the optional rules replaced.
 * @since Unreleased
 */
export function setOptionalRuleOnPolicy(policy: Policy, rules: Rule[]): Policy {
  if (rules.length === 0) {
    return removeAll(policy, acp.anyOf);
  }
  let updatedPolicy = setIri(policy, acp.anyOf, rules[0]);
  rules.slice(1).forEach((ruleToAdd: Rule) => {
    updatedPolicy = addOptionalRuleToPolicy(updatedPolicy, ruleToAdd);
  });
  return updatedPolicy;
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
 * Set the rules restrincting the scope of a given the [[Policy]]. If an agent
 * requesting access to a resource is present in **any** of the required rules,
 * they will not be granted access.
 * @param policy The [[Policy]] to which the rule should be added.
 * @param rules The rules the policy accepts.
 * @returns A new [[Policy]] clone of the original one, with the optional rules replaced.
 * @since Unreleased
 */
export function setForbiddenRuleOnPolicy(
  policy: Policy,
  rules: Rule[]
): Policy {
  if (rules.length === 0) {
    return removeAll(policy, acp.noneOf);
  }
  let updatedPolicy = setIri(policy, acp.noneOf, rules[0]);
  rules.slice(1).forEach((ruleToAdd: Rule) => {
    updatedPolicy = addForbiddenRuleToPolicy(updatedPolicy, ruleToAdd);
  });
  return updatedPolicy;
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
