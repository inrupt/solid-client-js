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
import * as fc from "fast-check";
import { DataFactory } from "n3";
import {
  isNamedNode,
  isLiteral,
  isLocalNode,
  asNamedNode,
  resolveIriForLocalNode,
  resolveLocalIri,
  serializeBoolean,
  deserializeBoolean,
  serializeDatetime,
  deserializeDatetime,
  serializeDecimal,
  deserializeDecimal,
  serializeInteger,
  deserializeInteger,
  normalizeLocale,
  ValidUrlExpectedError,
} from "./datatypes";
import { LocalNode } from "./interfaces";
import { localNodeSkolemPrefix } from "./rdf.internal";

describe("stress-testing serialisations", () => {
  it("should always return the input value when serialising, then deserialing a boolean", () => {
    const runs = 100;
    expect.assertions(runs + 2);

    const fcResult = fc.check(
      fc.property(fc.boolean(), (inputBoolean) => {
        expect(deserializeBoolean(serializeBoolean(inputBoolean))).toBe(
          inputBoolean
        );
      }),
      { numRuns: runs }
    );

    expect(fcResult.counterexample).toBeNull();
    expect(fcResult.failed).toBe(false);
  });

  it("should always return the input value when serialising, then deserialing a datetime", () => {
    const runs = 100;
    expect.assertions(runs + 2);

    const fcResult = fc.check(
      fc.property(fc.date(), (inputDatetime) => {
        expect(
          deserializeDatetime(serializeDatetime(inputDatetime))?.getTime()
        ).toBe(inputDatetime.getTime());
      }),
      { numRuns: runs }
    );

    expect(fcResult.counterexample).toBeNull();
    expect(fcResult.failed).toBe(false);
  });

  it("should always return the input value when serialising, then deserialing a decimal", () => {
    const runs = 100;
    expect.assertions(runs + 2);

    const fcResult = fc.check(
      fc.property(fc.float(), (inputDecimal) => {
        expect(deserializeDecimal(serializeDecimal(inputDecimal))).toBe(
          inputDecimal
        );
      }),
      { numRuns: runs }
    );

    expect(fcResult.counterexample).toBeNull();
    expect(fcResult.failed).toBe(false);
  });

  it("should always return the input value when serialising, then deserialing a integer", () => {
    const runs = 100;
    expect.assertions(runs + 2);

    const fcResult = fc.check(
      fc.property(fc.integer(), (inputInteger) => {
        expect(deserializeInteger(serializeInteger(inputInteger))).toBe(
          inputInteger
        );
      }),
      { numRuns: runs }
    );

    expect(fcResult.counterexample).toBeNull();
    expect(fcResult.failed).toBe(false);
  });
});

describe("serializeBoolean", () => {
  it("serializes true as `'true'`", () => {
    expect(serializeBoolean(true)).toBe("true");
  });

  it("serializes false as `'false'`", () => {
    expect(serializeBoolean(false)).toBe("false");
  });
});
describe("deserializeBoolean", () => {
  it("parses `1` as true", () => {
    expect(deserializeBoolean("1")).toBe(true);
  });

  it("parses `0` as false", () => {
    expect(deserializeBoolean("0")).toBe(false);
  });

  it("parses `true` as true", () => {
    expect(deserializeBoolean("true")).toBe(true);
  });

  it("parses `false` as false", () => {
    expect(deserializeBoolean("false")).toBe(false);
  });

  it("returns null if a value is not a serialised boolean", () => {
    expect(deserializeBoolean("")).toBeNull();
    expect(deserializeBoolean("Not a serialised boolean")).toBeNull();
  });
});

