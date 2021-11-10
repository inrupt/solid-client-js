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

import type { SolidDataset } from "../../interfaces";
import { addUrl, createSolidDataset, createThing, setThing } from "../..";
import { acp } from "../../constants";
import {
  DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
  DEFAULT_DOMAIN,
} from "./createAccessControlledResource";

export const TEST_URL = {
  accessControlResource: DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
  accessControl1: DEFAULT_DOMAIN.concat("ac1"),
  memberAccessControl1: DEFAULT_DOMAIN.concat("mac1"),
  accessControl1Policy1: DEFAULT_DOMAIN.concat("ac1p1"),
  accessControl1AccessPolicy1: DEFAULT_DOMAIN.concat("ac1ap1"),
  memberAccessControl1Policy1: DEFAULT_DOMAIN.concat("mac1p1"),
  memberAccessControl1AccessPolicy1: DEFAULT_DOMAIN.concat("mac1ap1"),
};

/** @hidden */
export function createAccessControlResourceDataset(): SolidDataset {
  // Create dataset
  let dataset = createSolidDataset();

  // Create AccessControlResource
  let acr = createThing({ url: TEST_URL.accessControlResource });
  acr = addUrl(acr, acp.accessControl, TEST_URL.accessControl1);
  acr = addUrl(acr, acp.memberAccessControl, TEST_URL.memberAccessControl1);
  dataset = setThing(dataset, acr);

  // Create AccessControl
  // Note: an object node is not a thing in a SolidDataset, hence the following doesn't work, neither does the fluent buildThing syntax
  // let ac1 = getThing(dataset, TEST_URL.accessControl1);
  let ac1 = createThing({ url: TEST_URL.accessControl1 });
  ac1 = addUrl(ac1, acp.apply, TEST_URL.accessControl1Policy1);
  ac1 = addUrl(ac1, acp.access, TEST_URL.accessControl1AccessPolicy1);
  dataset = setThing(dataset, ac1);

  // Create MemberAccessControl
  let mac1 = createThing({ url: TEST_URL.memberAccessControl1 });
  mac1 = addUrl(mac1, acp.apply, TEST_URL.memberAccessControl1Policy1);
  mac1 = addUrl(mac1, acp.access, TEST_URL.memberAccessControl1AccessPolicy1);
  dataset = setThing(dataset, mac1);

  return dataset;
}
