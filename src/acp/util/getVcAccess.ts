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

import { Thing, UrlString } from "../..";
import { getSourceIri } from "../../resource/resource";
import { getIriAll } from "../../thing/get";
import { asIri, getThing } from "../../thing/thing";
import { WithAccessibleAcr } from "../acp";
import { ACP } from "../constants";
import { internal_getAcr } from "../control.internal";
import { getAccessControlResourceThing } from "../internal/getAccessControlResourceThing";
import { getDefaultAccessControlThing } from "../internal/getDefaultAccessControlThing";
import { getModes } from "../internal/getModes";
import { AccessModes } from "../type/AccessModes";
import { DEFAULT_VC_MATCHER_NAME, DEFAULT_VC_POLICY_NAME } from "./setVcAccess";

const DEFAULT_NO_ACCESS: AccessModes = {
  read: false,
  append: false,
  write: false,
  controlRead: false,
  controlWrite: false,
};

const linkExists = (
  subject: Thing,
  predicate: UrlString,
  object: Thing
): boolean => getIriAll(subject, predicate).includes(asIri(object));

// TODO: It should be possible to write a `chainExists` function, taking in a chain
// of Thing, predicate, Thing, predicate... and checks whether such chain exists
// in a given dataset. It would make the following function much easier to read,
// instead of checking at each link that it isn't null and it is connected to the
// next link.

/**
 * ```{note}
 * The ACP specification is a draft. As such, this function is experimental and
 * subject to change, even in a non-major release.
 * See also: https://solid.github.io/authorization-panel/acp-specification/
 * ```
 *
 * Get the maximum access modes that are allowed for a VC holder for a given resource.
 * If the resource owner issued an Access Grant for the resource, the agent that
 * has been granted access will have at most the permissions returned by this function.
 * The Access Grant may be more restrictive.
 *
 * Note that only the modes set using [[setVcAccess]] will be returned by this function.
 * Additional access may have been set if the ACR has been manipulated not using this
 * library, which is currently out of scope.
 *
 * @param resourceWithAcr The resource for which the VC access modes are looked up.
 * @returns The access modes available to a VC holder.
 * @since 1.17.0
 */
export function getVcAccess(resourceWithAcr: WithAccessibleAcr): AccessModes {
  const acr = internal_getAcr(resourceWithAcr);

  const accessControl = getDefaultAccessControlThing(
    resourceWithAcr,
    "defaultAccessControl"
  );

  const acrThing = getAccessControlResourceThing(resourceWithAcr);

  if (
    acrThing === null ||
    !linkExists(acrThing, ACP.accessControl, accessControl)
  ) {
    return DEFAULT_NO_ACCESS;
  }

  const defaultVcPolicyIri = `${getSourceIri(acr)}#${DEFAULT_VC_POLICY_NAME}`;
  const vcPolicy = getThing(acr, defaultVcPolicyIri);
  if (vcPolicy === null || !linkExists(accessControl, ACP.apply, vcPolicy)) {
    return DEFAULT_NO_ACCESS;
  }

  const defaultVcMatcherIri = `${getSourceIri(acr)}#${DEFAULT_VC_MATCHER_NAME}`;
  const vcMatcher = getThing(acr, defaultVcMatcherIri);
  if (vcMatcher === null || !linkExists(vcPolicy, ACP.anyOf, vcMatcher)) {
    return DEFAULT_NO_ACCESS;
  }

  return getModes(vcPolicy, ACP.allow);
}
