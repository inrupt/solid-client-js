/**
 * Copyright 2020 Inrupt Inc.
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

import { internal_fetchAcl, internal_setAcl } from "../acl/acl.internal";
import {
  getAgentAccess as getAgentAccessWac,
  getAgentAccessAll as getAgentAccessAllWac,
} from "../acl/agent";
import {
  getGroupAccess as getGroupAccessWac,
  getGroupAccessAll as getGroupAccessAllWac,
} from "../acl/group";
import { getPublicAccess as getPublicAccessWac } from "../acl/class";
import {
  IriString,
  Url,
  UrlString,
  WebId,
  WithServerResourceInfo,
} from "../interfaces";
import { internal_defaultFetchOptions } from "../resource/resource";
import { Access } from "./universal";
import { Access as AclAccess } from "../acl/acl";

// Setting WacAccess = Required<Access> enforces that any change on Access will
// reflect on WacAccess, but WacAccess has additional restrictions.
type WacAccess = (
  | { controlRead: true; controlWrite: true }
  | { controlRead: undefined; controlWrite: undefined }
) & {
  read: true | undefined;
  append: true | undefined;
  write: true | undefined;
};

type AgentWacAccess = Record<WebId, WacAccess>;

function aclAccessToUniversal(access: AclAccess): WacAccess {
  // In ACL, denying access to an actor is a notion that doesn't exist, so an
  // access is either granted or not for a given mode.
  // This creates a misalignment with the ACP notion of an access being granted,
  // denied, or simply not mentioned. Here, we convert the boolean vision of
  // ACL into the boolean or undefined vision of ACP.
  return {
    read: access.read ? true : undefined,
    append: access.append ? true : undefined,
    write: access.write ? true : undefined,
    controlRead: access.control ? true : undefined,
    controlWrite: access.control ? true : undefined,
  } as WacAccess;
}

async function getActorAccess(
  resource: WithServerResourceInfo,
  actor: IriString,
  accessEvaluationCallback: typeof getAgentAccessWac,
  options: Partial<typeof internal_defaultFetchOptions>
): Promise<Access | null> {
  const resourceAcl = await internal_fetchAcl(resource, options);
  const wacAccess = accessEvaluationCallback(
    internal_setAcl(resource, resourceAcl),
    actor
  );
  if (wacAccess === null) {
    return null;
  }
  return aclAccessToUniversal(wacAccess);
}

async function getActorClassAccess(
  resource: WithServerResourceInfo,
  accessEvaluationCallback: typeof getPublicAccessWac,
  options: Partial<typeof internal_defaultFetchOptions>
): Promise<Access | null> {
  const resourceAcl = await internal_fetchAcl(resource, options);
  const wacAccess = accessEvaluationCallback(
    internal_setAcl(resource, resourceAcl)
  );
  if (wacAccess === null) {
    return null;
  }
  return aclAccessToUniversal(wacAccess);
}

async function getActorAccessAll(
  resource: WithServerResourceInfo,
  accessEvaluationCallback: typeof getAgentAccessAllWac,
  options: Partial<typeof internal_defaultFetchOptions>
): Promise<AgentWacAccess | null> {
  const resourceAcl = await internal_fetchAcl(resource, options);
  const wacAgentAccess = accessEvaluationCallback(
    internal_setAcl(resource, resourceAcl)
  );
  if (wacAgentAccess === null) {
    return null;
  }
  const result: AgentWacAccess = {};
  for (const [webId, wacAccess] of Object.entries(wacAgentAccess)) {
    result[webId] = aclAccessToUniversal(wacAccess);
  }
  return result;
}

/**
 * For a given Resource, look up its metadata, and read the Access permissions
 * granted to the given Agent.
 *
 * Note that this only lists permissions granted to the given Agent individually,
 * and will not exhaustively list modes the given Agent may have access to because
 * they apply to everyone, or because they apply to the Agent through a group for
 * instance.
 *
 * @param resource The URL of the Resource for which we want to list Access
 * @param agent The Agent for which the Access is granted
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns True for Access modes granted to the Agent, and undefined otherwise.
 */
export function getAgentAccess(
  resource: WithServerResourceInfo,
  agent: WebId,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<Access | null> {
  return getActorAccess(resource, agent, getAgentAccessWac, options);
}

/**
 * For a given Resource, look up its metadata, and read the Access permissions
 * granted to the given Group.
 *
 * Note that this only lists permissions granted to the given Group individually,
 * and will not exhaustively list modes the given Group may have access to because
 * they apply to everyone, or because they apply to the Group through another
 * Group that may contain it for instance.
 *
 * @param resource The URL of the Resource for which we want to list Access
 * @param group The Group for which the Access is granted
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns True for Access modes granted to the Agent, False for Access modes
 * denied to the Agent, and undefined otherwise.
 */
export function getGroupAccess(
  resource: WithServerResourceInfo,
  group: UrlString,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<Access | null> {
  return getActorAccess(resource, group, getGroupAccessWac, options);
}

/**
 * For a given Resource, look up its metadata, and read the Access permissions
 * granted to everyone.
 *
 * Note that this only lists permissions explicitly granted to everyone as a whole,
 * and will not exhaustively list modes any individual Agent or Group may have
 * access to because they specifically apply to them only.
 *
 * @param resource The URL of the Resource for which we want to list public Access
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns True for Access modes granted to the Agent, False for Access modes
 * denied to the Agent, and undefined otherwise.
 */
export function getPublicAccess(
  resource: WithServerResourceInfo,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<Access | null> {
  return getActorClassAccess(resource, getPublicAccessWac, options);
}

/**
 * For a given Resource, look up its metadata, and read the Access permissions
 * granted explicitly to each individual Agent.
 *
 * Note that this only lists permissions granted to each Agent individually,
 * and will not exhaustively list modes any Agent may have access to because
 * they apply to everyone, or because they apply to an Agent through a group for
 * instance.
 *
 * @param resource The URL of the Resource for which we want to list Agents Access
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns A map of Agents WebIDs associated to a list of modes: True for Access modes
 * granted to the Agent, and undefined otherwise.
 */
export function getAgentAccessAll(
  resource: WithServerResourceInfo,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<AgentWacAccess | null> {
  return getActorAccessAll(resource, getAgentAccessAllWac, options);
}

/**
 * For a given Resource, look up its metadata, and read the Access permissions
 * granted explicitly to each individual Group.
 *
 * Note that this only lists permissions granted to each Group individually,
 * and will not exhaustively list modes any Group may have access to because
 * they apply individually to all of the Agents in the Group, or to everyone
 * for instance.
 *
 * @param resource The URL of the Resource for which we want to list Agents Access
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns A map of Groups URLs associated to a list of modes: True for Access modes
 * granted to the Agent, False for Access modes denied to the Agent, and undefined otherwise.
 */
export async function getGroupAccessAll(
  resource: WithServerResourceInfo,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<AgentWacAccess | null> {
  return getActorAccessAll(resource, getGroupAccessAllWac, options);
}
