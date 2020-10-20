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
  hasServerResourceInfo,
  SolidDataset,
  Thing,
  ThingPersisted,
  Url,
  UrlString,
  WithResourceInfo,
  WithServerResourceInfo,
} from "../interfaces";
import { getSourceUrl, internal_cloneResource } from "../resource/resource";
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
import { hasAccessibleAcr, WithAccessibleAcr, WithAcp } from "./acp";

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
export function hasLinkedAcr<Resource extends WithServerResourceInfo>(
  resource: Resource
): resource is WithLinkedAcpAccessControl<Resource> {
  return (
    hasServerResourceInfo(resource) &&
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
export type AccessControlResource = SolidDataset &
  WithResourceInfo & { accessTo: UrlString };

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
  Resource extends WithServerResourceInfo = WithServerResourceInfo
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
 * Find an [[AccessControl]] with a given URL in a given Resource with an Access Control Resource.
 *
 * @returns The requested Access Control, or `null` if it could not be found.
 */
export function getAccessControl(
  withAccessControlResource: WithAccessibleAcr,
  url: Parameters<typeof getThing>[1],
  options?: Parameters<typeof getThing>[2]
): AccessControl | null {
  const acr = getAcr(withAccessControlResource);
  const foundThing = getThing(acr, url, options);
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
 * Get all [[AccessControl]]s in the Access Control Resource of a given Resource.
 */
export function getAccessControlAll(
  withAccessControlResource: WithAccessibleAcr,
  options?: Parameters<typeof getThingAll>[1]
): AccessControl[] {
  const acr = getAcr(withAccessControlResource);
  const foundThings = getThingAll(acr, options);

  return foundThings.filter((foundThing) =>
    getIriAll(foundThing, rdf.type).includes(acp.AccessControl)
  );
}
/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Insert an [[AccessControl]] into the [[AccessControlResource]] of a Resource, replacing previous
 * instances of that Access Control.
 *
 * @param withAccessControlResource A Resource with the Access Control Resource into which to insert an Access Control.
 * @param accessControl The Access Control to insert into the Access Control Resource.
 * @returns The given Resource with a new Access Control Resource equal to the original Access Control Resource, but with the given Access Control.
 */
export function setAccessControl<ResourceExt extends WithAccessibleAcr>(
  withAccessControlResource: ResourceExt,
  accessControl: AccessControl
): ResourceExt {
  const acr = getAcr(withAccessControlResource);
  const updatedAcr = setThing(acr, accessControl);
  const updatedResource = setAcr(withAccessControlResource, updatedAcr);
  return updatedResource;
}
/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Remove an [[AccessControl]] from the [[AccessControlResource]] of a Resource.
 *
 * @param withAccessControlResource A Resource with the Access Control Resource from which to remove an Access Control.
 * @param accessControl The Access Control to remove from the given Access Control Resource.
 * @returns The given Resource with a new Access Control Resource equal to the original Access Control Resource, excluding the given Access Control.
 */
export function removeAccessControl<ResourceExt extends WithAccessibleAcr>(
  withAccessControlResource: ResourceExt,
  accessControl: AccessControl
): ResourceExt {
  const acr = getAcr(withAccessControlResource);
  const updatedAcr = removeThing(acr, accessControl);
  const updatedResource = setAcr(withAccessControlResource, updatedAcr);
  return updatedResource;
}

function getAcr(resource: WithAccessibleAcr): AccessControlResource {
  if (!hasAccessibleAcr(resource)) {
    throw new Error(
      `Cannot work with Access Controls on a Resource (${getSourceUrl(
        resource
      )}) that does not have an Access Control Resource.`
    );
  }
  return resource.internal_acp.acr;
}

function setAcr<ResourceExt extends WithAcp>(
  resource: ResourceExt,
  acr: AccessControlResource
): ResourceExt & WithAccessibleAcr {
  return Object.assign(internal_cloneResource(resource), {
    internal_acp: {
      ...resource.internal_acp,
      acr: acr,
    },
  });
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Add an Access Policy to an Access Control Resource such that that Policy applies to the Access
 * Control Resource itself, rather than the Resource it governs.
 *
 * @param resourceWithAcr The Access Control to which the ACR Policy should be added.
 * @param policyUrl URL of the Policy that should apply to the given Access Control Resource.
 * @returns A new Access Control equal to the given Access Control, but with the given ACR Policy added to it.
 */
export function addAcrPolicyUrl<ResourceExt extends WithAccessibleAcr>(
  resourceWithAcr: ResourceExt,
  policyUrl: Url | UrlString | ThingPersisted
): ResourceExt {
  const acr = getAcr(resourceWithAcr);
  const acrUrl = getSourceUrl(acr);

  let acrThing = getThing(acr, acrUrl) ?? createThing({ url: acrUrl });
  acrThing = addIri(acrThing, acp.access, policyUrl);
  const updatedAcr = setThing(acr, acrThing);

  const updatedResource = setAcr(resourceWithAcr, updatedAcr);
  return updatedResource;
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Get the URLs of the Access Policies that apply to an Access Control Resource itself, rather than
 * to the Resource it governs.
 *
 * @param resourceWithAcr The Resource with the Access Control Resource of which to get the URLs of the Policies that govern access to it.
 * @returns URLs of the Policies that govern access to the given Access Control Resource.
 */
export function getAcrPolicyUrlAll<ResourceExt extends WithAccessibleAcr>(
  resourceWithAcr: ResourceExt
): UrlString[] {
  const acr = getAcr(resourceWithAcr);
  const acrUrl = getSourceUrl(acr);

  const acrThing = getThing(acr, acrUrl);
  if (acrThing === null) {
    return [];
  }
  return getIriAll(acrThing, acp.access);
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Stop the URL of a given Access Policy from applying to an Access Control Resource itself.
 *
 * @param resourceWithAcr The Resource with the Access Control Resource to which the given URL of a Policy should no longer apply.
 * @param policyUrl The URL of the Policy that should no longer apply.
 * @returns A new Access Control equal to the given Access Control, but with the given ACR Policy removed from it.
 */
export function removeAcrPolicyUrl<ResourceExt extends WithAccessibleAcr>(
  resourceWithAcr: ResourceExt,
  policyUrl: Url | UrlString | ThingPersisted
): ResourceExt {
  const acr = getAcr(resourceWithAcr);
  const acrUrl = getSourceUrl(acr);

  const acrThing = getThing(acr, acrUrl);
  if (acrThing === null) {
    return resourceWithAcr;
  }
  const updatedAcrThing = removeIri(acrThing, acp.access, policyUrl);
  const updatedAcr = setThing(acr, updatedAcrThing);

  return setAcr(resourceWithAcr, updatedAcr);
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Stop all URL of Access Policies from applying to an Access Control Resource itself.
 *
 * @param resourceWithAcr The Resource with the Access Control Resource to which no more Policies should apply.
 * @returns A new Access Control equal to the given Access Control, but without any Policy applying to it.
 */
export function removeAcrPolicyUrlAll<ResourceExt extends WithAccessibleAcr>(
  resourceWithAcr: ResourceExt
): ResourceExt {
  const acr = getAcr(resourceWithAcr);
  const acrUrl = getSourceUrl(acr);

  const acrThing = getThing(acr, acrUrl);
  if (acrThing === null) {
    return resourceWithAcr;
  }
  const updatedAcrThing = removeAll(acrThing, acp.access);
  const updatedAcr = setThing(acr, updatedAcrThing);

  return setAcr(resourceWithAcr, updatedAcr);
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
