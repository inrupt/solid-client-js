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
import { asIri, getThing, setThing } from "../thing/thing";
import { hasAccessibleAcr, WithAccessibleAcr, WithAcp } from "../acp/acp";
import {
  AccessControlResource,
  addAcrPolicyUrl,
  addPolicyUrl,
  getAcrPolicyUrlAll,
  getPolicyUrlAll,
  removeAcrPolicyUrl,
  removePolicyUrl,
} from "../acp/control";
import { internal_getAcr, internal_setAcr } from "../acp/control.internal";
import {
  createPolicy,
  getAllowModes,
  getDenyModes,
  getPolicy,
  Policy,
  setAllowModes,
} from "../acp/policy";
import {
  createRule,
  getForbiddenRuleUrlAll,
  getOptionalRuleUrlAll,
  getRequiredRuleUrlAll,
  getRule,
  Rule,
} from "../acp/rule";
import {
  IriString,
  SolidDataset,
  UrlString,
  WebId,
  WithResourceInfo,
} from "../interfaces";
import { Access } from "./universal";
import { getIri, getIriAll } from "../thing/get";
import { addIri } from "../thing/add";
import { setIri } from "../thing/set";

function getActiveRuleAll(
  resource: WithAccessibleAcr & WithResourceInfo,
  policyUrlAll: UrlString[]
): UrlString[] {
  // Collect all the rules referenced by the active policies.
  const ruleUrls: string[] = [];
  policyUrlAll.forEach((policyUrl) => {
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
  return ruleUrls;
}

export function internal_hasInaccessiblePolicies(
  resource: WithAccessibleAcr & WithResourceInfo
): boolean {
  const sourceIri = getSourceIri(resource);

  // Collect all policies that apply to the resource or its ACR (aka active)
  const activePolicyUrls = getPolicyUrlAll(resource).concat(
    getAcrPolicyUrlAll(resource)
  );
  const ruleUrls: string[] = getActiveRuleAll(resource, activePolicyUrls);

  // If either an active policy or rule are not defined in the ACR, return false
  return (
    activePolicyUrls
      .concat(ruleUrls)
      // The call to `isDefaultEssPolicyUrl` is a workaround for an ESS bug.
      // When that workaround can be removed, remove the `&&` leg that calls it.
      .some(
        (url) =>
          url.substring(0, sourceIri.length) !== sourceIri &&
          !isDefaultEssPolicyUrl(url, sourceIri)
      )
  );
}

const knownActorRelations = [acp.agent, acp.group];
/**
 * Union type of all relations defined in `knownActorRelations`.
 *
 * When the ACP spec evolves to support additional relations of Rules to Actors,
 * adding those relations to `knownActorRelations` will cause TypeScript to warn
 * us everywhere to update everywhere the ActorRelation type is used and that
 * needs additional work to handle it.
 */
type ActorRelation = typeof knownActorRelations extends Array<infer E>
  ? E
  : never;

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
 * @returns What Access modes are granted to the given actor explicitly, or null if it could not be determined.
 */
export function internal_getActorAccess(
  resource: WithResourceInfo & WithAcp,
  actorRelation: ActorRelation,
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

  const initialAccess: Access = {
    read: false,
    append: false,
    write: false,
    controlRead: false,
    controlWrite: false,
  };
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
  }, initialAccess);
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

  // At this point, everything that has been explicitly allowed is true.
  // However, it could still be overridden by access that is explicitly denied.
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

/**
 * Get an overview of what access is defined for a given Agent in a Resource's Access Control Resource.
 *
 * This will only return a value if all relevant access is defined in just the Resource's Access
 * Control Resource; in other words, if an Access Policy or Access Rule applies that is re-used for
 * other Resources, this function will not be able to determine the access relevant to this Agent.
 *
 * Additionally, this only considers access given _explicitly_ to the given Agent, i.e. without
 * additional conditions.
 *
 * In other words, this function will generally understand and return the access as set by
 * [[internal_setAgentAccess]], but not understand more convoluted Policies.
 *
 * @param resource Resource that was fetched together with its linked Access Control Resource.
 * @param webId WebID of the Agent you want to get the access for.
 * @returns What Access modes are granted to the given Agent explicitly, or null if it could not be determined.
 */
export function internal_getAgentAccess(
  resource: WithResourceInfo & WithAcp,
  webId: WebId
): Access | null {
  return internal_getActorAccess(resource, acp.agent, webId);
}

/**
 * Get an overview of what access is defined for a given Group in a Resource's Access Control Resource.
 *
 * This will only return a value if all relevant access is defined in just the Resource's Access
 * Control Resource; in other words, if an Access Policy or Access Rule applies that is re-used for
 * other Resources, this function will not be able to determine the access relevant to this Group.
 *
 * Additionally, this only considers access given _explicitly_ to the given Group, i.e. without
 * additional conditions.
 *
 * In other words, this function will generally understand and return the access as set by
 * [[internal_setGroupAccess]], but not understand more convoluted Policies.
 *
 * @param resource Resource that was fetched together with its linked Access Control Resource.
 * @param groupUrl URL of the Group you want to get the access for.
 * @returns What Access modes are granted to the given Group explicitly, or null if it could not be determined.
 */
export function internal_getGroupAccess(
  resource: WithResourceInfo & WithAcp,
  groupUrl: UrlString
): Access | null {
  return internal_getActorAccess(resource, acp.group, groupUrl);
}

/**
 * Get an overview of what access is defined for everybody in a Resource's Access Control Resource.
 *
 * This will only return a value if all relevant access is defined in just the Resource's Access
 * Control Resource; in other words, if an Access Policy or Access Rule applies that is re-used for
 * other Resources, this function will not be able to determine the access relevant to everybody.
 *
 * Additionally, this only considers access given _explicitly_ to everybody, i.e. without
 * additional conditions.
 *
 * In other words, this function will generally understand and return the access as set by
 * [[internal_setPublicAccess]], but not understand more convoluted Policies.
 *
 * @param resource Resource that was fetched together with its linked Access Control Resource.
 * @returns What Access modes are granted to everyone explicitly, or null if it could not be determined.
 */
export function internal_getPublicAccess(
  resource: WithResourceInfo & WithAcp
): Access | null {
  return internal_getActorAccess(resource, acp.agent, acp.PublicAgent);
}

/**
 * Get an overview of what access is defined for all authenticated Agents in a Resource's Access Control Resource.
 *
 * This will only return a value if all relevant access is defined in just the Resource's Access
 * Control Resource; in other words, if an Access Policy or Access Rule applies that is re-used for
 * other Resources, this function will not be able to determine the access relevant to authenticated
 * Agents.
 *
 * Additionally, this only considers access given _explicitly_ to authenticated Agents, i.e. without
 * additional conditions.
 *
 * In other words, this function will generally understand and return the access as set by
 * [[internal_setAuthenticatedAccess]], but not understand more convoluted Policies.
 *
 * @param resource Resource that was fetched together with its linked Access Control Resource.
 * @returns What Access modes are granted to authenticated users explicitly, or null if it could not be determined.
 */
export function internal_getAuthenticatedAccess(
  resource: WithResourceInfo & WithAcp
): Access | null {
  return internal_getActorAccess(resource, acp.agent, acp.AuthenticatedAgent);
}

function policyAppliesTo(
  policy: Policy,
  actorRelation: ActorRelation,
  actor: IriString,
  acr: AccessControlResource
) {
  const allowModes = getIriAll(policy, acp.allow);
  const denyModes = getIriAll(policy, acp.deny);
  if (allowModes.length + denyModes.length === 0) {
    // A Policy that does not specify access modes does not do anything:
    return false;
  }

  const allOfRules = getRequiredRuleUrlAll(policy)
    .map((ruleUrl) => getRule(acr, ruleUrl))
    .filter(isNotNull);
  const anyOfRules = getOptionalRuleUrlAll(policy)
    .map((ruleUrl) => getRule(acr, ruleUrl))
    .filter(isNotNull);
  const noneOfRules = getForbiddenRuleUrlAll(policy)
    .map((ruleUrl) => getRule(acr, ruleUrl))
    .filter(isNotNull);

  // We assume that this Policy applies if this specific actor is mentioned
  // and no further restrictions are in place.
  // (In other words, the Policy may apply to others *in addition to* this
  // actor, but if it applies to this actor *unless* some other condition holds,
  // we cannot be sure whether it will apply to this actor.)
  // This means that:
  return (
    // Every existing allOf Rule explicitly applies explicitly to this given actor:
    allOfRules.every((rule) => ruleAppliesTo(rule, actorRelation, actor)) &&
    // If there are anyOf Rules, at least one applies explicitly to this actor:
    (anyOfRules.length === 0 ||
      anyOfRules.some((rule) => ruleAppliesTo(rule, actorRelation, actor))) &&
    // No further restrictions are in place that make this sometimes not apply
    // to the given actor:
    noneOfRules.length === 0
  );
}

function policyConflictsWith(
  policy: Policy,
  otherAccess: {
    read?: boolean;
    append?: boolean;
    write?: boolean;
  }
): boolean {
  const allowModes = getIriAll(policy, acp.allow);
  const denyModes = getIriAll(policy, acp.deny);
  return (
    (otherAccess.read === true && denyModes.includes(acp.Read)) ||
    (otherAccess.read === false &&
      allowModes.includes(acp.Read) &&
      !denyModes.includes(acp.Read)) ||
    (otherAccess.append === true && denyModes.includes(acp.Append)) ||
    (otherAccess.append === false &&
      allowModes.includes(acp.Append) &&
      !denyModes.includes(acp.Append)) ||
    (otherAccess.write === true && denyModes.includes(acp.Write)) ||
    (otherAccess.write === false &&
      allowModes.includes(acp.Write) &&
      !denyModes.includes(acp.Write))
  );
}

function ruleAppliesTo(
  rule: Rule,
  actorRelation: ActorRelation,
  actor: IriString
): boolean {
  // A Rule that does not list *any* actor matches for everyone:
  let isEmpty = true;
  knownActorRelations.forEach((knownActorRelation) => {
    isEmpty &&= getIri(rule, knownActorRelation) === null;
  });
  return isEmpty || getIriAll(rule, actorRelation).includes(actor);
}

/**
 * Get a set of all actors mentioned in an ACR by active Rules (i.e. that are
 * referenced by Policies referenced by the ACR Control, and therefore that
 * effectively apply).
 *
 * @param resource The resource with the ACR we want to inspect
 * @param actorRelation
 */
function internal_findActorAll(
  resource: WithAccessibleAcr & WithResourceInfo,
  actorRelation: ActorRelation
): Set<WebId> {
  const actors: Set<WebId> = new Set();
  // Collect all policies that apply to the resource or its ACR (aka active)
  const activePolicyUrls = getPolicyUrlAll(resource).concat(
    getAcrPolicyUrlAll(resource)
  );
  const rules = getActiveRuleAll(resource, activePolicyUrls);
  // This code could be prettier using flat(), which isn't supported by nodeJS 10.
  // If you read this comment after April 2021, feel free to refactor.
  rules.forEach((ruleUrl) => {
    // The rules URL being extracted from the dataset, it is safe to assume
    // that getThing cannot return undefined.
    const ruleThing = getThing(internal_getAcr(resource), ruleUrl)!;
    getIriAll(ruleThing, actorRelation)
      .filter(
        (iri) =>
          !([
            acp.PublicAgent,
            acp.CreatorAgent,
            acp.AuthenticatedAgent,
          ] as string[]).includes(iri) || actorRelation != acp.agent
      )
      .forEach((iri) => actors.add(iri));
  });
  return actors;
}

/**
 * Iterate through all the actors active for an ACR, and list all of their access.
 * @param resource The resource for which we want to list the access
 * @param actorRelation The type of actor we want to list access for
 * @returns A map with each actor access indexed by their URL, or null if some
 * external policies are referenced.
 */
export function internal_getActorAccessAll(
  resource: WithResourceInfo & WithAcp,
  actorRelation: ActorRelation
): Record<string, Access> | null {
  if (
    !hasAccessibleAcr(resource) ||
    internal_hasInaccessiblePolicies(resource)
  ) {
    return null;
  }
  const result: Record<UrlString, Access> = {};
  const actors = internal_findActorAll(resource, actorRelation);
  actors.forEach((iri) => {
    // The type assertion holds, because if internal_getActorAccess were null,
    // we would have returned {} already.
    const access = internal_getActorAccess(
      resource,
      actorRelation,
      iri
    ) as Access;
    result[iri] = access;
  });
  return result;
}

/**
 * Get an overview of what access are defined for all Groups in a Resource's Access Control Resource.
 *
 * This will only return a value if all relevant access is defined in just the Resource's Access
 * Control Resource; in other words, if an Access Policy or Access Rule applies that is re-used for
 * other Resources, this function will not be able to determine the access relevant to the mentionned
 * Groups.
 *
 * Additionally, this only considers access given _explicitly_ to individual Groups, i.e. without
 * additional conditions.
 *
 * In other words, this function will generally understand and return the access as set by
 * [[internal_setAgentAccess]], but not understand more convoluted Policies.
 *
 * @param resource Resource that was fetched together with its linked Access Control Resource.
 * @returns A map with each Group's access indexed by their URL, or null if some
 * external policies are referenced.
 */
export function internal_getGroupAccessAll(
  resource: WithResourceInfo & WithAcp
): Record<UrlString, Access> | null {
  return internal_getActorAccessAll(resource, acp.group);
}

/**
 * Get an overview of what access are defined for all Agents in a Resource's Access Control Resource.
 *
 * This will only return a value if all relevant access is defined in just the Resource's Access
 * Control Resource; in other words, if an Access Policy or Access Rule applies that is re-used for
 * other Resources, this function will not be able to determine the access relevant to the mentionned
 * Agents.
 *
 * Additionally, this only considers access given _explicitly_ to individual Agents, i.e. without
 * additional conditions.
 *
 * In other words, this function will generally understand and return the access as set by
 * [[internal_setAgentAccess]], but not understand more convoluted Policies.
 *
 * @param resource Resource that was fetched together with its linked Access Control Resource.
 * @returns A map with each Agent's access indexed by their WebID, or null if some
 * external policies are referenced.
 */
export function internal_getAgentAccessAll(
  resource: WithResourceInfo & WithAcp
): Record<WebId, Access> | null {
  return internal_getActorAccessAll(resource, acp.agent);
}

/**
 * Set access to a Resource for a specific actor.
 *
 * This function adds the relevant Access Control Policies and Rules to a
 * Resource's Access Control Resource to define the given access for the given
 * actor specifically. In other words, it can, for example, add Policies that
 * give a particular Group Read access to the Resource. However, if other
 * Policies specify that everyone in that Group is *denied* Read access *except*
 * for a particular Agent, then that will be left intact.
 * This means that, unless *only* this module's functions are used to manipulate
 * access to this Resource, the set access might not be equal to the effective
 * access for an agent matching the given actor.
 *
 * There are a number of preconditions that have to be fulfilled for this
 * function to work:
 * - Access to the Resource is determined via an Access Control Resource.
 * - The Resource's Access Control Resource does not refer to (Policies or Rules
 *   in) other Resources.
 * - The current user has access to the Resource's Access Control Resource.
 *
 * If those conditions do not hold, this function will return `null`.
 *
 * Additionally, take note that the given access will only be applied to the
 * given Resource; if that Resource is a Container, access will have to be set
 * for its contained Resources independently.
 *
 * @param resource Resource that was fetched together with its linked Access Control Resource.
 * @param actorRelation What type of actor (e.g. acp:agent or acp:group) you want to set the access for.
 * @param actor Which instance of the given actor type you want to set the access for.
 * @param access What access (read, append, write, controlRead, controlWrite) to set for the given actor. `true` to allow, `false` to deny, and `undefined` to leave unchanged.
 * @returns The Resource with the updated Access Control Resource attached, if updated successfully, or `null` if not.
 */
export function internal_setActorAccess<
  ResourceExt extends WithResourceInfo & WithAcp
>(
  resource: ResourceExt,
  actorRelation: ActorRelation,
  actor: UrlString,
  access: Partial<Access>
): ResourceExt | null {
  if (
    !hasAccessibleAcr(resource) ||
    internal_hasInaccessiblePolicies(resource)
  ) {
    return null;
  }

  // Get the access that currently applies to the given actor
  const existingAccess = internal_getActorAccess(
    resource,
    actorRelation,
    actor
  );

  /* istanbul ignore if: It returns null if the ACR has inaccessible Policies, which should happen since we already check for that above. */
  if (existingAccess === null) {
    return null;
  }

  // Get all Policies that apply specifically to the given actor
  const acr = internal_getAcr(resource);

  const acrPolicyUrls = getAcrPolicyUrlAll(resource);
  const acrPolicies = acrPolicyUrls
    // This is a temporary workaround until ESS removes its default Policy references:
    .filter(
      (policyUrl) => !isDefaultEssPolicyUrl(policyUrl, getSourceIri(resource))
    )
    .map((policyUrl) => getPolicy(acr, policyUrl))
    .filter((policy) => policy !== null) as Policy[];
  const applicableAcrPolicies = acrPolicies.filter((policy) =>
    policyAppliesTo(policy, actorRelation, actor, acr)
  );

  const policyUrls = getPolicyUrlAll(resource);
  const policies = policyUrls
    // This is a temporary workaround until ESS removes its default Policy references:
    .filter(
      (policyUrl) => !isDefaultEssPolicyUrl(policyUrl, getSourceIri(resource))
    )
    .map((policyUrl) => getPolicy(acr, policyUrl))
    .filter((policy) => policy !== null) as Policy[];
  const applicablePolicies = policies.filter((policy) =>
    policyAppliesTo(policy, actorRelation, actor, acr)
  );

  // We only need to override Policies that define access other than what we want:
  const conflictingAcrPolicies = applicableAcrPolicies.filter((policy) =>
    policyConflictsWith(policy, {
      read: access.controlRead,
      write: access.controlWrite,
    })
  );
  const conflictingPolicies = applicablePolicies.filter((policy) =>
    policyConflictsWith(policy, {
      read: access.read,
      append: access.append,
      write: access.write,
    })
  );

  // For every Policy that applies specifically to the given Actor, but _also_
  // to another actor (i.e. that applies using an anyOf Rule, or a Rule that
  // mentions both the given and another actor)...
  const otherActorAcrPolicies = conflictingAcrPolicies.filter((acrPolicy) =>
    policyHasOtherActors(acrPolicy, actorRelation, actor, acr)
  );
  const otherActorPolicies = conflictingPolicies.filter((policy) =>
    policyHasOtherActors(policy, actorRelation, actor, acr)
  );

  // ...check what access the current actor would have if we removed them...
  const otherActorAcrPolicyUrls = otherActorAcrPolicies.map((acrPolicy) =>
    asIri(acrPolicy)
  );
  const otherActorPolicyUrls = otherActorPolicies.map((policy) =>
    asIri(policy)
  );
  let resourceWithPoliciesExcluded = otherActorAcrPolicyUrls.reduce(
    removeAcrPolicyUrl,
    resource
  );
  resourceWithPoliciesExcluded = otherActorPolicyUrls.reduce(
    removePolicyUrl,
    resourceWithPoliciesExcluded
  );
  const remainingAccess = internal_getActorAccess(
    resourceWithPoliciesExcluded,
    actorRelation,
    actor
  );

  /* istanbul ignore if: It returns null if the ACR has inaccessible Policies, which should happen since we already check for that at the start. */
  if (remainingAccess === null) {
    return null;
  }

  // ...add copies of those Policies and their Rules, but excluding the given actor...
  let updatedAcr = acr;
  const newAcrPolicyUrls: IriString[] = [];
  otherActorAcrPolicies.forEach((acrPolicy) => {
    const [policyCopy, ruleCopies] = copyPolicyExcludingActor(
      acrPolicy,
      acr,
      actorRelation,
      actor
    );
    updatedAcr = setThing(updatedAcr, policyCopy);
    updatedAcr = ruleCopies.reduce(setThing, updatedAcr);
    newAcrPolicyUrls.push(asIri(policyCopy));
  });
  const newPolicyUrls: IriString[] = [];
  otherActorPolicies.forEach((policy) => {
    const [policyCopy, ruleCopies] = copyPolicyExcludingActor(
      policy,
      acr,
      actorRelation,
      actor
    );
    updatedAcr = setThing(updatedAcr, policyCopy);
    updatedAcr = ruleCopies.reduce(setThing, updatedAcr);
    newPolicyUrls.push(asIri(policyCopy));
  });

  // ...add a new Policy that applies the given access,
  // and the previously applying access for access modes that were undefined...
  const newRuleIri =
    getSourceIri(acr) + `#rule_${encodeURIComponent(actorRelation)}_${actor}`;
  let newRule = createRule(newRuleIri);
  newRule = setIri(newRule, actorRelation, actor);

  const newControlReadAccess = access.controlRead ?? existingAccess.controlRead;
  const newControlWriteAccess =
    access.controlWrite ?? existingAccess.controlWrite;
  let acrPoliciesToUnapply = otherActorAcrPolicies;
  // Only replace existing Policies if the defined access actually changes:
  if (
    newControlReadAccess !== remainingAccess.controlRead ||
    newControlWriteAccess !== remainingAccess.controlWrite
  ) {
    const newAcrPolicyIri =
      getSourceIri(acr) +
      `#acr_policy` +
      `_${encodeURIComponent(actorRelation)}_${actor}` +
      `_${Date.now()}_${Math.random()}`;
    let newAcrPolicy = createPolicy(newAcrPolicyIri);
    newAcrPolicy = setAllowModes(newAcrPolicy, {
      read: newControlReadAccess === true,
      append: false,
      write: newControlWriteAccess === true,
    });
    newAcrPolicy = addIri(newAcrPolicy, acp.allOf, newRule);
    updatedAcr = setThing(updatedAcr, newAcrPolicy);
    updatedAcr = setThing(updatedAcr, newRule);
    newAcrPolicyUrls.push(newAcrPolicyIri);
    // If we don't have to set new access, we only need to unapply the
    // ACR Policies that applied to both the given actor and other actors
    // (because they have been replaced by clones not mentioning the given
    // actor). Hence `policiesToUnApply` is initialied to `otherActorPolicies`.
    // However, if we're in this if branch, that means we also had to replace
    // Policies that defined access for just this actor, so we'll have to remove
    // all Policies mentioning this actor:
    acrPoliciesToUnapply = conflictingAcrPolicies;
  }

  const newReadAccess = access.read ?? existingAccess.read;
  const newAppendAccess = access.append ?? existingAccess.append;
  const newWriteAccess = access.write ?? existingAccess.write;
  let policiesToUnapply = otherActorPolicies;
  // Only replace existing Policies if the defined access actually changes:
  if (
    newReadAccess !== remainingAccess.read ||
    newAppendAccess !== remainingAccess.append ||
    newWriteAccess !== remainingAccess.write
  ) {
    const newPolicyIri =
      getSourceIri(acr) +
      `#policy` +
      `_${encodeURIComponent(actorRelation)}_${encodeURIComponent(actor)}` +
      `_${Date.now()}_${Math.random()}`;
    let newPolicy = createPolicy(newPolicyIri);
    newPolicy = setAllowModes(newPolicy, {
      read: newReadAccess === true,
      append: newAppendAccess === true,
      write: newWriteAccess === true,
    });
    newPolicy = addIri(newPolicy, acp.allOf, newRule);
    updatedAcr = setThing(updatedAcr, newPolicy);
    updatedAcr = setThing(updatedAcr, newRule);
    newPolicyUrls.push(newPolicyIri);
    // If we don't have to set new access, we only need to unapply the
    // Policies that applied to both the given actor and other actors (because
    // they have been replaced by clones not mentioning the given actor). Hence
    // `policiesToUnApply` is initialied to `otherActorPolicies`.
    // However, if we're in this if branch, that means we also had to replace
    // Policies that defined access for just this actor, so we'll have to remove
    // all Policies mentioning this actor:
    policiesToUnapply = conflictingPolicies;
  }

  // ...then remove existing Policy URLs that mentioned both the given actor
  // and other actors from the given Resource and apply the new ones (but do not
  // remove the actual old Policies - they might still apply to other Resources!).
  let updatedResource = internal_setAcr(resource, updatedAcr);
  acrPoliciesToUnapply.forEach((previouslyApplicableAcrPolicy) => {
    updatedResource = removeAcrPolicyUrl(
      updatedResource,
      asIri(previouslyApplicableAcrPolicy)
    );
  });
  newAcrPolicyUrls.forEach((newAcrPolicyUrl) => {
    updatedResource = addAcrPolicyUrl(updatedResource, newAcrPolicyUrl);
  });
  policiesToUnapply.forEach((previouslyApplicablePolicy) => {
    updatedResource = removePolicyUrl(
      updatedResource,
      asIri(previouslyApplicablePolicy)
    );
  });
  newPolicyUrls.forEach((newPolicyUrl) => {
    updatedResource = addPolicyUrl(updatedResource, newPolicyUrl);
  });

  return updatedResource;
}

/**
 * Set access to a Resource for a specific Agent.
 *
 * This function adds the relevant Access Control Policies and Rules to a
 * Resource's Access Control Resource to define the given access for the given
 * Agent specifically. In other words, it can, for example, add Policies that
 * give a particular Agent Read access to the Resource. However, if other
 * Policies specify that that Agent is *denied* Read access *except* if they're
 * in a particular Group, then that will be left intact.
 * This means that, unless *only* this function is used to manipulate access to
 * this Resource, the set access might not be equal to the effective access for
 * the given Agent.
 *
 * There are a number of preconditions that have to be fulfilled for this
 * function to work:
 * - Access to the Resource is determined via an Access Control Resource.
 * - The Resource's Access Control Resource does not refer to (Policies or Rules
 *   in) other Resources.
 * - The current user has access to the Resource's Access Control Resource.
 *
 * If those conditions do not hold, this function will return `null`.
 *
 * Additionally, take note that the given access will only be applied to the
 * given Resource; if that Resource is a Container, access will have to be set
 * for its contained Resources independently.
 *
 * @param resource Resource that was fetched together with its linked Access Control Resource.
 * @param webId Which Agent you want to set the access for.
 * @param access What access (read, append, write, controlRead, controlWrite) to set for the given Agent. `true` to allow, `false` to deny, and `undefined` to leave unchanged.
 * @returns The Resource with the updated Access Control Resource attached, if updated successfully, or `null` if not.
 */
export function internal_setAgentAccess<
  ResourceExt extends WithResourceInfo & WithAcp
>(
  resource: ResourceExt,
  webId: WebId,
  access: Partial<Access>
): ResourceExt | null {
  return internal_setActorAccess(resource, acp.agent, webId, access);
}

/**
 * Set access to a Resource for a specific Group.
 *
 * This function adds the relevant Access Control Policies and Rules to a
 * Resource's Access Control Resource to define the given access for the given
 * Group specifically. In other words, it can, for example, add Policies that
 * give a particular Group Read access to the Resource. However, if other
 * Policies specify that it is *denied* Read access *except* if they're a
 * particular Agent, then that will be left intact.
 * This means that, unless *only* this module's functions are used to manipulate
 * access to this Resource, the set access might not be equal to the effective
 * access for Agents in the given Group.
 *
 * There are a number of preconditions that have to be fulfilled for this
 * function to work:
 * - Access to the Resource is determined via an Access Control Resource.
 * - The Resource's Access Control Resource does not refer to (Policies or Rules
 *   in) other Resources.
 * - The current user has access to the Resource's Access Control Resource.
 *
 * If those conditions do not hold, this function will return `null`.
 *
 * Additionally, take note that the given access will only be applied to the
 * given Resource; if that Resource is a Container, access will have to be set
 * for its contained Resources independently.
 *
 * @param resource Resource that was fetched together with its linked Access Control Resource.
 * @param groupUrl Which Group you want to set the access for.
 * @param access What access (read, append, write, controlRead, controlWrite) to set for the given Group. `true` to allow, `false` to deny, and `undefined` to leave unchanged.
 * @returns The Resource with the updated Access Control Resource attached, if updated successfully, or `null` if not.
 */
export function internal_setGroupAccess<
  ResourceExt extends WithResourceInfo & WithAcp
>(
  resource: ResourceExt,
  groupUrl: WebId,
  access: Partial<Access>
): ResourceExt | null {
  return internal_setActorAccess(resource, acp.group, groupUrl, access);
}

/**
 * Set access to a Resource for everybody.
 *
 * This function adds the relevant Access Control Policies and Rules to a
 * Resource's Access Control Resource to define the given access for everybody
 * specifically. In other words, it can, for example, add Policies that
 * give everybody Read access to the Resource. However, if other
 * Policies specify that everybody is *denied* Read access *except* if they're
 * in a particular Group, then that will be left intact.
 * This means that, unless *only* this module's functions are used to manipulate
 * access to this Resource, the set access might not be equal to the effective
 * access for a particular Agent.
 *
 * There are a number of preconditions that have to be fulfilled for this
 * function to work:
 * - Access to the Resource is determined via an Access Control Resource.
 * - The Resource's Access Control Resource does not refer to (Policies or Rules
 *   in) other Resources.
 * - The current user has access to the Resource's Access Control Resource.
 *
 * If those conditions do not hold, this function will return `null`.
 *
 * Additionally, take note that the given access will only be applied to the
 * given Resource; if that Resource is a Container, access will have to be set
 * for its contained Resources independently.
 *
 * @param resource Resource that was fetched together with its linked Access Control Resource.
 * @param access What access (read, append, write, controlRead, controlWrite) to set for everybody. `true` to allow, `false` to deny, and `undefined` to leave unchanged.
 * @returns The Resource with the updated Access Control Resource attached, if updated successfully, or `null` if not.
 */
export function internal_setPublicAccess<
  ResourceExt extends WithResourceInfo & WithAcp
>(resource: ResourceExt, access: Partial<Access>): ResourceExt | null {
  return internal_setActorAccess(resource, acp.agent, acp.PublicAgent, access);
}

/**
 * Set access to a Resource for authenticated Agents.
 *
 * This function adds the relevant Access Control Policies and Rules to a
 * Resource's Access Control Resource to define the given access for
 * authenticated Agents specifically. In other words, it can, for example, add
 * Policies that give authenticated Agents Read access to the Resource. However,
 * if other Policies specify that authenaticated Agents are *denied* Read access
 * *except* if they're in a particular Group, then that will be left intact.
 * This means that, unless *only* this module's functions are used to manipulate
 * access to this Resource, the set access might not be equal to the effective
 * access for a particular Agent.
 *
 * There are a number of preconditions that have to be fulfilled for this
 * function to work:
 * - Access to the Resource is determined via an Access Control Resource.
 * - The Resource's Access Control Resource does not refer to (Policies or Rules
 *   in) other Resources.
 * - The current user has access to the Resource's Access Control Resource.
 *
 * If those conditions do not hold, this function will return `null`.
 *
 * Additionally, take note that the given access will only be applied to the
 * given Resource; if that Resource is a Container, access will have to be set
 * for its contained Resources independently.
 *
 * @param resource Resource that was fetched together with its linked Access Control Resource.
 * @param access What access (read, append, write, controlRead, controlWrite) to set for authenticated Agents. `true` to allow, `false` to deny, and `undefined` to leave unchanged.
 * @returns The Resource with the updated Access Control Resource attached, if updated successfully, or `null` if not.
 */
export function internal_setAuthenticatedAccess<
  ResourceExt extends WithResourceInfo & WithAcp
>(resource: ResourceExt, access: Partial<Access>): ResourceExt | null {
  return internal_setActorAccess(
    resource,
    acp.agent,
    acp.AuthenticatedAgent,
    access
  );
}

function policyHasOtherActors(
  policy: Policy,
  actorRelation: ActorRelation,
  actor: IriString,
  policyAndRuleResource: SolidDataset
): boolean {
  const allOfRulesHaveOtherActors = getIriAll(policy, acp.allOf).some(
    (ruleUrl) => {
      const rule = getRule(policyAndRuleResource, ruleUrl);
      /* istanbul ignore if This function only gets called after policyAppliesTo, which already filters out non-existent Rules. */
      if (rule === null) {
        return false;
      }
      return ruleHasOtherActors(rule, actorRelation, actor);
    }
  );
  const anyOfRulesHaveOtherActors = getIriAll(policy, acp.anyOf).some(
    (ruleUrl) => {
      const rule = getRule(policyAndRuleResource, ruleUrl);
      /* istanbul ignore if This function only gets called after policyAppliesTo, which already filters out non-existent Rules. */
      if (rule === null) {
        return false;
      }
      return ruleHasOtherActors(rule, actorRelation, actor);
    }
  );
  /* istanbul ignore next This function only gets called after policyAppliesTo, which already filters out all noneOf Rules */
  const noneOfRulesHaveOtherActors = getIriAll(policy, acp.noneOf).some(
    (ruleUrl) => {
      const rule = getRule(policyAndRuleResource, ruleUrl);
      if (rule === null) {
        return false;
      }
      return ruleHasOtherActors(rule, actorRelation, actor);
    }
  );

  return (
    allOfRulesHaveOtherActors ||
    anyOfRulesHaveOtherActors ||
    noneOfRulesHaveOtherActors
  );
}

function ruleHasOtherActors(
  rule: Rule,
  actorRelation: ActorRelation,
  actor: IriString
): boolean {
  const otherActors: IriString[] = [];
  knownActorRelations.forEach((knownActorRelation) => {
    const otherActorsWithThisRelation = getIriAll(
      rule,
      knownActorRelation
    ).filter(
      (applicableActor) =>
        applicableActor !== actor || knownActorRelation !== actorRelation
    );
    // Unfortunately Node 10 does not support `.flat()` yet, hence the use of `push`:
    otherActors.push(...otherActorsWithThisRelation);
  });

  return otherActors.length > 0;
}

function copyPolicyExcludingActor(
  inputPolicy: Policy,
  policyAndRuleDataset: SolidDataset,
  actorRelationToExclude: ActorRelation,
  actorToExclude: IriString
): [Policy, Rule[]] {
  const newIriSuffix =
    "_copy_wihout" +
    `_${encodeURIComponent(actorRelationToExclude)}_${actorToExclude}` +
    `_${Date.now()}_${Math.random()}`;

  // Create new Rules for the Policy, excluding the given Actor
  const newAllOfRules = copyRulesExcludingActor(
    getIriAll(inputPolicy, acp.allOf),
    policyAndRuleDataset,
    newIriSuffix,
    actorRelationToExclude,
    actorToExclude
  );
  const newAnyOfRules = copyRulesExcludingActor(
    getIriAll(inputPolicy, acp.anyOf),
    policyAndRuleDataset,
    newIriSuffix,
    actorRelationToExclude,
    actorToExclude
  );
  const newNoneOfRules = copyRulesExcludingActor(
    getIriAll(inputPolicy, acp.noneOf),
    policyAndRuleDataset,
    newIriSuffix,
    actorRelationToExclude,
    actorToExclude
  );

  // Create a new Policy with the new Rules
  let newPolicy = createPolicy(asIri(inputPolicy) + newIriSuffix);
  getIriAll(inputPolicy, acp.allow).forEach((allowMode) => {
    newPolicy = addIri(newPolicy, acp.allow, allowMode);
  });
  getIriAll(inputPolicy, acp.deny).forEach((denyMode) => {
    newPolicy = addIri(newPolicy, acp.deny, denyMode);
  });
  newAllOfRules.forEach((newRule) => {
    newPolicy = addIri(newPolicy, acp.allOf, newRule);
  });
  newAnyOfRules.forEach((newRule) => {
    newPolicy = addIri(newPolicy, acp.anyOf, newRule);
  });
  /* istanbul ignore next Policies listing noneOf Rules are left alone (because they do not unambiguously apply to the given actor always), so there will usually not be any noneOf Rules to copy. */
  newNoneOfRules.forEach((newRule) => {
    newPolicy = addIri(newPolicy, acp.noneOf, newRule);
  });

  return [
    newPolicy,
    newAllOfRules.concat(newAnyOfRules).concat(newNoneOfRules),
  ];
}

/** Creates clones of all the Rules identified by `ruleIris` in `ruleDataset`, excluding the given Actor */
function copyRulesExcludingActor(
  ruleIris: IriString[],
  ruleDataset: SolidDataset,
  iriSuffix: IriString,
  actorRelationToExclude: ActorRelation,
  actorToExclude: IriString
): Rule[] {
  return ruleIris
    .map((ruleIri) => {
      const rule = getRule(ruleDataset, ruleIri);
      if (rule === null) {
        return null;
      }

      let newRule = createRule(asIri(rule) + iriSuffix);
      let listsOtherActors = false;
      knownActorRelations.forEach((knownActorRelation) => {
        getIriAll(rule, knownActorRelation).forEach((targetActor) => {
          if (
            knownActorRelation === actorRelationToExclude &&
            targetActor === actorToExclude
          ) {
            return;
          }
          listsOtherActors = true;
          newRule = addIri(newRule, knownActorRelation, targetActor);
        });
      });
      return listsOtherActors ? newRule : null;
    })
    .filter(isNotNull);
}

function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

/**
 * Work around ESS adding references to external Policies to ACRs by default.
 *
 * Inrupt's Enterprise Solid Server by default adds a reference to a Policy in
 * every ACR that is not local to that ACR. This will be removed in the near
 * future: they only reflect access that holds anyway (i.e. the Pod Owner's
 * access), and removing them does not actually change that access.
 *
 * However, until that is implemented, we manually ignore those Policies as a
 * workaround, rather than always returning `null` because we cannot read them
 * in the ACR itself.
 *
 * When ESS is updated, delete this function and remove references to it to
 * remove the workaround.
 *
 * @param policyUrl URL of a Policy.
 * @param resourceUrl Resource in whose ACR that URL is referenced.
 * @returns Whether the given Policy URL is a URL the Inrupt's Enterprise Solid Server has added by default for the given Resource.
 */
function isDefaultEssPolicyUrl(
  policyUrl: UrlString,
  resourceUrl: UrlString
): boolean {
  const essServers = [
    "https://pod.inrupt.com",
    "https://demo-ess.inrupt.com",
    "https://dev-ess.inrupt.com",
  ];
  return essServers.some((essServer) => {
    if (!resourceUrl.startsWith(essServer)) {
      return false;
    }
    // ESS Pods are of the form <origin>/<username>/,
    // and resource URLs are subpaths of that.
    // Hence, we can get the Pod root by getting everything up to and including
    // the first slash after the origin's trailing slash:
    const resourcePath = resourceUrl.substring(essServer.length + "/".length);
    const podRoot = resourceUrl.substring(
      0,
      essServer.length + "/".length + resourcePath.indexOf("/") + "/".length
    );

    return policyUrl === podRoot + "policies/#Owner";
  });
}
