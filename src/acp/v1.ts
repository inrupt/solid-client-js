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
  WithAccessibleAcr,
} from "./acp";
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
} from "./rule";
import { addMockAcrTo, mockAcrFor } from "./mock";
import {
  hasLinkedAcr,
  addAcrPolicyUrl,
  addMemberAcrPolicyUrl,
  getAcrPolicyUrlAll,
  getMemberAcrPolicyUrlAll,
  removeAcrPolicyUrl,
  removeAcrPolicyUrlAll,
  removeMemberAcrPolicyUrl,
  removeMemberAcrPolicyUrlAll,
  Control,
} from "./control";
import {
  internal_addMemberPolicyUrl,
  internal_addPolicyUrl,
  internal_createControl,
  internal_getAcr,
  internal_getControl,
  internal_getControlAll,
  internal_getMemberPolicyUrlAll,
  internal_getPolicyUrlAll,
  internal_removeMemberPolicyUrlAll,
  internal_removePolicyUrl,
  internal_removePolicyUrlAll,
  internal_setAcr,
  internal_setControl,
} from "./control.internal";
import { removeThing } from "../thing/thing";
import {
  previousSetAuthenticatedSignature,
  previousSetCreatorSignature,
  previousSetPublicSignature,
} from "./v2";

const v1AcpFunctions = {
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

const v1PolicyFunctions = {
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

const v1RuleFunctions = {
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

const v1MockFunctions = {
  addMockAcrTo,
  mockAcrFor,
};

const v1ControlFunctions = {
  hasLinkedAcr,
  addAcrPolicyUrl,
  addMemberAcrPolicyUrl,
  getAcrPolicyUrlAll,
  getMemberAcrPolicyUrlAll,
  removeAcrPolicyUrl,
  removeAcrPolicyUrlAll,
  removeMemberAcrPolicyUrl,
  removeMemberAcrPolicyUrlAll,
};
const deprecatedFunctions = {
  createControl: internal_createControl,
  getControl: internal_getControl,
  getAllControl: internal_getControlAll,
  getControlAll: internal_getControlAll,
  setControl: internal_setControl,
  removeControl,
  addPolicyUrl: internal_addPolicyUrl,
  getPolicyUrlAll: internal_getPolicyUrlAll,
  removePolicyUrl: internal_removePolicyUrl,
  removePolicyUrlAll: internal_removePolicyUrlAll,
  addMemberPolicyUrl: internal_addMemberPolicyUrl,
  getMemberPolicyUrlAll: internal_getMemberPolicyUrlAll,
  removeMemberPolicyUrl: internal_getMemberPolicyUrlAll,
  removeMemberPolicyUrlAll: internal_removeMemberPolicyUrlAll,
  /** @deprecated This misspelling was included accidentally. The correct function is [[getForbiddenRuleUrlAll]]. */
  getForbiddenRuleurlAll: getNoneOfRuleUrlAll,
  setPublic: previousSetPublicSignature,
  setAuthenticated: previousSetAuthenticatedSignature,
  setCreator: previousSetCreatorSignature,
};

/**
 * @hidden
 * @deprecated Replaced by [[acp_v2]].
 */
export const acp_v1 = {
  ...v1AcpFunctions,
  ...v1PolicyFunctions,
  ...v1RuleFunctions,
  ...v1MockFunctions,
  ...v1ControlFunctions,
  ...deprecatedFunctions,
};

/**
 * ```{note} The Web Access Control specification is not yet finalised. As such, this
 * function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Remove an [[Control]] from the [[AccessControlResource]] of a Resource.
 *
 * @param withAccessControlResource A Resource with the Access Control Resource from which to remove an Access Control.
 * @param control The [[Control]] to remove from the given Access Control Resource.
 * @returns The given Resource with a new Access Control Resource equal to the original Access Control Resource, excluding the given Access Control.
 * @hidden Developers don't need to care about initialising Controls - they can just add Policies directly.
 * @deprecated
 */
export function removeControl<ResourceExt extends WithAccessibleAcr>(
  withAccessControlResource: ResourceExt,
  control: Control
): ResourceExt {
  const acr = internal_getAcr(withAccessControlResource);
  const updatedAcr = removeThing(acr, control);
  const updatedResource = internal_setAcr(
    withAccessControlResource,
    updatedAcr
  );
  return updatedResource;
}
