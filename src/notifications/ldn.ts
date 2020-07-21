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
  Url,
  Thing,
  WithResourceInfo,
  WebId,
  UrlString,
  internal_toIriString,
  ThingPersisted,
} from "../interfaces";
import { fetch } from "../fetcher";
import {
  internal_fetchResourceInfo,
  hasInboxUrl,
  getInboxUrl,
  isLitDataset,
} from "../resource/resource";
import {
  fetchLitDataset,
  saveLitDatasetInContainer,
  createLitDataset,
} from "../resource/litDataset";
import { getThingOne, createThing, setThing, toNode } from "../thing/thing";
import { getIriOne } from "../thing/get";
import { ldp, as, rdf } from "../constants";

/** @internal */
export const internal_defaultFetchOptions = {
  fetch: fetch,
};
import { addIri } from "../thing/add";
import { setIri } from "../thing/set";

/**
 * Perform partial inbox discovery (https://www.w3.org/TR/ldn/#discovery) by only checking
 * resource content. If the inbox is only advertised in the resource metadata, it won't be
 * discovered.
 *
 * @param resource The URL of the resource for which we are searching for the inbox
 * @param receiverUrl If the Inbox is specific to a Thing, the URL identifying that Thing.
 * @param dataset The dataset where the inbox may be found (typically fetched at the resource Url)
 */
export function unstable_discoverInbox(
  dataset: LitDataset,
  receiverUrl: Url | UrlString
): UrlString | null {
  const thingUrl = internal_toIriString(receiverUrl);
  const resourceThing = getThingOne(dataset, thingUrl);
  return getIriOne(resourceThing, ldp.inbox);
}

/**
 * Perform complete inbox discovery (https://www.w3.org/TR/ldn/#discovery) by checking both
 * resource metadata (i.e. Link headers) and resource content.
 *
 * @param resourceUrl The URL of the resource for which we are searching for the inbox
 * @param dataset The dataset where the inbox may be found (typically fetched at the resource Url)
 */
export async function unstable_fetchInbox(
  resourceUrl: Url | UrlString,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<UrlString | null> {
  const resourceIriString = internal_toIriString(resourceUrl);
  // First, try to get a Link header to the inbox:
  const resourceInfo = await internal_fetchResourceInfo(
    resourceIriString,
    options
  );
  if (hasInboxUrl({ resourceInfo: resourceInfo })) {
    return getInboxUrl({ resourceInfo: resourceInfo });
  }

  // If the Resource does not contain Linked Data, that was our only shot at finding an Inbox:
  if (!isLitDataset({ resourceInfo: resourceInfo })) {
    return null;
  }

  // If it *is* Linked Data, it might contain a reference to the Inbox in its body:
  const resourceContent = await fetchLitDataset(resourceIriString, options);
  return unstable_discoverInbox(resourceContent, resourceIriString);
}

/**
 * Initialises a Notification with recommended data set.
 *
 * The returned notification is a regular [[Thing]], and thus can be extended with any additional
 * data relevant to the notification.
 *
 * @param sender The URL identifying the sender of the resource (typically, a WebID).
 * @param type The type of notification, typically a type from https://www.w3.org/TR/activitystreams-vocabulary/#activity-types.
 */
export function unstable_buildNotification(
  sender: Url | WebId,
  type: Url | UrlString
): Thing {
  let notification = createThing();
  notification = addIri(notification, as.actor, sender);
  notification = addIri(notification, rdf.type, type);
  return notification;
}

/**
 * Send a notification to a given target inbox, without performing any discovery.
 *
 * Note that you will need to manually set a https://www.w3.org/ns/activitystreams#target.
 *
 * @param notification The [[Thing]] containing the notification data - see [[unstable_buildNotification]].
 * @param inbox URL of the target inbox.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns A Promise resolving to a [[LitDataset]] containing the stored data linked to the new notification Resource, or rejecting if saving it failed.
 */
export async function unstable_sendNotificationToInbox(
  notification: Thing,
  inbox: Url | UrlString,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<LitDataset & WithResourceInfo> {
  let litDataset = createLitDataset();
  litDataset = setThing(litDataset, notification);

  return saveLitDatasetInContainer(
    internal_toIriString(inbox),
    notification,
    options
  );
}

/**
 * Discovers the inbox of the provided target resource, and then sends the provided notification to that inbox.
 * Fails if no inbox is discovered.
 *
 * @param notification The content of the notification.
 * @param receiver The URL of the target resource.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns A Promise resolving to a [[Thing]] containing the stored data linked to the new notification Resource, or rejecting if saving it failed.
 */
export async function unstable_sendNotification(
  notification: Thing,
  receiver: Url | UrlString | ThingPersisted,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
) {
  // TODO: Change `fetchInbox` to take a `ThingPersisted` and just read the inbox from it directly:
  const receiverIri = internal_toIriString(toNode(receiver));
  const inbox = await unstable_fetchInbox(receiverIri, options);
  if (inbox === null) {
    throw new Error(`No inbox discovered for Resource [${receiverIri}]`);
  }

  const notificationWithTarget = setIri(notification, as.target, receiver);

  let litDataset = createLitDataset();
  litDataset = setThing(litDataset, notificationWithTarget);

  return unstable_sendNotificationToInbox(
    notificationWithTarget,
    inbox,
    options
  );
}
