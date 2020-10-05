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
  Url,
  UrlString,
  WithResourceInfo,
} from "../interfaces";
import { getIriAll } from "../thing/get";
import { setIri } from "../thing/set";
import {
  createThing,
  CreateThingOptions,
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
