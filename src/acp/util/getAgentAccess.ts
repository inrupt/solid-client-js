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

import type { WebId } from "../../interfaces";
import type { AccessModes } from "../type/AccessModes";
import type { WithAccessibleAcr } from "../acp";
import { getPolicyUrlAll } from "../policy/getPolicyUrlAll";
import { getThing, getUrlAll, ThingPersisted } from "../..";
import { internal_getAcr } from "../control.internal";
import { getAcrPolicyUrlAll } from "../policy/getAcrPolicyUrlAll";
import { ACP } from "../constants";
import { getAllowModes } from "../policy/getAllowModes";
import { getDenyModes } from "../policy/getDenyModes";

/** @hidden */
function isAgentMatched(
  acr: WithAccessibleAcr,
  policy: ThingPersisted,
  webId: string
): boolean {
  // TODO: Proper solution
  // Finalise, release and use the TypeScript ACP Solid library
  // internal_getActorAccess in acp_v2:96 doesn't reduce the policies properly
  // policyAppliesTo in acp_v2:256 assumes that every matcher is an agent matcher
  //
  // TODO: Stopgap solution
  // Implement a simplistic reduce function that
  // matches policies where the agent is present in the matchers
  const allOfMatchers = getUrlAll(policy, ACP.allOf)
    .map((url) => getThing(internal_getAcr(acr), url))
    .filter((thing): thing is ThingPersisted => thing !== null);

  const allOfMatched = allOfMatchers.every((thing) => {
    return getUrlAll(thing, ACP.agent).includes(webId);
  });

  const anyOfMatchers = getUrlAll(policy, ACP.anyOf)
    .map((url) => getThing(internal_getAcr(acr), url))
    .filter((thing): thing is ThingPersisted => thing !== null);

  const anyOfMatched = anyOfMatchers.some((thing) => {
    return getUrlAll(thing, ACP.agent).includes(webId);
  });

  const noneOfMatchers = getUrlAll(policy, ACP.noneOf)
    .map((url) => getThing(internal_getAcr(acr), url))
    .filter((thing): thing is ThingPersisted => thing !== null);

  const noneOfMatched = noneOfMatchers.some((thing) => {
    return getUrlAll(thing, ACP.agent).includes(webId);
  });

  return (
    allOfMatchers.length + anyOfMatchers.length > 0 &&
    (allOfMatchers.length === 0 || allOfMatched) &&
    (anyOfMatchers.length === 0 || anyOfMatched) &&
    (noneOfMatchers.length === 0 || !noneOfMatched)
  );
}

/** @hidden */
function reduceModes(
  policy: ThingPersisted,
  modes: AccessModes,
  type: "control" | "resource"
): AccessModes {
  const allowed = getAllowModes(policy);
  const denied = getDenyModes(policy);

  if (type === "control") {
    return {
      read: modes.read,
      append: modes.append,
      write: modes.write,
      controlRead: (modes.controlRead || allowed.read) && !denied.read,
      controlWrite: (modes.controlWrite || allowed.write) && !denied.write,
    };
  }
  return {
    read: (modes.read || allowed.read) && !denied.read,
    append: (modes.append || allowed.append) && !denied.append,
    write: (modes.write || allowed.write) && !denied.write,
    controlRead: modes.controlRead,
    controlWrite: modes.controlWrite,
  };
}

/**
 * Get an overview of what access is defined for a given Agent.
 *
 * @param resourceWithAcr URL of the Resource you want to read the access for.
 * @param webId WebID of the Agent you want to get the access for.
 * @since 1.16.0
 */
export async function getAgentAccess<T extends WithAccessibleAcr>(
  resourceWithAcr: T,
  webId: WebId
): Promise<AccessModes> {
  // TODO: add support for external resources
  let resourceAccess = {
    read: false,
    append: false,
    write: false,
    controlRead: false,
    controlWrite: false,
  };

  const policyAll = getPolicyUrlAll(resourceWithAcr)
    .map((url) => getThing(internal_getAcr(resourceWithAcr), url))
    .filter((policy): policy is ThingPersisted => policy !== null);

  policyAll.forEach((policy) => {
    if (isAgentMatched(resourceWithAcr, policy, webId)) {
      resourceAccess = reduceModes(policy, resourceAccess, "resource");
    }
  });

  const acrPolicyAll = getAcrPolicyUrlAll(resourceWithAcr)
    .map((url) => getThing(internal_getAcr(resourceWithAcr), url))
    .filter((policy): policy is ThingPersisted => policy !== null);

  acrPolicyAll.forEach((policy) => {
    if (isAgentMatched(resourceWithAcr, policy, webId)) {
      resourceAccess = reduceModes(policy, resourceAccess, "control");
    }
  });

  return resourceAccess;
}
