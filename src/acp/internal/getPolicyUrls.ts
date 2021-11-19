/**
 * Copyright 2021 Inrupt Inc.
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

import type { WithAccessibleAcr } from "../acp";
import { ACP } from "../constants";
import { getIriAll } from "../../thing/get";
import { getThing } from "../../thing/thing";
import { getAccessControlResource } from "./getAccessControlResource";

/** @hidden */
type PolicyType = typeof ACP.apply | typeof ACP.access;

/** @hidden */
export function getPolicyUrls(
  resource: WithAccessibleAcr,
  accessControlUrls: UrlString[],
  type: PolicyType
): string[] {
  const acr = getAccessControlResource(resource);

  return [
    ...new Set(
      accessControlUrls
        .map((accessControlUrl) => {
          const accessControlThing = getThing(acr, accessControlUrl);
          if (accessControlThing !== null) {
            return getIriAll(accessControlThing, type);
          }
          return [];
        })
        .reduce(
          (previousValue, currentValue) => previousValue.concat(currentValue),
          []
        )
    ),
  ];
}
