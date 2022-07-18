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

import {
  DEFAULT_ACCESS_CONTROL,
  DEFAULT_ACR_ACCESS_CONTROL,
  DEFAULT_MEMBER_ACCESS_CONTROL,
  DEFAULT_MEMBER_ACR_ACCESS_CONTROL,
} from "../internal/getDefaultAccessControlUrl";
import {
  DEFAULT_VC_MATCHER_NAME,
  DEFAULT_VC_POLICY_NAME,
} from "../util/setVcAccess";

/** @hidden */
export const DEFAULT_DOMAIN = "https://example.org/";

/** @hidden */
export const DEFAULT_RESOURCE_URL = DEFAULT_DOMAIN.concat("r");

/** @hidden */
export const DEFAULT_ACCESS_CONTROL_RESOURCE_URL = DEFAULT_DOMAIN.concat("acr");

/** @hidden */
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
  defaultAccessControl: DEFAULT_ACCESS_CONTROL_RESOURCE_URL.concat("#").concat(
    DEFAULT_ACCESS_CONTROL
  ),
  defaultAccessControlPolicy1: DEFAULT_DOMAIN.concat("dacp1"),
  defaultAccessControlPolicy2: DEFAULT_DOMAIN.concat("dacp2"),
  defaultAcrAccessControl: DEFAULT_ACCESS_CONTROL_RESOURCE_URL.concat(
    "#"
  ).concat(DEFAULT_ACR_ACCESS_CONTROL),
  defaultAcrAccessControlPolicy1: DEFAULT_DOMAIN.concat("dacracp1"),
  defaultAcrAccessControlPolicy2: DEFAULT_DOMAIN.concat("dacracp2"),
  defaultMemberAccessControl: DEFAULT_ACCESS_CONTROL_RESOURCE_URL.concat(
    "#"
  ).concat(DEFAULT_MEMBER_ACCESS_CONTROL),
  defaultMemberAccessControlPolicy1: DEFAULT_DOMAIN.concat("dmacp1"),
  defaultMemberAccessControlPolicy2: DEFAULT_DOMAIN.concat("dmacp2"),
  defaultMemberAcrAccessControl: DEFAULT_ACCESS_CONTROL_RESOURCE_URL.concat(
    "#"
  ).concat(DEFAULT_MEMBER_ACR_ACCESS_CONTROL),
  defaultMemberAcrAccessControlPolicy1: DEFAULT_DOMAIN.concat("dmacracp1"),
  defaultMemberAcrAccessControlPolicy2: DEFAULT_DOMAIN.concat("dmacracp2"),
  policy1: DEFAULT_DOMAIN.concat("p1"),
  defaultWebId: DEFAULT_DOMAIN.concat("wid1"),
  otherWebId: DEFAULT_DOMAIN.concat("wid2"),
  defaultAccessControlAgentMatcherReadPolicy:
    DEFAULT_ACCESS_CONTROL_RESOURCE_URL.concat(
      "#defaultAccessControlAgentMatcherReadPolicy"
    ),
  defaultAccessControlAgentMatcherAppendPolicy:
    DEFAULT_ACCESS_CONTROL_RESOURCE_URL.concat(
      "#defaultAccessControlAgentMatcherAppendPolicy"
    ),
  defaultAccessControlAgentMatcherWritePolicy:
    DEFAULT_ACCESS_CONTROL_RESOURCE_URL.concat(
      "#defaultAccessControlAgentMatcherWritePolicy"
    ),
  defaultAcrAccessControlAgentMatcherControlReadPolicy:
    DEFAULT_ACCESS_CONTROL_RESOURCE_URL.concat(
      "#defaultAcrAccessControlAgentMatcherControlReadPolicy"
    ),
  defaultAcrAccessControlAgentMatcherControlWritePolicy:
    DEFAULT_ACCESS_CONTROL_RESOURCE_URL.concat(
      "#defaultAcrAccessControlAgentMatcherControlWritePolicy"
    ),
  defaultAccessControlAgentMatcherReadPolicyMatcher:
    DEFAULT_ACCESS_CONTROL_RESOURCE_URL.concat(
      "#defaultAccessControlAgentMatcherReadPolicyMatcher"
    ),
  defaultAccessControlAgentMatcherAppendPolicyMatcher:
    DEFAULT_ACCESS_CONTROL_RESOURCE_URL.concat(
      "#defaultAccessControlAgentMatcherAppendPolicyMatcher"
    ),
  defaultAccessControlAgentMatcherWritePolicyMatcher:
    DEFAULT_ACCESS_CONTROL_RESOURCE_URL.concat(
      "#defaultAccessControlAgentMatcherWritePolicyMatcher"
    ),
  defaultAcrAccessControlAgentMatcherControlReadPolicyMatcher:
    DEFAULT_ACCESS_CONTROL_RESOURCE_URL.concat(
      "#defaultAcrAccessControlAgentMatcherControlReadPolicyMatcher"
    ),
  defaultAcrAccessControlAgentMatcherControlWritePolicyMatcher:
    DEFAULT_ACCESS_CONTROL_RESOURCE_URL.concat(
      "#defaultAcrAccessControlAgentMatcherControlWritePolicyMatcher"
    ),
  defaultMemberAccessControlAgentMatcherReadPolicy:
    DEFAULT_ACCESS_CONTROL_RESOURCE_URL.concat(
      "#defaultMemberAccessControlAgentMatcherReadPolicy"
    ),
  defaultMemberAccessControlAgentMatcherReadPolicyMatcher:
    DEFAULT_ACCESS_CONTROL_RESOURCE_URL.concat(
      "#defaultMemberAccessControlAgentMatcherReadPolicyMatcher"
    ),
  defaultAccessControlVcPolicy: DEFAULT_ACCESS_CONTROL_RESOURCE_URL.concat(
    "#",
    DEFAULT_VC_POLICY_NAME
  ),
  defaultAccessControlVcMatcher: DEFAULT_ACCESS_CONTROL_RESOURCE_URL.concat(
    "#",
    DEFAULT_VC_MATCHER_NAME
  ),
};
