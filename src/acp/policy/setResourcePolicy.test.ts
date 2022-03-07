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

import { jest, describe, it, expect } from "@jest/globals";
import { ACP } from "../constants";
import { addAllOfMatcherUrl } from "../matcher";
import {
  DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
  TEST_URL,
} from "../mock/constants";
import { createDatasetFromSubjects } from "../mock/dataset";
import { mockAccessControlledResource } from "../mock/mockAccessControlledResource";
import { acp_v4 } from "../v4";
import { setResourcePolicy } from "./setResourcePolicy";

describe("setResourcePolicy()", () => {
  it("returns a dataset containing the set policy and nothing else", async () => {
    const matcherUrl = TEST_URL.accessControlResource.concat("#matcherX");
    const policyUrl = TEST_URL.accessControlResource.concat("#dacp1");

    const resource = mockAccessControlledResource(
      createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [[ACP.accessControl, [TEST_URL.defaultAccessControl]]],
        ],
        [TEST_URL.defaultAccessControl, [[ACP.apply, [policyUrl]]]],
      ])
    );

    expect(resource.internal_acp.acr.graphs).toStrictEqual({
      default: {
        [TEST_URL.accessControlResource]: {
          predicates: {
            [ACP.accessControl]: {
              namedNodes: [TEST_URL.defaultAccessControl],
            },
          },
          type: "Subject",
          url: TEST_URL.accessControlResource,
        },
        [TEST_URL.defaultAccessControl]: {
          predicates: {
            [ACP.apply]: {
              namedNodes: [policyUrl],
            },
          },
          type: "Subject",
          url: TEST_URL.defaultAccessControl,
        },
      },
    });

    let policy = acp_v4.createResourcePolicyFor(resource, "dacp1");
    policy = acp_v4.addAllOfMatcherUrl(policy, matcherUrl);

    expect(
      setResourcePolicy(resource, policy).internal_acp.acr.graphs
    ).toStrictEqual({
      default: {
        [TEST_URL.accessControlResource]: {
          predicates: {
            [ACP.accessControl]: {
              namedNodes: [TEST_URL.defaultAccessControl],
            },
          },
          type: "Subject",
          url: TEST_URL.accessControlResource,
        },
        [TEST_URL.defaultAccessControl]: {
          predicates: {
            [ACP.apply]: {
              namedNodes: [policyUrl],
            },
          },
          type: "Subject",
          url: TEST_URL.defaultAccessControl,
        },
        [policyUrl]: {
          predicates: {
            ["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"]: {
              namedNodes: [ACP.Policy],
            },
            [ACP.allOf]: {
              namedNodes: [matcherUrl],
            },
          },
          type: "Subject",
          url: policyUrl,
        },
      },
    });
  });
});
