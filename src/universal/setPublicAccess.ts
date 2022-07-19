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

import type { UrlString } from "../interfaces";
import type { AccessModes } from "../acp/type/AccessModes";
import type { DefaultOptions } from "../acp/type/DefaultOptions";
import { getResourceInfo } from "../resource/resource";
import { setPublicAccess as setPublicAccessAcp } from "../acp/util/setPublicAccess";
import {
  setPublicResourceAccess as setPublicAccessWac,
  getPublicAccess as getPublicAccessWac,
  WacAccess,
} from "../access/wac";
import { getResourceAcr } from "../acp/util/getResourceAcr";
import { saveAcrFor } from "../acp/acp";
import { getPublicAccess as getPublicAccessAcp } from "./getPublicAccess";

/**
 * Set access to a resource for the public.
 *
 * This function works with Solid Pods that implement either the Web Access
 * Control spec or the Access Control Policies proposal, with some caveats:
 *
 * - If access to the given Resource has been set using anything other than the
 *   functions in this module, it is possible that it has been set in a way that
 *   prevents this function from reliably setting access.
 * - It will only set access explicitly for the given Agent. In other words,
 *   additional restrictions could be present that further restrict or loosen
 *   what access the given Agent has in particular circumstances.
 * - The provided access will only apply to the given Resource. In other words,
 *   if the Resource is a Container, the configured Access will not apply to
 *   contained Resources.
 * - If the current user does not have permission to view or change access for
 *   the given Resource, this function will resolve to `null`.
 *
 * Additionally, two caveats apply to users with a Pod server that uses WAC:
 * - If the Resource did not have an ACL yet, a new one will be initialised.
 *   This means that changes to the ACL of a parent Container can no longer
 *   affect access people have to this Resource, although existing access will
 *   be preserved.
 * - Setting different values for `controlRead` and `controlWrite` is not
 *   supported, and **will throw an error**. If you expect (some of) your users
 *   to have Pods implementing WAC, be sure to pass the same value for both.
 *
 * @param resourceUrl URL of the Resource you want to set access for.
 * @param access The Access Modes to add (true) or remove (false).
 * @param options Default Options such as a fetch function.
 * @since 1.19.0
 */
export async function setPublicAccess(
  resourceUrl: UrlString,
  access: Partial<AccessModes>,
  options?: DefaultOptions
): Promise<AccessModes | null> {
  const resourceInfo = await getResourceInfo(resourceUrl, options);
  const acr = await getResourceAcr(resourceInfo, options);

  if (acr === null) {
    await setPublicAccessWac(resourceInfo, access as WacAccess, options);
    return getPublicAccessWac(resourceInfo, options);
  }

  try {
    await saveAcrFor(await setPublicAccessAcp(acr, access), options);
    return await getPublicAccessAcp(resourceUrl, options);
  } catch (e) {
    return null;
  }
}
