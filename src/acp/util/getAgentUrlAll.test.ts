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
import { getAgentUrlAll } from "./getAgentUrlAll";

describe("getAgentUrlAll", () => {
  it("returns an empty array if the ACR is empty", () => {
    expect(getAgentUrlAll(mockAccessControlledResource())).toStrictEqual([]);
  });

  it("returns agents defined in a matcher", () => {
    expect(
      getAgentUrlAll(
        mockAccessControlledResource(
          createDatasetFromSubjects([
            [
              "https://example.org/subject_resource",
              [
                [
                  ACP.agent,
                  [
                    "https://example.org/x",
                    "https://example.org/y",
                    "https://example.org/z",
                  ],
                ],
              ],
            ],
          ])
        )
      )
    ).toStrictEqual([
      "https://example.org/x",
      "https://example.org/y",
      "https://example.org/z",
    ]);
  });

  it("returns agents defined in a matcher only once", () => {
    expect(
      getAgentUrlAll(
        mockAccessControlledResource(
          createDatasetFromSubjects([
            [
              "https://example.org/subject_resource_1",
              [
                [
                  ACP.agent,
                  [
                    "https://example.org/x",
                    "https://example.org/y",
                    "https://example.org/z",
                  ],
                ],
              ],
            ],
            [
              "https://example.org/subject_resource_2",
              [[ACP.agent, ["https://example.org/x"]]],
            ],
          ])
        )
      )
    ).toStrictEqual([
      "https://example.org/x",
      "https://example.org/y",
      "https://example.org/z",
    ]);
  });
});
