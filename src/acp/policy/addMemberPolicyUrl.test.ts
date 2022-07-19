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
import { TEST_URL } from "../mock/constants";
import { mockAccessControlledResource } from "../mock/mockAccessControlledResource";
import { addMemberPolicyUrl } from "./addMemberPolicyUrl";

describe("addMemberPolicyUrl()", () => {
  it("returns a resource whose ACR contains the added member policy", async () => {
    const resource = mockAccessControlledResource();

    expect(resource.internal_acp.acr.graphs).toStrictEqual({ default: {} });
    expect(
      addMemberPolicyUrl(resource, TEST_URL.defaultMemberAccessControlPolicy1)
        .internal_acp.acr.graphs
    ).toStrictEqual({
      default: {
        [TEST_URL.accessControlResource]: {
          predicates: {
            [ACP.memberAccessControl]: {
              namedNodes: [TEST_URL.defaultMemberAccessControl],
            },
          },
          type: "Subject",
          url: TEST_URL.accessControlResource,
        },
        [TEST_URL.defaultMemberAccessControl]: {
          predicates: {
            [ACP.apply]: {
              namedNodes: [TEST_URL.defaultMemberAccessControlPolicy1],
            },
          },
          type: "Subject",
          url: TEST_URL.defaultMemberAccessControl,
        },
      },
    });
  });

  it("adds to the pre-existing default member access control", async () => {
    const resource = mockAccessControlledResource();

    expect(resource.internal_acp.acr.graphs).toStrictEqual({ default: {} });

    const resourceWithDefaultAccessControlPolicy1 = addMemberPolicyUrl(
      resource,
      TEST_URL.defaultMemberAccessControlPolicy1
    );

    expect(
      addMemberPolicyUrl(
        resourceWithDefaultAccessControlPolicy1,
        TEST_URL.defaultMemberAccessControlPolicy2
      ).internal_acp.acr.graphs
    ).toStrictEqual({
      default: {
        [TEST_URL.accessControlResource]: {
          predicates: {
            [ACP.memberAccessControl]: {
              namedNodes: [TEST_URL.defaultMemberAccessControl],
            },
          },
          type: "Subject",
          url: TEST_URL.accessControlResource,
        },
        [TEST_URL.defaultMemberAccessControl]: {
          predicates: {
            [ACP.apply]: {
              namedNodes: [
                TEST_URL.defaultMemberAccessControlPolicy1,
                TEST_URL.defaultMemberAccessControlPolicy2,
              ],
            },
          },
          type: "Subject",
          url: TEST_URL.defaultMemberAccessControl,
        },
      },
    });
  });
});
