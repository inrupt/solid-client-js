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

import { WithServerResourceInfo } from "../interfaces";
import { getSourceIri } from "../resource/resource";
import { internal_cloneResource } from "../resource/resource.internal";
import {
  createAcl,
  WithAccessibleAcl,
  WithFallbackAcl,
  WithResourceAcl,
} from "./acl";
import { internal_getContainerPath, internal_setAcl } from "./acl.internal";
import { mockContainerFrom } from "../resource/mock";
import { setMockAclUrl } from "./mock.internal";

/**
 * ```{warning}
 * Do not use this function in production code. For use in **unit tests** that
 * require a [[SolidDataset]] with a resource ACL (Access Control List).
 * ```
 *
 * Initialises a new empty ACL and attaches it to a given [[SolidDataset]] for use
 * in **unit tests**; e.g., unit tests that call [[getResourceAcl]].
 *
 * @param resource The Resource to mock up with a new resource ACL.
 * @returns The input Resource with an empty resource ACL attached.
 * @since 0.2.0
 */
export function addMockResourceAclTo<T extends WithServerResourceInfo>(
  resource: T
): T & WithResourceAcl {
  const aclUrl =
    resource.internal_resourceInfo.aclUrl ?? "https://your.pod/mock-acl.ttl";
  const resourceWithAclUrl: typeof resource & WithAccessibleAcl = Object.assign(
    internal_cloneResource(resource),
    {
      internal_resourceInfo: {
        ...resource.internal_resourceInfo,
        aclUrl,
      },
    }
  );
  const aclDataset = createAcl(resourceWithAclUrl);

  const resourceWithResourceAcl = internal_setAcl(resourceWithAclUrl, {
    resourceAcl: aclDataset,
    fallbackAcl: null,
  });

  return resourceWithResourceAcl;
}

/**
 *
 * ```{warning}
 * Do not use this function in production code.  For use in **unit tests** that require a
 * [[SolidDataset]] with a fallback ACL (Access Control List).
 * ```
 *
 * Initialises a new empty fallback ACL and attaches it to a given [[SolidDataset]] for use
 * in **unit tests**; e.g., unit tests that call [[getFallbackAcl]].
 *
 * @param resource The Resource to mock up with new fallback ACL.
 * @returns The input Resource with an empty fallback ACL attached.
 * @since 0.2.0
 */
export function addMockFallbackAclTo<T extends WithServerResourceInfo>(
  resource: T
): T & WithFallbackAcl {
  const containerUrl = internal_getContainerPath(getSourceIri(resource));
  const aclUrl = `${containerUrl}.acl`;
  const mockContainer = setMockAclUrl(mockContainerFrom(containerUrl), aclUrl);
  const aclDataset = createAcl(mockContainer);

  const resourceWithFallbackAcl = internal_setAcl(
    internal_cloneResource(resource),
    {
      resourceAcl: null,
      fallbackAcl: aclDataset,
    }
  );

  return resourceWithFallbackAcl;
}
