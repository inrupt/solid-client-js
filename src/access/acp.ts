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
import { getSourceIri } from "../resource/resource";
import { getThing } from "../thing/thing";
import { hasAccessibleAcr, WithAccessibleAcr, WithAcp } from "../acp/acp";
import {
  AccessControlResource,
  getAcrPolicyUrlAll,
  getPolicyUrlAll,
} from "../acp/control";
import { internal_getAcr } from "../acp/control.internal";
import { getAllowModes, getDenyModes, getPolicy, Policy } from "../acp/policy";
import {
  getForbiddenRuleUrlAll,
  getOptionalRuleUrlAll,
  getRequiredRuleUrlAll,
  getRule,
  Rule,
} from "../acp/rule";
import { IriString, WithResourceInfo } from "../interfaces";
import { getIriAll } from "../thing/get";

export function internal_hasInaccessiblePolicies(
  resource: WithAccessibleAcr & WithResourceInfo
): boolean {
  const sourceIri = getSourceIri(resource);

  // Collect all policies that apply to the resource or its ACR (aka active)
  const activePolicyUrls = getPolicyUrlAll(resource).concat(
    getAcrPolicyUrlAll(resource)
  );

  // Collect all the rules referenced by the active policies.
  const ruleUrls: string[] = [];
  activePolicyUrls.forEach((policyUrl) => {
    const acr = internal_getAcr(resource);
    const policyThing = getThing(acr, policyUrl);
    if (policyThing !== null) {
      getIriAll(policyThing, acp.anyOf).forEach((activeRuleUrl) =>
        ruleUrls.push(activeRuleUrl)
      );
      getIriAll(policyThing, acp.allOf).forEach((activeRuleUrl) =>
        ruleUrls.push(activeRuleUrl)
      );
      getIriAll(policyThing, acp.noneOf).forEach((activeRuleUrl) =>
        ruleUrls.push(activeRuleUrl)
      );
    }
  });
  // If either an active policy or rule are not defined in the ACR, return false
  return activePolicyUrls
    .concat(ruleUrls)
    .some((url) => url.substring(0, sourceIri.length) !== sourceIri);
}

/**
 * Each of the following access modes is in one of three states:
 * - true: this access mode is granted, or
 * - false: this access mode is denied, or
 * - undefined: this access mode is not set yet.
 */
interface Access {
  read: boolean | undefined;
  append: boolean | undefined;
  write: boolean | undefined;
  controlRead: boolean | undefined;
  controlWrite: boolean | undefined;
}

/**
 * Get an overview of what access is defined for a given actor in a Resource's Access Control Resource.
 *
 * This will only return a value if all relevant access is defined in just the Resource's Access
 * Control Resource; in other words, if an Access Policy or Access Rule applies that is re-used for
 * other Resources, this function will not be able to determine the access relevant to this actor.
 *
 * Additionally, this only considers access given _explicitly_ to the given actor, i.e. without
 * additional conditions.
 *
 * In other words, this function will generally understand and return the access as set by
 * [[internal_setActorAccess]], but not understand more convoluted Policies.
 *
 * @param resource Resource that was fetched together with its linked Access Control Resource.
 * @param actorRelation What type of actor (e.g. acp:agent or acp:group) you want to get the access for.
 * @param actor Which instance of the given actor type you want to get the access for.
 */
