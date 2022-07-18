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

import type { WithAccessibleAcr } from "../acp";
import { buildThing, createThing, getIriAll, getSourceUrl } from "../..";
import { ACP } from "../constants";
import { internal_getAcr as getAccessControlResource } from "../control.internal";
import { getAccessControlResourceThing } from "./getAccessControlResourceThing";
import {
  DefaultAccessControlName,
  getDefaultAccessControlUrl,
} from "./getDefaultAccessControlUrl";
import { setAccessControlResourceThing } from "./setAccessControlResourceThing";

function getAccessControlTypeFromDefaultAccessControlName(
  name: DefaultAccessControlName
): string {
  if (name.includes("Member")) {
    return ACP.memberAccessControl;
  }
  return ACP.accessControl;
}

/** @hidden */
export function setDefaultAccessControlThingIfNotExist<
  T extends WithAccessibleAcr
>(resource: T, name: DefaultAccessControlName): T {
  const defaultAccessControlThingUrl = getDefaultAccessControlUrl(
    resource,
    name
  );
  const acr = getAccessControlResource(resource);

  // Get the Access Control Resource Thing or create it
  let accessControlResourceThing = getAccessControlResourceThing(resource);
  if (
    accessControlResourceThing === null ||
    typeof accessControlResourceThing === "undefined"
  ) {
    accessControlResourceThing = createThing({ url: getSourceUrl(acr) });
  }

  // Get the Default Access Control Thing or create it and return
  const accessControlUrlAll = getIriAll(
    accessControlResourceThing,
    getAccessControlTypeFromDefaultAccessControlName(name)
  );

  if (!accessControlUrlAll.includes(defaultAccessControlThingUrl)) {
    accessControlResourceThing = buildThing(accessControlResourceThing)
      .addUrl(
        getAccessControlTypeFromDefaultAccessControlName(name),
        defaultAccessControlThingUrl
      )
      .build();

    return setAccessControlResourceThing(resource, accessControlResourceThing);
  }

  // Return the original resource if the ACR and Default AC exist
  return resource;
}
