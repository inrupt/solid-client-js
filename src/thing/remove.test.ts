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

import { Quad } from "rdf-js";
import { dataset } from "@rdfjs/dataset";
import { DataFactory } from "n3";
import { IriString, Thing, ThingLocal, ThingPersisted } from "../interfaces";
import {
  removeAll,
  removeUrl,
  removeBoolean,
  removeDatetime,
  removeDecimal,
  removeInteger,
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

function getMockQuadWithLiteralFor(
  predicate: IriString,
  literalValue: string,
  literalType: "string" | "integer" | "decimal" | "boolean" | "dateTime"
): Quad {
  const quad = DataFactory.quad(
    DataFactory.namedNode("https://arbitrary.vocab/subject"),
    DataFactory.namedNode(predicate),
    DataFactory.literal(
      literalValue,
      DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#" + literalType)
    )
  );
  return quad;
}
function getMockThingWithLiteralFor(
  predicate: IriString,
  literalValue: string,
  literalType: "string" | "integer" | "decimal" | "boolean" | "dateTime"
): Thing {
  const quad = getMockQuadWithLiteralFor(predicate, literalValue, literalType);
  const thing = dataset();
  thing.add(quad);

  return Object.assign(thing, {
    internal_url: "https://arbitrary.vocab/subject",
  });
}
function getMockQuadWithNamedNode(
  predicate: IriString,
  object: IriString
): Quad {
  const quad = DataFactory.quad(
    DataFactory.namedNode("https://arbitrary.vocab/subject"),
    DataFactory.namedNode(predicate),
    DataFactory.namedNode(object)
  );
  return quad;
}
function getMockThingWithNamedNode(
  predicate: IriString,
  object: IriString
): Thing {
  const plainDataset = dataset();
  const quad = getMockQuadWithNamedNode(predicate, object);
  plainDataset.add(quad);

  const thing: Thing = Object.assign(plainDataset, {
    internal_url: "https://arbitrary.vocab/subject",
  });
  return thing;
}

describe("removeAll", () => {
  it("removes all values for the given Predicate", () => {
    const quadWithIri = getMockQuadWithNamedNode(
      "https://some.vocab/predicate",
      "https://arbitrary.vocab/object"
    );
    const thingWithStringAndIri = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string value",
      "string"
    );
    thingWithStringAndIri.add(quadWithIri);

    const updatedThing = removeAll(
      thingWithStringAndIri,
      "https://some.vocab/predicate"
    );

    expect(updatedThing.size).toBe(0);
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

    expect(updatedThing.size).toBe(0);
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

    expect(thingWithString.size).toBe(1);
    expect(updatedThing.size).toBe(0);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { internal_name: "localSubject" }
    );
    const quadWithLocalSubject = DataFactory.quad(
      localSubject,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.namedNode("https://some.pod/resource#name")
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = removeAll(thingLocal, "https://some.vocab/predicate");

    expect(updatedThing.size).toBe(0);
  });

  it("removes multiple instances of the same value for the same Predicate", () => {
    const thingWithDuplicateIri = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#name"
    );
    thingWithDuplicateIri.add(Array.from(thingWithDuplicateIri)[0]);

    const updatedThing = removeAll(
      thingWithDuplicateIri,
      "https://some.vocab/predicate"
    );

    expect(updatedThing.size).toBe(0);
  });

  it("does not remove Quads with different Predicates", () => {
    const thingWithIri = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#name"
    );
    const mockQuadWithDifferentPredicate = getMockQuadWithNamedNode(
      "https://some-other.vocab/predicate",
      "https://arbitrary.pod/resource#name"
    );
    thingWithIri.add(mockQuadWithDifferentPredicate);

    const updatedThing = removeAll(
      thingWithIri,
      "https://some.vocab/predicate"
    );

    expect(Array.from(updatedThing)).toEqual([mockQuadWithDifferentPredicate]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      removeAll((null as unknown) as Thing, "https://arbitrary.vocab/predicate")
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
  function getMockQuadWithIri(
    predicate: IriString,
    iri: IriString = "https://arbitrary.vocab/object"
  ): Quad {
    return getMockQuadWithNamedNode(predicate, iri);
  }
  function getMockThingWithIri(
    predicate: IriString,
    iri: IriString = "https://arbitrary.vocab/object"
  ): ThingPersisted {
    const quad = getMockQuadWithIri(predicate, iri);
    const thing = dataset();
    thing.add(quad);

    return Object.assign(thing, {
      internal_url: "https://arbitrary.vocab/subject",
    });
  }

  it("removes the given IRI value for the given Predicate", () => {
    const thingWithIri = getMockThingWithIri(
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    const updatedThing = removeUrl(
      thingWithIri,
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    expect(updatedThing.size).toBe(0);
  });

  it("accepts Properties as Named Nodes", () => {
    const thingWithIri = getMockThingWithIri(
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    const updatedThing = removeUrl(
      thingWithIri,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "https://some.pod/resource#name"
    );

    expect(updatedThing.size).toBe(0);
  });

  it("accepts IRI's as Named Nodes", () => {
    const thingWithIri = getMockThingWithIri(
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    const updatedThing = removeUrl(
      thingWithIri,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/resource#name")
    );

    expect(updatedThing.size).toBe(0);
  });

  it("does not modify the input Thing", () => {
    const thingWithIri = getMockThingWithIri(
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    const updatedThing = removeUrl(
      thingWithIri,
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    expect(thingWithIri.size).toBe(1);
    expect(updatedThing.size).toBe(0);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { internal_name: "localSubject" }
    );
    const quadWithLocalSubject = DataFactory.quad(
      localSubject,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.namedNode("https://some.pod/resource#name")
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = removeUrl(
      thingLocal,
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    expect(updatedThing.size).toBe(0);
  });

  it("removes multiple instances of the same IRI for the same Predicate", () => {
    const thingWithDuplicateIri = getMockThingWithIri(
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );
    thingWithDuplicateIri.add(Array.from(thingWithDuplicateIri)[0]);

    const updatedThing = removeUrl(
      thingWithDuplicateIri,
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    expect(updatedThing.size).toBe(0);
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithIri = getMockThingWithIri(
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );
    const mockQuadWithDifferentIri = getMockQuadWithIri(
      "https://some.vocab/predicate",
      "https://some-other.pod/resource#name"
    );
    const mockQuadWithDifferentPredicate = getMockQuadWithIri(
      "https://some-other.vocab/predicate",
      "https://some.pod/resource#name"
    );
    thingWithIri.add(mockQuadWithDifferentIri);
    thingWithIri.add(mockQuadWithDifferentPredicate);

    const updatedThing = removeUrl(
      thingWithIri,
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    expect(Array.from(updatedThing)).toEqual([
      mockQuadWithDifferentIri,
      mockQuadWithDifferentPredicate,
    ]);
  });

  it("does not remove Quads with non-IRI Objects", () => {
    const thingWithIri = getMockThingWithIri(
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );
    const mockQuadWithString = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal("Some non-IRI Object")
    );
    thingWithIri.add(mockQuadWithString);

    const updatedThing = removeUrl(
      thingWithIri,
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    expect(Array.from(updatedThing)).toEqual([mockQuadWithString]);
  });

  it("resolves ThingPersisteds", () => {
    const thingPersisted: ThingPersisted = Object.assign(dataset(), {
      internal_url: "https://some.pod/resource#thing",
    });
    const quadWithThingPersistedIri = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.namedNode("https://some.pod/resource#thing")
    );
    const datasetWithThingPersistedIri = dataset();
    datasetWithThingPersistedIri.add(quadWithThingPersistedIri);
    const thingWithThingPersistedIri: Thing = Object.assign(
      datasetWithThingPersistedIri,
      {
        internal_url: "https://arbitrary.vocab/subject",
      }
    );

    const updatedThing = removeUrl(
      thingWithThingPersistedIri,
      "https://some.vocab/predicate",
      thingPersisted
    );

    expect(updatedThing.size).toBe(0);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      removeUrl(
        (null as unknown) as Thing,
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

    expect(updatedThing.size).toBe(0);
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

    expect(updatedThingWithoutSerialised1.size).toBe(0);
    expect(updatedThingWithoutSerialised0.size).toBe(0);
    expect(updatedThingWithoutSerialisedTrue.size).toBe(0);
    expect(updatedThingWithoutSerialisedFalse.size).toBe(0);
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

    expect(updatedThing.size).toBe(0);
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

    expect(thingWithBoolean.size).toBe(1);
    expect(updatedThing.size).toBe(0);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { internal_name: "localSubject" }
    );
    const quadWithLocalSubject = DataFactory.quad(
      localSubject,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal(
        "1",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#boolean")
      )
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = removeBoolean(
      thingLocal,
      "https://some.vocab/predicate",
      true
    );

    expect(updatedThing.size).toBe(0);
  });

  it("removes multiple instances of the same boolean for the same Predicate", () => {
    const thingWithDuplicateBoolean = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1",
      "boolean"
    );
    thingWithDuplicateBoolean.add(Array.from(thingWithDuplicateBoolean)[0]);

    const updatedThing = removeBoolean(
      thingWithDuplicateBoolean,
      "https://some.vocab/predicate",
      true
    );

    expect(updatedThing.size).toBe(0);
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithOtherQuads = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1",
      "boolean"
    );

    const mockQuadWithDifferentObject = getMockQuadWithLiteralFor(
      "https://some.vocab/predicate",
      "0",
      "boolean"
    );
    const mockQuadWithDifferentPredicate = getMockQuadWithLiteralFor(
      "https://some-other.vocab/predicate",
      "1",
      "boolean"
    );
    thingWithOtherQuads.add(mockQuadWithDifferentObject);
    thingWithOtherQuads.add(mockQuadWithDifferentPredicate);

    const updatedThing = removeBoolean(
      thingWithOtherQuads,
      "https://some.vocab/predicate",
      true
    );

    expect(Array.from(updatedThing)).toEqual([
      mockQuadWithDifferentObject,
      mockQuadWithDifferentPredicate,
    ]);
  });

  it("does not remove Quads with non-boolean Objects", () => {
    const thingWithString = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1",
      "boolean"
    );
    const mockQuadWithIntegerNotBoolean = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal("1", "http://www.w3.org/2001/XMLSchema#integer")
    );
    thingWithString.add(mockQuadWithIntegerNotBoolean);

    const updatedThing = removeBoolean(
      thingWithString,
      "https://some.vocab/predicate",
      true
    );

    expect(Array.from(updatedThing)).toEqual([mockQuadWithIntegerNotBoolean]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      removeBoolean(
        (null as unknown) as Thing,
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

    expect(updatedThing.size).toBe(0);
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

    expect(updatedThingWithoutRoundedDatetime.size).toBe(0);
    expect(updatedThingWithoutSpecificDatetime.size).toBe(0);
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

    expect(updatedThing.size).toBe(0);
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

    expect(thingWithDatetime.size).toBe(1);
    expect(updatedThing.size).toBe(0);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { internal_name: "localSubject" }
    );
    const quadWithLocalSubject = DataFactory.quad(
      localSubject,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal(
        "1990-11-12T13:37:42Z",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#dateTime")
      )
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = removeDatetime(
      thingLocal,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(updatedThing.size).toBe(0);
  });

  it("removes multiple instances of the same datetime for the same Predicate", () => {
    const thingWithDuplicateDatetime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12T13:37:42Z",
      "dateTime"
    );
    thingWithDuplicateDatetime.add(Array.from(thingWithDuplicateDatetime)[0]);

    const updatedThing = removeDatetime(
      thingWithDuplicateDatetime,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(updatedThing.size).toBe(0);
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithOtherQuads = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12T13:37:42Z",
      "dateTime"
    );

    const mockQuadWithDifferentObject = getMockQuadWithLiteralFor(
      "https://some.vocab/predicate",
      "1955-06-08T13:37:42Z",
      "dateTime"
    );
    const mockQuadWithInvalidObject = getMockQuadWithLiteralFor(
      "https://some.vocab/predicate",
      (undefined as unknown) as string,
      "dateTime"
    );
    const mockQuadWithDifferentPredicate = getMockQuadWithLiteralFor(
      "https://some-other.vocab/predicate",
      "1990-11-12T13:37:42Z",
      "dateTime"
    );
    thingWithOtherQuads.add(mockQuadWithDifferentObject);
    thingWithOtherQuads.add(mockQuadWithInvalidObject);
    thingWithOtherQuads.add(mockQuadWithDifferentPredicate);

    const updatedThing = removeDatetime(
      thingWithOtherQuads,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(Array.from(updatedThing)).toEqual([
      mockQuadWithDifferentObject,
      mockQuadWithInvalidObject,
      mockQuadWithDifferentPredicate,
    ]);
  });

  it("does not remove Quads with non-datetime Objects", () => {
    const thingWithString = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12T13:37:42Z",
      "dateTime"
    );
    const mockQuadWithStringNotDatetime = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal(
        "1990-11-12T13:37:42Z",
        "http://www.w3.org/2001/XMLSchema#string"
      )
    );
    thingWithString.add(mockQuadWithStringNotDatetime);

    const updatedThing = removeDatetime(
      thingWithString,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(Array.from(updatedThing)).toEqual([mockQuadWithStringNotDatetime]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      removeDatetime(
        (null as unknown) as Thing,
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

    expect(updatedThing.size).toBe(0);
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

    expect(updatedThingWithoutPlainDecimal.size).toBe(0);
    expect(updatedThingWithoutSignedDecimal.size).toBe(0);
    expect(updatedThingWithoutZeroedDecimal.size).toBe(0);
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

    expect(updatedThing.size).toBe(0);
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

    expect(thingWithDecimal.size).toBe(1);
    expect(updatedThing.size).toBe(0);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { internal_name: "localSubject" }
    );
    const quadWithLocalSubject = DataFactory.quad(
      localSubject,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal(
        "13.37",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#decimal")
      )
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = removeDecimal(
      thingLocal,
      "https://some.vocab/predicate",
      13.37
    );

    expect(updatedThing.size).toBe(0);
  });

  it("removes multiple instances of the same decimal for the same Predicate", () => {
    const thingWithDuplicateDecimal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13.37",
      "decimal"
    );
    thingWithDuplicateDecimal.add(Array.from(thingWithDuplicateDecimal)[0]);

    const updatedThing = removeDecimal(
      thingWithDuplicateDecimal,
      "https://some.vocab/predicate",
      13.37
    );

    expect(updatedThing.size).toBe(0);
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithOtherQuads = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13.37",
      "decimal"
    );

    const mockQuadWithDifferentObject = getMockQuadWithLiteralFor(
      "https://some.vocab/predicate",
      "4.2",
      "decimal"
    );
    const mockQuadWithDifferentPredicate = getMockQuadWithLiteralFor(
      "https://some-other.vocab/predicate",
      "13.37",
      "decimal"
    );
    thingWithOtherQuads.add(mockQuadWithDifferentObject);
    thingWithOtherQuads.add(mockQuadWithDifferentPredicate);

    const updatedThing = removeDecimal(
      thingWithOtherQuads,
      "https://some.vocab/predicate",
      13.37
    );

    expect(Array.from(updatedThing)).toEqual([
      mockQuadWithDifferentObject,
      mockQuadWithDifferentPredicate,
    ]);
  });

  it("does not remove Quads with non-decimal Objects", () => {
    const thingWithString = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13.37",
      "decimal"
    );
    const mockQuadWithStringNotDecimal = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal("13.37", "http://www.w3.org/2001/XMLSchema#string")
    );
    thingWithString.add(mockQuadWithStringNotDecimal);

    const updatedThing = removeDecimal(
      thingWithString,
      "https://some.vocab/predicate",
      13.37
    );

    expect(Array.from(updatedThing)).toEqual([mockQuadWithStringNotDecimal]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      removeDecimal(
        (null as unknown) as Thing,
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

    expect(updatedThing.size).toBe(0);
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

    expect(updatedThingWithoutUnsignedInteger.size).toBe(0);
    expect(updatedThingWithoutSignedInteger.size).toBe(0);
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

    expect(updatedThing.size).toBe(0);
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

    expect(thingWithInteger.size).toBe(1);
    expect(updatedThing.size).toBe(0);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { internal_name: "localSubject" }
    );
    const quadWithLocalSubject = DataFactory.quad(
      localSubject,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal(
        "42",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer")
      )
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = removeInteger(
      thingLocal,
      "https://some.vocab/predicate",
      42
    );

    expect(updatedThing.size).toBe(0);
  });

  it("removes multiple instances of the same integer for the same Predicate", () => {
    const thingWithDuplicateInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );
    thingWithDuplicateInteger.add(Array.from(thingWithDuplicateInteger)[0]);

    const updatedThing = removeInteger(
      thingWithDuplicateInteger,
      "https://some.vocab/predicate",
      42
    );

    expect(updatedThing.size).toBe(0);
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithOtherQuads = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    const mockQuadWithDifferentObject = getMockQuadWithLiteralFor(
      "https://some.vocab/predicate",
      "1337",
      "integer"
    );
    const mockQuadWithDifferentPredicate = getMockQuadWithLiteralFor(
      "https://some-other.vocab/predicate",
      "42",
      "integer"
    );
    thingWithOtherQuads.add(mockQuadWithDifferentObject);
    thingWithOtherQuads.add(mockQuadWithDifferentPredicate);

    const updatedThing = removeInteger(
      thingWithOtherQuads,
      "https://some.vocab/predicate",
      42
    );

    expect(Array.from(updatedThing)).toEqual([
      mockQuadWithDifferentObject,
      mockQuadWithDifferentPredicate,
    ]);
  });

  it("does not remove Quads with non-integer Objects", () => {
    const thingWithString = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );
    const mockQuadWithStringNotInteger = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal("42", "http://www.w3.org/2001/XMLSchema#string")
    );
    thingWithString.add(mockQuadWithStringNotInteger);

    const updatedThing = removeInteger(
      thingWithString,
      "https://some.vocab/predicate",
      42
    );

    expect(Array.from(updatedThing)).toEqual([mockQuadWithStringNotInteger]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      removeInteger(
        (null as unknown) as Thing,
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

describe("removeStringWithLocale", () => {
  function getMockQuadWithStringWithLocaleFor(
    predicate: IriString,
    literalValue: string,
    locale: string
  ): Quad {
    const quad = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode(predicate),
      DataFactory.literal(literalValue, locale)
    );
    return quad;
  }
  function getMockThingWithStringWithLocaleFor(
    predicate: IriString,
    literalValue: string,
    locale: string
  ): Thing {
    const quad = getMockQuadWithStringWithLocaleFor(
      predicate,
      literalValue,
      locale
    );
    const thing = dataset();
    thing.add(quad);

    return Object.assign(thing, {
      internal_url: "https://arbitrary.vocab/subject",
    });
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

    expect(updatedThing.size).toBe(0);
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

    expect(updatedThing.size).toBe(0);
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

    expect(thingWithStringWithLocale.size).toBe(1);
    expect(updatedThing.size).toBe(0);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { internal_name: "localSubject" }
    );
    const quadWithLocalSubject = DataFactory.quad(
      localSubject,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal("Some arbitrary string", "en-us")
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = removeStringWithLocale(
      thingLocal,
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );

    expect(updatedThing.size).toBe(0);
  });

  it("removes multiple instances of the same localised string for the same Predicate", () => {
    const thingWithDuplicateStringWithLocale = getMockThingWithStringWithLocaleFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );
    thingWithDuplicateStringWithLocale.add(
      Array.from(thingWithDuplicateStringWithLocale)[0]
    );

    const updatedThing = removeStringWithLocale(
      thingWithDuplicateStringWithLocale,
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );

    expect(updatedThing.size).toBe(0);
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithStringWithLocale = getMockThingWithStringWithLocaleFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );

    const mockQuadWithDifferentStringInSameLocale = getMockQuadWithStringWithLocaleFor(
      "https://some.vocab/predicate",
      "Some other arbitrary string",
      "en-us"
    );

    const mockQuadWithSameStringInDifferentLocale = getMockQuadWithStringWithLocaleFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-uk"
    );

    const mockQuadWithDifferentPredicate = getMockQuadWithStringWithLocaleFor(
      "https://some.other.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );
    thingWithStringWithLocale.add(mockQuadWithDifferentStringInSameLocale);
    thingWithStringWithLocale.add(mockQuadWithSameStringInDifferentLocale);
    thingWithStringWithLocale.add(mockQuadWithDifferentPredicate);

    const updatedThing = removeStringWithLocale(
      thingWithStringWithLocale,
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-US"
    );

    expect(Array.from(updatedThing)).toEqual([
      mockQuadWithDifferentStringInSameLocale,
      mockQuadWithSameStringInDifferentLocale,
      mockQuadWithDifferentPredicate,
    ]);
  });

  it("removes Quads when the locale casing mismatch", () => {
    const thingWithStringWithLocale = getMockThingWithStringWithLocaleFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );

    const mockQuadWithStringInDifferentLocale = getMockQuadWithStringWithLocaleFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-US"
    );

    thingWithStringWithLocale.add(mockQuadWithStringInDifferentLocale);

    const updatedThing = removeStringWithLocale(
      thingWithStringWithLocale,
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-US"
    );

    expect(updatedThing.size).toBe(0);
  });

  it("does not remove Quads with non-string Objects", () => {
    const thingWithLocalizedString = getMockThingWithStringWithLocaleFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-US"
    );
    const mockQuadWithInteger = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal("42", "http://www.w3.org/2001/XMLSchema#integer")
    );
    thingWithLocalizedString.add(mockQuadWithInteger);

    const updatedThing = removeStringWithLocale(
      thingWithLocalizedString,
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-US"
    );

    expect(updatedThing.has(mockQuadWithInteger)).toBe(true);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      removeStringWithLocale(
        (null as unknown) as Thing,
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

    expect(updatedThing.size).toBe(0);
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

    expect(updatedThing.size).toBe(0);
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

    expect(thingWithStringNoLocale.size).toBe(1);
    expect(updatedThing.size).toBe(0);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { internal_name: "localSubject" }
    );
    const quadWithLocalSubject = DataFactory.quad(
      localSubject,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal(
        "Some arbitrary string",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#string")
      )
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = removeStringNoLocale(
      thingLocal,
      "https://some.vocab/predicate",
      "Some arbitrary string"
    );

    expect(updatedThing.size).toBe(0);
  });

  it("removes multiple instances of the same string for the same Predicate", () => {
    const thingWithDuplicateString = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "string"
    );
    thingWithDuplicateString.add(Array.from(thingWithDuplicateString)[0]);

    const updatedThing = removeStringNoLocale(
      thingWithDuplicateString,
      "https://some.vocab/predicate",
      "Some arbitrary string"
    );

    expect(updatedThing.size).toBe(0);
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithOtherQuads = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "string"
    );

    const mockQuadWithDifferentObject = getMockQuadWithLiteralFor(
      "https://some.vocab/predicate",
      "Some other arbitrary string",
      "string"
    );
    const mockQuadWithDifferentPredicate = getMockQuadWithLiteralFor(
      "https://some-other.vocab/predicate",
      "Some arbitrary string",
      "string"
    );
    thingWithOtherQuads.add(mockQuadWithDifferentObject);
    thingWithOtherQuads.add(mockQuadWithDifferentPredicate);

    const updatedThing = removeStringNoLocale(
      thingWithOtherQuads,
      "https://some.vocab/predicate",
      "Some arbitrary string"
    );

    expect(Array.from(updatedThing)).toEqual([
      mockQuadWithDifferentObject,
      mockQuadWithDifferentPredicate,
    ]);
  });

  it("does not remove Quads with non-string Objects", () => {
    const thingWithString = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "string"
    );
    const mockQuadWithInteger = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal("42", "http://www.w3.org/2001/XMLSchema#integer")
    );
    thingWithString.add(mockQuadWithInteger);

    const updatedThing = removeStringNoLocale(
      thingWithString,
      "https://some.vocab/predicate",
      "Some arbitrary string"
    );

    expect(Array.from(updatedThing)).toEqual([mockQuadWithInteger]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      removeStringNoLocale(
        (null as unknown) as Thing,
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

    expect(updatedThing.size).toBe(0);
  });

  it("accepts localised strings as Literal", () => {
    const quad = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal("Some arbitrary string", "en-US")
    );
    const thing = dataset();
    thing.add(quad);

    const thingWithStringWithLocale = Object.assign(thing, {
      internal_url: "https://arbitrary.vocab/subject",
    });

    const updatedThing = removeLiteral(
      thingWithStringWithLocale,
      "https://some.vocab/predicate",
      DataFactory.literal("Some arbitrary string", "en-US")
    );

    expect(updatedThing.size).toBe(0);
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

    expect(updatedThing.size).toBe(0);
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

    expect(updatedThing.size).toBe(0);
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

    expect(updatedThing.size).toBe(0);
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

    expect(updatedThing.size).toBe(0);
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

    expect(updatedThing.size).toBe(0);
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

    expect(thingWithInteger.size).toBe(1);
    expect(updatedThing.size).toBe(0);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { internal_name: "localSubject" }
    );
    const quadWithLocalSubject = DataFactory.quad(
      localSubject,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal(
        "42",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer")
      )
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = removeLiteral(
      thingLocal,
      "https://some.vocab/predicate",
      DataFactory.literal(
        "42",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer")
      )
    );

    expect(updatedThing.size).toBe(0);
  });

  it("removes multiple instances of the same Literal for the same Predicate", () => {
    const thingWithDuplicateInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );
    thingWithDuplicateInteger.add(Array.from(thingWithDuplicateInteger)[0]);

    const updatedThing = removeLiteral(
      thingWithDuplicateInteger,
      "https://some.vocab/predicate",
      DataFactory.literal(
        "42",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer")
      )
    );

    expect(updatedThing.size).toBe(0);
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithOtherQuads = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    const mockQuadWithDifferentObject = getMockQuadWithLiteralFor(
      "https://some.vocab/predicate",
      "1337",
      "integer"
    );
    const mockQuadWithDifferentPredicate = getMockQuadWithLiteralFor(
      "https://some-other.vocab/predicate",
      "42",
      "integer"
    );
    thingWithOtherQuads.add(mockQuadWithDifferentObject);
    thingWithOtherQuads.add(mockQuadWithDifferentPredicate);

    const updatedThing = removeLiteral(
      thingWithOtherQuads,
      "https://some.vocab/predicate",
      DataFactory.literal(
        "42",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer")
      )
    );

    expect(Array.from(updatedThing)).toEqual([
      mockQuadWithDifferentObject,
      mockQuadWithDifferentPredicate,
    ]);
  });

  it("does not remove Quads with Literal Objects with different types", () => {
    const thingWithString = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );
    const mockQuadWithStringNotInteger = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal("42", "http://www.w3.org/2001/XMLSchema#string")
    );
    thingWithString.add(mockQuadWithStringNotInteger);

    const updatedThing = removeLiteral(
      thingWithString,
      "https://some.vocab/predicate",
      DataFactory.literal(
        "42",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer")
      )
    );

    expect(Array.from(updatedThing)).toEqual([mockQuadWithStringNotInteger]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      removeLiteral(
        (null as unknown) as Thing,
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

    expect(updatedThing.size).toBe(0);
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

    expect(updatedThing.size).toBe(0);
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

    expect(thingWithNamedNode.size).toBe(1);
    expect(updatedThing.size).toBe(0);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { internal_name: "localSubject" }
    );
    const quadWithLocalSubject = DataFactory.quad(
      localSubject,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.namedNode("https://some.vocab/object")
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = removeNamedNode(
      thingLocal,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.vocab/object")
    );

    expect(updatedThing.size).toBe(0);
  });

  it("removes multiple instances of the same NamedNode for the same Predicate", () => {
    const thingWithDuplicateNamedNode = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.vocab/object"
    );
    thingWithDuplicateNamedNode.add(Array.from(thingWithDuplicateNamedNode)[0]);

    const updatedThing = removeNamedNode(
      thingWithDuplicateNamedNode,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.vocab/object")
    );

    expect(updatedThing.size).toBe(0);
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithOtherQuads = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.vocab/object"
    );

    const mockQuadWithDifferentObject = getMockQuadWithNamedNode(
      "https://some.vocab/predicate",
      "https://some-other.vocab/object"
    );
    const mockQuadWithDifferentPredicate = getMockQuadWithNamedNode(
      "https://some-other.vocab/predicate",
      "https://some.vocab/object"
    );
    thingWithOtherQuads.add(mockQuadWithDifferentObject);
    thingWithOtherQuads.add(mockQuadWithDifferentPredicate);

    const updatedThing = removeNamedNode(
      thingWithOtherQuads,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.vocab/object")
    );

    expect(Array.from(updatedThing)).toEqual([
      mockQuadWithDifferentObject,
      mockQuadWithDifferentPredicate,
    ]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      removeNamedNode(
        (null as unknown) as Thing,
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