export function internal_getActorAccess(
  resource: WithResourceInfo & WithAcp,
  actorRelation: IriString,
  actor: IriString
): Access | null {
  if (
    !hasAccessibleAcr(resource) ||
    internal_hasInaccessiblePolicies(resource)
  ) {
    return null;
  }

  const acr = internal_getAcr(resource);

  const acrPolicyUrls = getAcrPolicyUrlAll(resource);
  const acrPolicies = acrPolicyUrls
    .map((policyUrl) => getPolicy(acr, policyUrl))
    .filter((policy) => policy !== null) as Policy[];
  const applicableAcrPolicies = acrPolicies.filter((policy) =>
    policyAppliesTo(policy, actorRelation, actor, acr)
  );

  const policyUrls = getPolicyUrlAll(resource);
  const policies = policyUrls
    .map((policyUrl) => getPolicy(acr, policyUrl))
    .filter((policy) => policy !== null) as Policy[];
  const applicablePolicies = policies.filter((policy) =>
    policyAppliesTo(policy, actorRelation, actor, acr)
  );

  // All allowed reading and writing defined in ACR policies
  // determines whether the `controlRead` and `controlWrite` statuses are `true`.
  const allowedAcrAccess = applicableAcrPolicies.reduce((acc, policy) => {
    const allAllowedAccess = { ...acc };
    const allowModes = getAllowModes(policy);
    if (allowModes.read) {
      allAllowedAccess.controlRead = true;
    }
    if (allowModes.write) {
      allAllowedAccess.controlWrite = true;
    }
    return allAllowedAccess;
  }, {} as Access);
  // Then allowed reading, appending and writing in regular policies
  // determines whether the respective status is `true`.
  const withAllowedAccess = applicablePolicies.reduce((acc, policy) => {
    const allAllowedAccess = { ...acc };
    const allowModes = getAllowModes(policy);
    if (allowModes.read) {
      allAllowedAccess.read = true;
    }
    if (allowModes.append) {
      allAllowedAccess.append = true;
    }
    if (allowModes.write) {
      allAllowedAccess.write = true;
    }
    return allAllowedAccess;
  }, allowedAcrAccess);

  // At this point, everything that is not explicitly allowed is still undefined.
  // However, we still need to set the access that is explicitly denied to `false`.
  // Starting with `controlRead` and `controlWrite`,
  // by inspecting denied reading and writing defined in the ACR policies.
  const withAcrDeniedAccess = applicableAcrPolicies.reduce((acc, policy) => {
    const allDeniedAccess = { ...acc };
    const denyModes = getDenyModes(policy);
    if (denyModes.read === true) {
      allDeniedAccess.controlRead = false;
    }
    if (denyModes.write === true) {
      allDeniedAccess.controlWrite = false;
    }
    return allDeniedAccess;
  }, withAllowedAccess);
  // And finally, we set to `false` those access modes that are explicitly denied
  // in the regular policies:
  const withDeniedAccess = applicablePolicies.reduce((acc, policy) => {
    const allDeniedAccess = { ...acc };
    const denyModes = getDenyModes(policy);
    if (denyModes.read === true) {
      allDeniedAccess.read = false;
    }
    if (denyModes.append === true) {
      allDeniedAccess.append = false;
    }
    if (denyModes.write === true) {
      allDeniedAccess.write = false;
    }
    return allDeniedAccess;
  }, withAcrDeniedAccess);

  return withDeniedAccess;
}

function policyAppliesTo(
  policy: Policy,
  actorRelation: IriString,
  actor: IriString,
  acr: AccessControlResource
) {
  const allOfRules = getRequiredRuleUrlAll(policy).map((ruleUrl) =>
    getRule(acr, ruleUrl)
  );
  const anyOfRules = getOptionalRuleUrlAll(policy).map((ruleUrl) =>
    getRule(acr, ruleUrl)
  );
  const noneOfRules = getForbiddenRuleUrlAll(policy).map((ruleUrl) =>
    getRule(acr, ruleUrl)
  );

  return (
    allOfRules.every((rule) => ruleAppliesTo(rule, actorRelation, actor)) &&
    (anyOfRules.length === 0 ||
      anyOfRules.some((rule) => ruleAppliesTo(rule, actorRelation, actor))) &&
    noneOfRules.every((rule) => !ruleAppliesTo(rule, actorRelation, actor))
  );
}

function ruleAppliesTo(
  rule: Rule | null,
  actorRelation: IriString,
  actor: IriString
): boolean {
  return rule !== null && getIriAll(rule, actorRelation).includes(actor);
}
