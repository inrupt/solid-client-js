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

import { hasAccessibleAcl } from "../acl/acl";
import {
  getResourceInfoWithAcr,
  hasAccessibleAcr,
  saveAcrFor,
} from "../acp/acp";
import { UrlString, WebId } from "../interfaces";
import {
  getSourceIri,
  internal_defaultFetchOptions,
} from "../resource/resource";
import {
  internal_getAgentAccess as getAgentAccessAcp,
  internal_getAgentAccessAll as getAgentAccessAllAcp,
  internal_setAgentAccess as setAgentAccessAcp,
  internal_getPublicAccess as getPublicAccessAcp,
  internal_setPublicAccess as setPublicAccessAcp,
  internal_getPoliciesAndMatchers,
} from "./acp_v2";
import {
  getAgentAccess as getAgentAccessWac,
  getAgentAccessAll as getAgentAccessAllWac,
  setAgentResourceAccess as setAgentAccessWac,
  getPublicAccess as getPublicAccessWac,
  setPublicResourceAccess as setPublicAccessWac,
  WacAccess,
} from "./wac";

/**
 * Each of the following access modes is in one of two states:
 * - true: this access mode is granted, or
 * - false: this access mode is not granted.
 * @since 1.5.0
 * @hidden
 * @deprecated Please import from the "universal" modules.
 */
export interface Access {
  read: boolean;
  append: boolean;
  write: boolean;
  controlRead: boolean;
  controlWrite: boolean;
}

/**
 * Get an overview of what access is defined for a given Agent.
 *
 * This function works with Solid Pods that implement either the Web Access
 * Control spec or the Access Control Policies proposal, with some caveats:
 *
 * - If access to the given Resource has been set using anything other than the
 *   functions in this module, it is possible that it has been set in a way that
 *   prevents this function from reliably reading access, in which case it will
 *   resolve to `null`.
 * - It will only return access specified explicitly for the given Agent. If
 *   additional restrictions are set up to apply to the given Agent in a
 *   particular situation, those will not be reflected in the return value of
 *   this function.
 * - It will only return access specified explicitly for the given Resource.
 *   In other words, if the Resource is a Container, the returned Access may not
 *   apply to contained Resources.
 * - If the current user does not have permission to view access for the given
 *   Resource, this function will resolve to `null`.
 *
 * @param resourceUrl URL of the Resource you want to read the access for.
 * @param webId WebID of the Agent you want to get the access for.
 * @since 1.5.0
 * @hidden
 * @deprecated Please import from the "universal" modules.
 */
export async function getAgentAccess(
  resourceUrl: UrlString,
  webId: WebId,
  options = internal_defaultFetchOptions
): Promise<Access | null> {
  const resourceInfo = await getResourceInfoWithAcr(resourceUrl, options);
  if (hasAccessibleAcr(resourceInfo)) {
    const acpData = await internal_getPoliciesAndMatchers(
      resourceInfo,
      options
    );
    return getAgentAccessAcp(acpData, webId);
  }
  if (hasAccessibleAcl(resourceInfo)) {
    return getAgentAccessWac(resourceInfo, webId, options);
  }
  return null;
}

/**
 * Set access to a Resource for a specific Agent.
 *
 * This function works with Solid Pods that implement either the Web Access
 * Control spec or the Access Control Policies proposal, with some caveats:
 *
 * - If access to the given Resource has been set using anything other than the
 *   functions in this module, it is possible that it has been set in a way that
 *   prevents this function from reliably setting access, in which case it will
 *   resolve to `null`.
 * - It will only set access explicitly for the given Agent. In other words,
 *   additional restrictions could be present that further restrict or loosen
 *   what access the given Agent has in particular circumstances.
 * - The provided access will only apply to the given Resource. In other words,
 *   if the Resource is a Container, the configured Access may not apply to
 *   contained Resources.
 * - If the current user does not have permission to view or change access for
 *   the given Resource, this function will resolve to `null`.
 *
 * Additionally, two caveats apply to users with a Pod server that uses WAC:
 * - If the Resource did not have an ACL yet, a new one will be initialised.
 *   This means that changes to the ACL of a parent Container can no longer
 *   affect access people have to this Resource, although existing access will
 *   be preserved.
 * - Setting different values for `controlRead` and `controlWrite` is not
 *   supported, and **will throw an error**. If you expect (some of) your users
 *   to have Pods implementing WAC, be sure to pass the same value for both.
 *
 * @param resourceUrl URL of the Resource you want to change the Agent's access to.
 * @param webId WebID of the Agent you want to set access for.
 * @param access What access permissions you want to set for the given Agent to the given Resource. Possible properties are `read`, `append`, `write`, `controlRead` and `controlWrite`: set to `true` to allow, to `false` to stop allowing, or `undefined` to leave unchanged. Take note that `controlRead` and `controlWrite` can not have distinct values for a Pod server implementing Web Access Control; trying this will throw an error.
 * @returns What access has been set for the given Agent explicitly.
 * @since 1.5.0
 * @hidden
 * @deprecated Please import from the "universal" modules.
 */
