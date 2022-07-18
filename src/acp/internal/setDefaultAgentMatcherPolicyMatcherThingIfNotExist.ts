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
import {
  buildThing,
  createThing,
  getIriAll,
  getThing,
  ThingPersisted,
} from "../..";
import { ACP } from "../constants";
import { internal_getAcr as getAccessControlResource } from "../control.internal";
import { DefaultAccessControlName } from "./getDefaultAccessControlUrl";
import { setAccessControlResourceThing } from "./setAccessControlResourceThing";
import { getDefaultAgentMatcherPolicyUrl } from "./getDefaultAgentMatcherPolicyUrl";
import { setDefaultAgentMatcherPolicyThingIfNotExist } from "./setDefaultAgentMatcherPolicyThingIfNotExist";
import { getDefaultAgentMatcherPolicyMatcherUrl } from "./getDefaultAgentMatcherPolicyMatcherUrl";
import { setModes } from "./setModes";

/** @hidden */
export const DEFAULT_POLICY_MATCHER_PREDICATE = ACP.anyOf;

/**
 * This functions scaffolds the default elements required for giving access to
 * an agent:
 * 1. If the Access Control Resource is empty, create the AccessControlResource
 *    element;
 * 2. If the current default Access Control doesn't exist (the one applying to
 *    one of: the Resource, the ACR, the Member Resources or the ACR of members)
 *    create it;
 * 3. If the default Policy for allowing the Access Modes for the current
 *    default Access Control doesn't exist, create it;
 * 4. If the default "anyOf" Agent Matcher for the current Policy creates it;
 * 5. Returns an ACR with a Matcher ready to add to.
 * @hidden
 * */
export function setDefaultAgentMatcherPolicyMatcherThingIfNotExist<
  T extends WithAccessibleAcr
>(resource: T, name: DefaultAccessControlName, mode: keyof AccessModes): T {
  const policyUrl = getDefaultAgentMatcherPolicyUrl(resource, name, mode);
  const matcherUrl = getDefaultAgentMatcherPolicyMatcherUrl(
    resource,
    name,
    mode
  );

  let defaultAgentMatcherPolicyThing = getThing(
    getAccessControlResource(resource),
    policyUrl
  );

  if (!defaultAgentMatcherPolicyThing) {
    resource = setDefaultAgentMatcherPolicyThingIfNotExist(
      resource,
      name,
      mode
    );
    defaultAgentMatcherPolicyThing = createThing({ url: policyUrl });
    defaultAgentMatcherPolicyThing = setModes(
      defaultAgentMatcherPolicyThing,
      { [mode]: true } as unknown as AccessModes,
      ACP.allow
    );
  }

  // Get the Default Access Control Agent Matcher Policy Matcher Thing or create it and return
  const agentMatcherPolicyUrlAll = getIriAll(
    defaultAgentMatcherPolicyThing,
    DEFAULT_POLICY_MATCHER_PREDICATE
  );

  if (!agentMatcherPolicyUrlAll.includes(matcherUrl)) {
    defaultAgentMatcherPolicyThing = buildThing(defaultAgentMatcherPolicyThing)
      .addUrl(DEFAULT_POLICY_MATCHER_PREDICATE, matcherUrl)
      .build();

    return setAccessControlResourceThing(
      resource,
      defaultAgentMatcherPolicyThing
    );
  }

  return resource;
}
