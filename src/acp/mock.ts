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

import { UrlString, WithResourceInfo } from "../interfaces";
import { mockSolidDatasetFrom } from "../resource/mock";
import { getSourceUrl } from "../resource/resource";
import { internal_cloneResource } from "../resource/resource.internal";
import { WithAccessibleAcr } from "./acp";
import { AccessControlResource } from "./control";

/**
 *
 * ```{warning}
 * Do not use this function in production code.  For use in **unit tests** that require a
 * [[AccessControlResource]].
 * ```
 *
 * Initialises a new empty Access Control Resource for a given Resource for use
 * in **unit tests**.
 *
 * @param resourceUrl The URL of the Resource to which the mocked ACR should apply.
 * @returns The mocked empty Access Control Resource for the given Resource.
 * @since 1.6.0
 */
export function mockAcrFor(resourceUrl: UrlString): AccessControlResource {
  const acrUrl = new URL("access-control-resource", resourceUrl).href;
  const acr: AccessControlResource = {
    ...mockSolidDatasetFrom(acrUrl),
    accessTo: resourceUrl,
  };

  return acr;
}

/**
 * ```{warning}
 * Do not use this function in production code.  For use in **unit tests** that require a
 * Resource with an [[AccessControlResource]].
 * ```
 *
 * Attaches an Access Control Resource to a given [[SolidDataset]] for use
 * in **unit tests**; e.g., unit tests that call [[getPolicyUrlAll]].
 *
 * @param resource The Resource to mock up with a new resource ACL.
 * @param accessControlResource The Access Control Resource to attach to the given Resource.
 * @returns The input Resource with an empty resource ACL attached.
 * @since 1.6.0
 */
export function addMockAcrTo<T extends WithResourceInfo>(
  resource: T,
  accessControlResource: AccessControlResource = mockAcrFor(
    getSourceUrl(resource)
  )
): T & WithAccessibleAcr {
  const resourceWithAcr: typeof resource & WithAccessibleAcr = Object.assign(
    internal_cloneResource(resource),
    {
      internal_acp: {
        acr: accessControlResource,
        aprs: {},
      },
    }
  );

  return resourceWithAcr;
}
