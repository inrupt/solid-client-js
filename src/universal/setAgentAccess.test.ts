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
import { setAgentAccess } from "./setAgentAccess";
import { getResourceInfo } from "../resource/resource";
import { getResourceAcr } from "../acp/util/getResourceAcr";
import { setAgentAccess as setAgentAccessAcp } from "../acp/util/setAgentAccess";
import { setAgentResourceAccess as setAgentAccessWac } from "../access/wac";
import { saveAcrFor } from "../acp/acp";

jest.mock("../resource/resource");
jest.mock("../acp/util/getResourceAcr");
jest.mock("./getAgentAccess");
jest.mock("../acp/acp");
jest.mock("../acp/util/setAgentAccess");
jest.mock("../access/wac");

describe("setAgentAccess", () => {
  it("calls the ACP module when resource has an ACR", async () => {
    await setAgentAccess("x", "y", {});
    expect(getResourceInfo).toHaveBeenCalledTimes(1);
    expect(getResourceInfo).toHaveBeenCalledWith("x", undefined);
    expect(getResourceAcr).toHaveBeenCalledTimes(1);
    expect(setAgentAccessAcp).toHaveBeenCalledTimes(1);
    expect(setAgentAccessWac).toHaveBeenCalledTimes(0);
  });

  it("calls the WAC module when resource does not have an ACR", async () => {
    (
      getResourceAcr as jest.Mocked<typeof getResourceAcr>
    ).mockResolvedValueOnce(null);
    await setAgentAccess("x", "y", {});
    expect(getResourceInfo).toHaveBeenCalledTimes(1);
    expect(getResourceInfo).toHaveBeenCalledWith("x", undefined);
    expect(getResourceAcr).toHaveBeenCalledTimes(1);
    expect(setAgentAccessWac).toHaveBeenCalledTimes(1);
    expect(setAgentAccessAcp).toHaveBeenCalledTimes(0);
  });

  it("calls the ACR fetcher passing the fetch option", async () => {
    await setAgentAccess("x", "y", {}, { fetch: "z" as any });
    expect(getResourceInfo).toHaveBeenCalledTimes(1);
    expect(getResourceInfo).toHaveBeenCalledWith("x", { fetch: "z" });
    expect(getResourceAcr).toHaveBeenCalledTimes(1);
    expect(setAgentAccessAcp).toHaveBeenCalledTimes(1);
    expect(setAgentAccessWac).toHaveBeenCalledTimes(0);
  });

  it("calls the WAC module passing the fetch option", async () => {
    (
      getResourceAcr as jest.Mocked<typeof getResourceAcr>
    ).mockResolvedValueOnce(null);
    await setAgentAccess("x", "y", {}, { fetch: "z" as any });
    expect(getResourceInfo).toHaveBeenCalledTimes(1);
    expect(getResourceInfo).toHaveBeenCalledWith("x", { fetch: "z" });
    expect(getResourceAcr).toHaveBeenCalledTimes(1);
    expect(setAgentAccessWac).toHaveBeenCalledTimes(1);
    expect(setAgentAccessAcp).toHaveBeenCalledTimes(0);
  });

  it("returns null if the ACR can't be saved", async () => {
    (saveAcrFor as jest.Mocked<typeof saveAcrFor>).mockRejectedValueOnce(
      "reject"
    );
    const x = await setAgentAccess("x", "y", {});
    expect(x).toBeNull();
  });
});
