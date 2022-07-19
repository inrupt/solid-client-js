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

import type { WithAccessibleAcr } from "../acp";
import { getSourceUrl } from "../..";
import { internal_getAcr as getAccessControlResource } from "../control.internal";

/** @hidden */
export type DefaultAccessControlName =
  | typeof DEFAULT_ACCESS_CONTROL
  | typeof DEFAULT_ACR_ACCESS_CONTROL
  | typeof DEFAULT_MEMBER_ACCESS_CONTROL
  | typeof DEFAULT_MEMBER_ACR_ACCESS_CONTROL;

/** @hidden */
export const DEFAULT_ACCESS_CONTROL = "defaultAccessControl";

/** @hidden */
export const DEFAULT_ACR_ACCESS_CONTROL = "defaultAcrAccessControl";

/** @hidden */
export const DEFAULT_MEMBER_ACCESS_CONTROL = "defaultMemberAccessControl";

/** @hidden */
export const DEFAULT_MEMBER_ACR_ACCESS_CONTROL =
  "defaultMemberAcrAccessControl";

/** @hidden */
export function getDefaultAccessControlUrl(
  resource: WithAccessibleAcr,
  name: DefaultAccessControlName
): string {
  const acr = getAccessControlResource(resource);
  const acrUrl = getSourceUrl(acr);
  return acrUrl.concat("#").concat(name);
}
