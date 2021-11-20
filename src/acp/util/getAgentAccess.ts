/**
 * Copyright 2021 Inrupt Inc.
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

import type { UrlString, WebId } from "../../interfaces";
import type { AccessModes } from "../type/AccessModes";
import type { DefaultOptions } from "../type/DefaultOptions";
import { getResourceAcr } from "./getResourceAcr";
import { getResourceInfo } from "../../resource/resource";
import { getPolicyUrlAll } from "../policy/getPolicyUrlAll";
import { getIriAll, getThing, ThingPersisted } from "../..";
import { internal_getAcr } from "../control.internal";
import { getAcrPolicyUrlAll } from "../policy/getAcrPolicyUrlAll";
import { ACP } from "../constants";
import { getAllowModes } from "../policy/getAllowModes";
import { getDenyModes } from "../policy/getDenyModes";

/** @hidden */
function isAgentMatched(policy: ThingPersisted, webId: string): boolean {
  // TODO: Proper solution
  // Finalise, release and use the TypeScript ACP Solid library
  // internal_getActorAccess in acp_v2:96 doesn't reduce the policies properly
  // policyAppliesTo in acp_v2:256 assumes that every matcher is an agent matcher
  //
  // TODO: Stopgap solution
  // Implement a simplistic reduce function that
  // matches policies where the agent is present in the matchers
  return false;
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
      read: (modes.read || allowed.read) && !denied.read,
      append: (modes.append || allowed.append) && !denied.append,
      write: (modes.write || allowed.write) && !denied.write,
      controlRead: modes.controlRead,
      controlWrite: modes.controlWrite,
    };
  }
  return {
    read: modes.read,
    append: modes.append,
    write: modes.write,
    controlRead:
      (modes.controlRead || allowed.controlRead) && !denied.controlRead,
    controlWrite:
      (modes.controlWrite || allowed.controlWrite) && !denied.controlWrite,
  };
}

/**
 * Get an overview of what access is defined for a given Agent.
 *
 * This function works with Solid Pods that implement either the Web Access
 * Control spec or the Access Control Policies proposal, with some caveats:
 *
 * - If access to the given Resource has been set using anything other than the
 *   functions in this module, it is possible that it has been set in a way that
 *   prevents this function from reliably reading access, in which case it will
 *   resolve to `null`.
 * - It will only return access specified explicitly for the given Agent. If
 *   additional restrictions are set up to apply to the given Agent in a
 *   particular situation, those will not be reflected in the return value of
 *   this function.
 * - It will only return access specified explicitly for the given Resource.
 *   In other words, if the Resource is a Container, the returned Access may not
 *   apply to contained Resources.
 * - If the current user does not have permission to view access for the given
 *   Resource, this function will resolve to `null`.
 *
 * @param resourceUrl URL of the Resource you want to read the access for.
 * @param webId WebID of the Agent you want to get the access for.
 * @since 1.16.0
 */
export async function getAgentAccess(
  resourceUrl: UrlString,
  webId: WebId,
  options?: DefaultOptions
): Promise<AccessModes | null> {
  const resourceInfo = await getResourceInfo(resourceUrl, options);
  const acr = await getResourceAcr(resourceInfo, options);

  if (acr === null) {
    return null;
  }

  let resourceAccess = {
    read: false,
    append: false,
    write: false,
    controlRead: false,
    controlWrite: false,
  };

  const policyAll = getPolicyUrlAll(acr)
    .map((url) => getThing(internal_getAcr(acr), url))
    .filter((policy): policy is ThingPersisted => policy !== null);

  policyAll.map((policy) => {
    isAgentMatched(policy, webId);
    resourceAccess = reduceModes(policy, resourceAccess, "resource");
  });

  const acrPolicyAll = getAcrPolicyUrlAll(acr)
    .map((url) => getThing(internal_getAcr(acr), url))
    .filter((policy): policy is ThingPersisted => policy !== null);

  acrPolicyAll.map((policy) => {
    isAgentMatched(policy, webId);
    resourceAccess = reduceModes(policy, resourceAccess, "control");
  });

  return resourceAccess;
}
