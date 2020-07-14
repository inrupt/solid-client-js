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

import { describe, it, expect } from "@jest/globals";

// import { INRUPT_TEST_IRI } from "@inrupt/vocab-common-rdfjs";
import { INRUPT_TEST_IRI } from "./GENERATED/INRUPT_TEST_IRI";

import { arrayContainsIri } from "./interfaces";

describe("interfaces", () => {
  it("should determine if array contains IRI", () => {
    expect(arrayContainsIri([], INRUPT_TEST_IRI.somePodResource)).toEqual(
      false
    );
    expect(
      arrayContainsIri(
        [INRUPT_TEST_IRI.somePodResource],
        INRUPT_TEST_IRI.somePodResource
      )
    ).toEqual(true);
    expect(
      arrayContainsIri(
        [INRUPT_TEST_IRI.somePodRootContainer],
        INRUPT_TEST_IRI.somePodResource
      )
    ).toEqual(false);
  });
});
