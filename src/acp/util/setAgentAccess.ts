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

import type { WebId } from "../../interfaces";
import type { AccessModes } from "../type/AccessModes";
import type { WithAccessibleAcr } from "../acp";
import { createThing, getThing } from "../..";
import { internal_getAcr as getAccessControlResource } from "../control.internal";
import { getAgentAccess } from "./getAgentAccess";
import { setDefaultAgentMatcherPolicyMatcherThingIfNotExist } from "../internal/setDefaultAgentMatcherPolicyMatcherThingIfNotExist";
import {
  DefaultAccessControlName,
  DEFAULT_ACCESS_CONTROL,
  DEFAULT_ACR_ACCESS_CONTROL,
} from "../internal/getDefaultAccessControlUrl";
import { getDefaultAgentMatcherPolicyMatcherUrl } from "../internal/getDefaultAgentMatcherPolicyMatcherUrl";
import { addAgent, removeAgent } from "../matcher";
import { setAccessControlResourceThing } from "../internal/setAccessControlResourceThing";

/** @hidden */
function setAgentAccessMode<T extends WithAccessibleAcr>(
  resourceWithAcr: T,
  webId: WebId,
  name: DefaultAccessControlName,
  mode: keyof AccessModes,
  operation: "add" | "remove"
): T {
  const matcherUrl = getDefaultAgentMatcherPolicyMatcherUrl(
    resourceWithAcr,
    name,
    mode
  );

  // Set default Matcher if not exists
  const resourceWithDefaultAgentMatcher =
    setDefaultAgentMatcherPolicyMatcherThingIfNotExist(
      resourceWithAcr,
      name,
      mode
    );

  const defaultAgentMatcherThing =
    getThing(
      getAccessControlResource(resourceWithDefaultAgentMatcher),
      matcherUrl
    ) ?? createThing({ url: matcherUrl });

  return setAccessControlResourceThing<T>(
    resourceWithDefaultAgentMatcher,
    operation === "add"
      ? addAgent(defaultAgentMatcherThing, webId)
      : removeAgent(defaultAgentMatcherThing, webId)
  );
}

/**
 * Set access for a given Agent.
 *
 * @param resourceWithAcr URL of the Resource you want to set the access for.
 * @param webId WebID of the Agent you want to set the access for.
 * @param access Access Modes you want to set for the agent.
 * @since 1.16.0
 */
export async function setAgentAccess<T extends WithAccessibleAcr>(
  resourceWithAcr: T,
  webId: WebId,
  access: Partial<AccessModes>
): Promise<T> {
  const agentAccessModes = await getAgentAccess(resourceWithAcr, webId);

  // Add Agent to Default Matchers (including member) if access mode is different from what exists
  if (
    typeof access.read === "boolean" &&
    agentAccessModes.read !== access.read
  ) {
    resourceWithAcr = setAgentAccessMode(
      resourceWithAcr,
      webId,
      DEFAULT_ACCESS_CONTROL,
      "read",
      access.read ? "add" : "remove"
    );
  }
  if (
    typeof access.append === "boolean" &&
    agentAccessModes.append !== access.append
  ) {
    resourceWithAcr = setAgentAccessMode(
      resourceWithAcr,
      webId,
      DEFAULT_ACCESS_CONTROL,
      "append",
      access.append ? "add" : "remove"
    );
  }
  if (
    typeof access.write === "boolean" &&
    agentAccessModes.write !== access.write
  ) {
    resourceWithAcr = setAgentAccessMode(
      resourceWithAcr,
      webId,
      DEFAULT_ACCESS_CONTROL,
      "write",
      access.write ? "add" : "remove"
    );
  }
  if (
    typeof access.controlRead === "boolean" &&
    agentAccessModes.controlRead !== access.controlRead
  ) {
    resourceWithAcr = setAgentAccessMode(
      resourceWithAcr,
      webId,
      DEFAULT_ACR_ACCESS_CONTROL,
      "controlRead",
      access.controlRead ? "add" : "remove"
    );
  }
  if (
    typeof access.controlWrite === "boolean" &&
    agentAccessModes.controlWrite !== access.controlWrite
  ) {
    resourceWithAcr = setAgentAccessMode(
      resourceWithAcr,
      webId,
      DEFAULT_ACR_ACCESS_CONTROL,
      "controlWrite",
      access.controlWrite ? "add" : "remove"
    );
  }

  return resourceWithAcr;
}