export async function setAgentAccess(
  resourceUrl: UrlString,
  webId: WebId,
  access: Partial<Access>,
  options = internal_defaultFetchOptions
): Promise<Access | null> {
  const resourceInfo = await getResourceInfoWithAcr(resourceUrl, options);
  if (hasAccessibleAcr(resourceInfo)) {
    const acpData = await internal_getPoliciesAndMatchers(
      resourceInfo,
      options
    );
    const updatedResource = setAgentAccessAcp(
      resourceInfo,
      acpData,
      webId,
      access
    );
    if (updatedResource) {
      try {
        await saveAcrFor(updatedResource, options);
        return await getAgentAccess(resourceUrl, webId, options);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
  if (hasAccessibleAcl(resourceInfo)) {
    if (access.controlRead !== access.controlWrite) {
      throw new Error(
        `When setting access for a Resource in a Pod implementing Web Access Control (i.e. [${getSourceIri(
          resourceInfo
        )}]), \`controlRead\` and \`controlWrite\` should have the same value.`
      );
    }
    const wacAccess = access as WacAccess;
    await setAgentAccessWac(resourceInfo, webId, wacAccess, options);
    return getAgentAccessWac(resourceInfo, webId, options);
  }
  return null;
}

/**
 * Get an overview of what access is defined for all Agents with respect to a given
 * Resource.
 *
 * This function works with Solid Pods that implement either the Web Access
 * Control spec or the Access Control Policies proposal, with some caveats:
 *
 * - If access to the given Resource has been set using anything other than the
 *   functions in this module, it is possible that it has been set in a way that
 *   prevents this function from reliably reading access, in which case it will
 *   resolve to `null`.
 * - It will only return access specified explicitly for the returned Agents. If
 *   additional restrictions are set up to apply to the listed Agents in a
 *   particular situation, those will not be reflected in the return value of
 *   this function.
 * - It will only return access specified explicitly for the given Resource.
 *   In other words, if the Resource is a Container, the returned Access may not
 *   apply to contained Resources.
 * - If the current user does not have permission to view access for the given
 *   Resource, this function will resolve to `null`.
 *
 * @param resourceUrl URL of the Resource you want to read the access for.
 * @returns The access information to the Resource, grouped by Agent.
 * @since 1.5.0
 * @hidden
 * @deprecated Please import from the "universal" modules.
 */
export async function getAgentAccessAll(
  resourceUrl: UrlString,
  options = internal_defaultFetchOptions
): Promise<Record<WebId, Access> | null> {
  const resourceInfo = await getResourceInfoWithAcr(resourceUrl, options);
  if (hasAccessibleAcr(resourceInfo)) {
    const acpData = await internal_getPoliciesAndMatchers(
      resourceInfo,
      options
    );
    return getAgentAccessAllAcp(acpData);
  }
  if (hasAccessibleAcl(resourceInfo)) {
    return getAgentAccessAllWac(resourceInfo, options);
  }
  return null;
}

/**
 * Get an overview of what access is defined for everyone.
 *
 * This function works with Solid Pods that implement either the Web Access
 * Control spec or the Access Control Policies proposal, with some caveats:
 *
 * - If access to the given Resource has been set using anything other than the
 *   functions in this module, it is possible that it has been set in a way that
 *   prevents this function from reliably reading access, in which case it will
 *   resolve to `null`.
 * - It will only return access specified explicitly for everyone. If
 *   additional restrictions are set up to apply to users in a particular
 *   situation, those will not be reflected in the return value of this
 *   function.
 * - It will only return access specified explicitly for the given Resource.
 *   In other words, if the Resource is a Container, the returned Access may not
 *   apply to contained Resources.
 * - If the current user does not have permission to view access for the given
 *   Resource, this function will resolve to `null`.
 *
 * @param resourceUrl URL of the Resource you want to read the access for.
 * @since 1.5.0
 * @hidden
 * @deprecated Please import from the "universal" modules.
 */
export async function getPublicAccess(
  resourceUrl: UrlString,
  options = internal_defaultFetchOptions
): Promise<Access | null> {
  const resourceInfo = await getResourceInfoWithAcr(resourceUrl, options);
  if (hasAccessibleAcr(resourceInfo)) {
    const acpData = await internal_getPoliciesAndMatchers(
      resourceInfo,
      options
    );
    return getPublicAccessAcp(acpData);
  }
  if (hasAccessibleAcl(resourceInfo)) {
    return getPublicAccessWac(resourceInfo, options);
  }
  return null;
}

/**
 * Set access to a Resource for everybody.
 *
 * This function works with Solid Pods that implement either the Web Access
 * Control spec or the Access Control Policies proposal, with some caveats:
 *
 * - If access to the given Resource has been set using anything other than the
 *   functions in this module, it is possible that it has been set in a way that
 *   prevents this function from reliably setting access, in which case it will
 *   resolve to `null`.
 * - It will only set access explicitly for everybody. In other words,
 *   additional restrictions could be present that further restrict or loosen
 *   what access a user has in particular circumstances.
 * - The provided access will only apply to the given Resource. In other words,
 *   if the Resource is a Container, the configured Access may not apply to
 *   contained Resources.
 * - If the current user does not have permission to view or change access for
 *   the given Resource, this function will resolve to `null`.
 *
 * Additionally, two caveats apply to users with a Pod server that uses WAC:
 * - If the Resource did not have an ACL yet, a new one will be initialised.
 *   This means that changes to the ACL of a parent Container can no longer
 *   affect access people have to this Resource, although existing access will
 *   be preserved.
 * - Setting different values for `controlRead` and `controlWrite` is not
 *   supported, and **will throw an error**. If you expect (some of) your users
 *   to have Pods implementing WAC, be sure to pass the same value for both.
 *
 * @param resourceUrl URL of the Resource you want to change public access to.
 * @param access What access permissions you want to set for everybody to the given Resource. Possible properties are `read`, `append`, `write`, `controlRead` and `controlWrite`: set to `true` to allow, to `false` to stop allowing, or `undefined` to leave unchanged. Take note that `controlRead` and `controlWrite` can not have distinct values for a Pod server implementing Web Access Control; trying this will throw an error.
 * @returns What access has been set for everybody explicitly.
 * @since 1.5.0
 * @hidden
 * @deprecated Please import from the "universal" modules.
 */
export async function setPublicAccess(
  resourceUrl: UrlString,
  access: Partial<Access>,
  options = internal_defaultFetchOptions
): Promise<Access | null> {
  const resourceInfo = await getResourceInfoWithAcr(resourceUrl, options);
  if (hasAccessibleAcr(resourceInfo)) {
    const acpData = await internal_getPoliciesAndMatchers(
      resourceInfo,
      options
    );
    const updatedResource = setPublicAccessAcp(resourceInfo, acpData, access);
    if (updatedResource) {
      try {
        await saveAcrFor(updatedResource, options);
        return await getPublicAccess(resourceUrl, options);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
  if (hasAccessibleAcl(resourceInfo)) {
    if (access.controlRead !== access.controlWrite) {
      throw new Error(
        `When setting access for a Resource in a Pod implementing Web Access Control (i.e. [${getSourceIri(
          resourceInfo
        )}]), \`controlRead\` and \`controlWrite\` should have the same value.`
      );
    }
    const wacAccess = access as WacAccess;
    await setPublicAccessWac(resourceInfo, wacAccess, options);
    return getPublicAccessWac(resourceInfo, options);
  }
  return null;
}

/**
 * @hidden
 * @deprecated Please import from the "universal" modules.
 */
export { getAccessFor, getAccessForAll, setAccessFor } from "./for";
