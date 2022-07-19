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

import { it, describe, expect } from "@jest/globals";
import { rdf } from "../../constants";
import { ACL, ACP, VC_ACCESS_GRANT } from "../constants";
import {
  DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
  TEST_URL,
} from "../mock/constants";
import { createDatasetFromSubjects } from "../mock/dataset";
import { mockAccessControlledResource } from "../mock/mockAccessControlledResource";
import { getVcAccess } from "./getVcAccess";
import { setVcAccess } from "./setVcAccess";

describe("getVcAccess", () => {
  it("returns the default access modes if the ACR is empty", () => {
    expect(getVcAccess(mockAccessControlledResource())).toStrictEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("returns the default access modes if the ACR does not contain the expected matcher", () => {
    expect(
      getVcAccess(
        mockAccessControlledResource(
          createDatasetFromSubjects([
            [
              DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
              [[ACP.accessControl, [TEST_URL.defaultAccessControl]]],
            ],
            [
              TEST_URL.defaultAccessControl,
              [[ACP.apply, [TEST_URL.defaultAccessControlVcPolicy]]],
            ],
            [
              TEST_URL.defaultAccessControlVcPolicy,
              [
                [rdf.type, [ACP.Policy]],
                [ACP.anyOf, [TEST_URL.defaultAccessControlVcMatcher]],
                [ACP.allow, [ACL.Read]],
              ],
            ],
            // Note that the VC matcher does not exist
          ])
        )
      )
    ).toStrictEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("returns the default access modes if the access control and the policy aren't linked in the ACR", () => {
    expect(
      getVcAccess(
        mockAccessControlledResource(
          createDatasetFromSubjects([
            [
              DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
              [[ACP.accessControl, [TEST_URL.defaultAccessControl]]],
            ],
            [
              TEST_URL.defaultAccessControl,
              // Note that the link between the Access Control and the policy is missing.
              [[rdf.type, [ACP.AccessControl]]],
            ],
            [
              TEST_URL.defaultAccessControlVcPolicy,
              [
                [rdf.type, [ACP.Policy]],
                [ACP.anyOf, [TEST_URL.defaultAccessControlVcMatcher]],
                [ACP.allow, [ACL.Read]],
              ],
            ],
            [
              TEST_URL.defaultAccessControlVcMatcher,
              [
                [rdf.type, [ACP.Matcher]],
                [ACP.vc, [VC_ACCESS_GRANT]],
              ],
            ],
          ])
        )
      )
    ).toStrictEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("returns the existing access modes if the ACR contains the appropriate Policy and Matchers, properly linked from the ACR", () => {
    const resource = mockAccessControlledResource(
      createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [[ACP.accessControl, [TEST_URL.defaultAccessControl]]],
        ],
        [
          TEST_URL.defaultAccessControl,
          [[ACP.apply, [TEST_URL.defaultAccessControlVcPolicy]]],
        ],
        [
          TEST_URL.defaultAccessControlVcPolicy,
          [
            [rdf.type, [ACP.Policy]],
            [ACP.anyOf, [TEST_URL.defaultAccessControlVcMatcher]],
            [ACP.allow, [ACL.Write]],
          ],
        ],
        [
          TEST_URL.defaultAccessControlVcMatcher,
          [
            [rdf.type, [ACP.Matcher]],
            [ACP.vc, [VC_ACCESS_GRANT]],
          ],
        ],
      ])
    );

    expect(getVcAccess(resource)).toStrictEqual({
      read: false,
      append: false,
      write: true,
      controlRead: false,
      controlWrite: false,
    });
  });
});
