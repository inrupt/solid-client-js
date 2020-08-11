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

import {
  WithResourceInfo,
  WithResourceAcl,
  WithAcl,
  WithAccessibleAcl,
  WithFallbackAcl,
  UrlString,
} from "../interfaces";
import { getSourceIri } from "../resource/resource";
import { createAcl, internal_getContainerPath } from "./acl";
import { mockContainerFrom } from "../resource/mock";

/**
 * Function for use in unit tests to mock a [[SolidDataset]] that has its own ACL attached.
 *
 * Warning: do not use this function in actual production code.
 * This function initialises a new empty ACL and attaches it to a given [[SolidDataset].
 * This is useful to mock a SolidDataset with an ACL in tests of code that call e.g.
 * [[getResourceAcl]].
 *
 * @param resource The Resource that we should pretend has its own ACL.
 * @returns The input Resource, with an empty Resource ACL attached.
 * @since Not released yet.
 */
export function addMockResourceAclTo<T extends WithResourceInfo>(
  resource: T
): T & WithResourceAcl {
  const aclUrl =
    resource.internal_resourceInfo.aclUrl ?? "https://your.pod/mock-acl.ttl";
  const resourceWithAclUrl: typeof resource & WithAccessibleAcl = Object.assign(
    resource,
    {
      internal_resourceInfo: {
        ...resource.internal_resourceInfo,
        aclUrl: aclUrl,
      },
    }
  );
  const aclDataset = createAcl(resourceWithAclUrl);

  const resourceWithResourceAcl: typeof resourceWithAclUrl &
    WithResourceAcl = Object.assign(resourceWithAclUrl, {
    internal_acl: {
      resourceAcl: aclDataset,
      fallbackAcl:
        ((resourceWithAclUrl as unknown) as WithAcl).internal_acl
          ?.fallbackAcl ?? null,
    },
  });

  return resourceWithResourceAcl;
}

/**
 * Function for use in unit tests to mock a [[SolidDataset]] that has one of its Container's ACL attached.
 *
 * Warning: do not use this function in actual production code.
 * This function initialises a new empty ACL and attaches it to a given [[SolidDataset] as its
 * fallback ACL.
 * This is useful to mock a SolidDataset with an ACL in tests of code that call e.g.
 * [[getFallbackAcl]].
 *
 * @param resource The Resource that we should pretend has one of its Container's ACL attached.
 * @returns The input Resource, with an empty Fallback ACL attached.
 * @since Not released yet.
 */
export function addMockFallbackAclTo<T extends WithResourceInfo>(
  resource: T
): T & WithFallbackAcl {
  const containerUrl = internal_getContainerPath(getSourceIri(resource));
  const aclUrl = containerUrl + ".acl";
  const mockContainer = setMockAclUrl(mockContainerFrom(containerUrl), aclUrl);
  const aclDataset = createAcl(mockContainer);

  const resourceWithFallbackAcl: typeof resource &
    WithFallbackAcl = Object.assign(resource, {
    internal_acl: {
      resourceAcl:
        ((resource as unknown) as WithAcl).internal_acl?.resourceAcl ?? null,
      fallbackAcl: aclDataset,
    },
  });

  return resourceWithFallbackAcl;
}

function setMockAclUrl<T extends WithResourceInfo>(
  resource: T,
  aclUrl: UrlString
): T & WithAccessibleAcl {
  const resourceWithAclUrl: typeof resource & WithAccessibleAcl = Object.assign(
    resource,
    {
      internal_resourceInfo: {
        ...resource.internal_resourceInfo,
        aclUrl: aclUrl,
      },
    }
  );

  return resourceWithAclUrl;
}
