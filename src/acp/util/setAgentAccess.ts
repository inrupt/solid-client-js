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

import type { WebId } from "../../interfaces";
import type { AccessModes } from "../type/AccessModes";
import type { WithAccessibleAcr } from "../type/WithAccessibleAcr";
import { getPolicyUrlAll } from "../policy/getPolicyUrlAll";
import { getThing, ThingPersisted } from "../..";
import { internal_getAcr } from "../control.internal";
import { getAcrPolicyUrlAll } from "../policy/getAcrPolicyUrlAll";
import { getAgentAccess } from "./getAgentAccess";

/** @hidden */
function containsModes(
  access: Partial<AccessModes>,
  type: "control" | "resource"
): boolean {
  return true;
}

/**
 * Set access for a given Agent.
 *
 * @param resourceWithAcr URL of the Resource you want to set the access for.
 * @param webId WebID of the Agent you want to set the access for.
 * @param access Access Modes you want to set for the agent
 * @param options Default Options such as a fetch function.
 * @since 1.16.0
 */
export async function setAgentAccess<T extends WithAccessibleAcr>(
  resourceWithAcr: T,
  webId: WebId,
  access: Partial<AccessModes>
): Promise<AccessModes> {
  if (containsModes(access, "resource")) {
    // Get the access modes currently set
    // Do the diff
    // Set what is needed
    const policyAll = getPolicyUrlAll(resourceWithAcr)
      .map((url) => getThing(internal_getAcr(resourceWithAcr), url))
      .filter((policy): policy is ThingPersisted => policy !== null);
  }

  if (containsModes(access, "control")) {
    const x = getAgentAccess(resourceWithAcr, webId);
  }

  return getAgentAccess(resourceWithAcr, webId);
}
