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

import { internal_fetchAcl } from "../acl/acl.internal";
import { getAgentAccess as getAgentAccessWac } from "../acl/agent";
import { WebId, WithServerResourceInfo } from "../interfaces";
import { internal_defaultFetchOptions } from "../resource/resource";
import { Access } from "./universal";
import { Access as AclAccess } from "../acl/acl";

// Setting WacAccess = Required<Access> enforces that any change on Access will
// reflect on WacAccess, but WacAccess has additional restrictions.
type WacAccess = Required<Access> &
  (
    | { controlRead: true; controlWrite: true }
    | ({ controlRead: undefined; controlWrite: undefined } & {
        read: true | undefined;
        append: true | undefined;
        write: true | undefined;
      })
  );

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
export async function getAgentAccess(
  resource: WithServerResourceInfo,
  agent: WebId,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<Access | null> {
  const resourceAcl = await internal_fetchAcl(resource, options);
  const wacAccess = getAgentAccessWac(
    Object.assign(resource, { internal_acl: resourceAcl }),
    agent
  );
  if (wacAccess === null) {
    return null;
  }
  return aclAccessToUniversal(wacAccess);
}
