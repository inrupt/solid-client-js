/**
 * Copyright 2020 Inrupt Inc.
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

import { WithAccessibleAcr } from "../acp/acp";
import { getAcrPolicyUrlAll, getPolicyUrlAll } from "../acp/control";
import { internal_getAcr } from "../acp/control.internal";
import { getPolicyAll } from "../acp/policy";
import { getRuleAll } from "../acp/rule";
import { acp } from "../constants";
import { WithResourceInfo } from "../interfaces";
import { getSourceIri } from "../resource/resource";
import { getSolidDataset } from "../resource/solidDataset";
import { getUrlAll } from "../thing/get";
import { asUrl, getThing } from "../thing/thing";

export function internal_hasInaccessiblePolicies(
  resource: WithAccessibleAcr & WithResourceInfo
): boolean {
  const sourceIri = getSourceIri(resource);

  // Collect all policies that apply to the resource or its ACR (aka active)
  const activePolicyUrls = getPolicyUrlAll(resource);
  getAcrPolicyUrlAll(resource).forEach((policyUrl) => {
    activePolicyUrls.push(policyUrl);
  });

  // Collect all the rules referenced by the active policies.
  const ruleUrls: string[] = [];
  activePolicyUrls.forEach((policyUrl) => {
    const acr = internal_getAcr(resource);
    const policyThing = getThing(acr, policyUrl);
    if (policyThing !== null) {
      getUrlAll(policyThing, acp.anyOf).forEach((activeRuleUrl) =>
        ruleUrls.push(activeRuleUrl)
      );
      getUrlAll(policyThing, acp.allOf).forEach((activeRuleUrl) =>
        ruleUrls.push(activeRuleUrl)
      );
      getUrlAll(policyThing, acp.noneOf).forEach((activeRuleUrl) =>
        ruleUrls.push(activeRuleUrl)
      );
    }
  });
  // If either an active policy or rule are not defined in the ACR, return false
  return (
    activePolicyUrls
      .concat(ruleUrls)
      .findIndex((url) => url.substring(0, sourceIri.length) !== sourceIri) !==
    -1
  );
}
