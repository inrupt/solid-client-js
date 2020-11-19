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

import { getSourceUrl } from "../resource/resource";
import { internal_cloneResource } from "../resource/resource.internal";
import { hasAccessibleAcr, WithAccessibleAcr, WithAcp } from "./acp";
import { AccessControlResource } from "./control";

/** @hidden */
export function internal_getAcr(
  resource: WithAccessibleAcr
): AccessControlResource {
  if (!hasAccessibleAcr(resource)) {
    throw new Error(
      `Cannot work with Access Controls on a Resource (${getSourceUrl(
        resource
      )}) that does not have an Access Control Resource.`
    );
  }
  return resource.internal_acp.acr;
}

/** @hidden */
export function internal_setAcr<ResourceExt extends WithAcp>(
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
