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

import type { ThingPersisted } from "../../interfaces";
import type { WithAccessibleAcr } from "../acp";
import { setAccessControlResourceThing } from "../internal/setAccessControlResourceThing";

/**
 * ```{note}
 * The ACP specification is a draft. As such, this function is experimental and
 * subject to change, even in a non-major release.
 * See also: https://solid.github.io/authorization-panel/acp-specification/
 * ```
 *
 * Insert the given [[ResourcePolicy]] into the given Resource's Acccess Control
 * Resource, replacing previous instances of that Policy.
 *
 * @param resourceWithAcr The Resource whose Access Control Resource contains Access Policies.
 * @param policy The Policy to insert into the Resource's Access Control Resource.
 * @returns A new Resource equal to the given Resource, but with the given Policy in its Access Control Resource.
 * @since 1.18.0
 */
export function setResourcePolicy<T extends WithAccessibleAcr>(
  resourceWithAcr: T,
  policy: ThingPersisted
): T {
  return setAccessControlResourceThing(resourceWithAcr, policy);
}
