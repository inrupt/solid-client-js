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
  LocalNode,
  UrlString,
} from "../interfaces";
import { fetch } from "../fetcher";
import {
  internal_fetchResourceInfo,
  hasInboxUrl,
  getInboxUrl,
  internal_toString,
} from "../resource";
import {
  fetchLitDataset,
  saveLitDatasetInContainer,
  createLitDataset,
} from "../litDataset";
import { getThingOne, createThing, isThingLocal, setThing } from "../thing";
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
 * @param dataset The dataset where the inbox may be found (typically fetched at the resource Url)
 */
export function unstable_discoverInbox(
  resource: Url | UrlString,
  dataset: LitDataset
): UrlString | null {
  const inbox = getIriOne(getThingOne(dataset, resource), ldp.inbox);
  return inbox;
}

/**
 * Perform complete inbox discovery (https://www.w3.org/TR/ldn/#discovery) by checking both
 * resource metadata (i.e. Link headers) and resource content.
 *
 * @param resource The URL of the resource for which we are searching for the inbox
 * @param dataset The dataset where the inbox may be found (typically fetched at the resource Url)
 */
export async function unstable_fetchInbox(
  resource: Url | UrlString,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<UrlString | null> {
  const resourceIri = typeof resource === "string" ? resource : resource.value;
  // First, try to get a Link header to the inbox
  const resourceInfo = await internal_fetchResourceInfo(resourceIri, options);
  if (hasInboxUrl({ resourceInfo: resourceInfo })) {
    return getInboxUrl({ resourceInfo: resourceInfo });
  }
  // If no Link header is defined, look up the resource content
  const resourceContent = await fetchLitDataset(resourceIri, options);
  return unstable_discoverInbox(resource, resourceContent);
}

/**
 * Creates a dataset describing a notification. The obtained notification has a relative
 * Url that is resolved when it is sent to an inbox.
 *
 * @param sender The URL identifying the sender of the resource (typically, a WebID)
 * @param target The URL identifying the resource the notification is about
 * @param type The type of notification, typically a type from https://www.w3.org/TR/activitystreams-vocabulary/#activity-types
 * @param options Additional data for the notification. If `body` is set, the provided Thing is used as an initial value for the notification. This makes it easier to set custom properties on a notification. If `subthings` is set, the provided [[Thing]]s are associated to the notification using the provided URLs.
 */
export function unstable_buildNotification(
  sender: Url | WebId,
  type: Url | UrlString,
  options?: Partial<{
    subthings: Record<UrlString, Thing>;
    body: Thing;
  }>
): LitDataset & { notification: UrlString | LocalNode } {
  let notificationData = createLitDataset();
  let notification: Thing;
  if (options && options.body) {
    notification = options.body;
    notificationData = setThing(notificationData, notification);
  } else {
    notification = createThing();
  }
  // Set the mandatory notification properties
  notification = addIri(notification, as.actor, sender);
  notification = addIri(notification, rdf.type, type);
  // Set the optional additional notification information
  if (options !== undefined && options.subthings !== undefined) {
    Object.entries(options.subthings).forEach(([predicate, value]) => {
      // All the quads of the notification subpart are added to the notification data
      notificationData = setThing(notification, value);
      notification = addIri(notification, predicate, value);
    });
  }
  notificationData = setThing(notificationData, notification);
  return Object.assign(notificationData, {
    notification: isThingLocal(notification)
      ? notification.localSubject
      : notification.url,
  });
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
  inbox: Url | UrlString,
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

/**
 * Discovers the inbox of the provided target resource, and then sends the provided notification to that inbox.
 * Fails if no inbox is discovered.
 * @param notification The content of thoe notification
 * @param receiver The target resource (e.g. a WebID)
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns A Promise resolving to a [[LitDataset]] containing the stored data linked to the new notification Resource, or rejecting if saving it failed.
 */
export async function unstable_sendNotification(
  notification: LitDataset & Partial<{ notification: UrlString | LocalNode }>,
  receiver: Url | UrlString,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
) {
  let notificationToSend = notification;
  const inbox = await unstable_fetchInbox(receiver, options);
  if (inbox === null) {
    throw new Error(
      `No inbox discovered for resource [${internal_toString(receiver)}]`
    );
  }
  if (notification.notification !== undefined) {
    let notificationThing = getThingOne(
      notification,
      notification.notification
    );
    notificationThing = setIri(notificationThing, as.target, receiver);
    notificationToSend = setThing(notificationToSend, notificationThing);
  }
  return unstable_sendNotificationToInbox(notificationToSend, inbox, options);
}
