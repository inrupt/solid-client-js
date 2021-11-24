/**
 * Copyright 2021 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

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

/** @hidden */
export function setDefaultAgentMatcherPolicyMatcherThingIfNotExist<
  T extends WithAccessibleAcr
>(resource: T, name: DefaultAccessControlName, mode: keyof AccessModes): T {
  const policyUrl = getDefaultAgentMatcherPolicyUrl(resource, name, mode);
  const matcherUrl = getDefaultAgentMatcherPolicyMatcherUrl(
    resource,
    name,
    mode
  );

  const resourceWithDefaultAgentMatcherPolicy =
    setDefaultAgentMatcherPolicyThingIfNotExist(resource, name, mode);

  let defaultAgentMatcherPolicyThing = getThing(
    getAccessControlResource(resourceWithDefaultAgentMatcherPolicy),
    policyUrl
  );

  if (!defaultAgentMatcherPolicyThing) {
    defaultAgentMatcherPolicyThing = createThing({ url: policyUrl });
    defaultAgentMatcherPolicyThing = setModes(
      defaultAgentMatcherPolicyThing,
      { [mode]: true } as any as AccessModes,
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
      resourceWithDefaultAgentMatcherPolicy,
      defaultAgentMatcherPolicyThing
    );
  }

  return resourceWithDefaultAgentMatcherPolicy;
}
