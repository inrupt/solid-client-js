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

import type { SolidDataset, WithServerResourceInfo } from "../../interfaces";
import type { DefaultOptions } from "../type/DefaultOptions";
import type { WithAccessibleAcr } from "../acp";
import { getAcrUrl } from "./getAcrUrl";
import { getSolidDataset } from "../../resource/solidDataset";
import { getSourceUrl } from "../../resource/resource";

/**
 * Retrieve the Access Control Resource of a Resource as per the ACP Draft
 * specification.
 *
 * @param resource The Resource for which to retrieve the URL of the Access
 * Control Resource if it is accessible.
 * @param options Default Options such as a fetch function.
 * @returns The URL of the ACR or null.
 */
export async function getResourceAcr<T extends WithServerResourceInfo>(
  resource: T,
  options?: DefaultOptions
): Promise<(T & WithAccessibleAcr) | null> {
  const acrUrl = await getAcrUrl(resource, options);
  if (acrUrl === null) {
    return null;
  }

  let acr: SolidDataset & WithServerResourceInfo;
  try {
    acr = await getSolidDataset(acrUrl, options);
  } catch (e: unknown) {
    return null;
  }

  return {
    ...resource,
    internal_acp: {
      acr: {
        ...acr,
        accessTo: getSourceUrl(resource),
      },
    },
  };
}
