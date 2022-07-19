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
import { ACL, ACP } from "../constants";
import {
  DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
  TEST_URL,
} from "../mock/constants";
import { createDatasetFromSubjects } from "../mock/dataset";
import { mockAccessControlledResource } from "../mock/mockAccessControlledResource";
import { setAgentAccess } from "./setAgentAccess";

describe("setAgentAccess()", () => {
  it("sets an access mode for an empty ACR", async () => {
    const resource = mockAccessControlledResource();

    expect(resource.internal_acp.acr.graphs).toStrictEqual({ default: {} });

    expect(
      (await setAgentAccess(resource, TEST_URL.defaultWebId, { read: true }))
        .internal_acp.acr.graphs.default
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
          [[ACP.agent, [TEST_URL.defaultWebId]]],
        ],
      ]).graphs.default
    );
  });

  it("sets no access mode for an empty access modes set", async () => {
    const resource = mockAccessControlledResource();

    expect(resource.internal_acp.acr.graphs).toStrictEqual({ default: {} });

    expect(
      (await setAgentAccess(resource, TEST_URL.defaultWebId, {})).internal_acp
        .acr.graphs.default
    ).toStrictEqual({});
  });

  it("removes an access mode for an existing default matcher", async () => {
    const testDataset = createDatasetFromSubjects([
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
        [[ACP.agent, [TEST_URL.defaultWebId]]],
      ],
    ]);
    const resource = mockAccessControlledResource(testDataset);

    expect(
      (await setAgentAccess(resource, TEST_URL.defaultWebId, { read: false }))
        .internal_acp.acr.graphs.default
    ).toStrictEqual({
      ...testDataset.graphs.default,
      [TEST_URL.defaultAccessControlAgentMatcherReadPolicyMatcher]: {
        predicates: {
          [ACP.agent]: {
            namedNodes: [],
          },
        },
        type: "Subject",
        url: TEST_URL.defaultAccessControlAgentMatcherReadPolicyMatcher,
      },
    });
  });

  it("adds full access for an agent", async () => {
    expect(
      (
        await setAgentAccess(
          mockAccessControlledResource(),
          TEST_URL.defaultWebId,
          {
            read: true,
            append: true,
            write: true,
            controlRead: true,
            controlWrite: true,
          }
        )
      ).internal_acp.acr.graphs.default
    ).toStrictEqual({
      ...createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [
            [
              ACP.accessControl,
              [TEST_URL.defaultAccessControl, TEST_URL.defaultAcrAccessControl],
            ],
          ],
        ],
        [
          TEST_URL.defaultAccessControl,
          [
            [
              ACP.apply,
              [
                TEST_URL.defaultAccessControlAgentMatcherReadPolicy,
                TEST_URL.defaultAccessControlAgentMatcherAppendPolicy,
                TEST_URL.defaultAccessControlAgentMatcherWritePolicy,
              ],
            ],
          ],
        ],
        [
          TEST_URL.defaultAcrAccessControl,
          [
            [
              ACP.access,
              [
                TEST_URL.defaultAcrAccessControlAgentMatcherControlReadPolicy,
                TEST_URL.defaultAcrAccessControlAgentMatcherControlWritePolicy,
              ],
            ],
          ],
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
          TEST_URL.defaultAccessControlAgentMatcherAppendPolicy,
          [
            [
              ACP.anyOf,
              [TEST_URL.defaultAccessControlAgentMatcherAppendPolicyMatcher],
            ],
            [ACP.allow, [ACL.Append]],
          ],
        ],
        [
          TEST_URL.defaultAccessControlAgentMatcherWritePolicy,
          [
            [
              ACP.anyOf,
              [TEST_URL.defaultAccessControlAgentMatcherWritePolicyMatcher],
            ],
            [ACP.allow, [ACL.Write]],
          ],
        ],
        [
          TEST_URL.defaultAcrAccessControlAgentMatcherControlReadPolicy,
          [
            [
              ACP.anyOf,
              [
                TEST_URL.defaultAcrAccessControlAgentMatcherControlReadPolicyMatcher,
              ],
            ],
            [ACP.allow, [ACL.Read]],
          ],
        ],
        [
          TEST_URL.defaultAcrAccessControlAgentMatcherControlWritePolicy,
          [
            [
              ACP.anyOf,
              [
                TEST_URL.defaultAcrAccessControlAgentMatcherControlWritePolicyMatcher,
              ],
            ],
            [ACP.allow, [ACL.Write]],
          ],
        ],
        [
          TEST_URL.defaultAccessControlAgentMatcherReadPolicyMatcher,
          [[ACP.agent, [TEST_URL.defaultWebId]]],
        ],
        [
          TEST_URL.defaultAccessControlAgentMatcherAppendPolicyMatcher,
          [[ACP.agent, [TEST_URL.defaultWebId]]],
        ],
        [
          TEST_URL.defaultAccessControlAgentMatcherWritePolicyMatcher,
          [[ACP.agent, [TEST_URL.defaultWebId]]],
        ],
        [
          TEST_URL.defaultAcrAccessControlAgentMatcherControlReadPolicyMatcher,
          [[ACP.agent, [TEST_URL.defaultWebId]]],
        ],
        [
          TEST_URL.defaultAcrAccessControlAgentMatcherControlWritePolicyMatcher,
          [[ACP.agent, [TEST_URL.defaultWebId]]],
        ],
      ]).graphs.default,
    });
  });

  it("removes all access modes for an agent", async () => {
    const dataset = createDatasetFromSubjects([
      [
        DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
        [
          [
            ACP.accessControl,
            [TEST_URL.defaultAccessControl, TEST_URL.defaultAcrAccessControl],
          ],
        ],
      ],
      [
        TEST_URL.defaultAccessControl,
        [
          [
            ACP.apply,
            [
              TEST_URL.defaultAccessControlAgentMatcherReadPolicy,
              TEST_URL.defaultAccessControlAgentMatcherAppendPolicy,
              TEST_URL.defaultAccessControlAgentMatcherWritePolicy,
            ],
          ],
        ],
      ],
      [
        TEST_URL.defaultAcrAccessControl,
        [
          [
            ACP.access,
            [
              TEST_URL.defaultAcrAccessControlAgentMatcherControlReadPolicy,
              TEST_URL.defaultAcrAccessControlAgentMatcherControlWritePolicy,
            ],
          ],
        ],
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
        TEST_URL.defaultAccessControlAgentMatcherAppendPolicy,
        [
          [
            ACP.anyOf,
            [TEST_URL.defaultAccessControlAgentMatcherAppendPolicyMatcher],
          ],
          [ACP.allow, [ACL.Append]],
        ],
      ],
      [
        TEST_URL.defaultAccessControlAgentMatcherWritePolicy,
        [
          [
            ACP.anyOf,
            [TEST_URL.defaultAccessControlAgentMatcherWritePolicyMatcher],
          ],
          [ACP.allow, [ACL.Write]],
        ],
      ],
      [
        TEST_URL.defaultAcrAccessControlAgentMatcherControlReadPolicy,
        [
          [
            ACP.anyOf,
            [
              TEST_URL.defaultAcrAccessControlAgentMatcherControlReadPolicyMatcher,
            ],
          ],
          [ACP.allow, [ACL.Read]],
        ],
      ],
      [
        TEST_URL.defaultAcrAccessControlAgentMatcherControlWritePolicy,
        [
          [
            ACP.anyOf,
            [
              TEST_URL.defaultAcrAccessControlAgentMatcherControlWritePolicyMatcher,
            ],
          ],
          [ACP.allow, [ACL.Write]],
        ],
      ],
      [
        TEST_URL.defaultAccessControlAgentMatcherReadPolicyMatcher,
        [[ACP.agent, [TEST_URL.defaultWebId, TEST_URL.otherWebId]]],
      ],
      [
        TEST_URL.defaultAccessControlAgentMatcherAppendPolicyMatcher,
        [[ACP.agent, [TEST_URL.defaultWebId, TEST_URL.otherWebId]]],
      ],
      [
        TEST_URL.defaultAccessControlAgentMatcherWritePolicyMatcher,
        [[ACP.agent, [TEST_URL.defaultWebId, TEST_URL.otherWebId]]],
      ],
      [
        TEST_URL.defaultAcrAccessControlAgentMatcherControlReadPolicyMatcher,
        [[ACP.agent, [TEST_URL.defaultWebId, TEST_URL.otherWebId]]],
      ],
      [
        TEST_URL.defaultAcrAccessControlAgentMatcherControlWritePolicyMatcher,
        [[ACP.agent, [TEST_URL.defaultWebId, TEST_URL.otherWebId]]],
      ],
    ]);
    const datasetWithoutDefaultWebId = createDatasetFromSubjects([
      [
        DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
        [
          [
            ACP.accessControl,
            [TEST_URL.defaultAccessControl, TEST_URL.defaultAcrAccessControl],
          ],
        ],
      ],
      [
        TEST_URL.defaultAccessControl,
        [
          [
            ACP.apply,
            [
              TEST_URL.defaultAccessControlAgentMatcherReadPolicy,
              TEST_URL.defaultAccessControlAgentMatcherAppendPolicy,
              TEST_URL.defaultAccessControlAgentMatcherWritePolicy,
            ],
          ],
        ],
      ],
      [
        TEST_URL.defaultAcrAccessControl,
        [
          [
            ACP.access,
            [
              TEST_URL.defaultAcrAccessControlAgentMatcherControlReadPolicy,
              TEST_URL.defaultAcrAccessControlAgentMatcherControlWritePolicy,
            ],
          ],
        ],
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
        TEST_URL.defaultAccessControlAgentMatcherAppendPolicy,
        [
          [
            ACP.anyOf,
            [TEST_URL.defaultAccessControlAgentMatcherAppendPolicyMatcher],
          ],
          [ACP.allow, [ACL.Append]],
        ],
      ],
      [
        TEST_URL.defaultAccessControlAgentMatcherWritePolicy,
        [
          [
            ACP.anyOf,
            [TEST_URL.defaultAccessControlAgentMatcherWritePolicyMatcher],
          ],
          [ACP.allow, [ACL.Write]],
        ],
      ],
      [
        TEST_URL.defaultAcrAccessControlAgentMatcherControlReadPolicy,
        [
          [
            ACP.anyOf,
            [
              TEST_URL.defaultAcrAccessControlAgentMatcherControlReadPolicyMatcher,
            ],
          ],
          [ACP.allow, [ACL.Read]],
        ],
      ],
      [
        TEST_URL.defaultAcrAccessControlAgentMatcherControlWritePolicy,
        [
          [
            ACP.anyOf,
            [
              TEST_URL.defaultAcrAccessControlAgentMatcherControlWritePolicyMatcher,
            ],
          ],
          [ACP.allow, [ACL.Write]],
        ],
      ],
      [
        TEST_URL.defaultAccessControlAgentMatcherReadPolicyMatcher,
        [[ACP.agent, [TEST_URL.otherWebId]]],
      ],
      [
        TEST_URL.defaultAccessControlAgentMatcherAppendPolicyMatcher,
        [[ACP.agent, [TEST_URL.otherWebId]]],
      ],
      [
        TEST_URL.defaultAccessControlAgentMatcherWritePolicyMatcher,
        [[ACP.agent, [TEST_URL.otherWebId]]],
      ],
      [
        TEST_URL.defaultAcrAccessControlAgentMatcherControlReadPolicyMatcher,
        [[ACP.agent, [TEST_URL.otherWebId]]],
      ],
      [
        TEST_URL.defaultAcrAccessControlAgentMatcherControlWritePolicyMatcher,
        [[ACP.agent, [TEST_URL.otherWebId]]],
      ],
    ]);

    expect(
      (
        await setAgentAccess(
          mockAccessControlledResource(dataset),
          TEST_URL.defaultWebId,
          {
            read: false,
            append: false,
            write: false,
            controlRead: false,
            controlWrite: false,
          }
        )
      ).internal_acp.acr.graphs.default
    ).toStrictEqual({
      ...datasetWithoutDefaultWebId.graphs.default,
    });
  });
});
