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
import { getResourceAcr } from "./getResourceAcr";
import { getAcrUrl } from "./getAcrUrl";
import { getSolidDataset } from "../../resource/solidDataset";

jest.mock("./getAcrUrl");
jest.mock("../../resource/solidDataset");
jest.mock("../../resource/resource");

describe("getResourceAcr", () => {
  it("returns null if the ACR URL can't be retrieved", async () => {
    (getAcrUrl as jest.Mocked<typeof getAcrUrl>).mockResolvedValueOnce(null);
    const x = await getResourceAcr({} as any);
    expect(getAcrUrl).toHaveBeenCalledTimes(1);
    expect(getAcrUrl).toHaveBeenCalledWith({}, undefined);
    expect(x).toBeNull();
  });

  it("returns null if the ACR can't be retrieved", async () => {
    (
      getSolidDataset as jest.Mocked<typeof getSolidDataset>
    ).mockRejectedValueOnce("reject");
    const x = await getResourceAcr({} as any);
    expect(getAcrUrl).toHaveBeenCalledTimes(1);
    expect(getAcrUrl).toHaveBeenCalledWith({}, undefined);
    expect(getSolidDataset).toHaveBeenCalledTimes(1);
    expect(x).toBeNull();
  });

  it("returns the resource with ACR", async () => {
    await getResourceAcr({} as any);
    expect(getAcrUrl).toHaveBeenCalledTimes(1);
    expect(getAcrUrl).toHaveBeenCalledWith({}, undefined);
    expect(getSolidDataset).toHaveBeenCalledTimes(1);
    // FIXME this tests too much internals
  });
});
