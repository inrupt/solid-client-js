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

import { it, expect } from "@jest/globals";
import * as acp_ess_2 from "./ess2";

it("exports Inrupt ESS 1.1 ACP functions", () => {
  expect(acp_ess_2.addAcrPolicyUrl).toBeDefined();
  expect(acp_ess_2.addAgent).toBeDefined();
  expect(acp_ess_2.addAllOfMatcherUrl).toBeDefined();
  expect(acp_ess_2.addAnyOfMatcherUrl).toBeDefined();
  expect(acp_ess_2.addClient).toBeDefined();
  expect(acp_ess_2.addMemberAcrPolicyUrl).toBeDefined();
  expect(acp_ess_2.addMemberPolicyUrl).toBeDefined();
  expect(acp_ess_2.addMockAcrTo).toBeDefined();
  expect(acp_ess_2.addNoneOfMatcherUrl).toBeDefined();
  expect(acp_ess_2.addPolicyUrl).toBeDefined();
  expect(acp_ess_2.createMatcher).toBeDefined();
  expect(acp_ess_2.createPolicy).toBeDefined();
  expect(acp_ess_2.createResourceMatcherFor).toBeDefined();
  expect(acp_ess_2.createResourcePolicyFor).toBeDefined();
  expect(acp_ess_2.getAcrPolicyUrlAll).toBeDefined();
  expect(acp_ess_2.getAgentAll).toBeDefined();
  expect(acp_ess_2.getAllOfMatcherUrlAll).toBeDefined();
  expect(acp_ess_2.getAllowModes).toBeDefined();
  expect(acp_ess_2.getAnyOfMatcherUrlAll).toBeDefined();
  expect(acp_ess_2.getClientAll).toBeDefined();
  expect(acp_ess_2.getDenyModes).toBeDefined();
  expect(acp_ess_2.getFileWithAccessDatasets).toBeDefined();
  expect(acp_ess_2.getFileWithAcr).toBeDefined();
  expect(acp_ess_2.getLinkedAcrUrl).toBeDefined();
  expect(acp_ess_2.getMatcher).toBeDefined();
  expect(acp_ess_2.getMatcherAll).toBeDefined();
  expect(acp_ess_2.getMemberAcrPolicyUrlAll).toBeDefined();
  expect(acp_ess_2.getMemberPolicyUrlAll).toBeDefined();
  expect(acp_ess_2.getNoneOfMatcherUrlAll).toBeDefined();
  expect(acp_ess_2.getPolicy).toBeDefined();
  expect(acp_ess_2.getPolicyAll).toBeDefined();
  expect(acp_ess_2.getPolicyUrlAll).toBeDefined();
  expect(acp_ess_2.getReferencedPolicyUrlAll).toBeDefined();
  expect(acp_ess_2.getResourceAcrPolicy).toBeDefined();
  expect(acp_ess_2.getResourceAcrPolicyAll).toBeDefined();
  expect(acp_ess_2.getResourceInfoWithAccessDatasets).toBeDefined();
  expect(acp_ess_2.getResourceInfoWithAcr).toBeDefined();
  expect(acp_ess_2.getResourceMatcher).toBeDefined();
  expect(acp_ess_2.getResourceMatcherAll).toBeDefined();
  expect(acp_ess_2.getResourcePolicy).toBeDefined();
  expect(acp_ess_2.getResourcePolicyAll).toBeDefined();
  expect(acp_ess_2.getSolidDatasetWithAccessDatasets).toBeDefined();
  expect(acp_ess_2.getSolidDatasetWithAcr).toBeDefined();
  expect(acp_ess_2.getVcAccess).toBeDefined();
  expect(acp_ess_2.hasAccessibleAcr).toBeDefined();
  expect(acp_ess_2.hasAuthenticated).toBeDefined();
  expect(acp_ess_2.hasCreator).toBeDefined();
  expect(acp_ess_2.hasLinkedAcr).toBeDefined();
  expect(acp_ess_2.hasPublic).toBeDefined();
  expect(acp_ess_2.isAcpControlled).toBeDefined();
  expect(acp_ess_2.mockAcrFor).toBeDefined();
  expect(acp_ess_2.removeAcrPolicyUrl).toBeDefined();
  expect(acp_ess_2.removeAcrPolicyUrlAll).toBeDefined();
  expect(acp_ess_2.removeAgent).toBeDefined();
  expect(acp_ess_2.removeAllOfMatcherUrl).toBeDefined();
  expect(acp_ess_2.removeAnyOfMatcherUrl).toBeDefined();
  expect(acp_ess_2.removeAuthenticated).toBeDefined();
  expect(acp_ess_2.removeClient).toBeDefined();
  expect(acp_ess_2.removeCreator).toBeDefined();
  expect(acp_ess_2.removeMatcher).toBeDefined();
  expect(acp_ess_2.removeMemberAcrPolicyUrl).toBeDefined();
  expect(acp_ess_2.removeMemberAcrPolicyUrlAll).toBeDefined();
  expect(acp_ess_2.removeMemberPolicyUrl).toBeDefined();
  expect(acp_ess_2.removeMemberPolicyUrlAll).toBeDefined();
  expect(acp_ess_2.removeNoneOfMatcherUrl).toBeDefined();
  expect(acp_ess_2.removePolicy).toBeDefined();
  expect(acp_ess_2.removePolicyUrl).toBeDefined();
  expect(acp_ess_2.removePolicyUrlAll).toBeDefined();
  expect(acp_ess_2.removePublic).toBeDefined();
  expect(acp_ess_2.removeResourceAcrPolicy).toBeDefined();
  expect(acp_ess_2.removeResourceMatcher).toBeDefined();
  expect(acp_ess_2.removeResourcePolicy).toBeDefined();
  expect(acp_ess_2.saveAcrFor).toBeDefined();
  expect(acp_ess_2.setAgent).toBeDefined();
  expect(acp_ess_2.setAllOfMatcherUrl).toBeDefined();
  expect(acp_ess_2.setAllowModes).toBeDefined();
  expect(acp_ess_2.setAnyOfMatcherUrl).toBeDefined();
  expect(acp_ess_2.setAuthenticated).toBeDefined();
  expect(acp_ess_2.setCreator).toBeDefined();
  expect(acp_ess_2.setDenyModes).toBeDefined();
  expect(acp_ess_2.setMatcher).toBeDefined();
  expect(acp_ess_2.setNoneOfMatcherUrl).toBeDefined();
  expect(acp_ess_2.setPolicy).toBeDefined();
  expect(acp_ess_2.setPublic).toBeDefined();
  expect(acp_ess_2.setResourceMatcher).toBeDefined();
  expect(acp_ess_2.setResourcePolicy).toBeDefined();
  expect(acp_ess_2.setVcAccess).toBeDefined();
});
