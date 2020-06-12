import { describe, it, expect } from "@jest/globals";
import { isHeaders, mergeHeaders } from "./headersUtils";

describe("type guard isHeaders", () => {
  it("should return false for undefined objects", async () => {
    expect(isHeaders(undefined)).toBe(false);
  });

  it("should return false for iterable objects", async () => {
    expect(isHeaders([["key", "value"]])).toBe(false);
    expect(isHeaders({ key: "value" })).toBe(false);
  });

  it("should return true for Headers objects", async () => {
    expect(isHeaders(new Headers({ key: "a value" }))).toBe(true);
  });
});

describe("mergeHeaders", () => {
  it("should throw when merging divergent headers", async () => {
    expect(() =>
      mergeHeaders(new Headers({ key: "a value" }), "key", "another value")
    ).toThrow();
    expect(() =>
      mergeHeaders({ key: "a value" }, "key", "another value")
    ).toThrow();
    expect(() =>
      mergeHeaders([["key", "a value"]], "key", "another value")
    ).toThrow();
  });

  it("should not throw on equivalent overlapping values", async () => {
    expect(() =>
      mergeHeaders({ key: "a value" }, "key", "a value")
    ).not.toThrow();
    expect(() =>
      mergeHeaders([["key", "a value"]], "key", "a value")
    ).not.toThrow();
    expect(() =>
      mergeHeaders(new Headers({ key: "a value" }), "key", "a value")
    ).not.toThrow();
  });

  it("should add new values to the headers", async () => {
    expect(
      mergeHeaders({ key: "a value" }, "another key", "another value")
    ).toEqual({
      key: "a value",
      "another key": "another value",
    });
  });
});
