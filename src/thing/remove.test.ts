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
import { dataset } from "@rdfjs/dataset";
import { Quad } from "rdf-js";
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

  return Object.assign(thing, { url: "https://arbitrary.vocab/subject" });
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
    url: "https://arbitrary.vocab/subject",
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

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithString = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string value",
      "string"
    );

    const updatedThing = removeAll(
      thingWithString,
      DataFactory.namedNode("https://some.vocab/predicate")
    );

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(thingWithString)).toHaveLength(1);
    expect(Array.from(updatedThing)).toHaveLength(0);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
    );
    const quadWithLocalSubject = DataFactory.quad(
      localSubject,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.namedNode("https://some.pod/resource#name")
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      name: "localSubject",
    });

    const updatedThing = removeAll(thingLocal, "https://some.vocab/predicate");

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(updatedThing)).toEqual([]);
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

    return Object.assign(thing, { url: "https://arbitrary.vocab/subject" });
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

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithIri = getMockThingWithIri(
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    const updatedThing = removeUrl(
      thingWithIri,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "https://some.pod/resource#name"
    );

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(thingWithIri)).toHaveLength(1);
    expect(Array.from(updatedThing)).toHaveLength(0);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
    );
    const quadWithLocalSubject = DataFactory.quad(
      localSubject,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.namedNode("https://some.pod/resource#name")
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      name: "localSubject",
    });

    const updatedThing = removeUrl(
      thingLocal,
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(updatedThing)).toEqual([]);
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
      url: "https://some.pod/resource#thing",
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
        url: "https://arbitrary.vocab/subject",
      }
    );

    const updatedThing = removeUrl(
      thingWithThingPersistedIri,
      "https://some.vocab/predicate",
      thingPersisted
    );

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts Predicates as Named Nodes", () => {
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

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(thingWithBoolean)).toHaveLength(1);
    expect(Array.from(updatedThing)).toHaveLength(0);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
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
      name: "localSubject",
    });

    const updatedThing = removeBoolean(
      thingLocal,
      "https://some.vocab/predicate",
      true
    );

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts Predicates as Named Nodes", () => {
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

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(thingWithDatetime)).toHaveLength(1);
    expect(Array.from(updatedThing)).toHaveLength(0);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
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
      name: "localSubject",
    });

    const updatedThing = removeDatetime(
      thingLocal,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(updatedThing)).toEqual([]);
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
    const mockQuadWithDifferentPredicate = getMockQuadWithLiteralFor(
      "https://some-other.vocab/predicate",
      "1990-11-12T13:37:42Z",
      "dateTime"
    );
    thingWithOtherQuads.add(mockQuadWithDifferentObject);
    thingWithOtherQuads.add(mockQuadWithDifferentPredicate);

    const updatedThing = removeDatetime(
      thingWithOtherQuads,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(Array.from(updatedThing)).toEqual([
      mockQuadWithDifferentObject,
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

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts Predicates as Named Nodes", () => {
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

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(thingWithDecimal)).toHaveLength(1);
    expect(Array.from(updatedThing)).toHaveLength(0);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
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
      name: "localSubject",
    });

    const updatedThing = removeDecimal(
      thingLocal,
      "https://some.vocab/predicate",
      13.37
    );

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts Predicates as Named Nodes", () => {
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

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(thingWithInteger)).toHaveLength(1);
    expect(Array.from(updatedThing)).toHaveLength(0);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
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
      name: "localSubject",
    });

    const updatedThing = removeInteger(
      thingLocal,
      "https://some.vocab/predicate",
      42
    );

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(updatedThing)).toEqual([]);
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

    return Object.assign(thing, { url: "https://arbitrary.vocab/subject" });
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

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts Predicates as Named Nodes", () => {
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

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(thingWithStringWithLocale)).toHaveLength(1);
    expect(Array.from(updatedThing)).toHaveLength(0);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
    );
    const quadWithLocalSubject = DataFactory.quad(
      localSubject,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal("Some arbitrary string", "en-us")
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      name: "localSubject",
    });

    const updatedThing = removeStringWithLocale(
      thingLocal,
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(updatedThing)).toEqual([mockQuadWithInteger]);
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

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts Predicates as Named Nodes", () => {
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

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(thingWithStringNoLocale)).toHaveLength(1);
    expect(Array.from(updatedThing)).toHaveLength(0);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
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
      name: "localSubject",
    });

    const updatedThing = removeStringNoLocale(
      thingLocal,
      "https://some.vocab/predicate",
      "Some arbitrary string"
    );

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(updatedThing)).toEqual([]);
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
      url: "https://arbitrary.vocab/subject",
    });

    const updatedThing = removeLiteral(
      thingWithStringWithLocale,
      "https://some.vocab/predicate",
      DataFactory.literal("Some arbitrary string", "en-US")
    );

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts Predicates as Named Nodes", () => {
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

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(thingWithInteger)).toHaveLength(1);
    expect(Array.from(updatedThing)).toHaveLength(0);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
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
      name: "localSubject",
    });

    const updatedThing = removeLiteral(
      thingLocal,
      "https://some.vocab/predicate",
      DataFactory.literal(
        "42",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer")
      )
    );

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithNamedNode = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.vocab/object"
    );

    const updatedThing = removeNamedNode(
      thingWithNamedNode,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.namedNode("https://some.vocab/object")
    );

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(thingWithNamedNode)).toHaveLength(1);
    expect(Array.from(updatedThing)).toHaveLength(0);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
    );
    const quadWithLocalSubject = DataFactory.quad(
      localSubject,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.namedNode("https://some.vocab/object")
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      name: "localSubject",
    });

    const updatedThing = removeNamedNode(
      thingLocal,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.vocab/object")
    );

    expect(Array.from(updatedThing)).toEqual([]);
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

    expect(Array.from(updatedThing)).toEqual([]);
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
});
