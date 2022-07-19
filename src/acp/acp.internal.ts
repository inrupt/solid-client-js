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
import { WithServerResourceInfo } from "../interfaces";
import { getLinkedResourceUrlAll } from "../resource/resource";

/**
 * @param linkedAccessResource A Resource exposed via the Link header of another Resource with rel="acl".
 * @returns Whether that Resource is an ACP ACR or not (in which case it's likely a WAC ACL).
 */
export function isAcr(linkedAccessResource: WithServerResourceInfo): boolean {
  const relTypeLinks = getLinkedResourceUrlAll(linkedAccessResource).type;
  return (
    Array.isArray(relTypeLinks) &&
    relTypeLinks.includes(acp.AccessControlResource)
  );
}
