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
import { getSourceUrl } from "../resource/resource";
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
import { WithAccessibleAcr } from "./acp";
import { internal_getAcr, internal_setAcr } from "./control.internal";

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
 * An Access Control Resource, containing [[Control]]s specifying which [[Policy]]'s
 * apply to the Resource this Access Control Resource is linked to.
 */
export type AccessControlResource = SolidDataset &
  WithResourceInfo & { accessTo: UrlString };

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * A Control, usually contained in an [[AccessControlResource]]. It describes which
 * [[Policy]]'s apply to a Resource.
 */
export type Control = Thing;

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
 * Add a [[Policy]] to an Access Control Resource such that that [[Policy]] applies to the Access
 * Control Resource itself, rather than the Resource it governs.
 *
 * @param resourceWithAcr The [[Control]] to which the ACR Policy should be added.
 * @param policyUrl URL of the Policy that should apply to the given Access Control Resource.
 * @returns A new [[Control]] equal to the given [[Control]], but with the given ACR Policy added to it.
 */
export function addAcrPolicyUrl<ResourceExt extends WithAccessibleAcr>(
  resourceWithAcr: ResourceExt,
  policyUrl: Url | UrlString | ThingPersisted
): ResourceExt {
  const acr = internal_getAcr(resourceWithAcr);
  const acrUrl = getSourceUrl(acr);

  let acrThing = getThing(acr, acrUrl) ?? createThing({ url: acrUrl });
  acrThing = addIri(acrThing, acp.access, policyUrl);
  const updatedAcr = setThing(acr, acrThing);

  const updatedResource = internal_setAcr(resourceWithAcr, updatedAcr);
  return updatedResource;
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Add a [[Policy]] to an Access Control Resource such that that [[Policy]] applies to the Access
 * Control Resources of child Resources.
 *
 * @param resourceWithAcr The [[Control]] to which the ACR Policy should be added.
 * @param policyUrl URL of the Policy that should apply to the given Access Control Resources of children of the Resource.
 * @returns A new [[Control]] equal to the given [[Control]], but with the given ACR Policy added to it.
 */
export function addMemberAcrPolicyUrl<ResourceExt extends WithAccessibleAcr>(
  resourceWithAcr: ResourceExt,
  policyUrl: Url | UrlString | ThingPersisted
): ResourceExt {
  const acr = internal_getAcr(resourceWithAcr);
  const acrUrl = getSourceUrl(acr);

  let acrThing = getThing(acr, acrUrl) ?? createThing({ url: acrUrl });
  acrThing = addIri(acrThing, acp.accessMembers, policyUrl);
  const updatedAcr = setThing(acr, acrThing);

  const updatedResource = internal_setAcr(resourceWithAcr, updatedAcr);
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
  const acr = internal_getAcr(resourceWithAcr);
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
 * Get the URLs of the Access Policies that apply to the Access Control Resources of the Resource's
 * children.
 *
 * @param resourceWithAcr The Resource with the Access Control Resource of which to get the URLs of the Policies that govern access to its children.
 * @returns URLs of the Policies that govern access to the Access Control Resources of the given Resource's children.
 */
export function getMemberAcrPolicyUrlAll<ResourceExt extends WithAccessibleAcr>(
  resourceWithAcr: ResourceExt
): UrlString[] {
  const acr = internal_getAcr(resourceWithAcr);
  const acrUrl = getSourceUrl(acr);

  const acrThing = getThing(acr, acrUrl);
  if (acrThing === null) {
    return [];
  }
  return getIriAll(acrThing, acp.accessMembers);
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Stop the URL of a given [[Policy]] from applying to an Access Control Resource itself.
 *
 * @param resourceWithAcr The Resource with the Access Control Resource to which the given URL of a Policy should no longer apply.
 * @param policyUrl The URL of the Policy that should no longer apply.
 * @returns A new [[Control]] equal to the given Access Control, but with the given ACR Policy removed from it.
 */
export function removeAcrPolicyUrl<ResourceExt extends WithAccessibleAcr>(
  resourceWithAcr: ResourceExt,
  policyUrl: Url | UrlString | ThingPersisted
): ResourceExt {
  const acr = internal_getAcr(resourceWithAcr);
  const acrUrl = getSourceUrl(acr);

  const acrThing = getThing(acr, acrUrl);
  if (acrThing === null) {
    return resourceWithAcr;
  }
  const updatedAcrThing = removeIri(acrThing, acp.access, policyUrl);
  const updatedAcr = setThing(acr, updatedAcrThing);

  return internal_setAcr(resourceWithAcr, updatedAcr);
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Stop the URL of a given [[Policy]] from applying to the Access Control Resources of the
 * Resource's children.
 *
 * @param resourceWithAcr The Resource with the Access Control Resource to whose children's ACRs the given URL of a Policy should no longer apply.
 * @param policyUrl The URL of the Policy that should no longer apply.
 * @returns A new Access Control equal to the given Access Control, but with the given Member ACR Policy removed from it.
 */
export function removeMemberAcrPolicyUrl<ResourceExt extends WithAccessibleAcr>(
  resourceWithAcr: ResourceExt,
  policyUrl: Url | UrlString | ThingPersisted
): ResourceExt {
  const acr = internal_getAcr(resourceWithAcr);
  const acrUrl = getSourceUrl(acr);

  const acrThing = getThing(acr, acrUrl);
  if (acrThing === null) {
    return resourceWithAcr;
  }
  const updatedAcrThing = removeIri(acrThing, acp.accessMembers, policyUrl);
  const updatedAcr = setThing(acr, updatedAcrThing);

  return internal_setAcr(resourceWithAcr, updatedAcr);
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Stop all URL of Access Policies from applying to an Access Control Resource itself.
 *
 * @param resourceWithAcr The Resource with the Access Control Resource to which no more Policies should apply.
 * @returns A new [[Control]] equal to the given [[Control]], but without any Policy applying to it.
 */
export function removeAcrPolicyUrlAll<ResourceExt extends WithAccessibleAcr>(
  resourceWithAcr: ResourceExt
): ResourceExt {
  const acr = internal_getAcr(resourceWithAcr);
  const acrUrl = getSourceUrl(acr);

  const acrThing = getThing(acr, acrUrl);
  if (acrThing === null) {
    return resourceWithAcr;
  }
  const updatedAcrThing = removeAll(acrThing, acp.access);
  const updatedAcr = setThing(acr, updatedAcrThing);

  return internal_setAcr(resourceWithAcr, updatedAcr);
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Stop all URL of Access Policies from applying to the Access Control Resources of the Resource's
 * children.
 *
 * @param resourceWithAcr The Resource with the Access Control Resource that should no longer apply Policies to its children's ACRs.
 * @returns A new [[Control]] equal to the given [[Control]], but without any Policy applying to its children's ACRs.
 */
export function removeMemberAcrPolicyUrlAll<
  ResourceExt extends WithAccessibleAcr
>(resourceWithAcr: ResourceExt): ResourceExt {
  const acr = internal_getAcr(resourceWithAcr);
  const acrUrl = getSourceUrl(acr);

  const acrThing = getThing(acr, acrUrl);
  if (acrThing === null) {
    return resourceWithAcr;
  }
  const updatedAcrThing = removeAll(acrThing, acp.accessMembers);
  const updatedAcr = setThing(acr, updatedAcrThing);

  return internal_setAcr(resourceWithAcr, updatedAcr);
}
