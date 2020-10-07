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

import { acp, rdf } from "../constants";
import {
  hasResourceInfo,
  SolidDataset,
  Thing,
  ThingPersisted,
  Url,
  UrlString,
  WithResourceInfo,
} from "../interfaces";
import { addIri } from "../thing/add";
import { getIriAll } from "../thing/get";
import { removeAll, removeIri } from "../thing/remove";
import { setIri } from "../thing/set";
import {
  createThing,
  getThing,
  getThingAll,
  removeThing,
  setThing,
} from "../thing/thing";

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Given a Resource, check whether it is governed by Access Policies.
 * (Specifically, a Resource that is governed by Access Policies will refer to exactly one Access
 * Control Resource, and expose that to users who are allowed to see or modify access to the given
 * Resource.)
 *
 * @param resource Resource which may or may not be governed by Access Policies.
 * @returns True if the Resource refers to an Access Control Resource and is hence governed by Access Policies, or false if it does not.
 */
export function hasLinkedAcr<Resource extends WithResourceInfo>(
  resource: Resource
): resource is WithLinkedAcpAccessControl<Resource> {
  return (
    hasResourceInfo(resource) &&
    Array.isArray(
      resource.internal_resourceInfo.linkedResources[acp.accessControl]
    ) &&
    resource.internal_resourceInfo.linkedResources[acp.accessControl].length ===
      1
  );
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * An Access Control Resource, containing [[AccessControl]]s specifying which [[AccessPolicy]]'s
 * apply to the Resource this Access Control Resource is linked to.
 */
export type AccessControlResource = SolidDataset & { accessTo: UrlString };

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * An Access Control, usually contained in an [[AccessControlResource]]. It describes which
 * [[AccessPolicy]]'s apply to a Resource.
 */
export type AccessControl = Thing;

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * If this type applies to a Resource, it is governed by an Access Control Resource,
 * and thus not the Web Access Control spec.
 * It does not indicate that this Access Control Resource will also be accessible to the current
 * user.
 */
export type WithLinkedAcpAccessControl<
  Resource extends WithResourceInfo = WithResourceInfo
> = Resource & {
  internal_resourceInfo: {
    linkedResources: {
      [acp.accessControl]: [string];
    };
  };
};

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Initialise a new [[AccessControl]].
 */
export function createAccessControl(
  options?: Parameters<typeof createThing>[0]
): AccessControl {
  let accessControl = createThing(options);
  accessControl = setIri(accessControl, rdf.type, acp.AccessControl);
  return accessControl;
}
/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Find an [[AccessControl]] with a given URL in a given Access Control Resource.
 *
 * @returns The requested Access Control, or `null` if it could not be found.
 */
export function getAccessControl(
  accessControlResource: AccessControlResource,
  url: Parameters<typeof getThing>[1],
  options?: Parameters<typeof getThing>[2]
): AccessControl | null {
  const foundThing = getThing(accessControlResource, url, options);
  if (
    foundThing === null ||
    !getIriAll(foundThing, rdf.type).includes(acp.AccessControl)
  ) {
    return null;
  }

  return foundThing;
}
/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Get all [[AccessControl]]s in a given Access Control Resource.
 */
export function getAccessControlAll(
  accessControlResource: AccessControlResource,
  options?: Parameters<typeof getThingAll>[1]
): AccessControl[] {
  const foundThings = getThingAll(accessControlResource, options);

  return foundThings.filter((foundThing) =>
    getIriAll(foundThing, rdf.type).includes(acp.AccessControl)
  );
}
/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Insert an [[AccessControl]] into an [[AccessControlResource]], replacing previous instances of that Access Control.
 *
 * @param accessControlResource The Access Control Resource to insert an Access Control into.
 * @param accessControl The Access Control to insert into the given Access Control Resource.
 * @returns A new Access Control Resource equal to the given Access Control Resource, but with the given Access Control.
 */
export function setAccessControl(
  accessControlResource: AccessControlResource,
  accessControl: AccessControl
): AccessControlResource {
  return setThing(accessControlResource, accessControl);
}
/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Remove an [[AccessControl]] from an [[AccessControlResource]].
 *
 * @param accessControlResource The Access Control Resource to remove an Access Control from.
 * @param accessControl The Access Control to remove from the given Access Control Resource.
 * @returns A new Access Control Resource equal to the given Access Control Resource, excluding the given Access Control.
 */
export function removeAccessControl(
  accessControlResource: AccessControlResource,
  accessControl: AccessControl
): AccessControlResource {
  return removeThing(accessControlResource, accessControl);
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Add an Access Policy to an Access Control such that that Policy applies to the Resource to which
 * the Access Control is linked.
 *
 * @param accessControl The Access Control to which the Policy should be added.
 * @param policyUrl URL of the Policy that should apply to the Resource to which the Access Control is linked.
 * @returns A new Access Control equal to the given Access Control, but with the given policy added to it.
 */
export function addPolicyUrl(
  accessControl: AccessControl,
  policyUrl: Url | UrlString | ThingPersisted
): AccessControl {
  return addIri(accessControl, acp.apply, policyUrl);
}
/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Get all Policies that apply to the Resource to which the given Access Control is linked, and
 * which can be removed by anyone with Write access to the Access Control Resource that contains the
 * Access Control.
 *
 * @param accessControl The Access Control of which to get the Policies.
 * @returns The Policies that are listed in this Access Control as applying to the Resource it is linked to, and as removable by anyone with Write access to the Access Control Resource.
 */
export function getPolicyUrlAll(accessControl: AccessControl): UrlString[] {
  return getIriAll(accessControl, acp.apply);
}
/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Remove a given Policy that applies to the Resource to which the given Access Control is linked,
 * and which can be removed by anyone with Write access to the Access Control Resource that contains
 * the Access Control.
 *
 * @param accessControl The Access Control of which to remove the Policies.
 * @param policyUrl URL of the Policy that should no longer apply to the Resource to which the Access Control is linked.
 * @returns A new Access Control equal to the given Access Control, but with the given Policy removed from it.
 */
export function removePolicyUrl(
  accessControl: AccessControl,
  policyUrl: Url | UrlString | ThingPersisted
): AccessControl {
  return removeIri(accessControl, acp.apply, policyUrl);
}
/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Remove all Policies that apply to the Resource to which the given Access Control is linked, and
 * which can be removed by anyone with Write access to the Access Control Resource that contains the
 * Access Control.
 *
 * @param accessControl The Access Control of which to remove the Policies.
 * @returns A new Access Control equal to the given Access Control, but with all Policies removed from it.
 */
export function removePolicyUrlAll(
  accessControl: AccessControl
): AccessControl {
  return removeAll(accessControl, acp.apply);
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Add an Access Policy to an Access Control such that that Policy applies to the Resource to which
 * the Access Control is linked, and that it can only be removed by the current user and by the
 * owner of the Pod in which the Resource resides.
 *
 * @param accessControl The Access Control to which the Policy should be added.
 * @param policyUrl URL of the Policy that should apply to the Resource to which the Access Control is linked.
 * @returns A new Access Control equal to the given Access Control, but with the given policy added to it as a "Constant" Policy.
 */
export function addConstantPolicyUrl(
  accessControl: AccessControl,
  policyUrl: Url | UrlString | ThingPersisted
): AccessControl {
  return addIri(accessControl, acp.applyConstant, policyUrl);
}
/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Get all Policies that apply to the Resource to which the given Access Control is linked, and
 * which can only be removed by the person who added the Policy to the Access Control or the owner
 * of the Pod that contains the Resource the Access Control is linked to.
 *
 * @param accessControl The Access Control of which to get the Policies.
 * @returns The Policies that are listed in this Access Control as applying to the Resource it is linked to, and as removable only by whoever added the Policy or the Pod owner.
 */
export function getConstantPolicyUrlAll(
  accessControl: AccessControl
): UrlString[] {
  return getIriAll(accessControl, acp.applyConstant);
}
/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Remove a given Policy that applies to the Resource to which the given Access Control is linked,
 * and which can only be removed by the person who added the Policy to the Access Control or the
 * owner of the Pod that contains the Resource the Access Control is linked to.
 *
 * @param accessControl The Access Control of which to remove the Constant Policy.
 * @param policyUrl URL of the Constant Policy that should no longer apply to the Resource to which the Access Control is linked.
 * @returns A new Access Control equal to the given Access Control, but with the given Constant Policy removed from it.
 */
export function removeConstantPolicyUrl(
  accessControl: AccessControl,
  policyUrl: Url | UrlString | ThingPersisted
): AccessControl {
  return removeIri(accessControl, acp.applyConstant, policyUrl);
}
/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Remove all Policies that apply to the Resource to which the given Access Control is linked, and
 * which can only be removed by the person who added the Policy to the Access Control or the owner
 * of the Pod that contains the Resource the Access Control is linked to.
 *
 * @param accessControl The Access Control of which to remove the Policies.
 * @returns A new Access Control equal to the given Access Control, but with all Constant Policies removed from it.
 */
export function removeConstantPolicyUrlAll(
  accessControl: AccessControl
): AccessControl {
  return removeAll(accessControl, acp.applyConstant);
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Add an Access Policy to an Access Control such that that Policy applies to the children of the
 * Resource to which the Access Control is linked.
 *
 * @param accessControl The Access Control to which the Policy should be added.
 * @param policyUrl URL of the Policy that should apply to the children of the Resource to which the Access Control is linked.
 * @returns A new Access Control equal to the given Access Control, but with the given policy added to it as a Member Policy.
 */
export function addMemberPolicyUrl(
  accessControl: AccessControl,
  policyUrl: Url | UrlString | ThingPersisted
): AccessControl {
  return addIri(accessControl, acp.applyMembers, policyUrl);
}
/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Get all Policies that apply to the children of the Resource to which the given Access Control is
 * linked, and which can be removed by anyone with Write access to the Access Control Resource that
 * contains the Access Control.
 *
 * @param accessControl The Access Control of which to get the Policies.
 * @returns The Policies that are listed in this Access Control as applying to the children of the Resource it is linked to, and as removable by anyone with Write access to the Access Control Resource.
 */
export function getMemberPolicyUrlAll(
  accessControl: AccessControl
): UrlString[] {
  return getIriAll(accessControl, acp.applyMembers);
}
/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Remove a given Policy that applies to the children of the Resource to which the given Access
 * Control is linked, and which can be removed by anyone with Write access to the Access Control
 * Resource that contains the Access Control.
 *
 * @param accessControl The Access Control of which to remove the Member Policy.
 * @param policyUrl URL of the Member Policy that should no longer apply to the Resource to which the Access Control is linked.
 * @returns A new Access Control equal to the given Access Control, but with the given Member Policy removed from it.
 */
export function removeMemberPolicyUrl(
  accessControl: AccessControl,
  policyUrl: Url | UrlString | ThingPersisted
): AccessControl {
  return removeIri(accessControl, acp.applyMembers, policyUrl);
}
/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Remove all Policies that apply to the children of the Resource to which the given Access Control
 * is linked, and which can be removed by anyone with Write access to the Access Control Resource
 * that contains the Access Control.
 *
 * @param accessControl The Access Control of which to remove the Member Policies.
 * @returns A new Access Control equal to the given Access Control, but with all Member Policies removed from it.
 */
export function removeMemberPolicyUrlAll(
  accessControl: AccessControl
): AccessControl {
  return removeAll(accessControl, acp.applyMembers);
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Add an Access Policy to an Access Control such that that Policy applies to the children of the
 * Resource to which the Access Control is linked, and that it can only be removed by the current
 * user and by the owner of the Pod in which the Resource resides.
 *
 * @param accessControl The Access Control to which the Policy should be added.
 * @param policyUrl URL of the Policy that should apply to the children of the Resource to which the Access Control is linked.
 * @returns A new Access Control equal to the given Access Control, but with the given policy added to it as a "Constant" Member Policy.
 */
export function addConstantMemberPolicyUrl(
  accessControl: AccessControl,
  policyUrl: Url | UrlString | ThingPersisted
): AccessControl {
  return addIri(accessControl, acp.applyMembersConstant, policyUrl);
}
/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Get all Policies that apply to the children of the Resource to which the given Access Control is
 * linked, and which can only be removed by the person who added the Policy to the Access Control or
 * the owner of the Pod that contains the Resource the Access Control is linked to.
 *
 * @param accessControl The Access Control of which to get the Policies.
 * @returns The Policies that are listed in this Access Control as applying to the children of the Resource it is linked to, and as removable only by whoever added the Policy or the Pod owner.
 */
export function getConstantMemberPolicyUrlAll(
  accessControl: AccessControl
): UrlString[] {
  return getIriAll(accessControl, acp.applyMembersConstant);
}
/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Remove a given Policy that applies to the children of the Resource to which the given Access
 * Control is linked, and which can only be removed by the person who added the Policy to the Access
 * Control or the owner of the Pod that contains the Resource the Access Control is linked to.
 *
 * @param accessControl The Access Control of which to remove the Constant Member Policy.
 * @param policyUrl URL of the Constant Member Policy that should no longer apply to the Resource to which the Access Control is linked.
 * @returns A new Access Control equal to the given Access Control, but with the given Constant Member Policy removed from it.
 */
export function removeConstantMemberPolicyUrl(
  accessControl: AccessControl,
  policyUrl: Url | UrlString | ThingPersisted
): AccessControl {
  return removeIri(accessControl, acp.applyMembersConstant, policyUrl);
}
/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Remove all Policies that apply to the children of the Resource to which the given Access Control
 * is linked, and which can only be removed by the person who added the Policy to the Access Control
 * or the owner of the Pod that contains the Resource the Access Control is linked to.
 *
 * @param accessControl The Access Control of which to remove the Policies.
 * @returns A new Access Control equal to the given Access Control, but with all Constant Member Policies removed from it.
 */
export function removeConstantMemberPolicyUrlAll(
  accessControl: AccessControl
): AccessControl {
  return removeAll(accessControl, acp.applyMembersConstant);
}
