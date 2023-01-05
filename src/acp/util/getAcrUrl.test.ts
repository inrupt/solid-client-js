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
import { getAcrUrl } from "./getAcrUrl";
import { getLinkedResourceUrlAll } from "../../resource/resource";
import { getAclServerResourceInfo } from "../../universal/getAclServerResourceInfo";
import { getAcrUrl as getAcrUrlLegacy } from "./getAcrUrl.legacy";

jest.mock("./getAcrUrl.legacy", () => ({
  // The legacy ACR URL discovery is mocked to fail, as ESS 1.1 has been deprecated.
  getAcrUrl: jest.fn().mockImplementation(() => null),
}));

jest.mock("../../universal/getAclServerResourceInfo");

jest.mock("../../resource/resource", () => ({
  getLinkedResourceUrlAll: jest.fn().mockImplementation(() => ({
    type: ["http://www.w3.org/ns/solid/acp#AccessControlResource"],
  })),
  getSourceUrl: jest.fn().mockImplementation(() => "x"),
}));

describe("getAcrUrl", () => {
  it("returns legacy ACR URLs", async () => {
    (
      getAcrUrlLegacy as jest.Mocked<typeof getAcrUrlLegacy>
    ).mockReturnValueOnce("x");
    const x = await getAcrUrl({} as any);
    expect(x).toBe("x");
  });

  it("returns null if the ACL resource info can't be fetched", async () => {
    (
      getAclServerResourceInfo as jest.Mocked<typeof getAclServerResourceInfo>
    ).mockResolvedValueOnce(null);
    const x = await getAcrUrl({} as any);
    expect(x).toBeNull();
  });

  it("returns the ACR URL if info is fetched and the correct link type is present", async () => {
    const x = await getAcrUrl({} as any);
    expect(x).toBe("x");
  });

  it("returns null if the correct link type is not present", async () => {
    (
      getLinkedResourceUrlAll as jest.Mocked<typeof getLinkedResourceUrlAll>
    ).mockReturnValueOnce({ type: ["y"] });
    const x = await getAcrUrl({} as any);
    expect(x).toBeNull();
  });
});
