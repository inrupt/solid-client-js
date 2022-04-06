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
  hasLinkedAcr,
  removeAcrPolicyUrlAll,
  removeMemberAcrPolicyUrlAll,
  removeMemberPolicyUrlAll,
  removePolicyUrlAll,
} from "./control";

export { addAcrPolicyUrl } from "./policy/addAcrPolicyUrl";

export { addMemberAcrPolicyUrl } from "./policy/addMemberAcrPolicyUrl";

export { addMemberPolicyUrl } from "./policy/addMemberPolicyUrl";

export { addPolicyUrl } from "./policy/addPolicyUrl";

export { getAcrPolicyUrlAll } from "./policy/getAcrPolicyUrlAll";

export { getMemberAcrPolicyUrlAll } from "./policy/getMemberAcrPolicyUrlAll";

export { getMemberPolicyUrlAll } from "./policy/getMemberPolicyUrlAll";

export { getPolicyUrlAll } from "./policy/getPolicyUrlAll";

export { removeAcrPolicyUrl } from "./policy/removeAcrPolicyUrl";

export { removeMemberAcrPolicyUrl } from "./policy/removeMemberAcrPolicyUrl";

export { removeMemberPolicyUrl } from "./policy/removeMemberPolicyUrl";

export { removePolicyUrl } from "./policy/removePolicyUrl";

export { setResourcePolicy } from "./policy/setResourcePolicy";

export {
  createPolicy,
  getPolicy,
  getPolicyAll,
  removePolicy,
  setPolicy,
  createResourcePolicyFor,
  getResourceAcrPolicy,
  getResourceAcrPolicyAll,
  getResourcePolicy,
  getResourcePolicyAll,
  removeResourceAcrPolicy,
  removeResourcePolicy,
  getAllowModesV2 as getAllowModes,
  getDenyModesV2 as getDenyModes,
  setAllowModesV2 as setAllowModes,
  setDenyModesV2 as setDenyModes,
} from "./policy";

export {
  addAgent,
  addNoneOfMatcherUrl,
  addAnyOfMatcherUrl,
  addAllOfMatcherUrl,
  createMatcher,
  getAgentAll,
  getNoneOfMatcherUrlAll,
  getAnyOfMatcherUrlAll,
  getAllOfMatcherUrlAll,
  getMatcher,
  getMatcherAll,
  hasAuthenticated,
  hasCreator,
  hasPublic,
  removeAgent,
  removeNoneOfMatcherUrl,
  removeAnyOfMatcherUrl,
  removeAllOfMatcherUrl,
  removeMatcher,
  setAgent,
  setAuthenticated,
  setCreator,
  setNoneOfMatcherUrl,
  setAnyOfMatcherUrl,
  setPublic,
  setAllOfMatcherUrl,
  setMatcher,
  addClient,
  getClientAll,
  removeClient,
  setClient,
  removeAuthenticated,
  removeCreator,
  removePublic,
  createResourceMatcherFor,
  getResourceMatcher,
  getResourceMatcherAll,
  removeResourceMatcher,
  setResourceMatcher,
} from "./matcher";

export { addMockAcrTo, mockAcrFor } from "./mock";

export { getVcAccess } from "./util/getVcAccess";

export { setVcAccess } from "./util/setVcAccess";
