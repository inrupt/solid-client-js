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
  getFileWithAccessDatasets,
  getFileWithAcr,
  getReferencedPolicyUrlAll,
  getResourceInfoWithAccessDatasets,
  getResourceInfoWithAcr,
  getSolidDatasetWithAccessDatasets,
  getSolidDatasetWithAcr,
  hasAccessibleAcr,
  saveAcrFor,
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
  getPolicy,
  getPolicyAll,
  policyAsMarkdown,
  removePolicy,
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
  getAllowModesV2,
  getDenyModesV2,
  setAllowModesV2,
  setDenyModesV2,
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

const v4AcpFunctions = {
  getFileWithAccessDatasets,
  getFileWithAcr,
  getReferencedPolicyUrlAll,
  getResourceInfoWithAccessDatasets,
  getResourceInfoWithAcr,
  getSolidDatasetWithAccessDatasets,
  getSolidDatasetWithAcr,
  hasAccessibleAcr,
  saveAcrFor,
};

const v4ControlFunctions = {
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

const v4PolicyFunctions = {
  createPolicy,
  getAllowModes: getAllowModesV2,
  getDenyModes: getDenyModesV2,
  getPolicy,
  getPolicyAll,
  policyAsMarkdown,
  removePolicy,
  setAllowModes: setAllowModesV2,
  setDenyModes: setDenyModesV2,
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

const v4RuleFunctions = {
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

const v4MockFunctions = {
  addMockAcrTo,
  mockAcrFor,
};

/**
 * @hidden
 * @deprecated Please import directly from the "acp/*" modules.
 */
export const acp_v4 = {
  ...v4AcpFunctions,
  ...v4ControlFunctions,
  ...v4PolicyFunctions,
  ...v4RuleFunctions,
  ...v4MockFunctions,
};
