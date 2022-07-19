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

import { acp } from "../constants";
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
import {
  createThing,
  getThing,
  getThingAll,
  removeThing,
  setThing,
} from "../thing/thing";
import { WithAccessibleAcr } from "./acp";
import {
  internal_addMemberPolicyUrl,
  internal_addPolicyUrl,
  internal_getAcr,
  internal_getControlAll,
  internal_getInitialisedControl,
  internal_getMemberPolicyUrlAll,
  internal_getPolicyUrlAll,
  internal_removeMemberPolicyUrl,
  internal_removeMemberPolicyUrlAll,
  internal_removePolicyUrl,
  internal_removePolicyUrlAll,
  internal_setAcr,
  internal_setControl,
} from "./control.internal";

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
 * @since 1.6.0
 */
export function hasLinkedAcr<Resource extends WithServerResourceInfo>(
  resource: Resource
): resource is WithLinkedAcr<Resource> {
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
 * @since 1.6.0
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
 * @since 1.6.0
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
 * @since 1.6.0
 */
export type WithLinkedAcr<
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
 * @param resourceWithAcr The Resource with an Access Control Resource to which the ACR Policy should be added.
 * @param policyUrl URL of the Policy that should apply to the given Access Control Resource.
 * @returns A Resource with a new Access Control Resource equal to the original ACR, but with the given ACR Policy added to it.
 * @since 1.6.0
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
 * Add a [[Policy]] to a Resource's Access Control Resource such that that
 * Policy applies to the Access Control Resources of child Resources.
 *
 * @param resourceWithAcr The Resource with an Access Control Resource to which the ACR Policy should be added.
 * @param policyUrl URL of the Policy that should apply to the given Access Control Resources of children of the Resource.
 * @returns A Resource with a new Access Control Resource equal to the original ACR, but with the given ACR Policy added to it.
 * @since 1.6.0
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
 * @since 1.6.0
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
 * @since 1.6.0
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
 * @returns A Resource with a new Access Control Resource equal to the original ACR, but with the given ACR Policy removed from it.
 * @since 1.6.0
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
 * @returns A Resource with a new Access Control Resource equal to the original ACR, but with the given member ACR Policy removed from it.
 * @since 1.6.0
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
 * @returns A Resource with a new Access Control Resource equal to the original ACR, but without any Policy applying to it.
 * @since 1.6.0
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
 * @returns A Resource with a new Access Control Resource equal to the original ACR, but without any Policy applying to its children's ACRs.
 * @since 1.6.0
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

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Add a [[Policy]] to an Access Control Resource such that that [[Policy]] applies to that Resource.
 *
 * @param resourceWithAcr The Resource to which the ACR Policy should be added.
 * @param policyUrl URL of the Policy that should apply to the given Resource.
 * @returns A Resource with a new Access Control Resource equal to the original ACR, but with the given Policy added to it.
 * @since 1.6.0
 */
export function addPolicyUrl<ResourceExt extends WithAccessibleAcr>(
  resourceWithAcr: ResourceExt,
  policyUrl: Url | UrlString
): ResourceExt {
  const control = internal_getInitialisedControl(resourceWithAcr);
  const updatedControl = internal_addPolicyUrl(control, policyUrl);
  const updatedResource = internal_setControl(resourceWithAcr, updatedControl);
  return updatedResource;
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Add a [[Policy]] to a Resource's Access Control Resource such that that
 * Policy applies to that Resource's children.
 *
 * @param resourceWithAcr The Resource to whose Access Control Resource the Policy should be added.
 * @param policyUrl URL of the Policy that should apply to the given Resource's children.
 * @returns A new Resource equal to the given Resource, but with the given Member Policy added to its Access Control Resource.
 * @since 1.6.0
 */
export function addMemberPolicyUrl<ResourceExt extends WithAccessibleAcr>(
  resourceWithAcr: ResourceExt,
  policyUrl: Url | UrlString
): ResourceExt {
  const control = internal_getInitialisedControl(resourceWithAcr);
  const updatedControl = internal_addMemberPolicyUrl(control, policyUrl);
  const updatedResource = internal_setControl(resourceWithAcr, updatedControl);
  return updatedResource;
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Get the URLs of the Access Policies that apply to a Resource.
 *
 * @param resourceWithAcr The Resource with the Access Control Resource of which to get the URLs of the Policies that govern access to it.
 * @returns URLs of the Policies that govern access to the given Resource.
 * @since 1.6.0
 */
export function getPolicyUrlAll<ResourceExt extends WithAccessibleAcr>(
  resourceWithAcr: ResourceExt
): UrlString[] {
  const controls = internal_getControlAll(resourceWithAcr);
  const policyUrlsByControl = controls.map((control) =>
    internal_getPolicyUrlAll(control)
  );
  const uniquePolicyUrls = new Set<UrlString>();
  policyUrlsByControl.forEach((policyUrls) => {
    policyUrls.forEach((url) => uniquePolicyUrls.add(url));
  });
  return Array.from(uniquePolicyUrls);
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Get the URLs of the Access Policies that apply to a Resource's children.
 *
 * @param resourceWithAcr The Resource with the Access Control Resource of which to get the URLs of the Policies that govern access to its children.
 * @returns URLs of the Policies that govern access to the given Resource's children.
 * @since 1.6.0
 */
export function getMemberPolicyUrlAll<ResourceExt extends WithAccessibleAcr>(
  resourceWithAcr: ResourceExt
): UrlString[] {
  const controls = internal_getControlAll(resourceWithAcr);
  const memberPolicyUrlsByControl = controls.map((control) =>
    internal_getMemberPolicyUrlAll(control)
  );
  const uniquePolicyUrls = new Set<UrlString>();
  memberPolicyUrlsByControl.forEach((policyUrls) => {
    policyUrls.forEach((url) => uniquePolicyUrls.add(url));
  });
  return Array.from(uniquePolicyUrls);
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Stop the URL of a given [[Policy]] from applying to a Resource.
 *
 * @param resourceWithAcr The Resource, with its Access Control Resource, to which the given URL of a Policy should no longer apply.
 * @param policyUrl The URL of the Policy that should no longer apply.
 * @returns A Resource with a new Access Control Resource equal to the original ACR, but with the given Policy removed from it.
 * @since 1.6.0
 */
export function removePolicyUrl<ResourceExt extends WithAccessibleAcr>(
  resourceWithAcr: ResourceExt,
  policyUrl: Url | UrlString | ThingPersisted
): ResourceExt {
  const controls = internal_getControlAll(resourceWithAcr);
  const updatedControls = controls.map((control) =>
    internal_removePolicyUrl(control, policyUrl)
  );
  const updatedResource = updatedControls.reduce(
    internal_setControl,
    resourceWithAcr
  );
  return updatedResource;
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Stop the URL of a given [[Policy]] from applying to the Resource's children.
 *
 * @param resourceWithAcr The Resource with the Access Control Resource to whose children the given URL of a Policy should no longer apply.
 * @param policyUrl The URL of the Policy that should no longer apply.
 * @returns A Resource with a new Access Control Resource equal to the original ACR, but with the given Member Policy removed from it.
 * @since 1.6.0
 */
export function removeMemberPolicyUrl<ResourceExt extends WithAccessibleAcr>(
  resourceWithAcr: ResourceExt,
  policyUrl: Url | UrlString | ThingPersisted
): ResourceExt {
  const controls = internal_getControlAll(resourceWithAcr);
  const updatedControls = controls.map((control) =>
    internal_removeMemberPolicyUrl(control, policyUrl)
  );
  const updatedResource = updatedControls.reduce(
    internal_setControl,
    resourceWithAcr
  );
  return updatedResource;
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Stop all URL of Access Policies from applying to a Resource.
 *
 * @param resourceWithAcr The Resource, with its Access Control Resource, to which no more Policies should apply.
 * @returns A Resource with a new Access Control Resource equal to the original ACR, but without any Policy applying to the Resource.
 * @since 1.6.0
 */
export function removePolicyUrlAll<ResourceExt extends WithAccessibleAcr>(
  resourceWithAcr: ResourceExt
): ResourceExt {
  const controls = internal_getControlAll(resourceWithAcr);
  const updatedControls = controls.map((control) =>
    internal_removePolicyUrlAll(control)
  );
  const updatedResource = updatedControls.reduce(
    internal_setControl,
    resourceWithAcr
  );
  return updatedResource;
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Stop all URL of Access Policies from applying to the Resource's children.
 *
 * @param resourceWithAcr The Resource with the Access Control Resource that should no longer apply Policies to its children.
 * @returns A Resource with a new Access Control Resource equal to the original ACR, but without any Policy applying to the Resource's children.
 * @since 1.6.0
 */
export function removeMemberPolicyUrlAll<ResourceExt extends WithAccessibleAcr>(
  resourceWithAcr: ResourceExt
): ResourceExt {
  const controls = internal_getControlAll(resourceWithAcr);
  const updatedControls = controls.map((control) =>
    internal_removeMemberPolicyUrlAll(control)
  );
  const updatedResource = updatedControls.reduce(
    internal_setControl,
    resourceWithAcr
  );
  return updatedResource;
}

/**
 * Gets a human-readable representation of the given [[Control]] to aid debugging.
 *
 * Note that changes to the exact format of the return value are not considered a breaking change;
 * it is intended to aid in debugging, not as a serialisation method that can be reliably parsed.
 *
 * @param resourceWithAcr The Resource with an attached Access Control Resource of which you want to get a human-readable representation.
 * @since 1.6.0
 * @deprecated
 */
export function acrAsMarkdown(
  resourceWithAcr: WithResourceInfo & WithAccessibleAcr
): string {
  let markdown = `# Access controls for ${getSourceUrl(resourceWithAcr)}\n`;

  const policyUrls = getPolicyUrlAll(resourceWithAcr);
  const memberPolicyUrls = getMemberPolicyUrlAll(resourceWithAcr);
  const acrPolicyUrls = getAcrPolicyUrlAll(resourceWithAcr);
  const memberAcrPolicyUrls = getMemberAcrPolicyUrlAll(resourceWithAcr);

  if (
    policyUrls.length === 0 &&
    memberPolicyUrls.length === 0 &&
    acrPolicyUrls.length === 0 &&
    memberAcrPolicyUrls.length === 0
  ) {
    markdown += "\n<no policies specified yet>\n";
  }
  if (policyUrls.length > 0) {
    markdown += "\nThe following policies apply to this resource:\n- ";
    markdown += `${policyUrls.join("\n- ")}\n`;
  }
  if (acrPolicyUrls.length > 0) {
    markdown +=
      "\nThe following policies apply to the access control resource for this resource:\n- ";
    markdown += `${acrPolicyUrls.join("\n- ")}\n`;
  }
  if (memberPolicyUrls.length > 0) {
    markdown +=
      "\nThe following policies apply to the children of this resource:\n- ";
    markdown += `${memberPolicyUrls.join("\n- ")}\n`;
  }
  if (memberAcrPolicyUrls.length > 0) {
    markdown +=
      "\nThe following policies apply to the access control resources for children of this resource:\n- ";
    markdown += `${memberAcrPolicyUrls.join("\n- ")}\n`;
  }

  return markdown;
}
