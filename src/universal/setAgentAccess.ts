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

import type { UrlString, WebId } from "../interfaces";
import type { AccessModes } from "../acp/type/AccessModes";
import type { DefaultOptions } from "../acp/type/DefaultOptions";
import { getResourceInfo } from "../resource/resource";
import { setAgentAccess as setAgentAccessAcp } from "../acp/util/setAgentAccess";
import {
  setAgentResourceAccess as setAgentAccessWac,
  getAgentAccess as getAgentAccessWac,
  WacAccess,
} from "../access/wac";
import { getResourceAcr } from "../acp/util/getResourceAcr";
import { saveAcrFor } from "../acp/acp";
import { getAgentAccess } from "./getAgentAccess";

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
 * @since unreleased
 */
export async function setAgentAccess(
  resourceUrl: UrlString,
  webId: WebId,
  access: Partial<AccessModes>,
  options?: DefaultOptions
): Promise<AccessModes | null> {
  // TODO: Change the standard getAgentAccess signatures to all take a  T extends WithAcl
  const resourceInfo = await getResourceInfo(resourceUrl, options);
  const acr = await getResourceAcr(resourceInfo, options);

  if (acr === null) {
    await setAgentAccessWac(resourceInfo, webId, access as WacAccess, options);
    return getAgentAccessWac(resourceInfo, webId, options);
  }

  // TODO: Make sure both setAgentAccessWac and setAgentAccessAcp don't save within the function, expose one standard saveAclFor function that is universal.
  try {
    await saveAcrFor(await setAgentAccessAcp(acr, webId, access), options);
    return await getAgentAccess(resourceUrl, webId, options);
  } catch (e) {
    return null;
  }
}
