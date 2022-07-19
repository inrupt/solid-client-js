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
import * as acp_ess_1 from "./ess1";

it("exports Inrupt ESS 1.1 ACP functions", () => {
  expect(acp_ess_1.acrAsMarkdown).toBeDefined();
  expect(acp_ess_1.addAcrPolicyUrl).toBeDefined();
  expect(acp_ess_1.addAgent).toBeDefined();
  expect(acp_ess_1.addAllOfRuleUrl).toBeDefined();
  expect(acp_ess_1.addAnyOfRuleUrl).toBeDefined();
  expect(acp_ess_1.addClient).toBeDefined();
  expect(acp_ess_1.addGroup).toBeDefined();
  expect(acp_ess_1.addMemberAcrPolicyUrl).toBeDefined();
  expect(acp_ess_1.addMemberPolicyUrl).toBeDefined();
  expect(acp_ess_1.addMockAcrTo).toBeDefined();
  expect(acp_ess_1.addNoneOfRuleUrl).toBeDefined();
  expect(acp_ess_1.addPolicyUrl).toBeDefined();
  expect(acp_ess_1.createPolicy).toBeDefined();
  expect(acp_ess_1.createResourcePolicyFor).toBeDefined();
  expect(acp_ess_1.createResourceRuleFor).toBeDefined();
  expect(acp_ess_1.createRule).toBeDefined();
  expect(acp_ess_1.getAcrPolicyUrlAll).toBeDefined();
  expect(acp_ess_1.getAgentAll).toBeDefined();
  expect(acp_ess_1.getAllowModes).toBeDefined();
  expect(acp_ess_1.getAllOfRuleUrlAll).toBeDefined();
  expect(acp_ess_1.getAnyOfRuleUrlAll).toBeDefined();
  expect(acp_ess_1.getClientAll).toBeDefined();
  expect(acp_ess_1.getDenyModes).toBeDefined();
  expect(acp_ess_1.getFileWithAccessDatasets).toBeDefined();
  expect(acp_ess_1.getFileWithAcr).toBeDefined();
  expect(acp_ess_1.getGroupAll).toBeDefined();
  expect(acp_ess_1.getLinkedAcrUrl).toBeDefined();
  expect(acp_ess_1.getMemberAcrPolicyUrlAll).toBeDefined();
  expect(acp_ess_1.getMemberPolicyUrlAll).toBeDefined();
  expect(acp_ess_1.getNoneOfRuleUrlAll).toBeDefined();
  expect(acp_ess_1.getPolicy).toBeDefined();
  expect(acp_ess_1.getPolicyAll).toBeDefined();
  expect(acp_ess_1.getPolicyUrlAll).toBeDefined();
  expect(acp_ess_1.getReferencedPolicyUrlAll).toBeDefined();
  expect(acp_ess_1.getResourceAcrPolicy).toBeDefined();
  expect(acp_ess_1.getResourceAcrPolicyAll).toBeDefined();
  expect(acp_ess_1.getResourceInfoWithAccessDatasets).toBeDefined();
  expect(acp_ess_1.getResourceInfoWithAcr).toBeDefined();
  expect(acp_ess_1.getResourcePolicy).toBeDefined();
  expect(acp_ess_1.getResourcePolicyAll).toBeDefined();
  expect(acp_ess_1.getResourceRule).toBeDefined();
  expect(acp_ess_1.getResourceRuleAll).toBeDefined();
  expect(acp_ess_1.getRule).toBeDefined();
  expect(acp_ess_1.getRuleAll).toBeDefined();
  expect(acp_ess_1.getSolidDatasetWithAccessDatasets).toBeDefined();
  expect(acp_ess_1.getSolidDatasetWithAcr).toBeDefined();
  expect(acp_ess_1.hasAccessibleAcr).toBeDefined();
  expect(acp_ess_1.hasAnyClient).toBeDefined();
  expect(acp_ess_1.hasAuthenticated).toBeDefined();
  expect(acp_ess_1.hasCreator).toBeDefined();
  expect(acp_ess_1.hasLinkedAcr).toBeDefined();
  expect(acp_ess_1.hasPublic).toBeDefined();
  expect(acp_ess_1.isAcpControlled).toBeDefined();
  expect(acp_ess_1.mockAcrFor).toBeDefined();
  expect(acp_ess_1.policyAsMarkdown).toBeDefined();
  expect(acp_ess_1.removeAcrPolicyUrl).toBeDefined();
  expect(acp_ess_1.removeAcrPolicyUrlAll).toBeDefined();
  expect(acp_ess_1.removeAgent).toBeDefined();
  expect(acp_ess_1.removeAllOfRuleUrl).toBeDefined();
  expect(acp_ess_1.removeAnyClient).toBeDefined();
  expect(acp_ess_1.removeAnyOfRuleUrl).toBeDefined();
  expect(acp_ess_1.removeAuthenticated).toBeDefined();
  expect(acp_ess_1.removeClient).toBeDefined();
  expect(acp_ess_1.removeCreator).toBeDefined();
  expect(acp_ess_1.removeMemberAcrPolicyUrl).toBeDefined();
  expect(acp_ess_1.removeMemberAcrPolicyUrlAll).toBeDefined();
  expect(acp_ess_1.removeMemberPolicyUrl).toBeDefined();
  expect(acp_ess_1.removeMemberPolicyUrlAll).toBeDefined();
  expect(acp_ess_1.removeNoneOfRuleUrl).toBeDefined();
  expect(acp_ess_1.removePolicy).toBeDefined();
  expect(acp_ess_1.removePolicyUrl).toBeDefined();
  expect(acp_ess_1.removePolicyUrlAll).toBeDefined();
  expect(acp_ess_1.removePublic).toBeDefined();
  expect(acp_ess_1.removeResourceAcrPolicy).toBeDefined();
  expect(acp_ess_1.removeResourcePolicy).toBeDefined();
  expect(acp_ess_1.removeResourceRule).toBeDefined();
  expect(acp_ess_1.removeRule).toBeDefined();
  expect(acp_ess_1.removeGroup).toBeDefined();
  expect(acp_ess_1.ruleAsMarkdown).toBeDefined();
  expect(acp_ess_1.saveAcrFor).toBeDefined();
  expect(acp_ess_1.setAgent).toBeDefined();
  expect(acp_ess_1.setAllOfRuleUrl).toBeDefined();
  expect(acp_ess_1.setAnyClient).toBeDefined();
  expect(acp_ess_1.setAnyOfRuleUrl).toBeDefined();
  expect(acp_ess_1.setAuthenticated).toBeDefined();
  expect(acp_ess_1.setClient).toBeDefined();
  expect(acp_ess_1.setCreator).toBeDefined();
  expect(acp_ess_1.setNoneOfRuleUrl).toBeDefined();
  expect(acp_ess_1.setPolicy).toBeDefined();
  expect(acp_ess_1.setPublic).toBeDefined();
  expect(acp_ess_1.setResourceAcrPolicy).toBeDefined();
  expect(acp_ess_1.setResourcePolicy).toBeDefined();
  expect(acp_ess_1.setResourceRule).toBeDefined();
  expect(acp_ess_1.setRule).toBeDefined();
  expect(acp_ess_1.setAllowModes).toBeDefined();
  expect(acp_ess_1.setDenyModes).toBeDefined();
  expect(acp_ess_1.setGroup).toBeDefined();
});
