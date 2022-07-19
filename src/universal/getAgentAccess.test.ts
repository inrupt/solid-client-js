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
import { getAgentAccess } from "./getAgentAccess";
import { getResourceInfo } from "../resource/resource";
import { getResourceAcr } from "../acp/util/getResourceAcr";
import { getAgentAccess as getAgentAccessAcp } from "../acp/util/getAgentAccess";
import { getAgentAccess as getAgentAccessWac } from "../access/wac";

jest.mock("../resource/resource", () => ({
  getResourceInfo: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("../acp/util/getResourceAcr", () => ({
  getResourceAcr: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("../acp/util/getAgentAccess", () => ({
  getAgentAccess: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("../access/wac", () => ({
  getAgentAccess: jest.fn().mockImplementation(() => ({})),
}));

describe("getAgentAccess", () => {
  it("calls the ACP module when resource has an ACR", async () => {
    await getAgentAccess("x", "y");
    expect(getResourceInfo).toHaveBeenCalledTimes(1);
    expect(getResourceInfo).toHaveBeenCalledWith("x", undefined);
    expect(getResourceAcr).toHaveBeenCalledTimes(1);
    expect(getAgentAccessAcp).toHaveBeenCalledTimes(1);
    expect(getAgentAccessAcp).toHaveBeenCalledWith({}, "y");
    expect(getAgentAccessWac).toHaveBeenCalledTimes(0);
  });

  it("calls the WAC module when resource does not have an ACR", async () => {
    (getResourceAcr as jest.Mock).mockResolvedValueOnce(null);
    await getAgentAccess("x", "y");
    expect(getResourceInfo).toHaveBeenCalledTimes(1);
    expect(getResourceInfo).toHaveBeenCalledWith("x", undefined);
    expect(getResourceAcr).toHaveBeenCalledTimes(1);
    expect(getAgentAccessWac).toHaveBeenCalledTimes(1);
    expect(getAgentAccessWac).toHaveBeenCalledWith({}, "y", undefined);
    expect(getAgentAccessAcp).toHaveBeenCalledTimes(0);
  });

  it("calls the ACR fetcher passing the fetch option", async () => {
    await getAgentAccess("x", "y", { fetch: "z" as any });
    expect(getResourceInfo).toHaveBeenCalledTimes(1);
    expect(getResourceInfo).toHaveBeenCalledWith("x", { fetch: "z" });
    expect(getResourceAcr).toHaveBeenCalledTimes(1);
    expect(getResourceAcr).toHaveBeenCalledWith({}, { fetch: "z" });
    expect(getAgentAccessAcp).toHaveBeenCalledTimes(1);
    expect(getAgentAccessAcp).toHaveBeenCalledWith({}, "y");
    expect(getAgentAccessWac).toHaveBeenCalledTimes(0);
  });

  it("calls the WAC module passing the fetch option", async () => {
    (getResourceAcr as jest.Mock).mockResolvedValueOnce(null);
    await getAgentAccess("x", "y", { fetch: "z" as any });
    expect(getResourceInfo).toHaveBeenCalledTimes(1);
    expect(getResourceInfo).toHaveBeenCalledWith("x", { fetch: "z" });
    expect(getResourceAcr).toHaveBeenCalledTimes(1);
    expect(getResourceAcr).toHaveBeenCalledWith({}, { fetch: "z" });
    expect(getAgentAccessWac).toHaveBeenCalledTimes(1);
    expect(getAgentAccessWac).toHaveBeenCalledWith({}, "y", { fetch: "z" });
    expect(getAgentAccessAcp).toHaveBeenCalledTimes(0);
  });
});
