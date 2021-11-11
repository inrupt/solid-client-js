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

export const DEFAULT_DOMAIN = "https://example.org/";

export const DEFAULT_RESOURCE_URL = DEFAULT_DOMAIN.concat("r");

export const DEFAULT_ACCESS_CONTROL_RESOURCE_URL = DEFAULT_DOMAIN.concat("acr");

export const TEST_URL = {
  accessControlResource: DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
  accessControl1: DEFAULT_DOMAIN.concat("ac1"),
  accessControl2: DEFAULT_DOMAIN.concat("ac2"),
  accessControl1Policy1: DEFAULT_DOMAIN.concat("ac1p1"),
  accessControl1Policy2: DEFAULT_DOMAIN.concat("ac1p2"),
  accessControl1AccessPolicy1: DEFAULT_DOMAIN.concat("ac1ap1"),
  accessControl1AccessPolicy2: DEFAULT_DOMAIN.concat("ac1ap2"),
  accessControl2Policy1: DEFAULT_DOMAIN.concat("ac2p1"),
  accessControl2Policy2: DEFAULT_DOMAIN.concat("ac2p2"),
  accessControl2AccessPolicy1: DEFAULT_DOMAIN.concat("ac2ap1"),
  accessControl2AccessPolicy2: DEFAULT_DOMAIN.concat("ac2ap2"),
  memberAccessControl1: DEFAULT_DOMAIN.concat("mac1"),
  memberAccessControl2: DEFAULT_DOMAIN.concat("mac2"),
  memberAccessControl1Policy1: DEFAULT_DOMAIN.concat("mac1p1"),
  memberAccessControl1Policy2: DEFAULT_DOMAIN.concat("mac1p2"),
  memberAccessControl1AccessPolicy1: DEFAULT_DOMAIN.concat("mac1ap1"),
  memberAccessControl1AccessPolicy2: DEFAULT_DOMAIN.concat("mac1ap2"),
  memberAccessControl2Policy1: DEFAULT_DOMAIN.concat("mac2p1"),
  memberAccessControl2Policy2: DEFAULT_DOMAIN.concat("mac2p2"),
  memberAccessControl2AccessPolicy1: DEFAULT_DOMAIN.concat("mac2ap1"),
  memberAccessControl2AccessPolicy2: DEFAULT_DOMAIN.concat("mac2ap2"),
};
