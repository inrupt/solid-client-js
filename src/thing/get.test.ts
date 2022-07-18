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

import type { NamedNode, Literal, BlankNode } from "@rdfjs/types";
import { DataFactory } from "n3";
import { IriString, Thing, UrlString } from "../interfaces";
import {
  getUrl,
  getBoolean,
  getDatetime,
  getDate,
  getTime,
  getDecimal,
  getInteger,
  getStringEnglish,
  getStringWithLocale,
  getStringNoLocale,
  getLiteral,
  getNamedNode,
  getUrlAll,
  getBooleanAll,
  getDatetimeAll,
  getDateAll,
  getTimeAll,
  getDecimalAll,
  getIntegerAll,
  getStringEnglishAll,
  getStringWithLocaleAll,
  getStringByLocaleAll,
  getStringNoLocaleAll,
  getLiteralAll,
  getNamedNodeAll,
  getTerm,
  getTermAll,
  getIriAll,
  getPropertyAll,
} from "./get";
import { xmlSchemaTypes } from "../datatypes";
import { createThing, ValidPropertyUrlExpectedError } from "./thing";
import { mockThingFrom } from "./mock";
import { localNodeSkolemPrefix } from "../rdf.internal";
import { addStringNoLocale } from "./add";
import { removeStringNoLocale } from "./remove";

const SUBJECT = "https://arbitrary.vocab/subject";
const PREDICATE = "https://some.vocab/predicate";

function getMockThingWithLiteralFor(
  predicate: IriString,
  literalValue: string,
  literalType:
    | "string"
    | "integer"
    | "decimal"
    | "boolean"
    | "dateTime"
    | "date"
    | "time"
): Thing {
  return {
    type: "Subject",
    url: "https://arbitrary.vocab/subject",
    predicates: {
      [predicate]: {
        literals: {
          [`http://www.w3.org/2001/XMLSchema#${literalType}`]: [literalValue],
        },
      },
    },
  };
}
function getMockThingWithLiteralsFor(
  predicate: IriString,
  literal1Value: string,
  literal2Value: string,
  literalType:
    | "string"
    | "integer"
    | "decimal"
    | "boolean"
    | "dateTime"
    | "date"
    | "time"
): Thing {
  return {
    type: "Subject",
    url: "https://arbitrary.vocab/subject",
    predicates: {
      [predicate]: {
        literals: {
          [`http://www.w3.org/2001/XMLSchema#${literalType}`]: [
            literal1Value,
            literal2Value,
          ],
        },
      },
    },
  };
}

describe("getPropertyAll", () => {
  it("returns all Properties for which a value is defined", () => {
    const mockThing = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate1",
      "value1",
      "value2",
      "string"
    );

    expect(getPropertyAll(mockThing)).toStrictEqual([
      "https://some.vocab/predicate1",
    ]);
  });

  it("returns all Properties for which a value is defined, excluding Properties that no longer have a value", () => {
    let mockThing = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate1",
      "value1",
      "value2",
      "string"
    );
    mockThing = addStringNoLocale(
      mockThing,
      "https://arbitrary.vocab/predicate2",
      "value 3"
    );
    mockThing = addStringNoLocale(
      mockThing,
      "https://some.vocab/predicate3",
      "value 4"
    );
    mockThing = removeStringNoLocale(
      mockThing,
      "https://arbitrary.vocab/predicate2",
      "value 3"
    );

    expect(getPropertyAll(mockThing)).toStrictEqual([
      "https://some.vocab/predicate1",
      "https://some.vocab/predicate3",
    ]);
  });

  it("returns an empty array for an empty Thing", () => {
    expect(getPropertyAll(createThing())).toStrictEqual([]);
  });
});

