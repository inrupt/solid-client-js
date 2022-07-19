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
import type { AccessModes } from "../type/AccessModes";
import { DefaultAccessControlName } from "./getDefaultAccessControlUrl";
import { getDefaultAgentMatcherPolicyUrl } from "./getDefaultAgentMatcherPolicyUrl";
import { addMemberAcrPolicyUrl } from "../policy/addMemberAcrPolicyUrl";
import { addMemberPolicyUrl } from "../policy/addMemberPolicyUrl";
import { addAcrPolicyUrl } from "../policy/addAcrPolicyUrl";
import { addPolicyUrl } from "../policy/addPolicyUrl";

/** @hidden */
export function setDefaultAgentMatcherPolicyThingIfNotExist<
  T extends WithAccessibleAcr
>(resource: T, name: DefaultAccessControlName, mode: keyof AccessModes): T {
  const policyUrl = getDefaultAgentMatcherPolicyUrl(resource, name, mode);

  // TODO: Re-enable when we support setting agent access on member resources
  // if (policyUrl.includes("Member") && policyUrl.includes("Acr")) {
  //   return addMemberAcrPolicyUrl(resource, policyUrl);
  // }

  // if (policyUrl.includes("Member")) {
  //   return addMemberPolicyUrl(resource, policyUrl);
  // }

  if (policyUrl.includes("Acr")) {
    return addAcrPolicyUrl(resource, policyUrl);
  }

  return addPolicyUrl(resource, policyUrl);
}
