//
// Copyright Inrupt Inc.
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
import * as ResourceModule from "../resource/resource";
import { getAclServerResourceInfo } from "./getAclServerResourceInfo";
import type { WithServerResourceInfo } from "../interfaces";

const { getResourceInfo } = ResourceModule;

jest.mock("../resource/resource", () => ({
  getResourceInfo: jest.fn(),
}));

const mockResourceInfo = (options: {
  aclUrl?: string;
}): WithServerResourceInfo["internal_resourceInfo"] => ({
  isRawData: false,
  aclUrl: options.aclUrl,
  sourceIri: "https://example.org/some-resource",
  linkedResources: {},
});

describe("getAclServerResourceInfo", () => {
  it("fetches the ACL resource info if the resource has an ACL", async () => {
    const aclResourceInfo = mockResourceInfo({});
    const { getResourceInfo } = jest.mocked(ResourceModule);
    getResourceInfo.mockResolvedValueOnce({
      internal_resourceInfo: aclResourceInfo,
    });

    await expect(
      getAclServerResourceInfo({
        internal_resourceInfo: mockResourceInfo({
          aclUrl: "https://example.org/some-acl",
        }),
      }),
    ).resolves.toStrictEqual({
      internal_resourceInfo: aclResourceInfo,
    });
  });

  it("returns null if the resource ACL cannot be discovered", async () => {
    const { getResourceInfo } = jest.mocked(ResourceModule);
    getResourceInfo.mockRejectedValueOnce(null);
    await expect(
      getAclServerResourceInfo({
        internal_resourceInfo: mockResourceInfo({
          aclUrl: "https://example.org/some-missing-acl",
        }),
      }),
    ).resolves.toBeNull();
  });

  it("returns null if fetching the resource ACL fails", async () => {
    await expect(
      getAclServerResourceInfo({
        internal_resourceInfo: mockResourceInfo({ aclUrl: undefined }),
      }),
    ).resolves.toBeNull();
  });

  it("passes the fetch option to fetch the ACL resource info", async () => {
    const mockedFetch = jest.fn<typeof fetch>();
    await getAclServerResourceInfo(
      {
        internal_resourceInfo: mockResourceInfo({
          aclUrl: "https://example.org/some-acl",
        }),
      },
      { fetch: mockedFetch },
    );
    expect(getResourceInfo).toHaveBeenCalledTimes(1);
    expect(getResourceInfo).toHaveBeenCalledWith(
      "https://example.org/some-acl",
      { fetch: mockedFetch },
    );
  });
});
