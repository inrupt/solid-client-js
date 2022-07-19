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

import { addMockResourceAclTo, addMockFallbackAclTo } from "./mock";
import { mockSolidDatasetFrom, mockFileFrom } from "../resource/mock";
import {
  hasResourceAcl,
  getResourceAcl,
  hasFallbackAcl,
  getFallbackAcl,
} from "./acl";
import { getSourceIri } from "../resource/resource";

describe("addMockResourceAclTo", () => {
  it("is available on a returned SolidDataset", async () => {
    const mockedDataset = mockSolidDatasetFrom("https://some.pod/resource");

    const mockedDatasetWithMockedAcl = addMockResourceAclTo(mockedDataset);

    expect(hasResourceAcl(mockedDatasetWithMockedAcl)).toBe(true);
  });

  it("can be retrieved from a returned SolidDataset", async () => {
    const mockedDataset = mockSolidDatasetFrom("https://some.pod/resource");

    const mockedDatasetWithMockedAcl = addMockResourceAclTo(mockedDataset);

    expect(getResourceAcl(mockedDatasetWithMockedAcl)).toBeDefined();
    expect(getResourceAcl(mockedDatasetWithMockedAcl)).not.toBeNull();
  });

  it("is available on a returned File", async () => {
    const mockedFile = mockFileFrom("https://some.pod/resource");

    const mockedFileWithMockedAcl = addMockResourceAclTo(mockedFile);

    expect(hasResourceAcl(mockedFileWithMockedAcl)).toBe(true);
  });

  it("can be retrieved from a returned File", async () => {
    const mockedFile = mockFileFrom("https://some.pod/resource");

    const mockedFileWithMockedAcl = addMockResourceAclTo(mockedFile);

    expect(getResourceAcl(mockedFileWithMockedAcl)).toBeDefined();
    expect(getResourceAcl(mockedFileWithMockedAcl)).not.toBeNull();
  });

  it("is uses the server-decided ACL URL if available", async () => {
    const mockedDataset = mockSolidDatasetFrom("https://some.pod/resource");
    mockedDataset.internal_resourceInfo.aclUrl =
      "https://some.pod/arbitrary-location.acl";

    const mockedDatasetWithMockedAcl = addMockResourceAclTo(mockedDataset);
    const mockedResourceAcl = getResourceAcl(mockedDatasetWithMockedAcl);

    expect(getSourceIri(mockedResourceAcl)).toBe(
      "https://some.pod/arbitrary-location.acl"
    );
  });
});

describe("addMockFallbackAclTo", () => {
  it("is available on a returned SolidDataset", async () => {
    const mockedDataset = mockSolidDatasetFrom("https://some.pod/resource");

    const mockedDatasetWithMockedAcl = addMockFallbackAclTo(mockedDataset);

    expect(hasFallbackAcl(mockedDatasetWithMockedAcl)).toBe(true);
  });

  it("can be retrieved from a returned SolidDataset", async () => {
    const mockedDataset = mockSolidDatasetFrom("https://some.pod/resource");

    const mockedDatasetWithMockedAcl = addMockFallbackAclTo(mockedDataset);

    expect(getFallbackAcl(mockedDatasetWithMockedAcl)).toBeDefined();
    expect(getFallbackAcl(mockedDatasetWithMockedAcl)).not.toBeNull();
  });

  it("is available on a returned File", async () => {
    const mockedFile = mockFileFrom("https://some.pod/resource");

    const mockedFileWithMockedAcl = addMockFallbackAclTo(mockedFile);

    expect(hasFallbackAcl(mockedFileWithMockedAcl)).toBe(true);
  });

  it("can be retrieved from a returned File", async () => {
    const mockedFile = mockFileFrom("https://some.pod/resource");

    const mockedFileWithMockedAcl = addMockFallbackAclTo(mockedFile);

    expect(getFallbackAcl(mockedFileWithMockedAcl)).toBeDefined();
    expect(getFallbackAcl(mockedFileWithMockedAcl)).not.toBeNull();
  });
});
