import {
  removeOneIri,
  removeOneStringUnlocalised,
  removeOneStringInLocale,
  removeOneInteger,
  removeOneDecimal,
  removeOneBoolean,
  removeOneDatetime,
  removeOneLiteral,
  removeOneNamedNode,
} from "./remove";
import { dataset } from "@rdfjs/dataset";
import { NamedNode, Quad } from "rdf-js";
import { DataFactory } from "n3";
import { IriString, Thing, ThingLocal, ThingPersisted } from "../index";

function getMockQuad(
  terms: Partial<{
    subject: IriString;
    predicate: IriString;
    object: IriString;
    namedGraph: IriString;
  }> = {}
) {
  const subject: NamedNode = DataFactory.namedNode(
    terms.subject ?? "https://arbitrary.vocab/subject"
  );
  const predicate: NamedNode = DataFactory.namedNode(
    terms.predicate ?? "https://arbitrary.vocab/predicate"
  );
  const object: NamedNode = DataFactory.namedNode(
    terms.object ?? "https://arbitrary.vocab/object"
  );
  const namedGraph: NamedNode | undefined = terms.namedGraph
    ? DataFactory.namedNode(terms.namedGraph)
    : undefined;
  return DataFactory.quad(subject, predicate, object, namedGraph);
}

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

  return Object.assign(thing, { iri: "https://arbitrary.vocab/subject" });
}
describe("removeOneIri", () => {
  function getMockQuadWithIri(
    predicate: IriString,
    iri: IriString = "https://arbitrary.vocab/object"
  ): Quad {
    return getMockQuad({
      subject: "https://arbitrary.vocab/subject",
      predicate: predicate,
      object: iri,
    });
  }
  function getMockThingWithIri(
    predicate: IriString,
    iri: IriString = "https://arbitrary.vocab/object"
  ): ThingPersisted {
    const quad = getMockQuadWithIri(predicate, iri);
    const thing = dataset();
    thing.add(quad);

    return Object.assign(thing, { iri: "https://arbitrary.vocab/subject" });
  }

  it("removes the given IRI value for the given Predicate", () => {
    const thingWithIri = getMockThingWithIri(
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    const updatedThing = removeOneIri(
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

    const updatedThing = removeOneIri(
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

    const updatedThing = removeOneIri(
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

    const updatedThing = removeOneIri(
      thingWithIri,
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    expect(Array.from(thingWithIri).length).toBe(1);
    expect(Array.from(updatedThing).length).toBe(0);
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

    const updatedThing = removeOneIri(
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

    const updatedThing = removeOneIri(
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

    const updatedThing = removeOneIri(
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

    const updatedThing = removeOneIri(
      thingWithIri,
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    expect(Array.from(updatedThing)).toEqual([mockQuadWithString]);
  });

  it("resolves ThingPersisteds", () => {
    const thingPersisted: ThingPersisted = Object.assign(dataset(), {
      iri: "https://some.pod/resource#thing",
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
        iri: "https://arbitrary.vocab/subject",
      }
    );

    const updatedThing = removeOneIri(
      thingWithThingPersistedIri,
      "https://some.vocab/predicate",
      thingPersisted
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });
});

describe("removeOneStringUnlocalised", () => {
  it("removes the given string value for the given Predicate", () => {
    const thingWithStringUnlocalised = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "string"
    );

    const updatedThing = removeOneStringUnlocalised(
      thingWithStringUnlocalised,
      "https://some.vocab/predicate",
      "Some arbitrary string"
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithStringUnlocalised = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "string"
    );

    const updatedThing = removeOneStringUnlocalised(
      thingWithStringUnlocalised,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "Some arbitrary string"
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not modify the input Thing", () => {
    const thingWithStringUnlocalised = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "string"
    );

    const updatedThing = removeOneStringUnlocalised(
      thingWithStringUnlocalised,
      "https://some.vocab/predicate",
      "Some arbitrary string"
    );

    expect(Array.from(thingWithStringUnlocalised).length).toBe(1);
    expect(Array.from(updatedThing).length).toBe(0);
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

    const updatedThing = removeOneStringUnlocalised(
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

    const updatedThing = removeOneStringUnlocalised(
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

    const updatedThing = removeOneStringUnlocalised(
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

    const updatedThing = removeOneStringUnlocalised(
      thingWithString,
      "https://some.vocab/predicate",
      "Some arbitrary string"
    );

    expect(Array.from(updatedThing)).toEqual([mockQuadWithInteger]);
  });
});

describe("removeOneStringInLocale", () => {
  function getMockQuadWithStringInLocaleFor(
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
  function getMockThingWithStringInLocaleFor(
    predicate: IriString,
    literalValue: string,
    locale: string
  ): Thing {
    const quad = getMockQuadWithStringInLocaleFor(
      predicate,
      literalValue,
      locale
    );
    const thing = dataset();
    thing.add(quad);

    return Object.assign(thing, { iri: "https://arbitrary.vocab/subject" });
  }
  it("removes the given localised string for the given Predicate", () => {
    const thingWithStringInLocale = getMockThingWithStringInLocaleFor(
      "https://some.vocab/predicate",
      "Une chaîne de caractères quelconque",
      "fr-fr"
    );

    const updatedThing = removeOneStringInLocale(
      thingWithStringInLocale,
      "https://some.vocab/predicate",
      "Une chaîne de caractères quelconque",
      "fr-fr"
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithStringInLocale = getMockThingWithStringInLocaleFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );

    const updatedThing = removeOneStringInLocale(
      thingWithStringInLocale,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "Some arbitrary string",
      "en-us"
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not modify the input Thing", () => {
    const thingWithStringInLocale = getMockThingWithStringInLocaleFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );

    const updatedThing = removeOneStringInLocale(
      thingWithStringInLocale,
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );

    expect(Array.from(thingWithStringInLocale).length).toBe(1);
    expect(Array.from(updatedThing).length).toBe(0);
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

    const updatedThing = removeOneStringInLocale(
      thingLocal,
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("removes multiple instances of the same localised string for the same Predicate", () => {
    const thingWithDuplicateStringInLocale = getMockThingWithStringInLocaleFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );
    thingWithDuplicateStringInLocale.add(
      Array.from(thingWithDuplicateStringInLocale)[0]
    );

    const updatedThing = removeOneStringInLocale(
      thingWithDuplicateStringInLocale,
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not remove Quads with different Predicates or Objects", () => {
    const thingWithStringInLocale = getMockThingWithStringInLocaleFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );

    const mockQuadWithDifferentStringInSameLocale = getMockQuadWithStringInLocaleFor(
      "https://some.vocab/predicate",
      "Some other arbitrary string",
      "en-us"
    );

    const mockQuadWithSameStringInDifferentLocale = getMockQuadWithStringInLocaleFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-uk"
    );

    const mockQuadWithDifferentPredicate = getMockQuadWithStringInLocaleFor(
      "https://some.other.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );
    thingWithStringInLocale.add(mockQuadWithDifferentStringInSameLocale);
    thingWithStringInLocale.add(mockQuadWithSameStringInDifferentLocale);
    thingWithStringInLocale.add(mockQuadWithDifferentPredicate);

    const updatedThing = removeOneStringInLocale(
      thingWithStringInLocale,
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
    const thingWithStringInLocale = getMockThingWithStringInLocaleFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-us"
    );

    const mockQuadWithStringInDifferentLocale = getMockQuadWithStringInLocaleFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-US"
    );

    thingWithStringInLocale.add(mockQuadWithStringInDifferentLocale);

    const updatedThing = removeOneStringInLocale(
      thingWithStringInLocale,
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-US"
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("does not remove Quads with non-string Objects", () => {
    const thingWithLocalisedString = getMockThingWithStringInLocaleFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-US"
    );
    const mockQuadWithInteger = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal("42", "http://www.w3.org/2001/XMLSchema#integer")
    );
    thingWithLocalisedString.add(mockQuadWithInteger);

    const updatedThing = removeOneStringInLocale(
      thingWithLocalisedString,
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "en-US"
    );

    expect(Array.from(updatedThing)).toEqual([mockQuadWithInteger]);
  });
});

describe("removeOneInteger", () => {
  it("removes the given integer value for the given Predicate", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    const updatedThing = removeOneInteger(
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

    const updatedThing = removeOneInteger(
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

    const updatedThing = removeOneInteger(
      thingWithInteger,
      "https://some.vocab/predicate",
      42
    );

    expect(Array.from(thingWithInteger).length).toBe(1);
    expect(Array.from(updatedThing).length).toBe(0);
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

    const updatedThing = removeOneInteger(
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

    const updatedThing = removeOneInteger(
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

    const updatedThing = removeOneInteger(
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

    const updatedThing = removeOneInteger(
      thingWithString,
      "https://some.vocab/predicate",
      42
    );

    expect(Array.from(updatedThing)).toEqual([mockQuadWithStringNotInteger]);
  });
});

describe("removeOneDecimal", () => {
  it("removes the given decimal value for the given Predicate", () => {
    const thingWithDecimal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13.37",
      "decimal"
    );

    const updatedThing = removeOneDecimal(
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

    const updatedThing = removeOneDecimal(
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

    const updatedThing = removeOneDecimal(
      thingWithDecimal,
      "https://some.vocab/predicate",
      13.37
    );

    expect(Array.from(thingWithDecimal).length).toBe(1);
    expect(Array.from(updatedThing).length).toBe(0);
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

    const updatedThing = removeOneDecimal(
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

    const updatedThing = removeOneDecimal(
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

    const updatedThing = removeOneDecimal(
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

    const updatedThing = removeOneDecimal(
      thingWithString,
      "https://some.vocab/predicate",
      13.37
    );

    expect(Array.from(updatedThing)).toEqual([mockQuadWithStringNotDecimal]);
  });
});

describe("removeOneBoolean", () => {
  it("removes the given boolean value for the given Predicate", () => {
    const thingWithBoolean = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1",
      "boolean"
    );

    const updatedThing = removeOneBoolean(
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

    const updatedThing = removeOneBoolean(
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

    const updatedThing = removeOneBoolean(
      thingWithBoolean,
      "https://some.vocab/predicate",
      true
    );

    expect(Array.from(thingWithBoolean).length).toBe(1);
    expect(Array.from(updatedThing).length).toBe(0);
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

    const updatedThing = removeOneBoolean(
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

    const updatedThing = removeOneBoolean(
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

    const updatedThing = removeOneBoolean(
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

    const updatedThing = removeOneBoolean(
      thingWithString,
      "https://some.vocab/predicate",
      true
    );

    expect(Array.from(updatedThing)).toEqual([mockQuadWithIntegerNotBoolean]);
  });
});

describe("removeOneDatetime", () => {
  it("removes the given datetime value for the given Predicate", () => {
    const thingWithDatetime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12T13:37:42Z",
      "dateTime"
    );

    const updatedThing = removeOneDatetime(
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

    const updatedThing = removeOneDatetime(
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

    const updatedThing = removeOneDatetime(
      thingWithDatetime,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(Array.from(thingWithDatetime).length).toBe(1);
    expect(Array.from(updatedThing).length).toBe(0);
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

    const updatedThing = removeOneDatetime(
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

    const updatedThing = removeOneDatetime(
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

    const updatedThing = removeOneDatetime(
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

    const updatedThing = removeOneDatetime(
      thingWithString,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(Array.from(updatedThing)).toEqual([mockQuadWithStringNotDatetime]);
  });
});

describe("removeOneLiteral", () => {
  it("accepts unlocalised strings as Literal", () => {
    const thingWithStringUnlocalised = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some arbitrary string",
      "string"
    );

    const updatedThing = removeOneLiteral(
      thingWithStringUnlocalised,
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

    const thingWithStringInLocale = Object.assign(thing, {
      iri: "https://arbitrary.vocab/subject",
    });

    const updatedThing = removeOneLiteral(
      thingWithStringInLocale,
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

    const updatedThing = removeOneLiteral(
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

    const updatedThing = removeOneLiteral(
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

    const updatedThing = removeOneLiteral(
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

    const updatedThing = removeOneLiteral(
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

    const updatedThing = removeOneLiteral(
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

    const updatedThing = removeOneLiteral(
      thingWithInteger,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal(
        "42",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer")
      )
    );

    expect(Array.from(thingWithInteger).length).toBe(1);
    expect(Array.from(updatedThing).length).toBe(0);
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

    const updatedThing = removeOneLiteral(
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

    const updatedThing = removeOneLiteral(
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

    const updatedThing = removeOneLiteral(
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

    const updatedThing = removeOneLiteral(
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
    iri: "https://arbitrary.vocab/subject",
  });
  return thing;
}

describe("removeOneNamedNode", () => {
  it("removes the given NamedNode value for the given Predicate", () => {
    const thingWithNamedNode = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.vocab/object"
    );

    const updatedThing = removeOneNamedNode(
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

    const updatedThing = removeOneNamedNode(
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

    const updatedThing = removeOneNamedNode(
      thingWithNamedNode,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.namedNode("https://some.vocab/object")
    );

    expect(Array.from(thingWithNamedNode).length).toBe(1);
    expect(Array.from(updatedThing).length).toBe(0);
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

    const updatedThing = removeOneNamedNode(
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

    const updatedThing = removeOneNamedNode(
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

    const updatedThing = removeOneNamedNode(
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
