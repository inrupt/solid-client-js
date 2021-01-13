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
import { getPolicyUrlAll } from "../acp/control";
import { internal_getAcr } from "../acp/control.internal";
import { getRuleAll } from "../acp/rule";
import { WithResourceInfo } from "../interfaces";
import { getSourceIri } from "../resource/resource";
import { asUrl } from "../thing/thing";

export function internal_hasInaccessiblePolicies(
  resource: WithAccessibleAcr & WithResourceInfo
): boolean {
  const sourceIri = getSourceIri(resource);
  const policyUrls = getPolicyUrlAll(resource);
  const ruleUrls = getRuleAll(internal_getAcr(resource)).map((rule) =>
    asUrl(rule)
  );
  // If either a policy or a rule are not defined in the ACR, return false
  return (
    policyUrls
      .concat(ruleUrls)
      .findIndex((url) => url.substring(0, sourceIri.length) !== sourceIri) !==
    -1
  );
}
