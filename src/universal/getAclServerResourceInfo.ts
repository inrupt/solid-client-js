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

import type { WithServerResourceInfo } from "../interfaces";
import type { DefaultOptions } from "../acp/type/DefaultOptions";
import { getResourceInfo } from "../resource/resource";

/**
 * Retrieve the Server Resource Info of Resource expressing access control over
 * another resource it is linked to. It applies in both ACP and WAC contexts:
 * the Access Control Resource is discovered consistently using a Link header
 * with `rel=acl`.
 *
 * @param {WithServerResourceInfo} resource The Resource for which ACL we want
 * to retrieve the Server Resource Info.
 * @param {DefaultOptions} options
 * @returns The Server Resource Info if available, null otherwise.
 * @since 1.19.0
 */
export async function getAclServerResourceInfo(
  resource: WithServerResourceInfo,
  options?: DefaultOptions
): Promise<WithServerResourceInfo | null> {
  if (typeof resource.internal_resourceInfo.aclUrl === "string") {
    return getResourceInfo(resource.internal_resourceInfo.aclUrl, options);
  }
  return null;
}
