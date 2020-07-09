/**
 * Copyright 2020 Inrupt Inc.
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

import { it, expect } from "@jest/globals";
jest.mock("cross-fetch");

import { fetch } from "./fetcher";
import { INRUPT_TEST_IRI } from "./GENERATED/INRUPT_TEST_IRI";
import { makeString } from "./interfaces";

it("should fallback to cross-fetch if no Solid-specific fetcher is available", async () => {
  const crossFetch = jest.requireMock("cross-fetch") as jest.Mock<
    ReturnType<typeof window.fetch>,
    [RequestInfo, RequestInit]
  >;

  await fetch(makeString(INRUPT_TEST_IRI.someNonRdfResource));

  expect(crossFetch.mock.calls).toEqual([
    [makeString(INRUPT_TEST_IRI.someNonRdfResource), undefined],
  ]);
});
