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

import { ACP } from "../constants";
import type { UrlString } from "../../interfaces";
import { getIriAll } from "../../thing/get";
import type { WithAccessibleAcr } from "../acp";
import { getAccessControlResourceThing } from "../internal/getAccessControlResourceThing";

/**
 * ```{note}
 * The ACP specification is a draft. As such, this function is experimental and
 * subject to change, even in a non-major release.
 * See also: https://solid.github.io/authorization-panel/acp-specification/
 * ```
 *
 * Get the URL of all member access controls linked to the given resource's ACR.
 *
 * @param resourceWithAcr The resource for which to retrieve URLs of access
 * controls inherited by its children.
 * @returns Access Control URL array
 * @since 1.6.0
 */
export function getMemberAccessControlUrlAll(
  resourceWithAcr: WithAccessibleAcr
): UrlString[] {
  const acrThing = getAccessControlResourceThing(resourceWithAcr);

  if (acrThing === null) {
    return [];
  }

  return getIriAll(acrThing, ACP.memberAccessControl);
}
