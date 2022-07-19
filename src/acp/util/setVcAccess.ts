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

import {
  addIri,
  asIri,
  buildThing,
  getIriAll,
  getSourceIri,
  getThing,
  setThing,
  Thing,
} from "../..";
import { rdf } from "../../constants";
import { WithAccessibleAcr } from "../acp";
import { ACP, VC_ACCESS_GRANT } from "../constants";
import { internal_getAcr } from "../control.internal";
import { getAccessControlResourceThing } from "../internal/getAccessControlResourceThing";
import { getDefaultAccessControlThing } from "../internal/getDefaultAccessControlThing";
import { getModes } from "../internal/getModes";
import { setAcr } from "../internal/setAcr";
import { setModes } from "../internal/setModes";
import { AccessModes } from "../type/AccessModes";

export const DEFAULT_VC_POLICY_NAME = "defaultVcPolicy";
export const DEFAULT_VC_MATCHER_NAME = "defaultVcMatcher";

/**
 * ```{note}
 * The ACP specification is a draft. As such, this function is experimental and
 * subject to change, even in a non-major release.
 * See also: https://solid.github.io/authorization-panel/acp-specification/
 * ```
 *
 * Set the maximum access modes that are allowed for a VC holder for a given resource.
 * If the resource owner issued an Access Grant for the resource, the agent that
 * has been granted access will have at most the permissions set by this function.
 * The Access Grant may be more restrictive.
 *
 * Note that additional access may have been set if the ACR has been manipulated
 * not using this library, which is currently out of scope. In this case, the access
 * set by this function may not apply.
 *
 * @param resourceWithAcr The resource for which the access modes are being set for VC holders.
 * @param access The access modes to set. Setting a mode to `true` will enable it, to `false`
 * will disable it, and to `undefined` will leave it unchanged compared to what was previously
 * set.
 * @returns A copy of the resource and its attached ACR, updated to the new access modes.
 * @since 1.17.0
 */
export function setVcAccess(
  resourceWithAcr: WithAccessibleAcr,
  access: Partial<AccessModes>
): WithAccessibleAcr {
  let acr = internal_getAcr(resourceWithAcr);
  const defaultVcPolicyIri = `${getSourceIri(acr)}#${DEFAULT_VC_POLICY_NAME}`;
  const defaultVcMatcherIri = `${getSourceIri(acr)}#${DEFAULT_VC_MATCHER_NAME}`;

  let accessControl = getDefaultAccessControlThing(
    resourceWithAcr,
    "defaultAccessControl"
  );

  let acrThing =
    getAccessControlResourceThing(resourceWithAcr) ??
    buildThing({ url: getSourceIri(acr) })
      .addIri(ACP.accessControl, accessControl)
      .build();

  if (!getIriAll(acrThing, ACP.accessControl).includes(asIri(accessControl))) {
    // Case when the ACR Thing existed, but did not include a link to the default Access Control.
    acrThing = addIri(acrThing, ACP.accessControl, accessControl);
  }

  let vcPolicy = getThing(acr, defaultVcPolicyIri);
  if (vcPolicy === null) {
    // If the policy does not exist, create it and link the default Access Control to it.
    vcPolicy = buildThing({ url: defaultVcPolicyIri })
      .addIri(rdf.type, ACP.Policy)
      .addIri(ACP.anyOf, defaultVcMatcherIri)
      .build();
    accessControl = addIri(accessControl, ACP.apply, vcPolicy);
  }

  const vcMatcher: Thing =
    getThing(acr, defaultVcMatcherIri) ??
    buildThing({ url: defaultVcMatcherIri })
      .addIri(rdf.type, ACP.Matcher)
      .addIri(ACP.vc, VC_ACCESS_GRANT)
      .build();

  const currentModes = getModes(vcPolicy, ACP.allow);
  // Only change the modes which are set in `access`, and preserve the others.
  vcPolicy = setModes(vcPolicy, { ...currentModes, ...access }, ACP.allow);

  // Write the changed access control, policy and matchers in the ACR
  acr = [acrThing, accessControl, vcPolicy, vcMatcher].reduce(setThing, acr);

  return setAcr(resourceWithAcr, acr);
}
