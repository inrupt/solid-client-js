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

import { dataset } from "@rdfjs/dataset";
import { DataFactory } from "n3";
import { IriString, Thing, ThingPersisted, UrlString } from "../interfaces";
import {
  removeAll,
  removeUrl,
  removeBoolean,
  removeDatetime,
  removeDate,
  removeTime,
  removeDecimal,
  removeInteger,
  removeStringEnglish,
  removeStringWithLocale,
  removeStringNoLocale,
  removeLiteral,
  removeNamedNode,
} from "./remove";
import { mockThingFrom } from "./mock";
import {
  ValidPropertyUrlExpectedError,
  ValidValueUrlExpectedError,
} from "./thing";
import { localNodeSkolemPrefix } from "../rdf.internal";

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

describe("removeAll", () => {
  it("removes all values for the given Predicate", () => {
    const thingWithStringAndIri = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string value",
      "string"
    );
    (thingWithStringAndIri.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["https://arbitrary.vocab/predicate"];

    const updatedThing = removeAll(
      thingWithStringAndIri,
      "https://some.vocab/predicate"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toBeUndefined();
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithString = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string value",
      "string"
    );

    const updatedThing = removeAll(
      thingWithString,
      DataFactory.namedNode("https://some.vocab/predicate")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toBeUndefined();
  });

  it("does not modify the input Thing", () => {
    const thingWithString = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string value",
      "string"
    );

    const updatedThing = removeAll(
      thingWithString,
      DataFactory.namedNode("https://some.vocab/predicate")
    );

    expect(thingWithString).not.toStrictEqual(updatedThing);
    expect(
      thingWithString.predicates["https://some.vocab/predicate"]
    ).toBeDefined();
    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toBeUndefined();
  });

  it("does nothing if there was nothing to remove", () => {
    const thingWithString = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string value",
      "string"
    );

    const updatedThing = removeAll(
      thingWithString,
      DataFactory.namedNode("https://some.vocab/other-predicate")
    );

    expect(thingWithString).toStrictEqual(updatedThing);
    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toBeDefined();
  });

  it("also works on ThingLocals", () => {
    const thingLocal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string value",
      "string"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}arbitrary-subject-name`;

    const updatedThing = removeAll(thingLocal, "https://some.vocab/predicate");

    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toBeUndefined();
  });

  it("removes multiple instances of the same value for the same Predicate", () => {
    const thingWithDuplicateIri = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#name"
    );
    (
      thingWithDuplicateIri.predicates["https://some.vocab/predicate"]
        .namedNodes as UrlString[]
    ).push("https://arbitrary.pod/resource#name");

    const updatedThing = removeAll(
      thingWithDuplicateIri,
      "https://some.vocab/predicate"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toBeUndefined();
  });

  it("does not remove Quads with different Predicates", () => {
    const thingWithIri = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#name"
    );
    (thingWithIri.predicates["https://some-other.vocab/predicate"] as {
      namedNodes: UrlString[];
    }) = {
      namedNodes: ["https://arbitrary.pod/resource#name"],
    };

    const updatedThing = removeAll(
      thingWithIri,
      "https://some.vocab/predicate"
    );

    expect(
      updatedThing.predicates["https://some-other.vocab/predicate"]
    ).toBeDefined();
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      removeAll(null as unknown as Thing, "https://arbitrary.vocab/predicate")
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      removeAll(
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
      removeAll(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("removeIri", () => {
  it("removes the given IRI value for the given Predicate", () => {
    const thingWithIri = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    const updatedThing = removeUrl(
      thingWithIri,
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual([]);
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithIri = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    const updatedThing = removeUrl(
      thingWithIri,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "https://some.pod/resource#name"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual([]);
  });

  it("accepts IRI's as Named Nodes", () => {
    const thingWithIri = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    const updatedThing = removeUrl(
      thingWithIri,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/resource#name")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual([]);
  });

  it("does not modify the input Thing", () => {
    const thingWithIri = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    const updatedThing = removeUrl(
      thingWithIri,
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    expect(thingWithIri).not.toStrictEqual(updatedThing);
    expect(
      thingWithIri.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual(["https://some.pod/resource#name"]);
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual([]);
  });

  it("does nothing if the URL to remove was not found", () => {
    const thingWithIri = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    const updatedThing = removeUrl(
      thingWithIri,
      "https://some.vocab/other-predicate",
      "https://some.pod/other-resource#name"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toEqual(["https://some.pod/resource#name"]);
  });

  it("also works on ThingLocals", () => {
    const thingLocal = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}arbitrary-subject-name`;

    const updatedThing = removeUrl(
      thingLocal,
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual([]);
  });

  it("removes multiple instances of the same IRI for the same Predicate", () => {
    const thingWithIri = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );
    (
      thingWithIri.predicates["https://some.vocab/predicate"]
        .namedNodes as UrlString[]
    ).push("https://some.pod/resource#name");

    const updatedThing = removeUrl(
      thingWithIri,
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual([]);
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithIri = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );
    (
      thingWithIri.predicates["https://some.vocab/predicate"]
        .namedNodes as UrlString[]
    ).push("https://some-other.pod/resource#name");
    (thingWithIri.predicates["https://some-other.vocab/predicate"] as {
      namedNodes: UrlString[];
    }) = {
      namedNodes: ["https://arbitrary.pod/resource#name"],
    };

    const updatedThing = removeUrl(
      thingWithIri,
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual(["https://some-other.pod/resource#name"]);
    expect(
      updatedThing.predicates["https://some-other.vocab/predicate"].namedNodes
    ).toStrictEqual(["https://arbitrary.pod/resource#name"]);
  });

  it("does not remove Quads with non-IRI Objects", () => {
    const thingWithIri = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some non-IRI Object",
      "string"
    );
    (thingWithIri.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["https://some.pod/resource#name"];

    const updatedThing = removeUrl(
      thingWithIri,
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toStrictEqual({
      literals: {
        "http://www.w3.org/2001/XMLSchema#string": ["Some non-IRI Object"],
      },
      namedNodes: [],
    });
  });

  it("resolves ThingPersisteds", () => {
    const thingPersisted: ThingPersisted = {
      type: "Subject",
      url: "https://some.pod/resource#thing",
      predicates: {},
    };
    const thingWithThingPersistedIri = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.pod/resource#thing"
    );

    const updatedThing = removeUrl(
      thingWithThingPersistedIri,
      "https://some.vocab/predicate",
      thingPersisted
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual([]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      removeUrl(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        "https://arbitrary.url"
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      removeUrl(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        "https://arbitrary.url"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      removeUrl(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        "https://arbitrary.url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });

  it("throws an error when passed an invalid URL value", () => {
    expect(() =>
      removeUrl(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "https://arbitrary.vocab/predicate",
        "not-a-url"
      )
    ).toThrow("Expected a valid URL value, but received: [not-a-url].");
  });

  it("throws an instance of ValidValueUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      removeUrl(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "https://arbitrary.vocab/predicate",
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidValueUrlExpectedError);
  });
});

describe("removeBoolean", () => {
  it("removes the given boolean value for the given Predicate", () => {
    const thingWithBoolean = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1",
      "boolean"
    );

    const updatedThing = removeBoolean(
      thingWithBoolean,
      "https://some.vocab/predicate",
      true
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#boolean": [],
    });
  });

  it("removes equivalent booleans with different serialisations", () => {
    const thingWithSerialised1 = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1",
      "boolean"
    );
    const thingWithSerialised0 = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "0",
      "boolean"
    );
    const thingWithSerialisedTrue = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "true",
      "boolean"
    );
    const thingWithSerialisedFalse = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "false",
      "boolean"
    );

    const updatedThingWithoutSerialised1 = removeBoolean(
      thingWithSerialised1,
      "https://some.vocab/predicate",
      true
    );
    const updatedThingWithoutSerialised0 = removeBoolean(
      thingWithSerialised0,
      "https://some.vocab/predicate",
      false
    );
    const updatedThingWithoutSerialisedTrue = removeBoolean(
      thingWithSerialisedTrue,
      "https://some.vocab/predicate",
      true
    );
    const updatedThingWithoutSerialisedFalse = removeBoolean(
      thingWithSerialisedFalse,
      "https://some.vocab/predicate",
      false
    );

    expect(
      updatedThingWithoutSerialised1.predicates["https://some.vocab/predicate"]
        .literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#boolean": [],
    });
    expect(
      updatedThingWithoutSerialised0.predicates["https://some.vocab/predicate"]
        .literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#boolean": [],
    });
    expect(
      updatedThingWithoutSerialisedTrue.predicates[
        "https://some.vocab/predicate"
      ].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#boolean": [],
    });
    expect(
      updatedThingWithoutSerialisedFalse.predicates[
        "https://some.vocab/predicate"
      ].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#boolean": [],
    });
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithBoolean = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "0",
      "boolean"
    );

    const updatedThing = removeBoolean(
      thingWithBoolean,
      DataFactory.namedNode("https://some.vocab/predicate"),
      false
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#boolean": [],
    });
  });

  it("does not modify the input Thing", () => {
    const thingWithBoolean = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1",
      "boolean"
    );

    const updatedThing = removeBoolean(
      thingWithBoolean,
      "https://some.vocab/predicate",
      true
    );

    expect(thingWithBoolean).not.toStrictEqual(updatedThing);
    expect(
      thingWithBoolean.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#boolean": ["1"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#boolean": [],
    });
  });

  it("does nothing if the boolean to remove was not found", () => {
    const thingWithBoolean = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1",
      "boolean"
    );

    const updatedThing = removeBoolean(
      thingWithBoolean,
      "https://some.vocab/other-predicate",
      false
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toEqual({
      "http://www.w3.org/2001/XMLSchema#boolean": ["1"],
    });
  });

  it("also works on ThingLocals", () => {
    const thingLocal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1",
      "boolean"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}arbitrary-subject-name`;

    const updatedThing = removeBoolean(
      thingLocal,
      "https://some.vocab/predicate",
      true
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#boolean": [],
    });
  });

  it("removes multiple instances of the same boolean for the same Predicate", () => {
    const thingWithDuplicateBoolean = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1",
      "boolean"
    );
    (
      thingWithDuplicateBoolean.predicates["https://some.vocab/predicate"]
        .literals!["http://www.w3.org/2001/XMLSchema#boolean"] as string[]
    ).push("1");

    const updatedThing = removeBoolean(
      thingWithDuplicateBoolean,
      "https://some.vocab/predicate",
      true
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#boolean": [],
    });
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithOtherQuads = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1",
      "boolean"
    );
    (
      thingWithOtherQuads.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#boolean"
      ] as string[]
    ).push("0");
    (thingWithOtherQuads.predicates[
      "https://some-other.vocab/predicate"
    ] as any) = {
      literals: {
        "http://www.w3.org/2001/XMLSchema#boolean": ["1"],
      },
    };

    const updatedThing = removeBoolean(
      thingWithOtherQuads,
      "https://some.vocab/predicate",
      true
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({ "http://www.w3.org/2001/XMLSchema#boolean": ["0"] });
    expect(
      updatedThing.predicates["https://some-other.vocab/predicate"].literals
    ).toStrictEqual({ "http://www.w3.org/2001/XMLSchema#boolean": ["1"] });
  });

  it("does not remove Quads with non-boolean Objects", () => {
    const thingWithIri = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1",
      "boolean"
    );
    (thingWithIri.predicates["https://some.vocab/predicate"]
      .namedNodes as UrlString[]) = ["1"];

    const updatedThing = removeBoolean(
      thingWithIri,
      "https://some.vocab/predicate",
      true
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual(["1"]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      removeBoolean(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        true
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      removeBoolean(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        true
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      removeBoolean(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        true
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("removeDatetime", () => {
  it("removes the given datetime value for the given Predicate", () => {
    const thingWithDatetime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12T13:37:42Z",
      "dateTime"
    );

    const updatedThing = removeDatetime(
      thingWithDatetime,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#dateTime": [],
    });
  });

  it("removes equivalent Datetimes with different serialisations", () => {
    const thingWithRoundedDatetime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12T13:37:42Z",
      "dateTime"
    );
    const thingWithSpecificDatetime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12T12:37:42.000+01:00",
      "dateTime"
    );

    const updatedThingWithoutRoundedDatetime = removeDatetime(
      thingWithRoundedDatetime,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );
    const updatedThingWithoutSpecificDatetime = removeDatetime(
      thingWithSpecificDatetime,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(
      updatedThingWithoutRoundedDatetime.predicates[
        "https://some.vocab/predicate"
      ].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#dateTime": [],
    });
    expect(
      updatedThingWithoutSpecificDatetime.predicates[
        "https://some.vocab/predicate"
      ].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#dateTime": [],
    });
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithDatetime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12T13:37:42Z",
      "dateTime"
    );

    const updatedThing = removeDatetime(
      thingWithDatetime,
      DataFactory.namedNode("https://some.vocab/predicate"),
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#dateTime": [],
    });
  });

  it("does not modify the input Thing", () => {
    const thingWithDatetime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12T13:37:42Z",
      "dateTime"
    );

    const updatedThing = removeDatetime(
      thingWithDatetime,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(thingWithDatetime).not.toStrictEqual(updatedThing);
    expect(
      thingWithDatetime.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#dateTime": ["1990-11-12T13:37:42Z"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#dateTime": [],
    });
  });

  it("also works on ThingLocals", () => {
    const thingLocal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12T13:37:42Z",
      "dateTime"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}arbitrary-subject-name`;

    const updatedThing = removeDatetime(
      thingLocal,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#dateTime": [],
    });
  });

  it("removes multiple instances of the same datetime for the same Predicate", () => {
    const thingWithDuplicateDatetime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12T13:37:42Z",
      "dateTime"
    );
    (
      thingWithDuplicateDatetime.predicates["https://some.vocab/predicate"]
        .literals!["http://www.w3.org/2001/XMLSchema#dateTime"] as string[]
    ).push("1990-11-12T13:37:42Z");

    const updatedThing = removeDatetime(
      thingWithDuplicateDatetime,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#dateTime": [],
    });
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithOtherQuads = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12T13:37:42Z",
      "dateTime"
    );
    // A different Object:
    (
      thingWithOtherQuads.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#dateTime"
      ] as string[]
    ).push("1955-06-08T13:37:42Z");
    // An invalid object
    (
      thingWithOtherQuads.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#dateTime"
      ] as string[]
    ).push("not-a-datetime");
    // A different predicate
    (thingWithOtherQuads.predicates[
      "https://some-other.vocab/predicate"
    ] as any) = {
      literals: {
        "http://www.w3.org/2001/XMLSchema#dateTime": ["1990-11-12T13:37:42Z"],
      },
    };

    const updatedThing = removeDatetime(
      thingWithOtherQuads,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(updatedThing.predicates).toStrictEqual({
      "https://some.vocab/predicate": {
        literals: {
          "http://www.w3.org/2001/XMLSchema#dateTime": [
            "1955-06-08T13:37:42Z",
            "not-a-datetime",
          ],
        },
      },
      "https://some-other.vocab/predicate": {
        literals: {
          "http://www.w3.org/2001/XMLSchema#dateTime": ["1990-11-12T13:37:42Z"],
        },
      },
    });
  });

  it("does not remove Quads with non-datetime Objects", () => {
    const thingWithString = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12T13:37:42Z",
      "dateTime"
    );
    (thingWithString.predicates["https://some.vocab/predicate"].literals![
      "http://www.w3.org/2001/XMLSchema#string"
    ] as string[]) = ["Some string value"];

    const updatedThing = removeDatetime(
      thingWithString,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#dateTime": [],
      "http://www.w3.org/2001/XMLSchema#string": ["Some string value"],
    });
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      removeDatetime(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      removeDatetime(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      removeDatetime(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("removeDate", () => {
  it("removes the given date value for the given Predicate", () => {
    const thingWithDate = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12Z",
      "date"
    );

    const updatedThing = removeDate(
      thingWithDate,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#date": [],
    });
  });

  it("removes the given date value for the given Predicate regardless of the time value set", () => {
    const thingWithDate = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12Z",
      "date"
    );

    const updatedThing = removeDate(
      thingWithDate,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#date": [],
    });
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithDate = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12Z",
      "date"
    );

    const updatedThing = removeDate(
      thingWithDate,
      DataFactory.namedNode("https://some.vocab/predicate"),
      new Date(Date.UTC(1990, 10, 12))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#date": [],
    });
  });

  it("does not modify the input Thing", () => {
    const thingWithDate = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12Z",
      "date"
    );

    const updatedThing = removeDate(
      thingWithDate,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12))
    );

    expect(thingWithDate).not.toStrictEqual(updatedThing);
    expect(
      thingWithDate.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#date": ["1990-11-12Z"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#date": [],
    });
  });

  it("also works on ThingLocals", () => {
    const thingLocal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12Z",
      "date"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}arbitrary-subject-name`;

    const updatedThing = removeDate(
      thingLocal,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#date": [],
    });
  });

  it("removes multiple instances of the same date for the same Predicate", () => {
    const thingWithDuplicateDate = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12Z",
      "date"
    );
    (
      thingWithDuplicateDate.predicates["https://some.vocab/predicate"]
        .literals!["http://www.w3.org/2001/XMLSchema#date"] as string[]
    ).push("1990-11-12Z");

    const updatedThing = removeDate(
      thingWithDuplicateDate,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#date": [],
    });
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithOtherQuads = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12Z",
      "date"
    );
    // A different Object:
    (
      thingWithOtherQuads.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#date"
      ] as string[]
    ).push("1955-06-08Z");
    // An invalid object
    (
      thingWithOtherQuads.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#date"
      ] as string[]
    ).push("not-a-date");
    // A different predicate
    (thingWithOtherQuads.predicates[
      "https://some-other.vocab/predicate"
    ] as any) = {
      literals: {
        "http://www.w3.org/2001/XMLSchema#date": ["1990-11-12Z"],
      },
    };

    const updatedThing = removeDate(
      thingWithOtherQuads,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12))
    );

    expect(updatedThing.predicates).toStrictEqual({
      "https://some.vocab/predicate": {
        literals: {
          "http://www.w3.org/2001/XMLSchema#date": [
            "1955-06-08Z",
            "not-a-date",
          ],
        },
      },
      "https://some-other.vocab/predicate": {
        literals: {
          "http://www.w3.org/2001/XMLSchema#date": ["1990-11-12Z"],
        },
      },
    });
  });

  it("does not remove Quads with non-date Objects", () => {
    const thingWithString = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12Z",
      "date"
    );
    (thingWithString.predicates["https://some.vocab/predicate"].literals![
      "http://www.w3.org/2001/XMLSchema#string"
    ] as string[]) = ["Some string value"];

    const updatedThing = removeDate(
      thingWithString,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#date": [],
      "http://www.w3.org/2001/XMLSchema#string": ["Some string value"],
    });
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      removeDate(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        new Date(Date.UTC(1990, 10, 12))
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      removeDate(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        new Date(Date.UTC(1990, 10, 12))
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      removeDate(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        new Date(Date.UTC(1990, 10, 12))
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("removeTime", () => {
  it("removes the given time value for the given Predicate", () => {
    const thingWithTime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13:37:42",
      "time"
    );

    const updatedThing = removeTime(
      thingWithTime,
      "https://some.vocab/predicate",
      {
        hour: 13,
        minute: 37,
        second: 42,
      }
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#time": [],
    });
  });

  it("removes equivalent times with different serialisations", () => {
    const thingWithRoundedTime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13:37:42",
      "time"
    );
    const thingWithSpecificTime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "12:37:42+01:00",
      "time"
    );

    const updatedThingWithoutRoundedTime = removeTime(
      thingWithRoundedTime,
      "https://some.vocab/predicate",
      {
        hour: 13,
        minute: 37,
        second: 42,
      }
    );
    const updatedThingWithoutSpecificTime = removeTime(
      thingWithSpecificTime,
      "https://some.vocab/predicate",
      {
        hour: 12,
        minute: 37,
        second: 42,
        timezoneHourOffset: 1,
        timezoneMinuteOffset: 0,
      }
    );

    expect(
      updatedThingWithoutRoundedTime.predicates["https://some.vocab/predicate"]
        .literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#time": [],
    });
    expect(
      updatedThingWithoutSpecificTime.predicates["https://some.vocab/predicate"]
        .literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#time": [],
    });
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithTime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13:37:42",
      "time"
    );

    const updatedThing = removeTime(
      thingWithTime,
      DataFactory.namedNode("https://some.vocab/predicate"),
      {
        hour: 13,
        minute: 37,
        second: 42,
      }
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#time": [],
    });
  });

  it("does not modify the input Thing", () => {
    const thingWithTime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13:37:42",
      "time"
    );

    const updatedThing = removeTime(
      thingWithTime,
      "https://some.vocab/predicate",
      {
        hour: 13,
        minute: 37,
        second: 42,
      }
    );

    expect(thingWithTime).not.toStrictEqual(updatedThing);
    expect(
      thingWithTime.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#time": ["13:37:42"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#time": [],
    });
  });

  it("also works on ThingLocals", () => {
    const thingLocal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13:37:42",
      "time"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}arbitrary-subject-name`;

    const updatedThing = removeTime(
      thingLocal,
      "https://some.vocab/predicate",
      {
        hour: 13,
        minute: 37,
        second: 42,
      }
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#time": [],
    });
  });

  it("removes multiple instances of the same time for the same Predicate", () => {
    const thingWithDuplicateTime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13:37:42",
      "time"
    );
    (
      thingWithDuplicateTime.predicates["https://some.vocab/predicate"]
        .literals!["http://www.w3.org/2001/XMLSchema#time"] as string[]
    ).push("13:37:42");

    const updatedThing = removeTime(
      thingWithDuplicateTime,
      "https://some.vocab/predicate",
      {
        hour: 13,
        minute: 37,
        second: 42,
      }
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#time": [],
    });
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithOtherQuads = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13:37:42",
      "time"
    );
    // A different Object:
    (
      thingWithOtherQuads.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#time"
      ] as string[]
    ).push("14:37:42");
    // An invalid object
    (
      thingWithOtherQuads.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#time"
      ] as string[]
    ).push("not-a-time");
    // A different predicate
    (thingWithOtherQuads.predicates[
      "https://some-other.vocab/predicate"
    ] as any) = {
      literals: {
        "http://www.w3.org/2001/XMLSchema#time": ["13:37:42"],
      },
    };

    const updatedThing = removeTime(
      thingWithOtherQuads,
      "https://some.vocab/predicate",
      {
        hour: 13,
        minute: 37,
        second: 42,
      }
    );

    expect(updatedThing.predicates).toStrictEqual({
      "https://some.vocab/predicate": {
        literals: {
          "http://www.w3.org/2001/XMLSchema#time": ["14:37:42", "not-a-time"],
        },
      },
      "https://some-other.vocab/predicate": {
        literals: {
          "http://www.w3.org/2001/XMLSchema#time": ["13:37:42"],
        },
      },
    });
  });

  it("does not remove Quads with non-time Objects", () => {
    const thingWithString = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13:37:42",
      "time"
    );
    (thingWithString.predicates["https://some.vocab/predicate"].literals![
      "http://www.w3.org/2001/XMLSchema#string"
    ] as string[]) = ["Some string value"];

    const updatedThing = removeTime(
      thingWithString,
      "https://some.vocab/predicate",
      {
        hour: 13,
        minute: 37,
        second: 42,
      }
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#time": [],
      "http://www.w3.org/2001/XMLSchema#string": ["Some string value"],
    });
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      removeTime(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        {
          hour: 13,
          minute: 37,
          second: 42,
        }
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      removeTime(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        {
          hour: 13,
          minute: 37,
          second: 42,
        }
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      removeTime(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        {
          hour: 13,
          minute: 37,
          second: 42,
        }
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("removeDecimal", () => {
  it("removes the given decimal value for the given Predicate", () => {
    const thingWithDecimal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13.37",
      "decimal"
    );

    const updatedThing = removeDecimal(
      thingWithDecimal,
      "https://some.vocab/predicate",
      13.37
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#decimal": [],
    });
  });

  it("removes equivalent Decimals with different serialisations", () => {
    const thingWithPlainDecimal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1337",
      "decimal"
    );
    const thingWithSignedDecimal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "+1337",
      "decimal"
    );
    const thingWithZeroedDecimal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "01337.0",
      "decimal"
    );

    const updatedThingWithoutPlainDecimal = removeDecimal(
      thingWithPlainDecimal,
      "https://some.vocab/predicate",
      1337
    );
    const updatedThingWithoutSignedDecimal = removeDecimal(
      thingWithSignedDecimal,
      "https://some.vocab/predicate",
      1337
    );
    const updatedThingWithoutZeroedDecimal = removeDecimal(
      thingWithZeroedDecimal,
      "https://some.vocab/predicate",
      1337
    );

    expect(
      updatedThingWithoutPlainDecimal.predicates["https://some.vocab/predicate"]
        .literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#decimal": [],
    });
    expect(
      updatedThingWithoutSignedDecimal.predicates[
        "https://some.vocab/predicate"
      ].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#decimal": [],
    });
    expect(
      updatedThingWithoutZeroedDecimal.predicates[
        "https://some.vocab/predicate"
      ].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#decimal": [],
    });
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithDecimal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13.37",
      "decimal"
    );

    const updatedThing = removeDecimal(
      thingWithDecimal,
      DataFactory.namedNode("https://some.vocab/predicate"),
      13.37
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#decimal": [],
    });
  });

  it("does not modify the input Thing", () => {
    const thingWithDecimal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13.37",
      "decimal"
    );

    const updatedThing = removeDecimal(
      thingWithDecimal,
      "https://some.vocab/predicate",
      13.37
    );

    expect(thingWithDecimal).not.toStrictEqual(updatedThing);
    expect(
      thingWithDecimal.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#decimal": ["13.37"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#decimal": [],
    });
  });

  it("does nothing if the decimal to remove could not be found", () => {
    const thingWithDecimal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13.37",
      "decimal"
    );

    const updatedThing = removeDecimal(
      thingWithDecimal,
      "https://some.vocab/other-predicate",
      4.2
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toEqual({
      "http://www.w3.org/2001/XMLSchema#decimal": ["13.37"],
    });
  });

  it("also works on ThingLocals", () => {
    const thingLocal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13.37",
      "decimal"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}arbitrary-subject-name`;

    const updatedThing = removeDecimal(
      thingLocal,
      "https://some.vocab/predicate",
      13.37
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#decimal": [],
    });
  });

  it("removes multiple instances of the same decimal for the same Predicate", () => {
    const thingWithDuplicateDecimal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13.37",
      "decimal"
    );
    (
      thingWithDuplicateDecimal.predicates["https://some.vocab/predicate"]
        .literals!["http://www.w3.org/2001/XMLSchema#decimal"] as string[]
    ).push("13.37");

    const updatedThing = removeDecimal(
      thingWithDuplicateDecimal,
      "https://some.vocab/predicate",
      13.37
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#decimal": [],
    });
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithOtherQuads = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13.37",
      "decimal"
    );
    // A different Object:
    (
      thingWithOtherQuads.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#decimal"
      ] as string[]
    ).push("4.2");
    // A different predicate
    (thingWithOtherQuads.predicates[
      "https://some-other.vocab/predicate"
    ] as any) = {
      literals: {
        "http://www.w3.org/2001/XMLSchema#decimal": ["13.37"],
      },
    };

    const updatedThing = removeDecimal(
      thingWithOtherQuads,
      "https://some.vocab/predicate",
      13.37
    );

    expect(updatedThing.predicates).toStrictEqual({
      "https://some.vocab/predicate": {
        literals: {
          "http://www.w3.org/2001/XMLSchema#decimal": ["4.2"],
        },
      },
      "https://some-other.vocab/predicate": {
        literals: {
          "http://www.w3.org/2001/XMLSchema#decimal": ["13.37"],
        },
      },
    });
  });

  it("does not remove Quads with non-decimal Objects", () => {
    const thingWithString = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13.37",
      "decimal"
    );
    (thingWithString.predicates["https://some.vocab/predicate"].literals![
      "http://www.w3.org/2001/XMLSchema#string"
    ] as string[]) = ["13.37"];

    const updatedThing = removeDecimal(
      thingWithString,
      "https://some.vocab/predicate",
      13.37
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#decimal": [],
      "http://www.w3.org/2001/XMLSchema#string": ["13.37"],
    });
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      removeDecimal(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        13.37
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      removeDecimal(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        13.37
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      removeDecimal(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        13.37
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("removeInteger", () => {
  it("removes the given integer value for the given Predicate", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    const updatedThing = removeInteger(
      thingWithInteger,
      "https://some.vocab/predicate",
      42
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#integer": [],
    });
  });

  it("removes equivalent integers with different serialisations", () => {
    const thingWithUnsignedInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );
    const thingWithSignedInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "+42",
      "integer"
    );

    const updatedThingWithoutUnsignedInteger = removeInteger(
      thingWithUnsignedInteger,
      "https://some.vocab/predicate",
      42
    );
    const updatedThingWithoutSignedInteger = removeInteger(
      thingWithSignedInteger,
      "https://some.vocab/predicate",
      42
    );

    expect(
      updatedThingWithoutUnsignedInteger.predicates[
        "https://some.vocab/predicate"
      ].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#integer": [],
    });
    expect(
      updatedThingWithoutSignedInteger.predicates[
        "https://some.vocab/predicate"
      ].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#integer": [],
    });
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    const updatedThing = removeInteger(
      thingWithInteger,
      DataFactory.namedNode("https://some.vocab/predicate"),
      42
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#integer": [],
    });
  });

  it("does not modify the input Thing", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    const updatedThing = removeInteger(
      thingWithInteger,
      "https://some.vocab/predicate",
      42
    );

    expect(thingWithInteger).not.toStrictEqual(updatedThing);
    expect(
      thingWithInteger.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#integer": ["42"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#integer": [],
    });
  });

  it("does nothing if the integer to remove could not be found", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    const updatedThing = removeInteger(
      thingWithInteger,
      "https://some.vocab/other-predicate",
      1337
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toEqual({
      "http://www.w3.org/2001/XMLSchema#integer": ["42"],
    });
  });

  it("also works on ThingLocals", () => {
    const thingLocal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}arbitrary-subject-name`;

    const updatedThing = removeInteger(
      thingLocal,
      "https://some.vocab/predicate",
      42
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#integer": [],
    });
  });

  it("removes multiple instances of the same integer for the same Predicate", () => {
    const thingWithDuplicateInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );
    (
      thingWithDuplicateInteger.predicates["https://some.vocab/predicate"]
        .literals!["http://www.w3.org/2001/XMLSchema#integer"] as string[]
    ).push("42");

    const updatedThing = removeInteger(
      thingWithDuplicateInteger,
      "https://some.vocab/predicate",
      42
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#integer": [],
    });
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithOtherQuads = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );
    // A different Object:
    (
      thingWithOtherQuads.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#integer"
      ] as string[]
    ).push("1337");
    // A different predicate
    (thingWithOtherQuads.predicates[
      "https://some-other.vocab/predicate"
    ] as any) = {
      literals: {
        "http://www.w3.org/2001/XMLSchema#integer": ["42"],
      },
    };

    const updatedThing = removeInteger(
      thingWithOtherQuads,
      "https://some.vocab/predicate",
      42
    );

    expect(updatedThing.predicates).toStrictEqual({
      "https://some.vocab/predicate": {
        literals: {
          "http://www.w3.org/2001/XMLSchema#integer": ["1337"],
        },
      },
      "https://some-other.vocab/predicate": {
        literals: {
          "http://www.w3.org/2001/XMLSchema#integer": ["42"],
        },
      },
    });
  });

  it("does not remove Quads with non-integer Objects", () => {
    const thingWithString = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );
    (thingWithString.predicates["https://some.vocab/predicate"].literals![
      "http://www.w3.org/2001/XMLSchema#string"
    ] as string[]) = ["42"];

    const updatedThing = removeInteger(
      thingWithString,
      "https://some.vocab/predicate",
      42
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#integer": [],
      "http://www.w3.org/2001/XMLSchema#string": ["42"],
    });
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      removeInteger(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        42
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      removeInteger(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        42
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      removeInteger(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        42
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("removeStringEnglish", () => {
  function getMockThingWithEnglishString(
    predicate: IriString,
    literalValue: string
  ): Thing {
    return {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {
        [predicate]: {
          langStrings: {
            en: [literalValue],
          },
        },
      },
    };
  }

  it("removes the given English string for the given Predicate", () => {
    const thingWithStringWithLocale = getMockThingWithEnglishString(
      "https://some.vocab/predicate",
      "Some value in English..."
    );

    const updatedThing = removeStringEnglish(
      thingWithStringWithLocale,
      "https://some.vocab/predicate",
      "Some value in English..."
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].langStrings
    ).toStrictEqual({
      en: [],
    });
  });
});

describe("removeStringWithLocale", () => {
  function getMockThingWithStringWithLocaleFor(
    predicate: IriString,
    literalValue: string,
    locale: string
  ): Thing {
    return {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {
        [predicate]: {
          langStrings: {
            [locale]: [literalValue],
          },
        },
      },
    };
  }

  it("removes the given localised string for the given Predicate", () => {
    const thingWithStringWithLocale = getMockThingWithStringWithLocaleFor(
      "https://some.vocab/predicate",
      "Une chaîne de caractères quelconque",
      "fr-fr"
    );

    const updatedThing = removeStringWithLocale(
      thingWithStringWithLocale,
      "https://some.vocab/predicate",
      "Une chaîne de caractères quelconque",
      "fr-fr"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].langStrings
    ).toStrictEqual({
      "fr-fr": [],
    });
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithStringWithLocale = getMockThingWithStringWithLocaleFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );

    const updatedThing = removeStringWithLocale(
      thingWithStringWithLocale,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "Some arbitrary string",
      "en-us"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].langStrings
    ).toStrictEqual({
      "en-us": [],
    });
  });

  it("does not modify the input Thing", () => {
    const thingWithStringWithLocale = getMockThingWithStringWithLocaleFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );

    const updatedThing = removeStringWithLocale(
      thingWithStringWithLocale,
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );

    expect(thingWithStringWithLocale).not.toStrictEqual(updatedThing);
    expect(
      thingWithStringWithLocale.predicates["https://some.vocab/predicate"]
        .langStrings
    ).toStrictEqual({
      "en-us": ["Some arbitrary string"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].langStrings
    ).toStrictEqual({
      "en-us": [],
    });
  });

  it("does nothing if the given string could not be found", () => {
    const thingWithStringWithLocale = getMockThingWithStringWithLocaleFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );

    const updatedThing = removeStringWithLocale(
      thingWithStringWithLocale,
      "https://some.vocab/other-predicate",
      "Some other arbitrary string",
      "nl-nl"
    );

    expect(thingWithStringWithLocale).toStrictEqual(updatedThing);
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].langStrings
    ).toStrictEqual({
      "en-us": ["Some arbitrary string"],
    });
  });

  it("also works on ThingLocals", () => {
    const thingLocal = getMockThingWithStringWithLocaleFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}arbitrary-subject-name`;

    const updatedThing = removeStringWithLocale(
      thingLocal,
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].langStrings
    ).toStrictEqual({
      "en-us": [],
    });
  });

  it("removes multiple instances of the same localised string for the same Predicate", () => {
    const thingWithDuplicateStringWithLocale =
      getMockThingWithStringWithLocaleFor(
        "https://some.vocab/predicate",
        "Some arbitrary string",
        "en-us"
      );
    (
      thingWithDuplicateStringWithLocale.predicates[
        "https://some.vocab/predicate"
      ].langStrings!["en-us"] as string[]
    ).push("Some arbitrary string");

    const updatedThing = removeStringWithLocale(
      thingWithDuplicateStringWithLocale,
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].langStrings
    ).toStrictEqual({
      "en-us": [],
    });
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithStringWithLocale = getMockThingWithStringWithLocaleFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );
    // A different Object:
    (
      thingWithStringWithLocale.predicates["https://some.vocab/predicate"]
        .langStrings!["en-us"] as string[]
    ).push("Some other arbitrary string");
    // A different locale
    (thingWithStringWithLocale.predicates["https://some.vocab/predicate"]
      .langStrings!["en-uk"] as string[]) = ["Some arbitrary string"];
    // A different predicate
    (thingWithStringWithLocale.predicates[
      "https://some-other.vocab/predicate"
    ] as any) = {
      langStrings: {
        "en-us": ["Some arbitrary string"],
      },
    };

    const updatedThing = removeStringWithLocale(
      thingWithStringWithLocale,
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-US"
    );

    expect(updatedThing.predicates).toStrictEqual({
      "https://some.vocab/predicate": {
        langStrings: {
          "en-us": ["Some other arbitrary string"],
          "en-uk": ["Some arbitrary string"],
        },
      },
      "https://some-other.vocab/predicate": {
        langStrings: {
          "en-us": ["Some arbitrary string"],
        },
      },
    });
  });

  it("removes Quads when the locale casing mismatch", () => {
    const thingWithStringWithLocale = getMockThingWithStringWithLocaleFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );

    const updatedThing = removeStringWithLocale(
      thingWithStringWithLocale,
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-US"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].langStrings
    ).toStrictEqual({
      "en-us": [],
    });
  });

  it("does not remove Quads with non-string Objects", () => {
    const thingWithInteger = getMockThingWithStringWithLocaleFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );
    (thingWithInteger.predicates["https://some.vocab/predicate"]
      .literals as any) = {
      "http://www.w3.org/2001/XMLSchema#integer": ["Some arbitrary string"],
    };

    const updatedThing = removeStringWithLocale(
      thingWithInteger,
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#integer": ["Some arbitrary string"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].langStrings
    ).toStrictEqual({
      "en-us": [],
    });
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      removeStringWithLocale(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        "Arbitrary string",
        "nl-NL"
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      removeStringWithLocale(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        "Arbitrary string",
        "nl-NL"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      removeStringWithLocale(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        "Arbitrary string",
        "nl-NL"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("removeStringNoLocale", () => {
  it("removes the given string value for the given Predicate", () => {
    const thingWithStringNoLocale = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "string"
    );

    const updatedThing = removeStringNoLocale(
      thingWithStringNoLocale,
      "https://some.vocab/predicate",
      "Some arbitrary string"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": [],
    });
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithStringNoLocale = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "string"
    );

    const updatedThing = removeStringNoLocale(
      thingWithStringNoLocale,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "Some arbitrary string"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": [],
    });
  });

  it("does not modify the input Thing", () => {
    const thingWithStringNoLocale = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "string"
    );

    const updatedThing = removeStringNoLocale(
      thingWithStringNoLocale,
      "https://some.vocab/predicate",
      "Some arbitrary string"
    );

    expect(thingWithStringNoLocale).not.toStrictEqual(updatedThing);
    expect(
      thingWithStringNoLocale.predicates["https://some.vocab/predicate"]
        .literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some arbitrary string"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": [],
    });
  });

  it("does nothing if the string to remove could not be found", () => {
    const thingWithStringNoLocale = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "string"
    );

    const updatedThing = removeStringNoLocale(
      thingWithStringNoLocale,
      "https://some.vocab/other-predicate",
      "Some arbitrary other string"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some arbitrary string"],
    });
  });

  it("also works on ThingLocals", () => {
    const thingLocal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "string"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}arbitrary-subject-name`;

    const updatedThing = removeStringNoLocale(
      thingLocal,
      "https://some.vocab/predicate",
      "Some arbitrary string"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": [],
    });
  });

  it("removes multiple instances of the same string for the same Predicate", () => {
    const thingWithDuplicateString = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "string"
    );
    (
      thingWithDuplicateString.predicates["https://some.vocab/predicate"]
        .literals!["http://www.w3.org/2001/XMLSchema#string"] as string[]
    ).push("Some arbitrary string");

    const updatedThing = removeStringNoLocale(
      thingWithDuplicateString,
      "https://some.vocab/predicate",
      "Some arbitrary string"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": [],
    });
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithOtherQuads = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "string"
    );
    // A different Object:
    (
      thingWithOtherQuads.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#string"
      ] as string[]
    ).push("Some other arbitrary string");
    // A different predicate
    (thingWithOtherQuads.predicates[
      "https://some-other.vocab/predicate"
    ] as any) = {
      literals: {
        "http://www.w3.org/2001/XMLSchema#string": ["Some arbitrary string"],
      },
    };

    const updatedThing = removeStringNoLocale(
      thingWithOtherQuads,
      "https://some.vocab/predicate",
      "Some arbitrary string"
    );

    expect(updatedThing.predicates).toStrictEqual({
      "https://some.vocab/predicate": {
        literals: {
          "http://www.w3.org/2001/XMLSchema#string": [
            "Some other arbitrary string",
          ],
        },
      },
      "https://some-other.vocab/predicate": {
        literals: {
          "http://www.w3.org/2001/XMLSchema#string": ["Some arbitrary string"],
        },
      },
    });
  });

  it("does not remove Quads with non-string Objects", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "string"
    );
    (thingWithInteger.predicates["https://some.vocab/predicate"].literals![
      "http://www.w3.org/2001/XMLSchema#integer"
    ] as string[]) = ["Some arbitrary string"];

    const updatedThing = removeStringNoLocale(
      thingWithInteger,
      "https://some.vocab/predicate",
      "Some arbitrary string"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": [],
      "http://www.w3.org/2001/XMLSchema#integer": ["Some arbitrary string"],
    });
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      removeStringNoLocale(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        "Arbitrary string"
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      removeStringNoLocale(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        "Arbitrary string"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      removeStringNoLocale(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        "Arbitrary string"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("removeLiteral", () => {
  it("accepts unlocalised strings as Literal", () => {
    const thingWithStringNoLocale = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "string"
    );

    const updatedThing = removeLiteral(
      thingWithStringNoLocale,
      "https://some.vocab/predicate",
      DataFactory.literal(
        "Some arbitrary string",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#string")
      )
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": [],
    });
  });

  it("accepts localised strings as Literal", () => {
    const quad = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal("Some arbitrary string", "en-US")
    );
    const thing = dataset();
    thing.add(quad);

    const thingWithStringWithLocale: Thing = {
      type: "Subject",
      url: "https://arbitrary.vocab/subject",
      predicates: {
        "https://some.vocab/predicate": {
          langStrings: {
            "en-US": ["Some arbitrary string"],
          },
        },
      },
    };

    const updatedThing = removeLiteral(
      thingWithStringWithLocale,
      "https://some.vocab/predicate",
      DataFactory.literal("Some arbitrary string", "en-US")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].langStrings
    ).toStrictEqual({
      "en-US": [],
    });
  });

  it("accepts integers as Literal", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    const updatedThing = removeLiteral(
      thingWithInteger,
      "https://some.vocab/predicate",
      DataFactory.literal(
        "42",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer")
      )
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#integer": [],
    });
  });

  it("accepts decimal as Literal", () => {
    const thingWithDecimal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13.37",
      "decimal"
    );

    const updatedThing = removeLiteral(
      thingWithDecimal,
      "https://some.vocab/predicate",
      DataFactory.literal(
        "13.37",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#decimal")
      )
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#decimal": [],
    });
  });

  it("accepts boolean as Literal", () => {
    const thingWithBoolean = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1",
      "boolean"
    );

    const updatedThing = removeLiteral(
      thingWithBoolean,
      "https://some.vocab/predicate",
      DataFactory.literal(
        "1",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#boolean")
      )
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#boolean": [],
    });
  });

  it("accepts time as Literal", () => {
    const thingWithTime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13:37:42",
      "time"
    );

    const updatedThing = removeLiteral(
      thingWithTime,
      "https://some.vocab/predicate",
      DataFactory.literal(
        "13:37:42",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#time")
      )
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#time": [],
    });
  });

  it("accepts datetime as Literal", () => {
    const thingWithDatetime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12T13:37:42Z",
      "dateTime"
    );

    const updatedThing = removeLiteral(
      thingWithDatetime,
      "https://some.vocab/predicate",
      DataFactory.literal(
        "1990-11-12T13:37:42Z",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#dateTime")
      )
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#dateTime": [],
    });
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    const updatedThing = removeLiteral(
      thingWithInteger,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal(
        "42",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer")
      )
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#integer": [],
    });
  });

  it("does not modify the input Thing", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    const updatedThing = removeLiteral(
      thingWithInteger,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal(
        "42",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer")
      )
    );

    expect(thingWithInteger).not.toStrictEqual(updatedThing);
    expect(
      thingWithInteger.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#integer": ["42"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#integer": [],
    });
  });

  it("does nothing if the given Literal could not be found", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    const updatedThing = removeLiteral(
      thingWithInteger,
      DataFactory.namedNode("https://some.vocab/other-predicate"),
      DataFactory.literal(
        "13.37",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#decimal")
      )
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toEqual({
      "http://www.w3.org/2001/XMLSchema#integer": ["42"],
    });
  });

  it("also works on ThingLocals", () => {
    const thingLocal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}arbitrary-subject-name`;

    const updatedThing = removeLiteral(
      thingLocal,
      "https://some.vocab/predicate",
      DataFactory.literal(
        "42",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer")
      )
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#integer": [],
    });
  });

  it("removes multiple instances of the same Literal for the same Predicate", () => {
    const thingWithDuplicateInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );
    (
      thingWithDuplicateInteger.predicates["https://some.vocab/predicate"]
        .literals!["http://www.w3.org/2001/XMLSchema#integer"] as string[]
    ).push("42");

    const updatedThing = removeLiteral(
      thingWithDuplicateInteger,
      "https://some.vocab/predicate",
      DataFactory.literal(
        "42",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer")
      )
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#integer": [],
    });
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithOtherQuads = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );
    // A different Object:
    (
      thingWithOtherQuads.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#integer"
      ] as string[]
    ).push("1337");
    // A different predicate
    (thingWithOtherQuads.predicates[
      "https://some-other.vocab/predicate"
    ] as any) = {
      literals: {
        "http://www.w3.org/2001/XMLSchema#integer": ["42"],
      },
    };

    const updatedThing = removeLiteral(
      thingWithOtherQuads,
      "https://some.vocab/predicate",
      DataFactory.literal(
        "42",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer")
      )
    );

    expect(updatedThing.predicates).toStrictEqual({
      "https://some.vocab/predicate": {
        literals: {
          "http://www.w3.org/2001/XMLSchema#integer": ["1337"],
        },
      },
      "https://some-other.vocab/predicate": {
        literals: {
          "http://www.w3.org/2001/XMLSchema#integer": ["42"],
        },
      },
    });
  });

  it("does not remove Quads with Literal Objects with different types", () => {
    const thingWithString = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );
    (thingWithString.predicates["https://some.vocab/predicate"] as any) = {
      literals: {
        "http://www.w3.org/2001/XMLSchema#string": ["42"],
      },
    };

    const updatedThing = removeLiteral(
      thingWithString,
      "https://some.vocab/predicate",
      DataFactory.literal(
        "42",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer")
      )
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#integer": [],
      "http://www.w3.org/2001/XMLSchema#string": ["42"],
    });
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      removeLiteral(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        DataFactory.literal(
          "42",
          DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer")
        )
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      removeLiteral(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        DataFactory.literal("Arbitrary string value")
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      removeLiteral(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        DataFactory.literal("Arbitrary string value")
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("removeNamedNode", () => {
  it("removes the given NamedNode value for the given Predicate", () => {
    const thingWithNamedNode = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.vocab/object"
    );

    const updatedThing = removeNamedNode(
      thingWithNamedNode,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.vocab/object")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual([]);
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithNamedNode = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.vocab/object"
    );

    const updatedThing = removeNamedNode(
      thingWithNamedNode,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.namedNode("https://some.vocab/object")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual([]);
  });

  it("does not modify the input Thing", () => {
    const thingWithNamedNode = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.vocab/object"
    );

    const updatedThing = removeNamedNode(
      thingWithNamedNode,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.namedNode("https://some.vocab/object")
    );

    expect(thingWithNamedNode).not.toStrictEqual(updatedThing);
    expect(
      thingWithNamedNode.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual(["https://some.vocab/object"]);
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual([]);
  });

  it("also works on ThingLocals", () => {
    const thingLocal = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.vocab/object"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}arbitrary-subject-name`;

    const updatedThing = removeNamedNode(
      thingLocal,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.vocab/object")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual([]);
  });

  it("removes multiple instances of the same NamedNode for the same Predicate", () => {
    const thingWithDuplicateNamedNode = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.vocab/object"
    );
    (
      thingWithDuplicateNamedNode.predicates["https://some.vocab/predicate"]
        .namedNodes as UrlString[]
    ).push("https://some.vocab/object");

    const updatedThing = removeNamedNode(
      thingWithDuplicateNamedNode,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.vocab/object")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual([]);
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithOtherQuads = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.vocab/object"
    );
    (
      thingWithOtherQuads.predicates["https://some.vocab/predicate"]
        .namedNodes as UrlString[]
    ).push("https://some-other.vocab/object");
    (thingWithOtherQuads.predicates["https://some-other.vocab/predicate"] as {
      namedNodes: UrlString[];
    }) = {
      namedNodes: ["https://some.vocab/object"],
    };

    const updatedThing = removeNamedNode(
      thingWithOtherQuads,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.vocab/object")
    );

    expect(updatedThing.predicates).toStrictEqual({
      "https://some.vocab/predicate": {
        namedNodes: ["https://some-other.vocab/object"],
      },
      "https://some-other.vocab/predicate": {
        namedNodes: ["https://some.vocab/object"],
      },
    });
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      removeNamedNode(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        DataFactory.namedNode("https://arbitrary.vocab/object")
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      removeNamedNode(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        DataFactory.namedNode("https://arbitrary.vocab/object")
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      removeNamedNode(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        DataFactory.namedNode("https://arbitrary.vocab/object")
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});
