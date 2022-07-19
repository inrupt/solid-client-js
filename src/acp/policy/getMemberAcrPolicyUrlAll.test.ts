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
import { ACP } from "../constants";
import {
  DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
  TEST_URL,
} from "../mock/constants";
import { mockAccessControlledResource } from "../mock/mockAccessControlledResource";
import { createDatasetFromSubjects } from "../mock/dataset";
import { getMemberAcrPolicyUrlAll } from "./getMemberAcrPolicyUrlAll";

describe("getMemberAcrPolicyUrlAll()", () => {
  it("returns an empty array for empty ACR", async () => {
    const resource = mockAccessControlledResource();

    expect(getMemberAcrPolicyUrlAll(resource)).toStrictEqual([]);
  });

  it("returns a member ACR policy URL when present", async () => {
    const resource = mockAccessControlledResource(
      createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [[ACP.memberAccessControl, [TEST_URL.memberAccessControl1]]],
        ],
        [
          TEST_URL.memberAccessControl1,
          [[ACP.access, [TEST_URL.memberAccessControl1AccessPolicy1]]],
        ],
      ])
    );

    expect(getMemberAcrPolicyUrlAll(resource)).toStrictEqual([
      TEST_URL.memberAccessControl1AccessPolicy1,
    ]);
  });

  it("returns all member ACR policy URLs when present", async () => {
    const resource = mockAccessControlledResource(
      createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [
            [
              ACP.memberAccessControl,
              [TEST_URL.memberAccessControl1, TEST_URL.memberAccessControl2],
            ],
          ],
        ],
        [
          TEST_URL.memberAccessControl1,
          [[ACP.access, [TEST_URL.memberAccessControl1AccessPolicy1]]],
        ],
        [
          TEST_URL.memberAccessControl2,
          [
            [
              ACP.access,
              [
                TEST_URL.memberAccessControl2AccessPolicy1,
                TEST_URL.memberAccessControl2AccessPolicy2,
              ],
            ],
          ],
        ],
      ])
    );

    expect(getMemberAcrPolicyUrlAll(resource)).toStrictEqual([
      TEST_URL.memberAccessControl1AccessPolicy1,
      TEST_URL.memberAccessControl2AccessPolicy1,
      TEST_URL.memberAccessControl2AccessPolicy2,
    ]);
  });

  it("doesn't pick up non member ACR policy URLs", async () => {
    const resource = mockAccessControlledResource(
      createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [
            [
              ACP.memberAccessControl,
              [TEST_URL.memberAccessControl1, TEST_URL.memberAccessControl2],
            ],
            [ACP.accessControl, [TEST_URL.accessControl1]],
          ],
        ],
        [
          TEST_URL.memberAccessControl1,
          [
            [ACP.access, [TEST_URL.memberAccessControl1AccessPolicy1]],
            [ACP.apply, [TEST_URL.memberAccessControl1Policy1]],
          ],
        ],
        [
          TEST_URL.memberAccessControl2,
          [
            [
              ACP.access,
              [
                TEST_URL.memberAccessControl2AccessPolicy1,
                TEST_URL.memberAccessControl2AccessPolicy2,
              ],
            ],
          ],
        ],
        [
          TEST_URL.accessControl1,
          [
            [ACP.access, [TEST_URL.accessControl1AccessPolicy1]],
            [ACP.apply, [TEST_URL.accessControl1Policy1]],
          ],
        ],
      ])
    );

    expect(getMemberAcrPolicyUrlAll(resource)).toStrictEqual([
      TEST_URL.memberAccessControl1AccessPolicy1,
      TEST_URL.memberAccessControl2AccessPolicy1,
      TEST_URL.memberAccessControl2AccessPolicy2,
    ]);
  });
});
