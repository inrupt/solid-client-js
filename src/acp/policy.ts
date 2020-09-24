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
  internal_toIriString,
  SolidDataset,
  Thing,
  Url,
  UrlString,
} from "../interfaces";
import { internal_defaultFetchOptions } from "../resource/resource";
import { saveSolidDatasetAt } from "../resource/solidDataset";
import { setUrl } from "../thing/set";
import { createThing, getThing, setThing } from "../thing/thing";

export type PolicyDataset = SolidDataset;
export type AccessPolicy = Thing;

/**
 * ```{note} There is no Access Control Policies specification yet. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Mark a given [[SolidDataset]] as containing [[AccessPolicy]]'s, and save it to the given URL.
 *
 * @param url URL to save this Access Policy SolidDataset at.
 * @param dataset The SolidDataset containing Access Policies to save.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 */
export async function savePolicyDatasetAt(
  url: Url | UrlString,
  dataset: PolicyDataset,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): ReturnType<typeof saveSolidDatasetAt> {
  url = internal_toIriString(url);
  let datasetThing = getThing(dataset, url) ?? createThing({ url: url });
  datasetThing = setUrl(datasetThing, rdf.type, acp.AccessPolicyResource);
  dataset = setThing(dataset, datasetThing);

  return saveSolidDatasetAt(url, dataset, options);
}
