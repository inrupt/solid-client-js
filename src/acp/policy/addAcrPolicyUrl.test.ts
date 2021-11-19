/**
 * Copyright 2021 Inrupt Inc.
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
import { TEST_URL } from "../mock/constants";
import { mockAccessControlledResource } from "../mock/mockAccessControlledResource";
import { addAcrPolicyUrl } from "./addAcrPolicyUrl";

describe("addAcrPolicyUrl()", () => {
  it("returns a Resource whose ACR contains the added policy", async () => {
    const resource = mockAccessControlledResource();

    expect(resource.internal_acp.acr.graphs).toStrictEqual({ default: {} });
    expect(
      addAcrPolicyUrl(resource, TEST_URL.defaultAcrAccessControlPolicy1)
        .internal_acp.acr.graphs
    ).toStrictEqual({
      default: {
        "https://example.org/acr": {
          predicates: {
            "http://www.w3.org/ns/solid/acp#accessControl": {
              namedNodes: [TEST_URL.defaultAcrAccessControl],
            },
          },
          type: "Subject",
          url: TEST_URL.accessControlResource,
        },
        "https://example.org/acr#defaultAcrAccessControl": {
          predicates: {
            "http://www.w3.org/ns/solid/acp#access": {
              namedNodes: [TEST_URL.defaultAcrAccessControlPolicy1],
            },
          },
          type: "Subject",
          url: "https://example.org/acr#defaultAcrAccessControl",
        },
      },
    });
  });

  it("Adds to the existing default access control", async () => {
    const resource = mockAccessControlledResource();

    expect(resource.internal_acp.acr.graphs).toStrictEqual({ default: {} });

    const resourceWithDefaultAcrAccessControlPolicy1 = addAcrPolicyUrl(
      resource,
      TEST_URL.defaultAcrAccessControlPolicy1
    );

    expect(
      addAcrPolicyUrl(
        resourceWithDefaultAcrAccessControlPolicy1,
        TEST_URL.defaultAcrAccessControlPolicy2
      ).internal_acp.acr.graphs
    ).toStrictEqual({
      default: {
        "https://example.org/acr": {
          predicates: {
            "http://www.w3.org/ns/solid/acp#accessControl": {
              namedNodes: [TEST_URL.defaultAcrAccessControl],
            },
          },
          type: "Subject",
          url: TEST_URL.accessControlResource,
        },
        "https://example.org/acr#defaultAcrAccessControl": {
          predicates: {
            "http://www.w3.org/ns/solid/acp#access": {
              namedNodes: [
                TEST_URL.defaultAcrAccessControlPolicy1,
                TEST_URL.defaultAcrAccessControlPolicy2,
              ],
            },
          },
          type: "Subject",
          url: "https://example.org/acr#defaultAcrAccessControl",
        },
      },
    });
  });
});
