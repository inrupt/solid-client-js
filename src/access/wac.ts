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

import {
  internal_fetchAcl,
  internal_getResourceAcl,
  internal_setAcl,
  internal_setResourceAcl,
} from "../acl/acl.internal";
import {
  getAgentAccess as getAgentAccessWac,
  getAgentAccessAll as getAgentAccessAllWac,
  setAgentResourceAccess as setAgentResourceAccessWac,
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
import {
  Access as AclAccess,
  AclDataset,
  createAclFromFallbackAcl,
  hasAccessibleAcl,
  hasFallbackAcl,
  hasResourceAcl,
  saveAclFor,
  WithAcl,
  WithResourceAcl,
} from "../acl/acl";

// Setting WacAccess = Required<Access> enforces that any change on Access will
// reflect on WacAccess, but WacAccess has additional restrictions.
export type WacAccess = (
  | { controlRead: true; controlWrite: true }
  | { controlRead: false; controlWrite: false }
  | { controlRead?: undefined; controlWrite?: undefined }
) & {
  read?: boolean;
  append?: boolean;
  write?: boolean;
};

type NoUndefinedWacAccess = (
  | { controlRead: true; controlWrite: true }
  | { controlRead: false; controlWrite: false }
) & {
  read: boolean;
  append: boolean;
  write: boolean;
};

export type AgentWacAccess = Record<WebId, WacAccess>;

function hasNoUndefinedAccessModes(
  access: WacAccess
): access is WacAccess & NoUndefinedWacAccess {
  return !(
    access.read === undefined ||
    access.append === undefined ||
    access.write === undefined ||
    access.controlRead === undefined ||
    access.controlWrite === undefined
  );
}

function universalAccessToAcl(
  newAccess: WacAccess,
  previousAccess: AclAccess
): AclAccess;
function universalAccessToAcl(
  newAccess: NoUndefinedWacAccess,
  previousAccess: undefined
): AclAccess;
function universalAccessToAcl(
  newAccess: WacAccess,
  previousAccess?: AclAccess
): AclAccess {
  // Universal access is aligned on ACP, which means there is a distinction between
  // controlRead and controlWrite. This split doesn't exist in WAC, which is why
  // the type for the input variable of this function is a restriction on the
  // universal Access type. Also, in WAC, an undefined and false Access modes are
  // equivalent.
  if (newAccess.controlRead !== newAccess.controlWrite) {
    throw new Error(
      "For WAC resources, controlRead and controlWrite must be equal."
    );
  }
  return hasNoUndefinedAccessModes(newAccess)
    ? {
        read: newAccess.read,
        append: newAccess.append,
        write: newAccess.write,
        control: newAccess.controlRead,
      }
    : {
        // The type signature enforces that previousAccess is defined here.
        read: newAccess.read ?? previousAccess!.read,
        append: newAccess.append ?? previousAccess!.append,
        write: newAccess.write ?? previousAccess!.write,
        control: newAccess.controlRead ?? previousAccess!.control,
      };
}

const NO_ACCESS: AclAccess = {
  read: false,
  write: false,
  append: false,
  control: false,
};

function aclAccessToUniversal(access: AclAccess): WacAccess {
  return {
    read: access.read === true ? true : undefined,
    write: access.write === true ? true : undefined,
    append: access.append === true ? true : undefined,
    controlRead: access.control === true ? true : undefined,
    controlWrite: access.control === true ? true : undefined,
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
 * @returns A map of Group URLs associated with a list of modes: True for Access modes
 * granted to the Agent, and undefined otherwise.
 */
export function getGroupAccessAll(
  resource: WithServerResourceInfo,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<AgentWacAccess | null> {
  return getActorAccessAll(resource, getGroupAccessAllWac, options);
}

/**
 * Set the Access modes for a given Agent to a given Resource.
 *
 * Important note: if the target resource did not have a Resource ACL, and its
 * Access was regulated by its Fallback ACL, said Fallback ACL is copied to create
 * a new Resource ACL. This has the side effect that the next time the Fallback
 * ACL is updated, the changes _will not impact_ the target resource.
 *
 * If the target Resource's Access mode cannot be determined, e.g. the user does
 * not have Read and Write access to the target Resource's ACL, or to its
 * fallback ACL if it does not have a Resource ACL, then `null` is returned.
 *
 * @param resource The Resource for which Access is being set
 * @param agent The Agent for whom Access is being set
 * @param access The Access being set
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns The Resource, with its ACL updated, or null if the new Access could not
 * be set.
 */
export async function setAgentResourceAccess<T extends WithServerResourceInfo>(
  resource: T,
  agent: WebId,
  access: WacAccess,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<(T & WithResourceAcl) | null> {
  if (!hasAccessibleAcl(resource)) {
    return null;
  }
  const acl = await internal_fetchAcl(resource, options);
  const resourceWithAcl = internal_setAcl(resource, acl);
  let resourceAcl: AclDataset;
  if (hasResourceAcl(resourceWithAcl)) {
    // This is the simple case, where the Resource ACL we need to update already
    // exists.
    resourceAcl = internal_getResourceAcl(resourceWithAcl);
  } else if (hasFallbackAcl(resourceWithAcl)) {
    // In this case, the Resource ACL needs to be created first, and then updated.
    resourceAcl = createAclFromFallbackAcl(resourceWithAcl);
  } else {
    return null;
  }

  const resourceWithOldAcl = internal_setResourceAcl(
    resourceWithAcl,
    resourceAcl
  );
  let wacAccess: AclAccess | undefined = undefined;
  if (hasNoUndefinedAccessModes(access)) {
    // If all the access modes in `access` are set, no need for the previous access.
    wacAccess = universalAccessToAcl(access, undefined);
  } else {
    // If some modes in `access` are undefined, they should be left unchanged.
    // The type assumption is okay because we just set a Resource ACL for the
    // Resource, or returned already.
    const currentAccess = getAgentAccessWac(
      resourceWithOldAcl,
      agent
    ) as AclAccess;
    wacAccess = universalAccessToAcl(access, currentAccess);
  }

  const updatedResourceAcl = setAgentResourceAccessWac(
    resourceAcl,
    agent,
    wacAccess
  );

  let savedAcl: AclDataset | null = null;
  try {
    savedAcl = await saveAclFor(resourceWithAcl, updatedResourceAcl, options);
    return internal_setResourceAcl(resourceWithAcl, savedAcl);
  } catch (e) {
    return null;
  }
}
