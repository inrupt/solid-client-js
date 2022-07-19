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
  getFileWithAccessDatasets,
  getFileWithAcr,
  getLinkedAcrUrl,
  getReferencedPolicyUrlAll,
  getResourceInfoWithAccessDatasets,
  getResourceInfoWithAcr,
  getSolidDatasetWithAccessDatasets,
  getSolidDatasetWithAcr,
  hasAccessibleAcr,
  saveAcrFor,
  isAcpControlled,
} from "./acp";
import {
  acrAsMarkdown,
  addAcrPolicyUrl,
  addMemberAcrPolicyUrl,
  addMemberPolicyUrl,
  addPolicyUrl,
  getAcrPolicyUrlAll,
  getMemberAcrPolicyUrlAll,
  getMemberPolicyUrlAll,
  getPolicyUrlAll,
  hasLinkedAcr,
  removeAcrPolicyUrl,
  removeAcrPolicyUrlAll,
  removeMemberAcrPolicyUrl,
  removeMemberAcrPolicyUrlAll,
  removeMemberPolicyUrl,
  removeMemberPolicyUrlAll,
  removePolicyUrl,
  removePolicyUrlAll,
} from "./control";
import {
  createPolicy,
  getAllowModesV1,
  getDenyModesV1,
  getPolicy,
  getPolicyAll,
  policyAsMarkdown,
  removePolicy,
  setAllowModesV1,
  setDenyModesV1,
  setPolicy,
  createResourcePolicyFor,
  getResourceAcrPolicy,
  getResourceAcrPolicyAll,
  getResourcePolicy,
  getResourcePolicyAll,
  removeResourceAcrPolicy,
  removeResourcePolicy,
  setResourceAcrPolicy,
  setResourcePolicy,
} from "./policy";
import {
  addAgent,
  addNoneOfRuleUrl,
  addGroup,
  addAnyOfRuleUrl,
  addAllOfRuleUrl,
  createRule,
  getAgentAll,
  getNoneOfRuleUrlAll,
  getGroupAll,
  getAnyOfRuleUrlAll,
  getAllOfRuleUrlAll,
  getRule,
  getRuleAll,
  hasAuthenticated,
  hasCreator,
  hasPublic,
  removeAgent,
  removeNoneOfRuleUrl,
  removeGroup,
  removeAnyOfRuleUrl,
  removeAllOfRuleUrl,
  removeRule,
  ruleAsMarkdown,
  setAgent,
  setAuthenticated,
  setCreator,
  setNoneOfRuleUrl,
  setGroup,
  setAnyOfRuleUrl,
  setPublic,
  setAllOfRuleUrl,
  setRule,
  addClient,
  getClientAll,
  hasAnyClient,
  removeClient,
  setAnyClient,
  setClient,
  removeAnyClient,
  removeAuthenticated,
  removeCreator,
  removePublic,
  createResourceRuleFor,
  getResourceRule,
  getResourceRuleAll,
  removeResourceRule,
  setResourceRule,
} from "./rule";
import { addMockAcrTo, mockAcrFor } from "./mock";

const v3AcpFunctions = {
  getFileWithAccessDatasets,
  getFileWithAcr,
  getLinkedAcrUrl,
  getReferencedPolicyUrlAll,
  getResourceInfoWithAccessDatasets,
  getResourceInfoWithAcr,
  getSolidDatasetWithAccessDatasets,
  getSolidDatasetWithAcr,
  hasAccessibleAcr,
  saveAcrFor,
  isAcpControlled,
};

const v3ControlFunctions = {
  acrAsMarkdown,
  addAcrPolicyUrl,
  addMemberAcrPolicyUrl,
  addMemberPolicyUrl,
  addPolicyUrl,
  getAcrPolicyUrlAll,
  getMemberAcrPolicyUrlAll,
  getMemberPolicyUrlAll,
  getPolicyUrlAll,
  hasLinkedAcr,
  removeAcrPolicyUrl,
  removeAcrPolicyUrlAll,
  removeMemberAcrPolicyUrl,
  removeMemberAcrPolicyUrlAll,
  removeMemberPolicyUrl,
  removeMemberPolicyUrlAll,
  removePolicyUrl,
  removePolicyUrlAll,
};

const v3PolicyFunctions = {
  createPolicy,
  getAllowModes: getAllowModesV1,
  getDenyModes: getDenyModesV1,
  getPolicy,
  getPolicyAll,
  policyAsMarkdown,
  removePolicy,
  setAllowModes: setAllowModesV1,
  setDenyModes: setDenyModesV1,
  setPolicy,
  createResourcePolicyFor,
  getResourceAcrPolicy,
  getResourceAcrPolicyAll,
  getResourcePolicy,
  getResourcePolicyAll,
  removeResourceAcrPolicy,
  removeResourcePolicy,
  setResourceAcrPolicy,
  setResourcePolicy,
};

const v3RuleFunctions = {
  addAgent,
  addGroup,
  createRule,
  getAgentAll,
  getGroupAll,
  getRule,
  getRuleAll,
  removeAgent,
  removeGroup,
  removeRule,
  ruleAsMarkdown,
  setAgent,
  setGroup,
  setRule,
  addClient,
  getClientAll,
  hasAnyClient,
  removeClient,
  setAnyClient,
  setClient,
  removeAnyClient,
  hasAuthenticated,
  hasCreator,
  hasPublic,
  setAuthenticated,
  setCreator,
  setPublic,
  removeAuthenticated,
  removeCreator,
  removePublic,
  getAnyOfRuleUrlAll,
  addAnyOfRuleUrl,
  removeAnyOfRuleUrl,
  setAnyOfRuleUrl,
  getAllOfRuleUrlAll,
  addAllOfRuleUrl,
  removeAllOfRuleUrl,
  setAllOfRuleUrl,
  getNoneOfRuleUrlAll,
  addNoneOfRuleUrl,
  removeNoneOfRuleUrl,
  setNoneOfRuleUrl,
  createResourceRuleFor,
  getResourceRule,
  getResourceRuleAll,
  removeResourceRule,
  setResourceRule,
};

const v3MockFunctions = {
  addMockAcrTo,
  mockAcrFor,
};

/**
 * @hidden
 * @deprecated Please import "acp_ess_1" directly.
 */
export const acp_v3 = {
  ...v3AcpFunctions,
  ...v3ControlFunctions,
  ...v3PolicyFunctions,
  ...v3RuleFunctions,
  ...v3MockFunctions,
};
