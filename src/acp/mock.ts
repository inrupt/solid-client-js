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

import { UrlString } from "../interfaces";
import { mockSolidDatasetFrom } from "../resource/mock";
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
 */
export function mockAcrFor(resourceUrl: UrlString): AccessControlResource {
  const acrUrl = new URL("access-control-resource", resourceUrl).href;
  const acr: AccessControlResource = Object.assign(
    mockSolidDatasetFrom(acrUrl),
    { accessTo: resourceUrl }
  );

  return acr;
}