describe("serializeDatetime", () => {
  it("properly serialises a given datetime", () => {
    expect(
      serializeDatetime(new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0)))
    ).toBe("1990-11-12T13:37:42.000Z");

    expect(
      serializeDatetime(new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 42)))
    ).toBe("1990-11-12T13:37:42.042Z");
  });
});
describe("deserializeDatetime", () => {
  it("properly parses a serialised datetime", () => {
    const expectedDate = new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0));
    expect(deserializeDatetime("1990-11-12T13:37:42.000Z")).toEqual(
      expectedDate
    );

    const expectedDateWithNegativeYear = new Date(
      Date.UTC(-42, 10, 12, 13, 37, 42, 0)
    );
    expect(deserializeDatetime("-0042-11-12T13:37:42.000Z")).toEqual(
      expectedDateWithNegativeYear
    );

    const expectedDateWithHour24 = new Date(Date.UTC(1990, 10, 13, 0, 0, 0, 0));
    expect(deserializeDatetime("1990-11-12T24:00:00Z")).toEqual(
      expectedDateWithHour24
    );

    const expectedDateWithFractionalSeconds = new Date(
      Date.UTC(1990, 10, 12, 13, 37, 42, 42)
    );
    expect(deserializeDatetime("1990-11-12T13:37:42.42Z")).toEqual(
      expectedDateWithFractionalSeconds
    );

    const expectedDateWithPositive0Timezone = new Date(
      Date.UTC(1990, 10, 12, 10, 0, 0, 0)
    );
    expect(deserializeDatetime("1990-11-12T10:00:00+00:00")).toEqual(
      expectedDateWithPositive0Timezone
    );

    const expectedDateWithNegative0Timezone = new Date(
      Date.UTC(1990, 10, 12, 10, 0, 0, 0)
    );
    expect(deserializeDatetime("1990-11-12T10:00:00-00:00")).toEqual(
      expectedDateWithNegative0Timezone
    );

    const expectedDateWithNegativeTimezone = new Date(
      Date.UTC(1990, 10, 12, 8, 30, 0, 0)
    );
    expect(deserializeDatetime("1990-11-12T10:00:00-01:30")).toEqual(
      expectedDateWithNegativeTimezone
    );

    const expectedDateWithMaxNegativeTimezone = new Date(
      Date.UTC(1990, 10, 11, 20, 0, 0, 0)
    );
    expect(deserializeDatetime("1990-11-12T10:00:00-14:00")).toEqual(
      expectedDateWithMaxNegativeTimezone
    );

    const expectedDateWithPositiveTimezone = new Date(
      Date.UTC(1990, 10, 12, 11, 30, 0, 0)
    );
    expect(deserializeDatetime("1990-11-12T10:00:00+01:30")).toEqual(
      expectedDateWithPositiveTimezone
    );

    const expectedDateWithMaxPositiveTimezone = new Date(
      Date.UTC(1990, 10, 13, 0, 0, 0, 0)
    );
    expect(deserializeDatetime("1990-11-12T10:00:00+14:00")).toEqual(
      expectedDateWithMaxPositiveTimezone
    );

    const dateBeforeTheYear100 = new Date(-59042995200000);
    expect(deserializeDatetime("0099-01-01T00:00:00.000Z")).toEqual(
      dateBeforeTheYear100
    );

    const expectedEarliestRepresentableDate = new Date(-8640000000000000);
    expect(deserializeDatetime("-271821-04-20T00:00:00.000Z")).toEqual(
      expectedEarliestRepresentableDate
    );
    // Same date, earlier timezone
    expect(deserializeDatetime("-271821-04-20T01:00:00.000-01:00")).toEqual(
      expectedEarliestRepresentableDate
    );
    // Same date, later timezone
    expect(deserializeDatetime("-271821-04-19T23:00:00.000+01:00")).toEqual(
      expectedEarliestRepresentableDate
    );

    const expectedLatestRepresentableDate = new Date(8640000000000000);
    expect(deserializeDatetime("275760-09-13T00:00:00.000Z")).toEqual(
      expectedLatestRepresentableDate
    );
    // Same date, earlier timezone
    expect(deserializeDatetime("275760-09-13T01:00:00.000-01:00")).toEqual(
      expectedLatestRepresentableDate
    );
    // Same date, later timezone
    expect(deserializeDatetime("275760-09-12T23:00:00.000+01:00")).toEqual(
      expectedLatestRepresentableDate
    );
  });

  it("returns null if a value is not a serialised datetime", () => {
    expect(deserializeDatetime("1990-11-12")).toBeNull();
    expect(deserializeDatetime("Not a serialised datetime")).toBeNull();
  });
});

describe("serializeDecimal", () => {
  it("properly serialises a given decimal", () => {
    expect(serializeDecimal(13.37)).toBe("13.37");
    expect(serializeDecimal(-13.37)).toBe("-13.37");
    expect(serializeDecimal(0.1337)).toBe("0.1337");
    // https://www.w3.org/TR/xmlschema-2/#decimal-lexical-representation
    // > If the fractional part is zero, the period and following zero(es) can be omitted.
    expect(serializeDecimal(1337.0)).toBe("1337");
  });
});
describe("deserializeDecimal", () => {
  it("properly parses a serialised decimal", () => {
    expect(deserializeDecimal("13.37")).toBe(13.37);
    expect(deserializeDecimal("+13.37")).toBe(13.37);
    expect(deserializeDecimal("-13.37")).toBe(-13.37);
    expect(deserializeDecimal("0.1337")).toBe(0.1337);
    expect(deserializeDecimal("1337")).toBe(1337);
  });

  it("return null if a value is not a serialised decimal", () => {
    expect(deserializeDecimal("Not a serialised decimal")).toBeNull();
  });
});

