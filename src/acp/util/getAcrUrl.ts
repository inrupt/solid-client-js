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

import type { UrlString, WithServerResourceInfo } from "../../interfaces";
import type { DefaultOptions } from "../type/DefaultOptions";
import { ACP } from "../constants";
import { getLinkedResourceUrlAll, getSourceUrl } from "../../resource/resource";
import { getAclServerResourceInfo } from "../../universal/getAclServerResourceInfo";
import { getAcrUrl as getAcrUrlLegacy } from "./getAcrUrl.legacy";

/**
 * Retrieve the URL of an Access Control Resource as per the ACP Draft
 * specification.
 *
 * @param resource The Resource for which to retrieve the URL of the Access
 * Control Resource if it is accessible.
 * @returns The URL of the ACR or null.
 */
export async function getAcrUrl(
  resource: WithServerResourceInfo,
  options?: DefaultOptions
): Promise<UrlString | null> {
  // TODO: Remove as soon as ESS 1.1 is phased out
  const legacyAcrUrl = getAcrUrlLegacy(resource);
  if (legacyAcrUrl !== null) {
    return legacyAcrUrl;
  }

  // The ACP Draft mandates a link rel="type" header identifies Access Control Resources
  const aclServerResourceInfo = await getAclServerResourceInfo(
    resource,
    options
  );

  if (aclServerResourceInfo === null) {
    return null;
  }

  const relTypeLinks = getLinkedResourceUrlAll(aclServerResourceInfo).type;
  if (
    Array.isArray(relTypeLinks) &&
    relTypeLinks.includes(ACP.AccessControlResource)
  ) {
    return getSourceUrl(aclServerResourceInfo);
  }

  return null;
}
