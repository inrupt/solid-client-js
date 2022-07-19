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

import { describe, it, expect } from "@jest/globals";
import { ACP } from "../constants";
import {
  DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
  TEST_URL,
} from "../mock/constants";
import { createDatasetFromSubjects } from "../mock/dataset";
import { mockAccessControlledResource } from "../mock/mockAccessControlledResource";
import { removePolicyUrl } from "./removePolicyUrl";

describe("removePolicyUrl()", () => {
  it("returns a resource whose ACR does not contain the removed resource policy", async () => {
    const resource = mockAccessControlledResource(
      createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [[ACP.accessControl, [TEST_URL.defaultAccessControl]]],
        ],
        [
          TEST_URL.defaultAccessControl,
          [[ACP.apply, [TEST_URL.defaultAccessControlPolicy1]]],
        ],
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
              namedNodes: [TEST_URL.defaultAccessControlPolicy1],
            },
          },
          type: "Subject",
          url: TEST_URL.defaultAccessControl,
        },
      },
    });

    expect(
      removePolicyUrl(resource, TEST_URL.defaultAccessControlPolicy1)
        .internal_acp.acr.graphs
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
              namedNodes: [],
            },
          },
          type: "Subject",
          url: TEST_URL.defaultAccessControl,
        },
      },
    });
  });

  it("does not remove non resource policies", async () => {
    const resource = mockAccessControlledResource(
      createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [
            [
              ACP.accessControl,
              [TEST_URL.defaultAccessControl, TEST_URL.defaultAcrAccessControl],
            ],
            [
              ACP.memberAccessControl,
              [
                TEST_URL.defaultMemberAccessControl,
                TEST_URL.defaultMemberAcrAccessControl,
              ],
            ],
          ],
        ],
        [TEST_URL.defaultAccessControl, [[ACP.apply, [TEST_URL.policy1]]]],
        [TEST_URL.defaultAcrAccessControl, [[ACP.access, [TEST_URL.policy1]]]],
        [
          TEST_URL.defaultMemberAccessControl,
          [[ACP.apply, [TEST_URL.policy1]]],
        ],
        [
          TEST_URL.defaultMemberAcrAccessControl,
          [[ACP.access, [TEST_URL.policy1]]],
        ],
      ])
    );

    expect(resource.internal_acp.acr.graphs).toStrictEqual({
      default: {
        [TEST_URL.accessControlResource]: {
          predicates: {
            [ACP.accessControl]: {
              namedNodes: [
                TEST_URL.defaultAccessControl,
                TEST_URL.defaultAcrAccessControl,
              ],
            },
            [ACP.memberAccessControl]: {
              namedNodes: [
                TEST_URL.defaultMemberAccessControl,
                TEST_URL.defaultMemberAcrAccessControl,
              ],
            },
          },
          type: "Subject",
          url: TEST_URL.accessControlResource,
        },
        [TEST_URL.defaultAccessControl]: {
          predicates: {
            [ACP.apply]: {
              namedNodes: [TEST_URL.policy1],
            },
          },
          type: "Subject",
          url: TEST_URL.defaultAccessControl,
        },
        [TEST_URL.defaultAcrAccessControl]: {
          predicates: {
            [ACP.access]: {
              namedNodes: [TEST_URL.policy1],
            },
          },
          type: "Subject",
          url: TEST_URL.defaultAcrAccessControl,
        },
        [TEST_URL.defaultMemberAccessControl]: {
          predicates: {
            [ACP.apply]: {
              namedNodes: [TEST_URL.policy1],
            },
          },
          type: "Subject",
          url: TEST_URL.defaultMemberAccessControl,
        },
        [TEST_URL.defaultMemberAcrAccessControl]: {
          predicates: {
            [ACP.access]: {
              namedNodes: [TEST_URL.policy1],
            },
          },
          type: "Subject",
          url: TEST_URL.defaultMemberAcrAccessControl,
        },
      },
    });

    expect(
      removePolicyUrl(resource, TEST_URL.policy1).internal_acp.acr.graphs
    ).toStrictEqual({
      default: {
        [TEST_URL.accessControlResource]: {
          predicates: {
            [ACP.accessControl]: {
              namedNodes: [
                TEST_URL.defaultAccessControl,
                TEST_URL.defaultAcrAccessControl,
              ],
            },
            [ACP.memberAccessControl]: {
              namedNodes: [
                TEST_URL.defaultMemberAccessControl,
                TEST_URL.defaultMemberAcrAccessControl,
              ],
            },
          },
          type: "Subject",
          url: TEST_URL.accessControlResource,
        },
        [TEST_URL.defaultAccessControl]: {
          predicates: {
            [ACP.apply]: {
              namedNodes: [],
            },
          },
          type: "Subject",
          url: TEST_URL.defaultAccessControl,
        },
        [TEST_URL.defaultAcrAccessControl]: {
          predicates: {
            [ACP.access]: {
              namedNodes: [TEST_URL.policy1],
            },
          },
          type: "Subject",
          url: TEST_URL.defaultAcrAccessControl,
        },
        [TEST_URL.defaultMemberAccessControl]: {
          predicates: {
            [ACP.apply]: {
              namedNodes: [TEST_URL.policy1],
            },
          },
          type: "Subject",
          url: TEST_URL.defaultMemberAccessControl,
        },
        [TEST_URL.defaultMemberAcrAccessControl]: {
          predicates: {
            [ACP.access]: {
              namedNodes: [TEST_URL.policy1],
            },
          },
          type: "Subject",
          url: TEST_URL.defaultMemberAcrAccessControl,
        },
      },
    });
  });
});
