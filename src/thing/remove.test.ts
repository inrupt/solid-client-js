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
import {
  Iri,
  IriString,
  makeIri,
  Thing,
  ThingLocal,
  ThingPersisted,
} from "../interfaces";
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
import { INRUPT_TEST_IRI } from "../GENERATED/INRUPT_TEST_IRI";
import { XSD } from "@solid/lit-vocab-common-rdfext";

function getMockQuadWithLiteralFor(
  predicate: IriString,
  literalValue: string,
  literalType: Iri
): Quad {
  const quad = DataFactory.quad(
    INRUPT_TEST_IRI.arbitrarySubject,
    predicate,
    DataFactory.literal(literalValue, literalType)
  );
  return quad;
}
function getMockThingWithLiteralFor(
  predicate: IriString,
  literalValue: string,
  literalType: Iri
): Thing {
  const quad = getMockQuadWithLiteralFor(predicate, literalValue, literalType);
  const thing = dataset();
  thing.add(quad);

  return Object.assign(thing, { url: INRUPT_TEST_IRI.arbitrarySubject });
}
function getMockQuadWithNamedNode(
  predicate: IriString,
  object: IriString
): Quad {
  const quad = DataFactory.quad(
    INRUPT_TEST_IRI.arbitrarySubject,
    predicate,
    object
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
    url: INRUPT_TEST_IRI.arbitrarySubject,
  });
  return thing;
}

