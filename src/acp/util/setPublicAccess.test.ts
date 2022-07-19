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

import { jest, describe, it, expect } from "@jest/globals";
import { ACL, ACP } from "../constants";
import {
  DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
  TEST_URL,
} from "../mock/constants";
import { createDatasetFromSubjects } from "../mock/dataset";
import { mockAccessControlledResource } from "../mock/mockAccessControlledResource";
import { setPublicAccess } from "./setPublicAccess";

describe("setPublicAccess()", () => {
  it("sets an access mode for the Public", async () => {
    const resource = mockAccessControlledResource();

    expect(resource.internal_acp.acr.graphs).toStrictEqual({ default: {} });

    expect(
      (await setPublicAccess(resource, { read: true })).internal_acp.acr.graphs
        .default
    ).toStrictEqual(
      createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [[ACP.accessControl, [TEST_URL.defaultAccessControl]]],
        ],
        [
          TEST_URL.defaultAccessControl,
          [[ACP.apply, [TEST_URL.defaultAccessControlAgentMatcherReadPolicy]]],
        ],
        [
          TEST_URL.defaultAccessControlAgentMatcherReadPolicy,
          [
            [
              ACP.anyOf,
              [TEST_URL.defaultAccessControlAgentMatcherReadPolicyMatcher],
            ],
            [ACP.allow, [ACL.Read]],
          ],
        ],
        [
          TEST_URL.defaultAccessControlAgentMatcherReadPolicyMatcher,
          [[ACP.agent, [ACP.PublicAgent]]],
        ],
      ]).graphs.default
    );
  });
});