describe("getIri", () => {
  function getMockThingWithIri(
    predicate: IriString,
    iri: IriString = "https://arbitrary.vocab/object"
  ): Thing {
    const thing: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {
        [predicate]: {
          namedNodes: [iri],
        },
      },
    };

    return thing;
  }

  it("returns the IRI value for the given Property", () => {
    const thingWithIri = getMockThingWithIri(
      "https://some.vocab/predicate",
      "https://some.vocab/object"
    );

    expect(getUrl(thingWithIri, "https://some.vocab/predicate")).toBe(
      "https://some.vocab/object"
    );
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithIri = getMockThingWithIri(
      "https://some.vocab/predicate",
      "https://some.vocab/object"
    );

    expect(
      getUrl(
        thingWithIri,
        DataFactory.namedNode("https://some.vocab/predicate")
      )
    ).toBe("https://some.vocab/object");
  });

  it("returns an LocalNode if that is the first match", () => {
    const thingWithIriAndLocalNode = getMockThingWithIri(
      "https://some.vocab/predicate",
      `${localNodeSkolemPrefix}someLocalNode`
    );
    (
      thingWithIriAndLocalNode.predicates["https://some.vocab/predicate"]
        .namedNodes as UrlString[]
    ).push("https://some.vocab/object");

    expect(
      getUrl(thingWithIriAndLocalNode, "https://some.vocab/predicate")
    ).toBe("#someLocalNode");
  });

  it("returns null if no IRI value was found", () => {
    const thingWithoutIri = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(getUrl(thingWithoutIri, "https://some.vocab/predicate")).toBeNull();
  });

  it("returns LocalNodes", () => {
    const thingWithIri = getMockThingWithIri(
      "https://some.vocab/predicate",
      `${localNodeSkolemPrefix}someLocalNode`
    );

    expect(getUrl(thingWithIri, "https://some.vocab/predicate")).toBe(
      "#someLocalNode"
    );
  });

  it("does not return non-IRI values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = [
      "https://some.vocab/object",
      "https://arbitrary.vocab/object",
    ];

    expect(
      getUrl(thingWithDifferentDatatypes, "https://some.vocab/predicate")
    ).toBe("https://some.vocab/object");
  });

  it("returns null if no IRI value was found for the given Predicate", () => {
    const thingWithIri = getMockThingWithIri("https://some.vocab/predicate");

    expect(
      getUrl(thingWithIri, "https://some-other.vocab/predicate")
    ).toBeNull();
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getUrl(null as unknown as Thing, "https://arbitrary.vocab/predicate")
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getUrl(mockThingFrom("https://arbitrary.pod/resource#thing"), "not-a-url")
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getUrl(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("getIriAll", () => {
  function getMockThingWithIris(
    predicate: IriString,
    iri1: IriString = "https://arbitrary.vocab/object1",
    iri2: IriString = "https://arbitrary.vocab/object2"
  ): Thing {
    return {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {
        [predicate]: {
          namedNodes: [iri1, iri2],
        },
      },
    };
  }

  it("returns the IRI values for the given Predicate", () => {
    const thingWithIris = getMockThingWithIris(
      "https://some.vocab/predicate",
      "https://some.vocab/object1",
      "https://some.vocab/object2"
    );

    expect(getUrlAll(thingWithIris, "https://some.vocab/predicate")).toEqual([
      "https://some.vocab/object1",
      "https://some.vocab/object2",
    ]);
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithIris = getMockThingWithIris(
      "https://some.vocab/predicate",
      "https://some.vocab/object1",
      "https://some.vocab/object2"
    );

    expect(
      getUrlAll(
        thingWithIris,
        DataFactory.namedNode("https://some.vocab/predicate")
      )
    ).toEqual(["https://some.vocab/object1", "https://some.vocab/object2"]);
  });

  it("returns an empty array if no IRI value was found", () => {
    const thingWithoutIris = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(getUrlAll(thingWithoutIris, "https://some.vocab/predicate")).toEqual(
      []
    );
  });

  it("does not return non-IRI values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["https://some.vocab/object"];

    expect(
      getUrlAll(thingWithDifferentDatatypes, "https://some.vocab/predicate")
    ).toEqual(["https://some.vocab/object"]);
  });

  it("returns an empty array if no IRI value was found for the given Predicate", () => {
    const thingWithIri = getMockThingWithIris("https://some.vocab/predicate");

    expect(
      getUrlAll(thingWithIri, "https://some-other.vocab/predicate")
    ).toEqual([]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getUrlAll(null as unknown as Thing, "https://arbitrary.vocab/predicate")
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getUrlAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getIriAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("getBoolean", () => {
  it("returns the boolean value for the given Predicate", () => {
    const thingWithBoolean = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1",
      "boolean"
    );

    expect(getBoolean(thingWithBoolean, "https://some.vocab/predicate")).toBe(
      true
    );
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithBoolean = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "0",
      "boolean"
    );

    expect(
      getBoolean(
        thingWithBoolean,
        DataFactory.namedNode("https://some.vocab/predicate")
      )
    ).toBe(false);
  });

  it("returns null if no boolean value was found", () => {
    const thingWithoutBoolean = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getBoolean(thingWithoutBoolean, "https://some.vocab/predicate")
    ).toBeNull();
  });

  it("does not return non-boolean values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary value",
      "string"
    );
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["https://arbitrary.vocab/object"];
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .literals!["http://www.w3.org/2001/XMLSchema#boolean"] as string[]) = [
      "1",
    ];

    expect(
      getBoolean(thingWithDifferentDatatypes, "https://some.vocab/predicate")
    ).toBe(true);
  });

  it("returns null if no boolean value was found for the given Predicate", () => {
    const thingWithBoolean = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1",
      "boolean"
    );

    expect(
      getBoolean(thingWithBoolean, "https://some-other.vocab/predicate")
    ).toBeNull();
  });

  it("returns null if an invalid value, marked as boolean, was found for the given Predicate", () => {
    const thingWithNonBoolean = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Not a boolean",
      "boolean"
    );

    expect(
      getBoolean(thingWithNonBoolean, "https://some.vocab/predicate")
    ).toBeNull();
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getBoolean(null as unknown as Thing, "https://arbitrary.vocab/predicate")
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getBoolean(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getBoolean(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("getBooleanAll", () => {
  it("returns the boolean values for the given Predicate", () => {
    const thingWithBooleans = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "1",
      "0",
      "boolean"
    );

    expect(
      getBooleanAll(thingWithBooleans, "https://some.vocab/predicate")
    ).toEqual([true, false]);
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithBooleans = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "1",
      "0",
      "boolean"
    );

    expect(
      getBooleanAll(
        thingWithBooleans,
        DataFactory.namedNode("https://some.vocab/predicate")
      )
    ).toEqual([true, false]);
  });

  it("returns an empty array if no boolean values were found", () => {
    const thingWithoutBooleans = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getBooleanAll(thingWithoutBooleans, "https://some.vocab/predicate")
    ).toEqual([]);
  });

  it("does not return non-boolean values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary value",
      "string"
    );
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["https://arbitrary.vocab/object"];
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .literals!["http://www.w3.org/2001/XMLSchema#boolean"] as string[]) = [
      "1",
    ];

    expect(
      getBooleanAll(thingWithDifferentDatatypes, "https://some.vocab/predicate")
    ).toEqual([true]);
  });

  it("returns an empty array if no boolean values were found for the given Predicate", () => {
    const thingWithBoolean = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1",
      "boolean"
    );

    expect(
      getBooleanAll(thingWithBoolean, "https://some-other.vocab/predicate")
    ).toEqual([]);
  });

  it("does not include invalid values marked as boolean", () => {
    const thingWithNonBoolean = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "Not a boolean",
      "0",
      "boolean"
    );

    expect(
      getBooleanAll(thingWithNonBoolean, "https://some.vocab/predicate")
    ).toEqual([false]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getBooleanAll(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate"
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getBooleanAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getBooleanAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("getDatetime", () => {
  it("returns the datetime value for the given Predicate", () => {
    const thingWithDatetime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12T13:37:42.000Z",
      "dateTime"
    );
    const expectedDate = new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0));

    expect(
      getDatetime(thingWithDatetime, "https://some.vocab/predicate")
    ).toEqual(expectedDate);
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithDatetime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12T13:37:42.000Z",
      "dateTime"
    );
    const expectedDate = new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0));

    expect(
      getDatetime(
        thingWithDatetime,
        DataFactory.namedNode("https://some.vocab/predicate")
      )
    ).toEqual(expectedDate);
  });

  it("returns null if no datetime value was found", () => {
    const thingWithoutDatetime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getDatetime(thingWithoutDatetime, "https://some.vocab/predicate")
    ).toBeNull();
  });

  it("does not return non-datetime values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary value",
      "string"
    );
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["https://arbitrary.vocab/object"];
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .literals!["http://www.w3.org/2001/XMLSchema#dateTime"] as string[]) = [
      "1990-11-12T13:37:42.000Z",
    ];
    const expectedDate = new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0));

    expect(
      getDatetime(thingWithDifferentDatatypes, "https://some.vocab/predicate")
    ).toEqual(expectedDate);
  });

  it("returns null if no datetime value was found for the given Predicate", () => {
    const thingWithDatetime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12T13:37:42.000Z",
      "dateTime"
    );

    expect(
      getDatetime(thingWithDatetime, "https://some-other.vocab/predicate")
    ).toBeNull();
  });

  it("returns null if an invalid value, marked as datetime, was found for the given Predicate", () => {
    const thingWithNonDatetime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Not a datetime",
      "dateTime"
    );

    expect(
      getDatetime(thingWithNonDatetime, "https://some.vocab/predicate")
    ).toBeNull();
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getDatetime(null as unknown as Thing, "https://arbitrary.vocab/predicate")
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getDatetime(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getDatetime(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("getDatetimeAll", () => {
  it("returns the datetime values for the given Predicate", () => {
    const thingWithDatetimes = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "1955-06-08T13:37:42.000Z",
      "1990-11-12T13:37:42.000Z",
      "dateTime"
    );
    const expectedDate1 = new Date(Date.UTC(1955, 5, 8, 13, 37, 42, 0));
    const expectedDate2 = new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0));

    expect(
      getDatetimeAll(thingWithDatetimes, "https://some.vocab/predicate")
    ).toEqual([expectedDate1, expectedDate2]);
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithDatetimes = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "1955-06-08T13:37:42.000Z",
      "1990-11-12T13:37:42.000Z",
      "dateTime"
    );
    const expectedDate1 = new Date(Date.UTC(1955, 5, 8, 13, 37, 42, 0));
    const expectedDate2 = new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0));

    expect(
      getDatetimeAll(
        thingWithDatetimes,
        DataFactory.namedNode("https://some.vocab/predicate")
      )
    ).toEqual([expectedDate1, expectedDate2]);
  });

  it("returns an empty array if no datetime values were found", () => {
    const thingWithoutDatetimes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getDatetimeAll(thingWithoutDatetimes, "https://some.vocab/predicate")
    ).toEqual([]);
  });

  it("does not return non-datetime values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary value",
      "string"
    );
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["https://arbitrary.vocab/object"];
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .literals!["http://www.w3.org/2001/XMLSchema#dateTime"] as string[]) = [
      "1990-11-12T13:37:42.000Z",
    ];
    const expectedDate = new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0));

    expect(
      getDatetimeAll(
        thingWithDifferentDatatypes,
        "https://some.vocab/predicate"
      )
    ).toEqual([expectedDate]);
  });

  it("returns an empty array if no datetime values were found for the given Predicate", () => {
    const thingWithDatetime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12T13:37:42.000Z",
      "dateTime"
    );

    expect(
      getDatetimeAll(thingWithDatetime, "https://some-other.vocab/predicate")
    ).toEqual([]);
  });

  it("does not return invalid values marked as datetime", () => {
    const thingWithNonDatetime = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "Not a datetime",
      "1990-11-12T13:37:42.000Z",
      "dateTime"
    );

    const expectedDate = new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0));

    expect(
      getDatetimeAll(thingWithNonDatetime, "https://some.vocab/predicate")
    ).toEqual([expectedDate]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getDatetimeAll(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate"
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getDatetimeAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getDatetimeAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("getDate", () => {
  it("returns the date value for the given Predicate", () => {
    const thingWithDate = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12Z",
      "date"
    );
    const expectedDate = new Date(Date.UTC(1990, 10, 12, 12));

    expect(getDate(thingWithDate, "https://some.vocab/predicate")).toEqual(
      expectedDate
    );
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithDate = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12Z",
      "date"
    );
    const expectedDate = new Date(Date.UTC(1990, 10, 12, 12));

    expect(
      getDate(
        thingWithDate,
        DataFactory.namedNode("https://some.vocab/predicate")
      )
    ).toEqual(expectedDate);
  });

  it("returns null if no date value was found", () => {
    const thingWithoutDate = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getDate(thingWithoutDate, "https://some.vocab/predicate")
    ).toBeNull();
  });

  it("does not return non-date values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary value",
      "string"
    );
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["https://arbitrary.vocab/object"];
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .literals!["http://www.w3.org/2001/XMLSchema#date"] as string[]) = [
      "1990-11-12Z",
    ];
    const expectedDate = new Date(Date.UTC(1990, 10, 12, 12));

    expect(
      getDate(thingWithDifferentDatatypes, "https://some.vocab/predicate")
    ).toEqual(expectedDate);
  });

  it("returns null if no date value was found for the given Predicate", () => {
    const thingWithDate = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12",
      "date"
    );

    expect(
      getDate(thingWithDate, "https://some-other.vocab/predicate")
    ).toBeNull();
  });

  it("returns null if an invalid value, marked as date, was found for the given Predicate", () => {
    const thingWithNonDate = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Not a date",
      "date"
    );

    expect(
      getDate(thingWithNonDate, "https://some.vocab/predicate")
    ).toBeNull();
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getDate(null as unknown as Thing, "https://arbitrary.vocab/predicate")
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getDate(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getDate(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("getDateAll", () => {
  it("returns the date values for the given Predicate", () => {
    const thingWithDates = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "1955-06-08",
      "1990-11-12",
      "date"
    );
    const expectedDate1 = new Date(Date.UTC(1955, 5, 8, 12));
    const expectedDate2 = new Date(Date.UTC(1990, 10, 12, 12));

    expect(getDateAll(thingWithDates, "https://some.vocab/predicate")).toEqual([
      expectedDate1,
      expectedDate2,
    ]);
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithDates = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "1955-06-08",
      "1990-11-12",
      "date"
    );
    const expectedDate1 = new Date(Date.UTC(1955, 5, 8, 12));
    const expectedDate2 = new Date(Date.UTC(1990, 10, 12, 12));

    expect(
      getDateAll(
        thingWithDates,
        DataFactory.namedNode("https://some.vocab/predicate")
      )
    ).toEqual([expectedDate1, expectedDate2]);
  });

  it("returns an empty array if no date values were found", () => {
    const thingWithoutDates = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getDateAll(thingWithoutDates, "https://some.vocab/predicate")
    ).toEqual([]);
  });

  it("does not return non-date values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary value",
      "string"
    );
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["https://arbitrary.vocab/object"];
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .literals!["http://www.w3.org/2001/XMLSchema#date"] as string[]) = [
      "1990-11-12",
    ];
    const expectedDate = new Date(Date.UTC(1990, 10, 12, 12));

    expect(
      getDateAll(thingWithDifferentDatatypes, "https://some.vocab/predicate")
    ).toEqual([expectedDate]);
  });

  it("returns an empty array if no date values were found for the given Predicate", () => {
    const thingWithDate = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12",
      "date"
    );

    expect(
      getDateAll(thingWithDate, "https://some-other.vocab/predicate")
    ).toEqual([]);
  });

  it("does not return invalid values marked as date", () => {
    const thingWithNonDate = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "Not a date",
      "1990-11-12",
      "date"
    );

    const expectedDate = new Date(Date.UTC(1990, 10, 12, 12));

    expect(
      getDateAll(thingWithNonDate, "https://some.vocab/predicate")
    ).toEqual([expectedDate]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getDateAll(null as unknown as Thing, "https://arbitrary.vocab/predicate")
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getDateAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getDateAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("getTime", () => {
  it("returns the time value for the given Predicate", () => {
    const thingWithTime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13:37:42",
      "time"
    );
    const expectedTime = {
      hour: 13,
      minute: 37,
      second: 42,
    };

    expect(
      getTime(thingWithTime, "https://some.vocab/predicate")
    ).toStrictEqual(expectedTime);
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithTime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13:37:42",
      "time"
    );
    const expectedTime = {
      hour: 13,
      minute: 37,
      second: 42,
    };

    expect(
      getTime(
        thingWithTime,
        DataFactory.namedNode("https://some.vocab/predicate")
      )
    ).toStrictEqual(expectedTime);
  });

  it("returns null if no time value was found", () => {
    const thingWithoutTime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getTime(thingWithoutTime, "https://some.vocab/predicate")
    ).toBeNull();
  });

  it("does not return non-time values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary value",
      "string"
    );
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["https://arbitrary.vocab/object"];
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .literals!["http://www.w3.org/2001/XMLSchema#time"] as string[]) = [
      "13:37:42",
    ];
    const expectedTime = {
      hour: 13,
      minute: 37,
      second: 42,
    };

    expect(
      getTime(thingWithDifferentDatatypes, "https://some.vocab/predicate")
    ).toStrictEqual(expectedTime);
  });

  it("returns null if no time value was found for the given Predicate", () => {
    const thingWithTime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13:37:42",
      "time"
    );

    expect(
      getTime(thingWithTime, "https://some-other.vocab/predicate")
    ).toBeNull();
  });

  it("returns null if an invalid value, marked as time, was found for the given Predicate", () => {
    const thingWithNonTime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Not a time",
      "time"
    );

    expect(
      getTime(thingWithNonTime, "https://some.vocab/predicate")
    ).toBeNull();
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getTime(null as unknown as Thing, "https://arbitrary.vocab/predicate")
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getTime(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getTime(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("getTimeAll", () => {
  it("returns the time values for the given Predicate", () => {
    const thingWithTimes = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "14:37:42",
      "13:37:42",
      "time"
    );
    const expectedTime1 = {
      hour: 14,
      minute: 37,
      second: 42,
    };
    const expectedTime2 = {
      hour: 13,
      minute: 37,
      second: 42,
    };

    expect(
      getTimeAll(thingWithTimes, "https://some.vocab/predicate")
    ).toStrictEqual([expectedTime1, expectedTime2]);
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithTimes = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "14:37:42",
      "13:37:42",
      "time"
    );
    const expectedTime1 = {
      hour: 14,
      minute: 37,
      second: 42,
    };
    const expectedTime2 = {
      hour: 13,
      minute: 37,
      second: 42,
    };

    expect(
      getTimeAll(
        thingWithTimes,
        DataFactory.namedNode("https://some.vocab/predicate")
      )
    ).toStrictEqual([expectedTime1, expectedTime2]);
  });

  it("returns an empty array if no time values were found", () => {
    const thingWithoutTimes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getTimeAll(thingWithoutTimes, "https://some.vocab/predicate")
    ).toStrictEqual([]);
  });

  it("does not return non-time values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary value",
      "string"
    );
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["https://arbitrary.vocab/object"];
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .literals!["http://www.w3.org/2001/XMLSchema#time"] as string[]) = [
      "13:37:42",
    ];
    const expectedTime = {
      hour: 13,
      minute: 37,
      second: 42,
    };

    expect(
      getTimeAll(thingWithDifferentDatatypes, "https://some.vocab/predicate")
    ).toStrictEqual([expectedTime]);
  });

  it("returns an empty array if no time values were found for the given Predicate", () => {
    const thingWithTime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13:37:42",
      "time"
    );

    expect(
      getTimeAll(thingWithTime, "https://some-other.vocab/predicate")
    ).toStrictEqual([]);
  });

  it("does not return invalid values marked as time", () => {
    const thingWithNonTime = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "Not a time",
      "13:37:42",
      "time"
    );

    const expectedTime = {
      hour: 13,
      minute: 37,
      second: 42,
    };

    expect(
      getTimeAll(thingWithNonTime, "https://some.vocab/predicate")
    ).toStrictEqual([expectedTime]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getTimeAll(null as unknown as Thing, "https://arbitrary.vocab/predicate")
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getTimeAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getTimeAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("getDecimal", () => {
  it("returns the decimal value for the given Predicate", () => {
    const thingWithDecimal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13.37",
      "decimal"
    );

    expect(getDecimal(thingWithDecimal, "https://some.vocab/predicate")).toBe(
      13.37
    );
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithDecimal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13.37",
      "decimal"
    );

    expect(
      getDecimal(
        thingWithDecimal,
        DataFactory.namedNode("https://some.vocab/predicate")
      )
    ).toBe(13.37);
  });

  it("returns null if no decimal value was found", () => {
    const thingWithoutDecimal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getDecimal(thingWithoutDecimal, "https://some.vocab/predicate")
    ).toBeNull();
  });

  it("does not return non-decimal values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary value",
      "string"
    );
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["https://arbitrary.vocab/object"];
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .literals!["http://www.w3.org/2001/XMLSchema#decimal"] as string[]) = [
      "13.37",
    ];

    expect(
      getDecimal(thingWithDifferentDatatypes, "https://some.vocab/predicate")
    ).toBe(13.37);
  });

  it("returns null if no decimal value was found for the given Predicate", () => {
    const thingWithDecimal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13.37",
      "decimal"
    );

    expect(
      getDecimal(thingWithDecimal, "https://some-other.vocab/predicate")
    ).toBeNull();
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getDecimal(null as unknown as Thing, "https://arbitrary.vocab/predicate")
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getDecimal(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getDecimal(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("getDecimalAll", () => {
  it("returns the decimal values for the given Predicate", () => {
    const thingWithDecimals = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "13.37",
      "7.2",
      "decimal"
    );

    expect(
      getDecimalAll(thingWithDecimals, "https://some.vocab/predicate")
    ).toEqual([13.37, 7.2]);
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithDecimals = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "13.37",
      "7.2",
      "decimal"
    );

    expect(
      getDecimalAll(
        thingWithDecimals,
        DataFactory.namedNode("https://some.vocab/predicate")
      )
    ).toEqual([13.37, 7.2]);
  });

  it("returns an empty array if no decimal values were found", () => {
    const thingWithoutDecimals = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getDecimalAll(thingWithoutDecimals, "https://some.vocab/predicate")
    ).toEqual([]);
  });

  it("does not return non-decimal values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary value",
      "string"
    );
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["https://arbitrary.vocab/object"];
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .literals!["http://www.w3.org/2001/XMLSchema#decimal"] as string[]) = [
      "13.37",
    ];

    expect(
      getDecimalAll(thingWithDifferentDatatypes, "https://some.vocab/predicate")
    ).toEqual([13.37]);
  });

  it("returns an empty array if no decimal values were found for the given Predicate", () => {
    const thingWithDecimal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13.37",
      "decimal"
    );

    expect(
      getDecimalAll(thingWithDecimal, "https://some-other.vocab/predicate")
    ).toEqual([]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getDecimalAll(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate"
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getDecimalAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getDecimalAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("getInteger", () => {
  it("returns the integer value for the given Predicate", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(getInteger(thingWithInteger, "https://some.vocab/predicate")).toBe(
      42
    );
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getInteger(
        thingWithInteger,
        DataFactory.namedNode("https://some.vocab/predicate")
      )
    ).toBe(42);
  });

  it("returns null if no integer value was found", () => {
    const thingWithoutInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13.37",
      "decimal"
    );

    expect(
      getInteger(thingWithoutInteger, "https://some.vocab/predicate")
    ).toBeNull();
  });

  it("does not return non-integer values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary value",
      "string"
    );
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["https://arbitrary.vocab/object"];
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .literals!["http://www.w3.org/2001/XMLSchema#integer"] as string[]) = [
      "42",
    ];

    expect(
      getInteger(thingWithDifferentDatatypes, "https://some.vocab/predicate")
    ).toBe(42);
  });

  it("returns null if no integer value was found for the given Predicate", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getInteger(thingWithInteger, "https://some-other.vocab/predicate")
    ).toBeNull();
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getInteger(null as unknown as Thing, "https://arbitrary.vocab/predicate")
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getInteger(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getInteger(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("getIntegerAll", () => {
  it("returns the integer values for the given Predicate", () => {
    const thingWithIntegers = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "42",
      "1337",
      "integer"
    );

    expect(
      getIntegerAll(thingWithIntegers, "https://some.vocab/predicate")
    ).toEqual([42, 1337]);
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithIntegers = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "42",
      "1337",
      "integer"
    );

    expect(
      getIntegerAll(
        thingWithIntegers,
        DataFactory.namedNode("https://some.vocab/predicate")
      )
    ).toEqual([42, 1337]);
  });

  it("returns an empty array if no integer values were found", () => {
    const thingWithoutIntegers = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13.37",
      "decimal"
    );

    expect(
      getIntegerAll(thingWithoutIntegers, "https://some.vocab/predicate")
    ).toEqual([]);
  });

  it("does not return non-integer values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary value",
      "string"
    );
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["https://arbitrary.vocab/object"];
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .literals!["http://www.w3.org/2001/XMLSchema#integer"] as string[]) = [
      "42",
    ];

    expect(
      getIntegerAll(thingWithDifferentDatatypes, "https://some.vocab/predicate")
    ).toEqual([42]);
  });

  it("returns an empty array if no integer values were found for the given Predicate", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getIntegerAll(thingWithInteger, "https://some-other.vocab/predicate")
    ).toEqual([]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getIntegerAll(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate"
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getIntegerAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getIntegerAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("getStringEnglish", () => {
  it("returns the English string value for the given Predicate", () => {
    const thingWithLocaleString: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {
        "https://some.vocab/predicate": {
          langStrings: {
            en: ["Some value"],
          },
        },
      },
    };

    expect(
      getStringEnglish(thingWithLocaleString, "https://some.vocab/predicate")
    ).toBe("Some value");
  });
});

describe("getStringEnglishAll", () => {
  it("treats empty-string locale literally - i.e. only returns values added with an empty language tag", () => {
    const thingWithLocaleStrings: Thing = {
      type: "Subject",
      url: SUBJECT,
      predicates: {
        [PREDICATE]: {
          langStrings: {
            en: ["value x", "value y"],
            fr: ["value 1"],
            "": ["value 2"],
            es: ["value 3"],
          },
          literals: {
            [xmlSchemaTypes.string]: ["value 1"],
          },
        },
      },
    };

    expect(getStringEnglishAll(thingWithLocaleStrings, PREDICATE)).toEqual([
      "value x",
      "value y",
    ]);
  });
});

describe("getStringWithLocale", () => {
  it("returns the string value for the given Predicate in the given locale", () => {
    const thingWithLocaleString: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {
        "https://some.vocab/predicate": {
          langStrings: {
            "nl-NL": ["Some value"],
          },
        },
      },
    };

    expect(
      getStringWithLocale(
        thingWithLocaleString,
        "https://some.vocab/predicate",
        "nl-NL"
      )
    ).toBe("Some value");
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithLocaleString: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {
        "https://some.vocab/predicate": {
          langStrings: {
            "nl-NL": ["Some value"],
          },
        },
      },
    };

    expect(
      getStringWithLocale(
        thingWithLocaleString,
        DataFactory.namedNode("https://some.vocab/predicate"),
        "nl-NL"
      )
    ).toBe("Some value");
  });

  it("supports matching locales with different casing", () => {
    const thingWithLocaleString: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {
        "https://some.vocab/predicate": {
          langStrings: {
            "nl-NL": ["Some value"],
          },
        },
      },
    };

    expect(
      getStringWithLocale(
        thingWithLocaleString,
        "https://some.vocab/predicate",
        "NL-nL"
      )
    ).toBe("Some value");
  });

  it("returns null if no locale string value was found", () => {
    const thingWithoutStringNoLocale = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getStringWithLocale(
        thingWithoutStringNoLocale,
        "https://some.vocab/predicate",
        "nl-NL"
      )
    ).toBeNull();
  });

  it("returns null if no locale string with the requested locale was found", () => {
    const thingWithDifferentLocaleString: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {
        "https://some.vocab/predicate": {
          langStrings: {
            "nl-NL": ["Some value"],
          },
        },
      },
    };

    expect(
      getStringWithLocale(
        thingWithDifferentLocaleString,
        "https://some.vocab/predicate",
        "en-GB"
      )
    ).toBeNull();
    expect(
      getStringWithLocale(
        thingWithDifferentLocaleString,
        "https://some.vocab/predicate",
        "nl"
      )
    ).toBeNull();
  });

  it("does not return non-locale-string values", () => {
    const literalWithLocale = DataFactory.literal("Some value", "nl-NL");
    const quadWithLocaleString = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      literalWithLocale
    );
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["https://arbitrary.vocab/object"];
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .langStrings as Record<string, string[]>) = {
      "nl-NL": ["Some value"],
    };

    expect(
      getStringWithLocale(
        thingWithDifferentDatatypes,
        "https://some.vocab/predicate",
        "nl-NL"
      )
    ).toBe("Some value");
  });

  it("returns null if no locale string was found for the given Predicate", () => {
    const thingWithLocaleString: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {
        "https://some.vocab/predicate": {
          langStrings: {
            "nl-NL": ["Some value"],
          },
        },
      },
    };

    expect(
      getStringWithLocale(
        thingWithLocaleString,
        "https://some-other.vocab/predicate",
        "nl-NL"
      )
    ).toBeNull();
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getStringWithLocale(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        "nl-NL"
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getStringWithLocale(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        "nl-NL"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getStringWithLocale(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        "nl-NL"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("getStringByLocaleAll", () => {
  it("returns all the string values for the given Predicate keyed by their locale", () => {
    const thingWithLocaleStrings: Thing = {
      type: "Subject",
      url: SUBJECT,
      predicates: {
        [PREDICATE]: {
          langStrings: {
            en: ["value 1", "value 2"],
            fr: ["value 3"],
            es: ["value 4"],
          },
        },
      },
    };

    expect(
      Array.from(getStringByLocaleAll(thingWithLocaleStrings, PREDICATE))
    ).toEqual([
      ["en", ["value 1", "value 2"]],
      ["fr", ["value 3"]],
      ["es", ["value 4"]],
    ]);
  });

  it("excludes non-language string values", () => {
    const thingWithLocaleStrings: Thing = {
      type: "Subject",
      url: SUBJECT,
      predicates: {
        [PREDICATE]: {
          langStrings: {
            fr: ["value 1"],
            es: ["value 3", "value 5"],
          },
          literals: {
            [xmlSchemaTypes.string]: ["value 2", "value 4"],
          },
        },
      },
    };

    expect(
      Array.from(getStringByLocaleAll(thingWithLocaleStrings, PREDICATE))
    ).toEqual([
      ["fr", ["value 1"]],
      ["es", ["value 3", "value 5"]],
    ]);
  });

  it("allows empty language tags - literal is still an rdf:langString", () => {
    const thingWithLocaleStrings: Thing = {
      type: "Subject",
      url: SUBJECT,
      predicates: {
        [PREDICATE]: {
          langStrings: {
            fr: ["chien"],
            "": ["dog"],
          },
        },
      },
    };

    // An empty language tag is valid, and even in Turtle should be serialized
    // as an rdf:langString, e.g.:
    //  <SUBJECT> <PREDICATE> "chien"@fr .
    //  <SUBJECT> <PREDICATE> "dog"^^rdf:langString .
    expect(
      Array.from(getStringByLocaleAll(thingWithLocaleStrings, PREDICATE))
    ).toEqual([
      ["fr", ["chien"]],
      ["", ["dog"]],
    ]);
  });

  it("ignores non-string literals", () => {
    const thingWithLocaleStrings: Thing = {
      type: "Subject",
      url: SUBJECT,
      predicates: {
        [PREDICATE]: {
          langStrings: {
            fr: ["value 1"],
          },
          literals: {
            [xmlSchemaTypes.string]: ["value 2"],
            [xmlSchemaTypes.decimal]: ["99.999"],
          },
        },
      },
    };

    expect(
      Array.from(getStringByLocaleAll(thingWithLocaleStrings, PREDICATE))
    ).toEqual([["fr", ["value 1"]]]);
  });

  it("ignores non-string literals even when there are no lang strings", () => {
    const thingWithLocaleStrings: Thing = {
      type: "Subject",
      url: SUBJECT,
      predicates: {
        [PREDICATE]: {
          literals: {
            [xmlSchemaTypes.string]: ["value 2"],
            [xmlSchemaTypes.decimal]: ["99.999"],
          },
        },
      },
    };

    expect(
      Array.from(getStringByLocaleAll(thingWithLocaleStrings, PREDICATE))
    ).toEqual([]);
  });

  it("ignores non-string literals even when there is no data at all", () => {
    const thingWithLocaleStrings: Thing = {
      type: "Subject",
      url: SUBJECT,
      predicates: {},
    };

    expect(
      Array.from(getStringByLocaleAll(thingWithLocaleStrings, PREDICATE))
    ).toEqual([]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getStringByLocaleAll(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate"
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getStringByLocaleAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getStringByLocaleAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("getStringWithLocaleAll", () => {
  it("treats empty-string locale literally - i.e. only returns values added with an empty language tag", () => {
    const thingWithLocaleStrings: Thing = {
      type: "Subject",
      url: SUBJECT,
      predicates: {
        [PREDICATE]: {
          langStrings: {
            fr: ["value 2"],
            "": ["value 3"],
            es: ["value 4"],
          },
          literals: {
            [xmlSchemaTypes.string]: ["value 1"],
          },
        },
      },
    };

    // TODO: Not sure this RDF-spec compliant - need to double check, but
    //  according to https://w3c.github.io/rdf-dir-literal/langString.html#literals
    //  it seems language tags *must* be non-empty...
    expect(
      getStringWithLocaleAll(thingWithLocaleStrings, PREDICATE, "")
    ).toEqual(["value 3"]);
  });

  it("returns the string values for the given Predicate in the given locale", () => {
    const thingWithLocaleStrings: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {
        "https://some.vocab/predicate": {
          langStrings: {
            "nl-NL": ["Some value 1", "Some value 2"],
          },
        },
      },
    };

    expect(
      getStringWithLocaleAll(
        thingWithLocaleStrings,
        "https://some.vocab/predicate",
        "nl-NL"
      )
    ).toEqual(["Some value 1", "Some value 2"]);
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithLocaleStrings: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {
        "https://some.vocab/predicate": {
          langStrings: {
            "nl-NL": ["Some value 1", "Some value 2"],
          },
        },
      },
    };

    expect(
      getStringWithLocaleAll(
        thingWithLocaleStrings,
        DataFactory.namedNode("https://some.vocab/predicate"),
        "nl-NL"
      )
    ).toEqual(["Some value 1", "Some value 2"]);
  });

  it("supports matching locales with different casing", () => {
    const thingWithLocaleString: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {
        "https://some.vocab/predicate": {
          langStrings: {
            "nl-NL": ["Some value"],
          },
        },
      },
    };

    expect(
      getStringWithLocaleAll(
        thingWithLocaleString,
        "https://some.vocab/predicate",
        "NL-nL"
      )
    ).toEqual(["Some value"]);
  });

  it("returns an empty array if no locale string values were found", () => {
    const thingWithoutStringNoLocales = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getStringWithLocaleAll(
        thingWithoutStringNoLocales,
        "https://some.vocab/predicate",
        "nl-NL"
      )
    ).toEqual([]);
  });

  it("returns an empty array if no locale strings with the requested locale were found", () => {
    const thingWithDifferentLocaleStrings: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {
        "https://some.vocab/predicate": {
          langStrings: {
            "nl-NL": ["Some value"],
          },
        },
      },
    };

    expect(
      getStringWithLocaleAll(
        thingWithDifferentLocaleStrings,
        "https://some.vocab/predicate",
        "en-GB"
      )
    ).toEqual([]);
    expect(
      getStringWithLocaleAll(
        thingWithDifferentLocaleStrings,
        "https://some.vocab/predicate",
        "nl"
      )
    ).toEqual([]);
  });

  it("does not return non-locale-string values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["https://arbitrary.vocab/object"];
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .langStrings as Record<string, string[]>) = {
      "nl-NL": ["Some value"],
    };

    expect(
      getStringWithLocaleAll(
        thingWithDifferentDatatypes,
        "https://some.vocab/predicate",
        "nl-NL"
      )
    ).toEqual(["Some value"]);
  });

  it("returns an empty array if no locale strings were found for the given Predicate", () => {
    const thingWithLocaleString: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {
        "https://some.vocab/predicate": {
          langStrings: {
            "nl-NL": ["Arbitrary value"],
          },
        },
      },
    };

    expect(
      getStringWithLocaleAll(
        thingWithLocaleString,
        "https://some-other.vocab/predicate",
        "nl-NL"
      )
    ).toEqual([]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getStringWithLocaleAll(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        "nl-NL"
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getStringWithLocaleAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        "nl-NL"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getStringWithLocaleAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        "nl-NL"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("getStringNoLocale", () => {
  it("returns the string value for the given Predicate", () => {
    const thingWithStringNoLocale = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some value",
      "string"
    );

    expect(
      getStringNoLocale(thingWithStringNoLocale, "https://some.vocab/predicate")
    ).toBe("Some value");
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithStringNoLocale = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some value",
      "string"
    );

    expect(
      getStringNoLocale(
        thingWithStringNoLocale,
        DataFactory.namedNode("https://some.vocab/predicate")
      )
    ).toBe("Some value");
  });

  it("returns null if no string value was found", () => {
    const thingWithoutStringNoLocale = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getStringNoLocale(
        thingWithoutStringNoLocale,
        "https://some.vocab/predicate"
      )
    ).toBeNull();
  });

  it("does not return non-string values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["https://arbitrary.vocab/object"];
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .literals![xmlSchemaTypes.string] as string[]) = ["Some value"];

    expect(
      getStringNoLocale(
        thingWithDifferentDatatypes,
        "https://some.vocab/predicate"
      )
    ).toBe("Some value");
  });

  it("returns null if no string value was found for the given Predicate", () => {
    const thingWithStringNoLocale = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary value",
      "string"
    );

    expect(
      getStringNoLocale(
        thingWithStringNoLocale,
        "https://some-other.vocab/predicate"
      )
    ).toBeNull();
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getStringNoLocale(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate"
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getStringNoLocale(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getStringNoLocale(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("getStringNoLocaleAll", () => {
  it("returns the string values for the given Predicate", () => {
    const thingWithStringNoLocales = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "Some value 1",
      "Some value 2",
      "string"
    );

    expect(
      getStringNoLocaleAll(
        thingWithStringNoLocales,
        "https://some.vocab/predicate"
      )
    ).toEqual(["Some value 1", "Some value 2"]);
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithStringNoLocales = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "Some value 1",
      "Some value 2",
      "string"
    );

    expect(
      getStringNoLocaleAll(
        thingWithStringNoLocales,
        DataFactory.namedNode("https://some.vocab/predicate")
      )
    ).toEqual(["Some value 1", "Some value 2"]);
  });

  it("returns an empty array if no string values were found", () => {
    const thingWithoutStringNoLocales = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getStringNoLocaleAll(
        thingWithoutStringNoLocales,
        "https://some.vocab/predicate"
      )
    ).toEqual([]);
  });

  it("does not return non-string values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["https://arbitrary.vocab/object"];
    (thingWithDifferentDatatypes.predicates["https://some.vocab/predicate"]
      .literals![xmlSchemaTypes.string] as string[]) = ["Some value"];

    expect(
      getStringNoLocaleAll(
        thingWithDifferentDatatypes,
        "https://some.vocab/predicate"
      )
    ).toEqual(["Some value"]);
  });

  it("returns an empty array if no string values were found for the given Predicate", () => {
    const thingWithStringNoLocale = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary value",
      "string"
    );

    expect(
      getStringNoLocaleAll(
        thingWithStringNoLocale,
        "https://some-other.vocab/predicate"
      )
    ).toEqual([]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getStringNoLocaleAll(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate"
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getStringNoLocaleAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getStringNoLocaleAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("getLiteral", () => {
  it("returns the Literal for the given Predicate", () => {
    const thingWithLiteral = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const foundLiteral = getLiteral(
      thingWithLiteral,
      "https://some.vocab/predicate"
    );
    expect(foundLiteral).not.toBeNull();
    expect((foundLiteral as Literal).termType).toBe("Literal");
    expect((foundLiteral as Literal).value).toBe("Some string");
  });

  it("can return langStrings", () => {
    const thingWithLocaleString: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {
        "https://some.vocab/predicate": {
          langStrings: {
            "empty-locale": [],
            "nl-NL": ["Some lang string"],
          },
        },
      },
    };

    const foundLiteral = getLiteral(
      thingWithLocaleString,
      "https://some.vocab/predicate"
    );
    expect(foundLiteral).not.toBeNull();
    expect((foundLiteral as Literal).termType).toBe("Literal");
    expect((foundLiteral as Literal).value).toBe("Some lang string");
    expect((foundLiteral as Literal).language.toLowerCase()).toBe("nl-nl");
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithLiteral = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const foundLiteral = getLiteral(
      thingWithLiteral,
      DataFactory.namedNode("https://some.vocab/predicate")
    );
    expect(foundLiteral).not.toBeNull();
    expect((foundLiteral as Literal).termType).toBe("Literal");
    expect((foundLiteral as Literal).value).toBe("Some string");
  });

  it("returns null if no Literal value was found", () => {
    const thingWithoutLiteral: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {
        "https://some.vocab/predicate": {
          langStrings: {
            "empty-locale": [],
          },
          literals: {
            "https://empty.data/type": [],
          },
        },
      },
    };

    expect(
      getLiteral(thingWithoutLiteral, "https://some.vocab/predicate")
    ).toBeNull();
  });

  it("does not return non-Literal values", () => {
    const thingWithDifferentTermTypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );
    (thingWithDifferentTermTypes.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["https://arbitrary.vocab/object"];

    expect(
      (
        getLiteral(
          thingWithDifferentTermTypes,
          "https://some.vocab/predicate"
        ) as Literal
      ).termType
    ).toBe("Literal");
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getLiteral(null as unknown as Thing, "https://arbitrary.vocab/predicate")
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getLiteral(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getLiteral(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("getLiteralAll", () => {
  it("returns the Literals for the given Predicate", () => {
    const thingWithLiterals = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "Some string 1",
      "Some string 2",
      "string"
    );

    const foundLiterals = getLiteralAll(
      thingWithLiterals,
      "https://some.vocab/predicate"
    );
    expect(foundLiterals).toHaveLength(2);
    expect(foundLiterals[0].termType).toBe("Literal");
    expect(foundLiterals[0].value).toBe("Some string 1");
    expect(foundLiterals[1].termType).toBe("Literal");
    expect(foundLiterals[1].value).toBe("Some string 2");
  });

  it("returns the lang string Literals for the given Predicate", () => {
    const thingWithLocaleString: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {
        "https://some.vocab/predicate": {
          langStrings: {
            "empty-locale": [],
            "nl-NL": ["Some lang string"],
          },
        },
      },
    };

    const foundLiterals = getLiteralAll(
      thingWithLocaleString,
      "https://some.vocab/predicate"
    );
    expect(foundLiterals).toHaveLength(1);
    expect(foundLiterals[0].termType).toBe("Literal");
    expect(foundLiterals[0].value).toBe("Some lang string");
    expect(foundLiterals[0].language.toLowerCase()).toBe("nl-nl");
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithLiterals = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "Some string 1",
      "Some string 2",
      "string"
    );

    const foundLiterals = getLiteralAll(
      thingWithLiterals,
      DataFactory.namedNode("https://some.vocab/predicate")
    );
    expect(foundLiterals).toHaveLength(2);
    expect(foundLiterals[0].termType).toBe("Literal");
    expect(foundLiterals[0].value).toBe("Some string 1");
    expect(foundLiterals[1].termType).toBe("Literal");
    expect(foundLiterals[1].value).toBe("Some string 2");
  });

  it("returns an empty array if no Literal values were found", () => {
    const thingWithoutLiterals: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {
        "https://some.vocab/predicate": {
          langStrings: {
            "empty-locale": [],
          },
          literals: {
            "https://empty.data/type": [],
          },
        },
      },
    };

    expect(
      getLiteralAll(thingWithoutLiterals, "https://some.vocab/predicate")
    ).toEqual([]);
  });

  it("does not return non-Literal values", () => {
    const thingWithDifferentTermTypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );
    (thingWithDifferentTermTypes.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["https://arbitrary.vocab/object"];

    const foundLiterals = getLiteralAll(
      thingWithDifferentTermTypes,
      "https://some.vocab/predicate"
    );

    expect(foundLiterals).toHaveLength(1);
    expect(foundLiterals[0].termType).toBe("Literal");
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getLiteralAll(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate"
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getLiteralAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getLiteralAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

function getMockThingWithNamedNode(
  predicate: IriString,
  object: IriString
): Thing {
  return {
    type: "Subject",
    url: "https://arbitrary.vocab/subject",
    predicates: {
      [predicate]: {
        namedNodes: [object],
      },
    },
  };
}
function getMockThingWithNamedNodes(
  predicate: IriString,
  object1: IriString,
  object2: IriString
): Thing {
  return {
    type: "Subject",
    url: "https://arbitrary.vocab/subject",
    predicates: {
      [predicate]: {
        namedNodes: [object1, object2],
      },
    },
  };
}

describe("getNamedNode", () => {
  it("returns the Named Node for the given Predicate", () => {
    const thingWithNamedNode = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.vocab/object"
    );

    const foundNamedNode = getNamedNode(
      thingWithNamedNode,
      "https://some.vocab/predicate"
    );
    expect(foundNamedNode).not.toBeNull();
    expect((foundNamedNode as NamedNode).termType).toBe("NamedNode");
    expect((foundNamedNode as NamedNode).value).toBe(
      "https://some.vocab/object"
    );
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithNamedNode = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.vocab/object"
    );

    const foundNamedNode = getNamedNode(
      thingWithNamedNode,
      DataFactory.namedNode("https://some.vocab/predicate")
    );
    expect(foundNamedNode).not.toBeNull();
    expect((foundNamedNode as NamedNode).termType).toBe("NamedNode");
    expect((foundNamedNode as NamedNode).value).toBe(
      "https://some.vocab/object"
    );
  });

  it("returns null if no Named Node value was found", () => {
    const thingWithoutNamedNode: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {},
    };

    expect(
      getNamedNode(thingWithoutNamedNode, "https://some.vocab/predicate")
    ).toBeNull();
  });

  it("does not return non-NamedNode values", () => {
    const thingWithDifferentTermTypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );
    (thingWithDifferentTermTypes.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["https://arbitrary.vocab/object"];

    expect(
      (
        getNamedNode(
          thingWithDifferentTermTypes,
          "https://some.vocab/predicate"
        ) as NamedNode
      ).termType
    ).toBe("NamedNode");
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getNamedNode(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate"
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getNamedNode(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getNamedNode(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("getNamedNodeAll", () => {
  it("returns the Named Nodes for the given Predicate", () => {
    const thingWithNamedNodes = getMockThingWithNamedNodes(
      "https://some.vocab/predicate",
      "https://some.vocab/object1",
      "https://some.vocab/object2"
    );

    const foundNamedNodes = getNamedNodeAll(
      thingWithNamedNodes,
      "https://some.vocab/predicate"
    );
    expect(foundNamedNodes).toHaveLength(2);
    expect(foundNamedNodes[0].termType).toBe("NamedNode");
    expect(foundNamedNodes[0].value).toBe("https://some.vocab/object1");
    expect(foundNamedNodes[1].termType).toBe("NamedNode");
    expect(foundNamedNodes[1].value).toBe("https://some.vocab/object2");
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithNamedNodes = getMockThingWithNamedNodes(
      "https://some.vocab/predicate",
      "https://some.vocab/object1",
      "https://some.vocab/object2"
    );

    const foundNamedNodes = getNamedNodeAll(
      thingWithNamedNodes,
      DataFactory.namedNode("https://some.vocab/predicate")
    );
    expect(foundNamedNodes).toHaveLength(2);
    expect(foundNamedNodes[0].termType).toBe("NamedNode");
    expect(foundNamedNodes[0].value).toBe("https://some.vocab/object1");
    expect(foundNamedNodes[1].termType).toBe("NamedNode");
    expect(foundNamedNodes[1].value).toBe("https://some.vocab/object2");
  });

  it("returns an empty array if no Named Node values were found", () => {
    const thingWithoutNamedNodes: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {},
    };

    expect(
      getNamedNodeAll(thingWithoutNamedNodes, "https://some.vocab/predicate")
    ).toEqual([]);
  });

  it("does not return non-NamedNode values", () => {
    const thingWithDifferentTermTypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );
    (thingWithDifferentTermTypes.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["https://arbitrary.vocab/object"];

    const foundNamedNodes = getNamedNodeAll(
      thingWithDifferentTermTypes,
      "https://some.vocab/predicate"
    );
    expect(foundNamedNodes).toHaveLength(1);
    expect(foundNamedNodes[0].termType).toBe("NamedNode");
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getNamedNodeAll(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate"
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getNamedNodeAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getNamedNodeAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("getTerm", () => {
  it("returns the NamedNode for the given Predicate", () => {
    const thingWithNamedNode = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.vocab/object"
    );

    const foundTerm = getTerm(
      thingWithNamedNode,
      "https://some.vocab/predicate"
    );
    expect(foundTerm).not.toBeNull();
    expect((foundTerm as NamedNode).termType).toBe("NamedNode");
    expect((foundTerm as NamedNode).value).toBe("https://some.vocab/object");
  });

  it("returns the Literal for the given Predicate", () => {
    const thingWithLiteral = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const foundTerm = getTerm(thingWithLiteral, "https://some.vocab/predicate");
    expect(foundTerm).not.toBeNull();
    expect((foundTerm as Literal).termType).toBe("Literal");
    expect((foundTerm as Literal).value).toBe("Some string");
    expect((foundTerm as Literal).datatype.value).toBe(
      "http://www.w3.org/2001/XMLSchema#string"
    );
  });

  it("returns a NamedNode for a Local Node", () => {
    const thingWithNamedNode = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      `${localNodeSkolemPrefix}local-node-name`
    );

    const foundTerm = getTerm(
      thingWithNamedNode,
      "https://some.vocab/predicate"
    );
    expect(foundTerm).not.toBeNull();
    expect((foundTerm as NamedNode).termType).toBe("NamedNode");
    expect((foundTerm as NamedNode).value).toBe("#local-node-name");
  });

  it("returns the Blank Node for the given Predicate", () => {
    const thingWithBlankNode: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {
        "https://some.vocab/predicate": {
          blankNodes: ["_:some-blank-node"],
        },
      },
    };

    const foundTerm = getTerm(
      thingWithBlankNode,
      "https://some.vocab/predicate"
    );
    expect(foundTerm).not.toBeNull();
    expect((foundTerm as BlankNode).termType).toBe("BlankNode");
    expect((foundTerm as BlankNode).value).toBe("some-blank-node");
  });

  it("returns the cycle Blank Node for the given Predicate", () => {
    const thingWithBlankNode: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {
        "https://some.vocab/predicate": {
          blankNodes: [
            {
              "https://arbitrary-other.vocab/predicate": {
                namedNodes: ["https://arbitrary.url"],
              },
            },
          ],
        },
      },
    };

    const foundTerm = getTerm(
      thingWithBlankNode,
      "https://some.vocab/predicate"
    );
    expect(foundTerm).not.toBeNull();
    expect((foundTerm as BlankNode).termType).toBe("BlankNode");
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithNamedNode = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.vocab/object"
    );

    const foundTerm = getTerm(
      thingWithNamedNode,
      DataFactory.namedNode("https://some.vocab/predicate")
    );
    expect(foundTerm).not.toBeNull();
    expect((foundTerm as NamedNode).termType).toBe("NamedNode");
    expect((foundTerm as NamedNode).value).toBe("https://some.vocab/object");
  });

  it("returns null if no value was found", () => {
    const thingWithoutTerm: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {},
    };

    expect(
      getTerm(thingWithoutTerm, "https://some.vocab/predicate")
    ).toBeNull();
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getTerm(null as unknown as Thing, "https://arbitrary.vocab/predicate")
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getTerm(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getTerm(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("getTermAll", () => {
  it("returns the Named Nodes for the given Predicate", () => {
    const thingWithNamedNodes = getMockThingWithNamedNodes(
      "https://some.vocab/predicate",
      "https://some.vocab/object1",
      "https://some.vocab/object2"
    );

    const foundTerms = getTermAll(
      thingWithNamedNodes,
      "https://some.vocab/predicate"
    );
    expect(foundTerms).toHaveLength(2);
    expect(foundTerms[0].termType).toBe("NamedNode");
    expect(foundTerms[0].value).toBe("https://some.vocab/object1");
    expect(foundTerms[1].termType).toBe("NamedNode");
    expect(foundTerms[1].value).toBe("https://some.vocab/object2");
  });

  it("returns the Literals for the given Predicate", () => {
    const thingWithLiterals = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "Some string 1",
      "Some string 2",
      "string"
    );

    const foundTerms = getTermAll(
      thingWithLiterals,
      "https://some.vocab/predicate"
    );
    expect(foundTerms).toHaveLength(2);
    expect(foundTerms[0].termType).toBe("Literal");
    expect(foundTerms[0].value).toBe("Some string 1");
    expect((foundTerms[0] as Literal).datatype.value).toBe(
      "http://www.w3.org/2001/XMLSchema#string"
    );
    expect(foundTerms[1].termType).toBe("Literal");
    expect(foundTerms[1].value).toBe("Some string 2");
    expect((foundTerms[1] as Literal).datatype.value).toBe(
      "http://www.w3.org/2001/XMLSchema#string"
    );
  });

  it("returns NamedNodes for Local Nodes", () => {
    const thingWithNamedNode = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      `${localNodeSkolemPrefix}local-node-name`
    );

    const foundTerms = getTermAll(
      thingWithNamedNode,
      "https://some.vocab/predicate"
    );
    expect(foundTerms).toHaveLength(1);
    expect(foundTerms[0].termType).toBe("NamedNode");
    expect(foundTerms[0].value).toBe("#local-node-name");
  });

  it("returns Blank Nodes for the given Predicate", () => {
    const thingWithBlankNode: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {
        "https://some.vocab/predicate": {
          blankNodes: ["_:some-blank-node"],
        },
      },
    };

    const foundTerms = getTermAll(
      thingWithBlankNode,
      "https://some.vocab/predicate"
    );
    expect(foundTerms).toHaveLength(1);
    expect(foundTerms[0].termType).toBe("BlankNode");
    expect(foundTerms[0].value).toBe("some-blank-node");
  });

  it("returns cycle Blank Nodes for the given Predicate", () => {
    const thingWithBlankNode: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {
        "https://some.vocab/predicate": {
          blankNodes: [
            {
              "https://arbitrary-other.vocab/predicate": {
                namedNodes: ["https://arbitrary.url"],
              },
            },
          ],
        },
      },
    };

    const foundTerms = getTermAll(
      thingWithBlankNode,
      "https://some.vocab/predicate"
    );
    expect(foundTerms).toHaveLength(1);
    expect(foundTerms[0].termType).toBe("BlankNode");
  });

  it("returns Terms of different TermTypes for the given Predicate", () => {
    const thingWithMixedTerms = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );
    (thingWithMixedTerms.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["https://some.vocab/object1"];

    const foundTerms = getTermAll(
      thingWithMixedTerms,
      "https://some.vocab/predicate"
    );
    expect(foundTerms).toHaveLength(2);
    expect(foundTerms[0].termType).toBe("NamedNode");
    expect(foundTerms[0].value).toBe("https://some.vocab/object1");
    expect(foundTerms[1].termType).toBe("Literal");
    expect(foundTerms[1].value).toBe("Some string");
    expect((foundTerms[1] as Literal).datatype.value).toBe(
      "http://www.w3.org/2001/XMLSchema#string"
    );
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithNamedNodes = getMockThingWithNamedNodes(
      "https://some.vocab/predicate",
      "https://some.vocab/object1",
      "https://some.vocab/object2"
    );

    const foundNamedNodes = getTermAll(
      thingWithNamedNodes,
      DataFactory.namedNode("https://some.vocab/predicate")
    );
    expect(foundNamedNodes).toHaveLength(2);
    expect(foundNamedNodes[0].termType).toBe("NamedNode");
    expect(foundNamedNodes[0].value).toBe("https://some.vocab/object1");
    expect(foundNamedNodes[1].termType).toBe("NamedNode");
    expect(foundNamedNodes[1].value).toBe("https://some.vocab/object2");
  });

  it("returns an empty array if no values were found", () => {
    const thingWithoutTerms: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {},
    };

    expect(
      getTermAll(thingWithoutTerms, "https://some.vocab/predicate")
    ).toEqual([]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      getTermAll(null as unknown as Thing, "https://arbitrary.vocab/predicate")
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      getTermAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      getTermAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});