describe("removeAll", () => {
  it("removes all values for the given Predicate", () => {
    const quadWithIri = getMockQuadWithNamedNode(
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thingWithStringAndIri = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Arbitrary string value",
      XSD.string
    );
    thingWithStringAndIri.add(quadWithIri);

    const updatedThing = removeAll(
      thingWithStringAndIri,
      INRUPT_TEST_IRI.arbitraryPredicate
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithString = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Arbitrary string value",
      XSD.string
    );

    const updatedThing = removeAll(
      thingWithString,
      INRUPT_TEST_IRI.arbitraryPredicate
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not modify the input Thing", () => {
    const thingWithString = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Arbitrary string value",
      XSD.string
    );

    const updatedThing = removeAll(
      thingWithString,
      INRUPT_TEST_IRI.arbitraryPredicate
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
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = removeAll(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("removes multiple instances of the same value for the same Predicate", () => {
    const thingWithDuplicateIri = getMockThingWithNamedNode(
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    thingWithDuplicateIri.add(Array.from(thingWithDuplicateIri)[0]);

    const updatedThing = removeAll(
      thingWithDuplicateIri,
      INRUPT_TEST_IRI.arbitraryPredicate
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not remove Quads with different Predicates", () => {
    const thingWithIri = getMockThingWithNamedNode(
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const mockQuadWithDifferentPredicate = getMockQuadWithNamedNode(
      INRUPT_TEST_IRI.arbitraryOtherPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    thingWithIri.add(mockQuadWithDifferentPredicate);

    const updatedThing = removeAll(
      thingWithIri,
      INRUPT_TEST_IRI.arbitraryPredicate
    );

    expect(Array.from(updatedThing)).toEqual([mockQuadWithDifferentPredicate]);
  });
});

describe("removeIri", () => {
  function getMockQuadWithIri(
    predicate: IriString,
    iri: IriString = INRUPT_TEST_IRI.arbitraryObject
  ): Quad {
    return getMockQuadWithNamedNode(predicate, iri);
  }
  function getMockThingWithIri(
    predicate: IriString,
    iri: IriString = INRUPT_TEST_IRI.arbitraryObject
  ): ThingPersisted {
    const quad = getMockQuadWithIri(predicate, iri);
    const thing = dataset();
    thing.add(quad);

    return Object.assign(thing, { url: INRUPT_TEST_IRI.arbitrarySubject });
  }

  it("removes the given IRI value for the given Predicate", () => {
    const thingWithIri = getMockThingWithIri(
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    const updatedThing = removeUrl(
      thingWithIri,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithIri = getMockThingWithIri(
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    const updatedThing = removeUrl(
      thingWithIri,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts IRI's as Named Nodes", () => {
    const thingWithIri = getMockThingWithIri(
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    const updatedThing = removeUrl(
      thingWithIri,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not modify the input Thing", () => {
    const thingWithIri = getMockThingWithIri(
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    const updatedThing = removeUrl(
      thingWithIri,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
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
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = removeUrl(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("removes multiple instances of the same IRI for the same Predicate", () => {
    const thingWithDuplicateIri = getMockThingWithIri(
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    thingWithDuplicateIri.add(Array.from(thingWithDuplicateIri)[0]);

    const updatedThing = removeUrl(
      thingWithDuplicateIri,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithIri = getMockThingWithIri(
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const mockQuadWithDifferentIri = getMockQuadWithIri(
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryOtherObject
    );
    const mockQuadWithDifferentPredicate = getMockQuadWithIri(
      INRUPT_TEST_IRI.arbitraryOtherPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    thingWithIri.add(mockQuadWithDifferentIri);
    thingWithIri.add(mockQuadWithDifferentPredicate);

    const updatedThing = removeUrl(
      thingWithIri,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    expect(Array.from(updatedThing)).toEqual([
      mockQuadWithDifferentIri,
      mockQuadWithDifferentPredicate,
    ]);
  });

  it("does not remove Quads with non-IRI Objects", () => {
    const thingWithIri = getMockThingWithIri(
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const mockQuadWithString = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal("Some non-IRI Object")
    );
    thingWithIri.add(mockQuadWithString);

    const updatedThing = removeUrl(
      thingWithIri,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    expect(Array.from(updatedThing)).toEqual([mockQuadWithString]);
  });

  it("resolves ThingPersisteds", () => {
    const thingIri = makeIri("https://some.pod/resource#thing");
    const thingPersisted: ThingPersisted = Object.assign(dataset(), {
      url: thingIri,
    });
    const quadWithThingPersistedIri = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      thingIri
    );
    const datasetWithThingPersistedIri = dataset();
    datasetWithThingPersistedIri.add(quadWithThingPersistedIri);
    const thingWithThingPersistedIri: Thing = Object.assign(
      datasetWithThingPersistedIri,
      {
        url: INRUPT_TEST_IRI.arbitrarySubject,
      }
    );

    const updatedThing = removeUrl(
      thingWithThingPersistedIri,
      INRUPT_TEST_IRI.arbitraryPredicate,
      thingPersisted
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });
});

describe("removeBoolean", () => {
  it("removes the given boolean value for the given Predicate", () => {
    const thingWithBoolean = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1",
      XSD.boolean_
    );

    const updatedThing = removeBoolean(
      thingWithBoolean,
      INRUPT_TEST_IRI.arbitraryPredicate,
      true
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithBoolean = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "0",
      XSD.boolean_
    );

    const updatedThing = removeBoolean(
      thingWithBoolean,
      INRUPT_TEST_IRI.arbitraryPredicate,
      false
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not modify the input Thing", () => {
    const thingWithBoolean = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1",
      XSD.boolean_
    );

    const updatedThing = removeBoolean(
      thingWithBoolean,
      INRUPT_TEST_IRI.arbitraryPredicate,
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
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal(
        "1",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#boolean")
      )
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = removeBoolean(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      true
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("removes multiple instances of the same boolean for the same Predicate", () => {
    const thingWithDuplicateBoolean = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1",
      XSD.boolean_
    );
    thingWithDuplicateBoolean.add(Array.from(thingWithDuplicateBoolean)[0]);

    const updatedThing = removeBoolean(
      thingWithDuplicateBoolean,
      INRUPT_TEST_IRI.arbitraryPredicate,
      true
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithOtherQuads = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1",
      XSD.boolean_
    );

    const mockQuadWithDifferentObject = getMockQuadWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "0",
      XSD.boolean_
    );
    const mockQuadWithDifferentPredicate = getMockQuadWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryOtherPredicate,
      "1",
      XSD.boolean_
    );
    thingWithOtherQuads.add(mockQuadWithDifferentObject);
    thingWithOtherQuads.add(mockQuadWithDifferentPredicate);

    const updatedThing = removeBoolean(
      thingWithOtherQuads,
      INRUPT_TEST_IRI.arbitraryPredicate,
      true
    );

    expect(Array.from(updatedThing)).toEqual([
      mockQuadWithDifferentObject,
      mockQuadWithDifferentPredicate,
    ]);
  });

  it("does not remove Quads with non-boolean Objects", () => {
    const thingWithString = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1",
      XSD.boolean_
    );
    const mockQuadWithIntegerNotBoolean = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal("1", "http://www.w3.org/2001/XMLSchema#integer")
    );
    thingWithString.add(mockQuadWithIntegerNotBoolean);

    const updatedThing = removeBoolean(
      thingWithString,
      INRUPT_TEST_IRI.arbitraryPredicate,
      true
    );

    expect(Array.from(updatedThing)).toEqual([mockQuadWithIntegerNotBoolean]);
  });
});

describe("removeDatetime", () => {
  it("removes the given datetime value for the given Predicate", () => {
    const thingWithDatetime = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1990-11-12T13:37:42Z",
      XSD.dateTime
    );

    const updatedThing = removeDatetime(
      thingWithDatetime,
      INRUPT_TEST_IRI.arbitraryPredicate,
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithDatetime = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1990-11-12T13:37:42Z",
      XSD.dateTime
    );

    const updatedThing = removeDatetime(
      thingWithDatetime,
      INRUPT_TEST_IRI.arbitraryPredicate,
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not modify the input Thing", () => {
    const thingWithDatetime = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1990-11-12T13:37:42Z",
      XSD.dateTime
    );

    const updatedThing = removeDatetime(
      thingWithDatetime,
      INRUPT_TEST_IRI.arbitraryPredicate,
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
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal(
        "1990-11-12T13:37:42Z",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#dateTime")
      )
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = removeDatetime(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("removes multiple instances of the same datetime for the same Predicate", () => {
    const thingWithDuplicateDatetime = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1990-11-12T13:37:42Z",
      XSD.dateTime
    );
    thingWithDuplicateDatetime.add(Array.from(thingWithDuplicateDatetime)[0]);

    const updatedThing = removeDatetime(
      thingWithDuplicateDatetime,
      INRUPT_TEST_IRI.arbitraryPredicate,
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithOtherQuads = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1990-11-12T13:37:42Z",
      XSD.dateTime
    );

    const mockQuadWithDifferentObject = getMockQuadWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1955-06-08T13:37:42Z",
      XSD.dateTime
    );
    const mockQuadWithDifferentPredicate = getMockQuadWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryOtherPredicate,
      "1990-11-12T13:37:42Z",
      XSD.dateTime
    );
    thingWithOtherQuads.add(mockQuadWithDifferentObject);
    thingWithOtherQuads.add(mockQuadWithDifferentPredicate);

    const updatedThing = removeDatetime(
      thingWithOtherQuads,
      INRUPT_TEST_IRI.arbitraryPredicate,
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(Array.from(updatedThing)).toEqual([
      mockQuadWithDifferentObject,
      mockQuadWithDifferentPredicate,
    ]);
  });

  it("does not remove Quads with non-datetime Objects", () => {
    const thingWithString = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1990-11-12T13:37:42Z",
      XSD.dateTime
    );
    const mockQuadWithStringNotDatetime = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal(
        "1990-11-12T13:37:42Z",
        "http://www.w3.org/2001/XMLSchema#string"
      )
    );
    thingWithString.add(mockQuadWithStringNotDatetime);

    const updatedThing = removeDatetime(
      thingWithString,
      INRUPT_TEST_IRI.arbitraryPredicate,
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(Array.from(updatedThing)).toEqual([mockQuadWithStringNotDatetime]);
  });
});

describe("removeDecimal", () => {
  it("removes the given decimal value for the given Predicate", () => {
    const thingWithDecimal = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "13.37",
      XSD.decimal
    );

    const updatedThing = removeDecimal(
      thingWithDecimal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      13.37
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithDecimal = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "13.37",
      XSD.decimal
    );

    const updatedThing = removeDecimal(
      thingWithDecimal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      13.37
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not modify the input Thing", () => {
    const thingWithDecimal = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "13.37",
      XSD.decimal
    );

    const updatedThing = removeDecimal(
      thingWithDecimal,
      INRUPT_TEST_IRI.arbitraryPredicate,
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
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal(
        "13.37",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#decimal")
      )
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = removeDecimal(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      13.37
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("removes multiple instances of the same decimal for the same Predicate", () => {
    const thingWithDuplicateDecimal = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "13.37",
      XSD.decimal
    );
    thingWithDuplicateDecimal.add(Array.from(thingWithDuplicateDecimal)[0]);

    const updatedThing = removeDecimal(
      thingWithDuplicateDecimal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      13.37
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithOtherQuads = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "13.37",
      XSD.decimal
    );

    const mockQuadWithDifferentObject = getMockQuadWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "4.2",
      XSD.decimal
    );
    const mockQuadWithDifferentPredicate = getMockQuadWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryOtherPredicate,
      "13.37",
      XSD.decimal
    );
    thingWithOtherQuads.add(mockQuadWithDifferentObject);
    thingWithOtherQuads.add(mockQuadWithDifferentPredicate);

    const updatedThing = removeDecimal(
      thingWithOtherQuads,
      INRUPT_TEST_IRI.arbitraryPredicate,
      13.37
    );

    expect(Array.from(updatedThing)).toEqual([
      mockQuadWithDifferentObject,
      mockQuadWithDifferentPredicate,
    ]);
  });

  it("does not remove Quads with non-decimal Objects", () => {
    const thingWithString = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "13.37",
      XSD.decimal
    );
    const mockQuadWithStringNotDecimal = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal("13.37", "http://www.w3.org/2001/XMLSchema#string")
    );
    thingWithString.add(mockQuadWithStringNotDecimal);

    const updatedThing = removeDecimal(
      thingWithString,
      INRUPT_TEST_IRI.arbitraryPredicate,
      13.37
    );

    expect(Array.from(updatedThing)).toEqual([mockQuadWithStringNotDecimal]);
  });
});

describe("removeInteger", () => {
  it("removes the given integer value for the given Predicate", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );

    const updatedThing = removeInteger(
      thingWithInteger,
      INRUPT_TEST_IRI.arbitraryPredicate,
      42
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );

    const updatedThing = removeInteger(
      thingWithInteger,
      INRUPT_TEST_IRI.arbitraryPredicate,
      42
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not modify the input Thing", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );

    const updatedThing = removeInteger(
      thingWithInteger,
      INRUPT_TEST_IRI.arbitraryPredicate,
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
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal(
        "42",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer")
      )
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = removeInteger(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      42
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("removes multiple instances of the same integer for the same Predicate", () => {
    const thingWithDuplicateInteger = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );
    thingWithDuplicateInteger.add(Array.from(thingWithDuplicateInteger)[0]);

    const updatedThing = removeInteger(
      thingWithDuplicateInteger,
      INRUPT_TEST_IRI.arbitraryPredicate,
      42
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithOtherQuads = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );

    const mockQuadWithDifferentObject = getMockQuadWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1337",
      XSD.integer
    );
    const mockQuadWithDifferentPredicate = getMockQuadWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryOtherPredicate,
      "42",
      XSD.integer
    );
    thingWithOtherQuads.add(mockQuadWithDifferentObject);
    thingWithOtherQuads.add(mockQuadWithDifferentPredicate);

    const updatedThing = removeInteger(
      thingWithOtherQuads,
      INRUPT_TEST_IRI.arbitraryPredicate,
      42
    );

    expect(Array.from(updatedThing)).toEqual([
      mockQuadWithDifferentObject,
      mockQuadWithDifferentPredicate,
    ]);
  });

  it("does not remove Quads with non-integer Objects", () => {
    const thingWithString = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );
    const mockQuadWithStringNotInteger = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal("42", "http://www.w3.org/2001/XMLSchema#string")
    );
    thingWithString.add(mockQuadWithStringNotInteger);

    const updatedThing = removeInteger(
      thingWithString,
      INRUPT_TEST_IRI.arbitraryPredicate,
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
      INRUPT_TEST_IRI.arbitrarySubject,
      predicate,
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

    return Object.assign(thing, { url: INRUPT_TEST_IRI.arbitrarySubject });
  }
  it("removes the given localised string for the given Predicate", () => {
    const thingWithStringWithLocale = getMockThingWithStringWithLocaleFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Une chaîne de caractères quelconque",
      "fr-fr"
    );

    const updatedThing = removeStringWithLocale(
      thingWithStringWithLocale,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Une chaîne de caractères quelconque",
      "fr-fr"
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithStringWithLocale = getMockThingWithStringWithLocaleFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string",
      "en-us"
    );

    const updatedThing = removeStringWithLocale(
      thingWithStringWithLocale,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string",
      "en-us"
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not modify the input Thing", () => {
    const thingWithStringWithLocale = getMockThingWithStringWithLocaleFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string",
      "en-us"
    );

    const updatedThing = removeStringWithLocale(
      thingWithStringWithLocale,
      INRUPT_TEST_IRI.arbitraryPredicate,
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
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal("Some arbitrary string", "en-us")
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = removeStringWithLocale(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string",
      "en-us"
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("removes multiple instances of the same localised string for the same Predicate", () => {
    const thingWithDuplicateStringWithLocale = getMockThingWithStringWithLocaleFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string",
      "en-us"
    );
    thingWithDuplicateStringWithLocale.add(
      Array.from(thingWithDuplicateStringWithLocale)[0]
    );

    const updatedThing = removeStringWithLocale(
      thingWithDuplicateStringWithLocale,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string",
      "en-us"
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithStringWithLocale = getMockThingWithStringWithLocaleFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string",
      "en-us"
    );

    const mockQuadWithDifferentStringInSameLocale = getMockQuadWithStringWithLocaleFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some other arbitrary string",
      "en-us"
    );

    const mockQuadWithSameStringInDifferentLocale = getMockQuadWithStringWithLocaleFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string",
      "en-uk"
    );

    const mockQuadWithDifferentPredicate = getMockQuadWithStringWithLocaleFor(
      INRUPT_TEST_IRI.arbitraryOtherPredicate,
      "Some arbitrary string",
      "en-us"
    );
    thingWithStringWithLocale.add(mockQuadWithDifferentStringInSameLocale);
    thingWithStringWithLocale.add(mockQuadWithSameStringInDifferentLocale);
    thingWithStringWithLocale.add(mockQuadWithDifferentPredicate);

    const updatedThing = removeStringWithLocale(
      thingWithStringWithLocale,
      INRUPT_TEST_IRI.arbitraryPredicate,
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
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string",
      "en-us"
    );

    const mockQuadWithStringInDifferentLocale = getMockQuadWithStringWithLocaleFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string",
      "en-US"
    );

    thingWithStringWithLocale.add(mockQuadWithStringInDifferentLocale);

    const updatedThing = removeStringWithLocale(
      thingWithStringWithLocale,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string",
      "en-US"
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not remove Quads with non-string Objects", () => {
    const thingWithLocalizedString = getMockThingWithStringWithLocaleFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string",
      "en-US"
    );
    const mockQuadWithInteger = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal("42", "http://www.w3.org/2001/XMLSchema#integer")
    );
    thingWithLocalizedString.add(mockQuadWithInteger);

    const updatedThing = removeStringWithLocale(
      thingWithLocalizedString,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string",
      "en-US"
    );

    expect(Array.from(updatedThing)).toEqual([mockQuadWithInteger]);
  });
});

describe("removeStringNoLocale", () => {
  it("removes the given string value for the given Predicate", () => {
    const thingWithStringNoLocale = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string",
      XSD.string
    );

    const updatedThing = removeStringNoLocale(
      thingWithStringNoLocale,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string"
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithStringNoLocale = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string",
      XSD.string
    );

    const updatedThing = removeStringNoLocale(
      thingWithStringNoLocale,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string"
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not modify the input Thing", () => {
    const thingWithStringNoLocale = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string",
      XSD.string
    );

    const updatedThing = removeStringNoLocale(
      thingWithStringNoLocale,
      INRUPT_TEST_IRI.arbitraryPredicate,
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
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal(
        "Some arbitrary string",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#string")
      )
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = removeStringNoLocale(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string"
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("removes multiple instances of the same string for the same Predicate", () => {
    const thingWithDuplicateString = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string",
      XSD.string
    );
    thingWithDuplicateString.add(Array.from(thingWithDuplicateString)[0]);

    const updatedThing = removeStringNoLocale(
      thingWithDuplicateString,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string"
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithOtherQuads = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string",
      XSD.string
    );

    const mockQuadWithDifferentObject = getMockQuadWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some other arbitrary string",
      XSD.string
    );
    const mockQuadWithDifferentPredicate = getMockQuadWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryOtherPredicate,
      "Some arbitrary string",
      XSD.string
    );
    thingWithOtherQuads.add(mockQuadWithDifferentObject);
    thingWithOtherQuads.add(mockQuadWithDifferentPredicate);

    const updatedThing = removeStringNoLocale(
      thingWithOtherQuads,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string"
    );

    expect(Array.from(updatedThing)).toEqual([
      mockQuadWithDifferentObject,
      mockQuadWithDifferentPredicate,
    ]);
  });

  it("does not remove Quads with non-string Objects", () => {
    const thingWithString = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string",
      XSD.string
    );
    const mockQuadWithInteger = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal("42", "http://www.w3.org/2001/XMLSchema#integer")
    );
    thingWithString.add(mockQuadWithInteger);

    const updatedThing = removeStringNoLocale(
      thingWithString,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string"
    );

    expect(Array.from(updatedThing)).toEqual([mockQuadWithInteger]);
  });
});

describe("removeLiteral", () => {
  it("accepts unlocalised strings as Literal", () => {
    const thingWithStringNoLocale = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some arbitrary string",
      XSD.string
    );

    const updatedThing = removeLiteral(
      thingWithStringNoLocale,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal(
        "Some arbitrary string",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#string")
      )
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts localised strings as Literal", () => {
    const quad = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal("Some arbitrary string", "en-US")
    );
    const thing = dataset();
    thing.add(quad);

    const thingWithStringWithLocale = Object.assign(thing, {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });

    const updatedThing = removeLiteral(
      thingWithStringWithLocale,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal("Some arbitrary string", "en-US")
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts integers as Literal", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );

    const updatedThing = removeLiteral(
      thingWithInteger,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal(
        "42",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer")
      )
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts decimal as Literal", () => {
    const thingWithDecimal = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "13.37",
      XSD.decimal
    );

    const updatedThing = removeLiteral(
      thingWithDecimal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal(
        "13.37",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#decimal")
      )
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts boolean as Literal", () => {
    const thingWithBoolean = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1",
      XSD.boolean_
    );

    const updatedThing = removeLiteral(
      thingWithBoolean,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal(
        "1",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#boolean")
      )
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts datetime as Literal", () => {
    const thingWithDatetime = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1990-11-12T13:37:42Z",
      XSD.dateTime
    );

    const updatedThing = removeLiteral(
      thingWithDatetime,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal(
        "1990-11-12T13:37:42Z",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#dateTime")
      )
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );

    const updatedThing = removeLiteral(
      thingWithInteger,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal(
        "42",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer")
      )
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not modify the input Thing", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );

    const updatedThing = removeLiteral(
      thingWithInteger,
      INRUPT_TEST_IRI.arbitraryPredicate,
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
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal(
        "42",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer")
      )
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = removeLiteral(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal(
        "42",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer")
      )
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("removes multiple instances of the same Literal for the same Predicate", () => {
    const thingWithDuplicateInteger = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );
    thingWithDuplicateInteger.add(Array.from(thingWithDuplicateInteger)[0]);

    const updatedThing = removeLiteral(
      thingWithDuplicateInteger,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal(
        "42",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer")
      )
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithOtherQuads = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );

    const mockQuadWithDifferentObject = getMockQuadWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1337",
      XSD.integer
    );
    const mockQuadWithDifferentPredicate = getMockQuadWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryOtherPredicate,
      "42",
      XSD.integer
    );
    thingWithOtherQuads.add(mockQuadWithDifferentObject);
    thingWithOtherQuads.add(mockQuadWithDifferentPredicate);

    const updatedThing = removeLiteral(
      thingWithOtherQuads,
      INRUPT_TEST_IRI.arbitraryPredicate,
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
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );
    const mockQuadWithStringNotInteger = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal("42", "http://www.w3.org/2001/XMLSchema#string")
    );
    thingWithString.add(mockQuadWithStringNotInteger);

    const updatedThing = removeLiteral(
      thingWithString,
      INRUPT_TEST_IRI.arbitraryPredicate,
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
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    const updatedThing = removeNamedNode(
      thingWithNamedNode,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithNamedNode = getMockThingWithNamedNode(
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    const updatedThing = removeNamedNode(
      thingWithNamedNode,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not modify the input Thing", () => {
    const thingWithNamedNode = getMockThingWithNamedNode(
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    const updatedThing = removeNamedNode(
      thingWithNamedNode,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
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
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = removeNamedNode(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("removes multiple instances of the same NamedNode for the same Predicate", () => {
    const thingWithDuplicateNamedNode = getMockThingWithNamedNode(
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    thingWithDuplicateNamedNode.add(Array.from(thingWithDuplicateNamedNode)[0]);

    const updatedThing = removeNamedNode(
      thingWithDuplicateNamedNode,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithOtherQuads = getMockThingWithNamedNode(
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    const mockQuadWithDifferentObject = getMockQuadWithNamedNode(
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryOtherObject
    );
    const mockQuadWithDifferentPredicate = getMockQuadWithNamedNode(
      INRUPT_TEST_IRI.arbitraryOtherPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    thingWithOtherQuads.add(mockQuadWithDifferentObject);
    thingWithOtherQuads.add(mockQuadWithDifferentPredicate);

    const updatedThing = removeNamedNode(
      thingWithOtherQuads,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    expect(Array.from(updatedThing)).toEqual([
      mockQuadWithDifferentObject,
      mockQuadWithDifferentPredicate,
    ]);
  });
});