describe("serializeInteger", () => {
  it("properly serialises a given integer", () => {
    expect(serializeInteger(42)).toBe("42");
    expect(serializeInteger(-42)).toBe("-42");
    expect(serializeInteger(0)).toBe("0");
  });
});
describe("deserializeInteger", () => {
  it("properly parses a serialised integer", () => {
    expect(deserializeInteger("42")).toBe(42);
    expect(deserializeInteger("-42")).toBe(-42);
    expect(deserializeInteger("+42")).toBe(42);
    expect(deserializeInteger("0")).toBe(0);
  });

  it("return null if a value is not a serialised integer", () => {
    expect(deserializeInteger("Not a serialised integer")).toBeNull();
  });
});

describe("normalizeLocale", () => {
  // The RDF/JS spec mandates lowercase locales:
  // https://rdf.js.org/data-model-spec/#dom-literal-language
  it("lowercases a given locale", () => {
    expect(normalizeLocale("EN-GB")).toBe("en-gb");
    expect(normalizeLocale("nl-NL")).toBe("nl-nl");
  });
});

describe("isNamedNode", () => {
  it("recognises a NamedNode", () => {
    expect(
      isNamedNode(DataFactory.namedNode("https://arbitrary.pod/resource#node"))
    ).toBe(true);
  });

  it("recognises non-NamedNodes", () => {
    expect(isNamedNode(DataFactory.blankNode())).toBe(false);
    expect(isNamedNode(DataFactory.literal("Arbitrary value"))).toBe(false);
    expect(isNamedNode(DataFactory.variable("Arbitrary name"))).toBe(false);
    expect(isNamedNode("Arbitrary string")).toBe(false);
  });
});

describe("isLiteral", () => {
  it("recognises a Literal", () => {
    expect(isLiteral(DataFactory.literal("Arbitrary value"))).toBe(true);
  });

  it("recognises non-Literals", () => {
    expect(isLiteral(DataFactory.blankNode())).toBe(false);
    expect(
      isLiteral(DataFactory.namedNode("https://arbitrary.pod/resource#node"))
    ).toBe(false);
    expect(isLiteral(DataFactory.variable("Arbitrary name"))).toBe(false);
    expect(isLiteral("Arbitrary string")).toBe(false);
  });
});

describe("isLocalNode", () => {
  it("recognises a LocalNode", () => {
    expect(
      isLocalNode(DataFactory.namedNode(localNodeSkolemPrefix + "localNode"))
    ).toBe(true);
  });

  it("recognises non-LocalNodes", () => {
    expect(isLocalNode(DataFactory.blankNode())).toBe(false);
    expect(
      isLocalNode(DataFactory.namedNode("https://arbitrary.pod/resource#node"))
    ).toBe(false);
    expect(isLocalNode(DataFactory.literal("Arbitrary value"))).toBe(false);
    expect(isLocalNode(DataFactory.variable("Arbitrary name"))).toBe(false);
    expect(isLocalNode("Arbitrary string")).toBe(false);
  });
});

describe("asNamedNode", () => {
  it("constructs a proper NamedNode from an IRI", () => {
    const namedNode = asNamedNode("https://some.pod/resource#node");
    expect(namedNode.termType).toBe("NamedNode");
    expect(namedNode.value).toBe("https://some.pod/resource#node");
  });

  it("preserves an existing NamedNode", () => {
    const originalNode = DataFactory.namedNode(
      "https://some.pod/resource#node"
    );
    const newNode = asNamedNode(originalNode);
    expect(newNode).toEqual(originalNode);
  });

  it("throws an error on invalid IRIs", () => {
    expect(() => asNamedNode("Not an IRI")).toThrow("Not an IRI");
  });
});

describe("resolveIriForLocalNode", () => {
  it("properly resolves the IRI for a LocalNode", () => {
    const localNode = DataFactory.namedNode(
      localNodeSkolemPrefix + "some-name"
    ) as LocalNode;
    expect(
      resolveIriForLocalNode(localNode, "https://some.pod/resource").value
    ).toBe("https://some.pod/resource#some-name");
  });
});

describe("resolveLocalIri", () => {
  it("properly resolves the IRI for a given name and resource IRI", () => {
    expect(resolveLocalIri("some-name", "https://some.pod/resource")).toBe(
      "https://some.pod/resource#some-name"
    );
  });
});

describe("ValidUrlExpectedError", () => {
  it("logs the invalid property in its error message", () => {
    const error = new ValidUrlExpectedError(null);

    expect(error.message).toBe("Expected a valid URL, but received: [null].");
  });

  it("logs the value of an invalid URL inside a Named Node in its error message", () => {
    const error = new ValidUrlExpectedError(DataFactory.namedNode("not-a-url"));

    expect(error.message).toBe(
      "Expected a valid URL, but received: [not-a-url]."
    );
  });

  it("exposes the invalid property", () => {
    const error = new ValidUrlExpectedError({ not: "a-url" });

    expect(error.receivedValue).toEqual({ not: "a-url" });
  });
});
