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
import { TEST_URL } from "../mock/constants";
import { mockAccessControlledResource } from "../mock/mockAccessControlledResource";
import { addMemberAcrPolicyUrl } from "./addMemberAcrPolicyUrl";

describe("addMemberAcrPolicyUrl()", () => {
  it("returns a resource whose ACR contains the added member ACR policy", async () => {
    const resource = mockAccessControlledResource();

    expect(resource.internal_acp.acr.graphs).toStrictEqual({ default: {} });
    expect(
      addMemberAcrPolicyUrl(
        resource,
        TEST_URL.defaultMemberAcrAccessControlPolicy1
      ).internal_acp.acr.graphs
    ).toStrictEqual({
      default: {
        [TEST_URL.accessControlResource]: {
          predicates: {
            [ACP.memberAccessControl]: {
              namedNodes: [TEST_URL.defaultMemberAcrAccessControl],
            },
          },
          type: "Subject",
          url: TEST_URL.accessControlResource,
        },
        [TEST_URL.defaultMemberAcrAccessControl]: {
          predicates: {
            [ACP.access]: {
              namedNodes: [TEST_URL.defaultMemberAcrAccessControlPolicy1],
            },
          },
          type: "Subject",
          url: TEST_URL.defaultMemberAcrAccessControl,
        },
      },
    });
  });

  it("adds to the pre-existing default member ACR access control", async () => {
    const resource = mockAccessControlledResource();

    expect(resource.internal_acp.acr.graphs).toStrictEqual({ default: {} });

    const resourceWithDefaultMemberAcrAccessControlPolicy1 =
      addMemberAcrPolicyUrl(
        resource,
        TEST_URL.defaultMemberAcrAccessControlPolicy1
      );

    expect(
      addMemberAcrPolicyUrl(
        resourceWithDefaultMemberAcrAccessControlPolicy1,
        TEST_URL.defaultMemberAcrAccessControlPolicy2
      ).internal_acp.acr.graphs
    ).toStrictEqual({
      default: {
        [TEST_URL.accessControlResource]: {
          predicates: {
            [ACP.memberAccessControl]: {
              namedNodes: [TEST_URL.defaultMemberAcrAccessControl],
            },
          },
          type: "Subject",
          url: TEST_URL.accessControlResource,
        },
        [TEST_URL.defaultMemberAcrAccessControl]: {
          predicates: {
            [ACP.access]: {
              namedNodes: [
                TEST_URL.defaultMemberAcrAccessControlPolicy1,
                TEST_URL.defaultMemberAcrAccessControlPolicy2,
              ],
            },
          },
          type: "Subject",
          url: TEST_URL.defaultMemberAcrAccessControl,
        },
      },
    });
  });
});
