/**
 * Copyright 2022 Inrupt Inc.
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

export {
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

export {
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

export {
  createPolicy,
  getAllowModesV1 as getAllowModes,
  getDenyModesV1 as getDenyModes,
  getPolicy,
  getPolicyAll,
  policyAsMarkdown,
  removePolicy,
  setAllowModesV1 as setAllowModes,
  setDenyModesV1 as setDenyModes,
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

export {
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

export { addMockAcrTo, mockAcrFor } from "./mock";
