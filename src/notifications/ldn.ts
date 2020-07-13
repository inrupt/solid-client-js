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
  LitDataset,
  Iri,
  Thing,
  IriString,
  WithResourceInfo,
} from "../interfaces";
import { dataset, DataFactory } from "../rdfjs";
import { fetch } from "../fetcher";
import {
  internal_fetchResourceInfo,
  hasInboxInfo,
  getInboxInfo,
  internal_toString
} from "../resource";
import { 
  fetchLitDataset, 
  saveLitDatasetInContainer 
} from "../litDataset";
import { getThingOne } from "../thing";
import { getIriOne } from "../thing/get";
import { ldp } from "../constants";
import { triplesToTurtle } from "../formats/turtle";

/** @internal */
export const internal_defaultFetchOptions = {
  fetch: fetch,
};

/**
 * Perform partial inbox discovery (https://www.w3.org/TR/ldn/#discovery) by only checking
 * resource content. If the inbox is only advertised in the resource metadata, it won't be
 * discovered.
 *
 * @param resource The IRI of the resource for which we are searching for the inbox
 * @param dataset The dataset where the inbox may be found (typically fetched at the resource IRI)
 */
export function unstable_discoverInbox(
  resource: Iri | IriString,
  dataset: LitDataset
): string | null {
  const inbox = getIriOne(getThingOne(dataset, resource), ldp.inbox);
  return inbox;
}

/**
 * Perform complete inbox discovery (https://www.w3.org/TR/ldn/#discovery) by checking both
 * resource metedata (i.e. Link headers) and resource content.
 *
 * @param resource The IRI of the resource for which we are searching for the inbox
 * @param dataset The dataset where the inbox may be found (typically fetched at the resource IRI)
 */
export async function unstable_fetchInbox(
  resource: Iri | IriString,
  options?: {
    fetch: typeof fetch;
  }
): Promise<string | null> {
  const resourceIri = typeof resource === "string" ? resource : resource.value;
  // First, try to get a Link header to the inbox
  const resourceInfo = await internal_fetchResourceInfo(resourceIri, options);
  if (hasInboxInfo({ resourceInfo: resourceInfo })) {
    return getInboxInfo({ resourceInfo: resourceInfo });
  }
  // If no Link header is defined, look up the resource content
  const resourceContent = await fetchLitDataset(resourceIri, options);
  return unstable_discoverInbox(resource, resourceContent);
}

export function unstable_buildNotification(
  sender: Iri | IriString,
  target: Iri | IriString,
  type: Iri | IriString,
  options?: {
    body: LitDataset;
  }
): LitDataset {
  // NOTE: Unimplemented
  return dataset();
}

/**
 * Send a notification to a given target inbox, without performing any discovery.
 *
 * @param notification The [[LitDataset]] containing the notification data.
 * @param inbox URL of the target inbox.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns A Promise resolving to a [[LitDataset]] containing the stored data linked to the new notification Resource, or rejecting if saving it failed.
 */
export async function unstable_sendNotificationToInbox(
  notification: LitDataset,
  inbox: Iri | IriString,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<LitDataset & WithResourceInfo> {
  return saveLitDatasetInContainer(
    internal_toString(inbox),
    notification,
    options
  );
}

export async function unstable_sendNotification(
  notification: LitDataset,
  receiver: Iri | IriString,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
) {
  // NOTE: Unimplemented
  void 0;
}
