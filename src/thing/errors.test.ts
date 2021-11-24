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

import { describe, it, expect } from "@jest/globals";

import { DataFactory } from "../rdfjs.internal";
import {
  ValidPropertyUrlExpectedError,
  ValidThingUrlExpectedError,
  ValidValueUrlExpectedError,
} from "./errors";

describe("ValidPropertyUrlExpectedError", () => {
  it("logs the invalid property in its error message", () => {
    const error = new ValidPropertyUrlExpectedError(null);

    expect(error.message).toBe(
      "Expected a valid URL to identify a property, but received: [null]."
    );
  });

  it("logs the value of an invalid URL inside a Named Node in its error message", () => {
    const error = new ValidPropertyUrlExpectedError(
      DataFactory.namedNode("not-a-url")
    );

    expect(error.message).toBe(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("exposes the invalid property", () => {
    const error = new ValidPropertyUrlExpectedError({ not: "a-url" });

    expect(error.receivedProperty).toEqual({ not: "a-url" });
  });
});

describe("ValidValueUrlExpectedError", () => {
  it("logs the invalid property in its error message", () => {
    const error = new ValidValueUrlExpectedError(null);

    expect(error.message).toBe(
      "Expected a valid URL value, but received: [null]."
    );
  });

  it("logs the value of an invalid URL inside a Named Node in its error message", () => {
    const error = new ValidValueUrlExpectedError(
      DataFactory.namedNode("not-a-url")
    );

    expect(error.message).toBe(
      "Expected a valid URL value, but received: [not-a-url]."
    );
  });

  it("exposes the invalid property", () => {
    const error = new ValidValueUrlExpectedError({ not: "a-url" });

    expect(error.receivedValue).toEqual({ not: "a-url" });
  });
});

describe("ValidThingUrlExpectedError", () => {
  it("logs the invalid property in its error message", () => {
    const error = new ValidThingUrlExpectedError(null);

    expect(error.message).toBe(
      "Expected a valid URL to identify a Thing, but received: [null]."
    );
  });

  it("logs the value of an invalid URL inside a Named Node in its error message", () => {
    const error = new ValidThingUrlExpectedError(
      DataFactory.namedNode("not-a-url")
    );

    expect(error.message).toBe(
      "Expected a valid URL to identify a Thing, but received: [not-a-url]."
    );
  });

  it("exposes the invalid property", () => {
    const error = new ValidThingUrlExpectedError({ not: "a-url" });

    expect(error.receivedValue).toEqual({ not: "a-url" });
  });
});
