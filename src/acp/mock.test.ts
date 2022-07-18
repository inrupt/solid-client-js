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
import { mockSolidDatasetFrom } from "../resource/mock";
import { addMockAcrTo, mockAcrFor } from "./mock";

describe("mockAcrFor", () => {
  it("should attach the URL of the Resource it applies to", () => {
    const mockedAcr = mockAcrFor("https://some.pod/resource");

    expect(mockedAcr.accessTo).toBe("https://some.pod/resource");
  });
});

describe("addMockAcrTo", () => {
  it("attaches the given ACR to the given Resource", () => {
    const resource = mockSolidDatasetFrom("https://some.pod/resource");
    const acr = mockAcrFor("https://some.pod/resource?ext=acr");

    const withMockAcr = addMockAcrTo(resource, acr);

    expect(withMockAcr.internal_acp.acr).toEqual(acr);
  });

  it("generates a mock ACR if none is provided", () => {
    const resource = mockSolidDatasetFrom("https://some.pod/resource");

    const withMockAcr = addMockAcrTo(resource);

    expect(withMockAcr.internal_acp.acr).not.toBeNull();
  });
});
