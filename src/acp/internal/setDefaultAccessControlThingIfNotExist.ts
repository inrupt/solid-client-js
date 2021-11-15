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

import {
  buildThing,
  createThing,
  getIriAll,
  getSourceUrl,
  getThing,
  ThingPersisted,
} from "../..";
import { acp } from "../../constants";
import type { WithAccessibleAcr } from "../acp";
import { getAccessControlResource } from "./getAccessControlResource";
import { getAccessControlResourceThing } from "./getAccessControlResourceThing";
import {
  AccessControlType,
  DEFAULT_ACCESS_CONTROL_NAME,
  DEFAULT_MEMBER_ACCESS_CONTROL_NAME,
  getDefaultAccessControlUrl,
} from "./getDefaultAccessControlUrl";
import { setAccessControlResourceThing } from "./setAccessControlResourceThing";

/** @hidden */
export function setDefaultAccessControlThingIfNotExist<
  T extends WithAccessibleAcr
>(resource: T, type: AccessControlType): T {
  const defaultAccessControlThingUrl = getDefaultAccessControlUrl(
    resource,
    type
  );
  const acr = getAccessControlResource(resource);
  let accessControlResourceThing = getAccessControlResourceThing(resource);
  if (
    accessControlResourceThing === null ||
    typeof accessControlResourceThing === "undefined"
  ) {
    accessControlResourceThing = createThing({ url: getSourceUrl(acr) });
  }
  const accessControlUrlAll = getIriAll(accessControlResourceThing, type);
  if (!accessControlUrlAll.includes(defaultAccessControlThingUrl)) {
    accessControlResourceThing = buildThing(accessControlResourceThing)
      .addUrl(type, defaultAccessControlThingUrl)
      .build();
    return setAccessControlResourceThing(resource, accessControlResourceThing);
  }
  return resource;
}
