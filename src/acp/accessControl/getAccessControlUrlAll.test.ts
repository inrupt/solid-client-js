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

import { createAccessControlledResourceFromAccessControlUrls } from "../mock/createAccessControlledResourceFromControls";
import { getAccessControlUrlAll } from "./getAccessControlUrlAll";

describe("getAccessControlUrlAll()", () => {
  it("Returns empty array for empty Access Control Resource", async () => {
    const resource = createAccessControlledResourceFromAccessControlUrls();

    expect(getAccessControlUrlAll(resource)).toStrictEqual([]);
  });

  it("Returns an access control URL when present", async () => {
    const ACCESS_CONTROL_ARRAY = ["https://example.org/ac1"];

    expect(
      getAccessControlUrlAll(
        createAccessControlledResourceFromAccessControlUrls(
          ACCESS_CONTROL_ARRAY
        )
      )
    ).toStrictEqual(ACCESS_CONTROL_ARRAY);
  });

  it("Returns all access control URLs when present", async () => {
    const ACCESS_CONTROL_ARRAY = [
      "https://example.org/ac1",
      "https://example.org/ac2",
    ];

    expect(
      getAccessControlUrlAll(
        createAccessControlledResourceFromAccessControlUrls(
          ACCESS_CONTROL_ARRAY
        )
      )
    ).toStrictEqual(ACCESS_CONTROL_ARRAY);
  });
});
