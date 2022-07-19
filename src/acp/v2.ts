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
  getAllowModesV1,
  getDenyModesV1,
  getPolicy,
  getPolicyAll,
  policyAsMarkdown,
  removePolicy,
  setAllowModesV1,
  setDenyModesV1,
  setPolicy,
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
  removeAuthenticated,
  removeCreator,
  removeNoneOfRuleUrl,
  removeGroup,
  removeAnyOfRuleUrl,
  removePublic,
  removeAllOfRuleUrl,
  removeRule,
  Rule,
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
} from "./rule";
import { addMockAcrTo, mockAcrFor } from "./mock";

const v2AcpFunctions = {
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

const v2ControlFunctions = {
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

const v2PolicyFunctions = {
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
};

const v2RuleFunctions = {
  addAgent,
  addForbiddenRuleUrl: addNoneOfRuleUrl,
  addGroup,
  addOptionalRuleUrl: addAnyOfRuleUrl,
  addRequiredRuleUrl: addAllOfRuleUrl,
  createRule,
  getAgentAll,
  getForbiddenRuleUrlAll: getNoneOfRuleUrlAll,
  getGroupAll,
  getOptionalRuleUrlAll: getAnyOfRuleUrlAll,
  getRequiredRuleUrlAll: getAllOfRuleUrlAll,
  getRule,
  getRuleAll,
  hasAuthenticated,
  hasCreator,
  hasPublic,
  removeAgent,
  removeForbiddenRuleUrl: removeNoneOfRuleUrl,
  removeGroup,
  removeOptionalRuleUrl: removeAnyOfRuleUrl,
  removeRequiredRuleUrl: removeAllOfRuleUrl,
  removeRule,
  ruleAsMarkdown,
  setAgent,
  setForbiddenRuleUrl: setNoneOfRuleUrl,
  setGroup,
  setOptionalRuleUrl: setAnyOfRuleUrl,
  setRequiredRuleUrl: setAllOfRuleUrl,
  setRule,
};

const v2MockFunctions = {
  addMockAcrTo,
  mockAcrFor,
};

/* istanbul ignore next Not a supported public API: */
/** @deprecated Replaced by [[setPublic]] */
export function previousSetPublicSignature(rule: Rule, enable: boolean): Rule {
  return enable ? setPublic(rule) : removePublic(rule);
}
/* istanbul ignore next Not a supported public API: */
/** @deprecated Replaced by [[setAuthenticated]] */
export function previousSetAuthenticatedSignature(
  rule: Rule,
  enable: boolean
): Rule {
  return enable ? setAuthenticated(rule) : removeAuthenticated(rule);
}
/* istanbul ignore next Not a supported public API: */
/** @deprecated Replaced by [[setCreator]] */
export function previousSetCreatorSignature(rule: Rule, enable: boolean): Rule {
  return enable ? setCreator(rule) : removeCreator(rule);
}

const deprecatedFunctions = {
  /** @deprecated This misspelling was included accidentally. The correct function is [[getForbiddenRuleUrlAll]]. */
  getForbiddenRuleurlAll: getNoneOfRuleUrlAll,
  setPublic: previousSetPublicSignature,
  setAuthenticated: previousSetAuthenticatedSignature,
  setCreator: previousSetCreatorSignature,
};

/**
 * @hidden
 * @deprecated Replaced by [[acp_v3]].
 */
export const acp_v2 = {
  ...v2AcpFunctions,
  ...v2ControlFunctions,
  ...v2PolicyFunctions,
  ...v2RuleFunctions,
  ...v2MockFunctions,
  ...deprecatedFunctions,
};
