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

import type { Url, UrlString } from "../../interfaces";
import type { WithAccessibleAcr } from "../acp";
import { ACP } from "../constants";
import { buildThing } from "../../thing/build";
import { getDefaultAccessControlThing } from "../internal/getDefaultAccessControlThing";
import { DEFAULT_MEMBER_ACCESS_CONTROL } from "../internal/getDefaultAccessControlUrl";
import { setAccessControlResourceThing } from "../internal/setAccessControlResourceThing";
import { setDefaultAccessControlThingIfNotExist } from "../internal/setDefaultAccessControlThingIfNotExist";

/**
 * ```{note}
 * The ACP specification is a draft. As such, this function is experimental and
 * subject to change, even in a non-major release.
 * See also: https://solid.github.io/authorization-panel/acp-specification/
 * ```
 *
 * Add a policy applying to the given resource's children.
 *
 * @param resourceWithAcr The resource for which to add the URL of a policy
 * applying to its children.
 * @param policyUrl A Policy URL.
 * @returns The resource with its ammended access control resource.
 * @since 1.16.1
 */
export function addMemberPolicyUrl<T extends WithAccessibleAcr>(
  resourceWithAcr: T,
  policyUrl: Url | UrlString
): T {
  const resourceWithAcrContainingDefaultMemberAccessControl =
    setDefaultAccessControlThingIfNotExist(
      resourceWithAcr,
      DEFAULT_MEMBER_ACCESS_CONTROL
    );
  const defaultMemberAccessControlThing = getDefaultAccessControlThing(
    resourceWithAcrContainingDefaultMemberAccessControl,
    DEFAULT_MEMBER_ACCESS_CONTROL
  );

  return setAccessControlResourceThing(
    resourceWithAcrContainingDefaultMemberAccessControl,
    buildThing(defaultMemberAccessControlThing)
      .addUrl(ACP.apply, policyUrl)
      .build()
  );
}
