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

import type { AccessModes } from "../type/AccessModes";
import { getAgentAccess } from "./getAgentAccess";
import { getAgentUrlAll } from "./getAgentUrlAll";
import type { WithAccessibleAcr } from "../acp";

/**
 * Get an overview of what access is defined for agents.
 *
 * This function works with Solid Pods that implement either the Web Access
 * Control spec or the Access Control Policies proposal, with some caveats:
 *
 * - If access to the given Resource has been set using anything other than the
 *   functions in this module, it is possible that it has been set in a way that
 *   prevents this function from reliably reading access.
 * - It will only return access specified explicitly for the given Agent within
 *   the ACL linked to the resource. If additional restrictions or external
 *   resources are used, those will not be reflected in the return value of this
 *   function.
 * - It will only return access specified explicitly for the given Resource.
 *   In other words, if the Resource is a Container, the returned Access may not
 *   apply to contained Resources.
 * - If the current user does not have permission to view access for the given
 *   Resource, this function will resolve to `null`.
 *
 * @param resourceUrl URL of the Resource you want to read the access for.
 * @param options Default Options such as a fetch function.
 * @since 1.21.0
 */
export async function getAgentAccessAll<T extends WithAccessibleAcr>(
  resourceWithAcr: T
): Promise<Record<string, AccessModes> | null> {
  return (
    await Promise.all(
      getAgentUrlAll(resourceWithAcr).map(async (agent) => ({
        [agent]: await getAgentAccess(resourceWithAcr, agent),
      }))
    )
  ).reduce(
    (agentAccessAll, currentAgentAccess) => ({
      ...agentAccessAll,
      ...currentAgentAccess,
    }),
    {}
  );
}
