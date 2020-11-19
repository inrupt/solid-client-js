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

import { acl } from "../constants";
import { saveSolidDatasetAt } from "../resource/solidDataset";
import {
  WithResourceInfo,
  AclDataset,
  hasAccessibleAcl,
  WithAcl,
  WithAccessibleAcl,
  WithResourceAcl,
  WithFallbackAcl,
  WithServerResourceInfo,
} from "../interfaces";
import { setThing } from "../thing/thing";
import { dataset } from "../rdfjs";
import { removeAll } from "../thing/remove";
import { setIri } from "../thing/set";
import {
  getSourceUrl,
  internal_defaultFetchOptions,
} from "../resource/resource";
import { internal_cloneResource } from "../resource/resource.internal";
import {
  internal_getAclRules,
  internal_getDefaultAclRulesForResource,
} from "./acl.internal";

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Verify whether a given SolidDataset was fetched together with its Access Control List.
 *
 * @param dataset A [[SolidDataset]] that may have its ACLs attached.
 * @returns True if `dataset` was fetched together with its ACLs.
 */
export function hasAcl<T extends object>(dataset: T): dataset is T & WithAcl {
  const potentialAcl = dataset as T & WithAcl;
  return typeof potentialAcl.internal_acl === "object";
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Verifies whether the given Resource has a resource ACL (Access Control List) attached.
 *
 * The [[hasResourceAcl]] function checks that:
 * - a given Resource has a resource ACL attached, and
 * - the user calling [[hasResourceAcl]] has Control access to the Resource.
 *
 * To retrieve a Resource with its ACLs, see [[getSolidDatasetWithAcl]].
 *
 * @param resource A Resource that might have an ACL attached.
 * @returns `true` if the Resource has a resource ACL attached that is accessible by the user.
 */
export function hasResourceAcl<
  Resource extends WithAcl & WithServerResourceInfo
>(
  resource: Resource
): resource is Resource & WithResourceAcl & WithAccessibleAcl {
  return (
    resource.internal_acl.resourceAcl !== null &&
    getSourceUrl(resource) ===
      resource.internal_acl.resourceAcl.internal_accessTo &&
    resource.internal_resourceInfo.aclUrl ===
      getSourceUrl(resource.internal_acl.resourceAcl)
  );
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 * Returns the resource ACL (Access Control List) attached to a Resource.
 *
 * If the Resource has its resource ACL attached and is accessible by the user
 * (see [[hasResourceAcl]]), the function returns the resource ACL.
 * If the Resource does not have a resource ACL attached or is inaccessible by the user,
 * the function returns `null`.
 *
 * @param resource A Resource with potentially an ACL attached.
 * @returns The resource ACL if available and `null` if not.
 */
export function getResourceAcl(
  resource: WithAcl & WithServerResourceInfo & WithResourceAcl
): AclDataset;
export function getResourceAcl(
  resource: WithAcl & WithServerResourceInfo
): AclDataset | null;
export function getResourceAcl(
  resource: WithAcl & WithServerResourceInfo
): AclDataset | null {
  if (!hasResourceAcl(resource)) {
    return null;
  }
  return resource.internal_acl.resourceAcl;
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Verifies whether the given Resource has a fallback ACL (Access Control List) attached.
 *
 * A fallback ACL for a Resource is inherited from the Resource's parent Container
 * (or another of its ancestor Containers) and applies if the Resource does
 * not have its own resource ACL.
 *
 * The [[hasFallbackAcl]] function checks that:
 * - a given Resource has a fallback ACL attached, and
 * - the user calling [[hasFallbackAcl]] has Control access to the Container
 * from which the Resource inherits its ACL.
 *
 * To retrieve a Resource with its ACLs, see [[getSolidDatasetWithAcl]].
 *
 * @param resource A [[SolidDataset]] that might have a fallback ACL attached.
 *
 * @returns `true` if the Resource has a fallback ACL attached that is accessible to the user.
 */
export function hasFallbackAcl<Resource extends WithAcl>(
  resource: Resource
): resource is Resource & WithFallbackAcl {
  return resource.internal_acl.fallbackAcl !== null;
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Returns the fallback ACL (Access Control List) attached to a Resource.
 *
 * If the Resource has a fallback ACL attached and is accessible by the user
 * (see [[hasFallbackAcl]]), the function returns the fallback ACL.
 * If the Resource does not hava a fallback ACL attached or is inaccessible by the user,
 * the function returns `null`.
 *
 * @param resource A Resource with potentially a fallback ACL attached.
 * @returns The fallback ACL if available or `null` if not.
 */
export function getFallbackAcl(resource: WithFallbackAcl): AclDataset;
export function getFallbackAcl(dataset: WithAcl): AclDataset | null;
export function getFallbackAcl(dataset: WithAcl): AclDataset | null {
  if (!hasFallbackAcl(dataset)) {
    return null;
  }
  return dataset.internal_acl.fallbackAcl;
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Creates an empty resource ACL (Access Control List) for a given Resource.
 *
 * @param targetResource A Resource that does not have its own ACL yet (see [[hasResourceAcl]]).
 * @returns An empty resource ACL for the given Resource.
 */
export function createAcl(
  targetResource: WithResourceInfo & WithAccessibleAcl
): AclDataset {
  const emptyResourceAcl: AclDataset = Object.assign(dataset(), {
    internal_accessTo: getSourceUrl(targetResource),
    internal_resourceInfo: {
      sourceIri: targetResource.internal_resourceInfo.aclUrl,
      isRawData: false,
      linkedResources: {},
    },
  });

  return emptyResourceAcl;
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Creates a resource ACL (Access Control List), initialised from the fallback ACL
 * inherited from the given Resource's Container (or another of its ancestor Containers).
 * That is, the new ACL has the same rules/entries as the fallback ACL that currently
 * applies to the Resource.
 *
 * @param resource A Resource without its own resource ACL (see [[hasResourceAcl]]) but with an accessible fallback ACL (see [[hasFallbackAcl]]).
 * @returns A resource ACL initialised with the rules/entries from the Resource's fallback ACL.
 */
export function createAclFromFallbackAcl(
  resource: WithFallbackAcl & WithResourceInfo & WithAccessibleAcl
): AclDataset {
  const emptyResourceAcl: AclDataset = createAcl(resource);

  const fallbackAclRules = internal_getAclRules(
    resource.internal_acl.fallbackAcl
  );
  const defaultAclRules = internal_getDefaultAclRulesForResource(
    fallbackAclRules,
    resource.internal_acl.fallbackAcl.internal_accessTo
  );
  const newAclRules = defaultAclRules.map((rule) => {
    rule = removeAll(rule, acl.default);
    rule = removeAll(rule, acl.defaultForNew);
    rule = setIri(rule, acl.accessTo, getSourceUrl(resource));
    rule = setIri(rule, acl.default, getSourceUrl(resource));
    return rule;
  });

  // Iterate over every ACL Rule we want to import, inserting them into `emptyResourceAcl` one by one:
  const initialisedResourceAcl = newAclRules.reduce(setThing, emptyResourceAcl);

  return initialisedResourceAcl;
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Saves the resource ACL for a Resource.
 *
 * @param resource The Resource to which the given resource ACL applies.
 * @param resourceAcl An [[AclDataset]] whose ACL Rules will apply to `resource`.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 */
export async function saveAclFor(
  resource: WithAccessibleAcl,
  resourceAcl: AclDataset,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<AclDataset & WithResourceInfo> {
  if (!hasAccessibleAcl(resource)) {
    throw new Error(
      `Could not determine the location of the ACL for the Resource at \`${getSourceUrl(
        resource
      )}\`; possibly the current user does not have Control access to that Resource. Try calling \`hasAccessibleAcl()\` before calling \`saveAclFor()\`.`
    );
  }
  const savedDataset = await saveSolidDatasetAt(
    resource.internal_resourceInfo.aclUrl,
    resourceAcl,
    options
  );
  const savedAclDataset: AclDataset & typeof savedDataset = Object.assign(
    savedDataset,
    {
      internal_accessTo: getSourceUrl(resource),
    }
  );

  return savedAclDataset;
}

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Removes the resource ACL (Access Control List) from a Resource.
 *
 * Once the resource ACL is removed from the Resource, the Resource relies on the
 * fallback ACL inherited from the Resource's parent Container (or another of its ancestor Containers).
 *
 * @param resource The Resource for which you want to delete the ACL.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 */
export async function deleteAclFor<
  Resource extends WithResourceInfo & WithAccessibleAcl
>(
  resource: Resource,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<Resource & { acl: { resourceAcl: null } }> {
  const config = {
    ...internal_defaultFetchOptions,
    ...options,
  };

  const response = await config.fetch(resource.internal_resourceInfo.aclUrl, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(
      `Deleting the ACL of the Resource at \`${getSourceUrl(
        resource
      )}\` failed: \`${response.status}\` \`${response.statusText}\`.`
    );
  }

  const storedResource = Object.assign(internal_cloneResource(resource), {
    acl: {
      resourceAcl: null,
    },
  });

  return storedResource;
}
