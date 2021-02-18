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

import { DataFactory } from "n3";

import { dataset } from "../rdfjs";

import { expectMatch } from "./test-support";

/**
 * This is not yet intended to be a fully comprehensive test suite for it's
 * corresponding file - basically the current test suite exercises the bulk of
 * logic, and so these tests just exercise the edge-case branches missed at the
 * moment by the current code-base.
 */
describe("expectMatch", () => {
  it("throws if unexpected matches", () => {
    expect(() => expectMatch(dataset(), null, null, null, 1)).toThrow();
    expect(() => expectMatch(dataset(), null, null, null, 99)).toThrow();

    // Use a non-null pattern component too...
    expect(() =>
      expectMatch(dataset(), "https://example.com/Subject", null, null, 99)
    ).toThrow();
  });

  it("ensure multiple matching quads returns 'null'", () => {
    const data = dataset();
    const subject = DataFactory.namedNode("https://example.com/Subject");
    const predicate = DataFactory.namedNode("https://example.com/Predicate");
    const obj = DataFactory.namedNode("https://example.com/Object");

    const graph1 = DataFactory.namedNode("https://example.com/Graph-1");
    const quad = DataFactory.quad(subject, predicate, obj, graph1);
    data.add(quad);
    expect(expectMatch(data, subject, predicate, obj, 1)).toStrictEqual(quad);

    // Add a second quad that will match our triple pattern, but is in a
    // different graph - we expect the triple-only matching expectation to be
    // met, but we get back a 'null' value, as there are multiple matching
    // quads.
    const graph2 = DataFactory.namedNode("https://example.com/Graph-2");
    data.add(DataFactory.quad(subject, predicate, obj, graph2));
    expect(expectMatch(data, subject, predicate, obj, 2)).toBeNull();
  });

  it("applies graph component to match", () => {
    const graph = DataFactory.namedNode("https://example.com/Graph-1");
    expect(expectMatch(dataset(), null, null, null, 0, graph)).toBeNull();
  });
});
