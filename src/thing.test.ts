import { getOneThing, getAllThings, createThing, asIri } from "./thing";
import { dataset } from "@rdfjs/dataset";
import { NamedNode } from "rdf-js";
import { DataFactory } from "n3";
import { IriString, Thing, ThingLocal, ThingPersisted } from "./index";

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

describe("createThing", () => {
  it("automatically generates a unique name for the Thing", () => {
    const thing1: ThingLocal = createThing();
    const thing2: ThingLocal = createThing();

    expect(typeof thing1.name).toBe("string");
    expect(thing1.name.length).toBeGreaterThan(0);
    expect(thing1.name).not.toEqual(thing2.name);
  });

  it("uses the given name, if any", () => {
    const thing: ThingLocal = createThing({ name: "some-name" });

    expect(thing.name).toBe("some-name");
  });

  it("uses the given IRI, if any", () => {
    const thing: ThingPersisted = createThing({
      iri: "https://some.pod/resource#thing",
    });

    expect(thing.iri).toBe("https://some.pod/resource#thing");
  });

  it("throws an error if the given URL is invalid", () => {
    expect(() => createThing({ iri: "Invalid IRI" })).toThrowError();
  });
});

describe("getOneThing", () => {
  it("returns a Dataset with just Quads in there with the given Subject", () => {
    const relevantQuad = getMockQuad({ subject: "https://some.vocab/subject" });
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(relevantQuad);
    datasetWithMultipleThings.add(
      getMockQuad({ subject: "https://arbitrary-other.vocab/subject" })
    );

    const thing = getOneThing(
      datasetWithMultipleThings,
      "https://some.vocab/subject"
    );

    expect(Array.from(thing)).toEqual([relevantQuad]);
  });

  it("accepts a Named Node as the Subject identifier", () => {
    const relevantQuad = getMockQuad({ subject: "https://some.vocab/subject" });
    const datasetWithAThing = dataset();
    datasetWithAThing.add(relevantQuad);

    const thing = getOneThing(
      datasetWithAThing,
      DataFactory.namedNode("https://some.vocab/subject")
    );

    expect(Array.from(thing)).toEqual([relevantQuad]);
  });

  it("accepts a SubjectLocal as the Subject identifier", () => {
    const quadWithLocalSubject = getMockQuad();
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
    );
    quadWithLocalSubject.subject = localSubject;
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(quadWithLocalSubject);

    const thing = getOneThing(datasetWithThingLocal, localSubject);

    expect(Array.from(thing)).toEqual([quadWithLocalSubject]);
  });

  it("returns Quads from all Named Graphs if no scope was specified", () => {
    const quadInDefaultGraph = getMockQuad({
      subject: "https://some.vocab/subject",
    });
    const quadInArbitraryGraph = getMockQuad({
      subject: "https://some.vocab/subject",
      namedGraph: "https://arbitrary.vocab/namedGraph",
    });
    const datasetWithMultipleNamedGraphs = dataset();
    datasetWithMultipleNamedGraphs.add(quadInDefaultGraph);
    datasetWithMultipleNamedGraphs.add(quadInArbitraryGraph);

    const thing = getOneThing(
      datasetWithMultipleNamedGraphs,
      "https://some.vocab/subject"
    );

    expect(thing.size).toEqual(2);
    expect(Array.from(thing).includes(quadInDefaultGraph)).toBe(true);
    expect(Array.from(thing).includes(quadInArbitraryGraph)).toBe(true);
  });

  it("is able to limit the Thing's scope to a single Named Graph", () => {
    const relevantQuad = getMockQuad({
      subject: "https://some.vocab/subject",
      namedGraph: "https://some.vocab/namedGraph",
    });
    const datasetWithMultipleNamedGraphs = dataset();
    datasetWithMultipleNamedGraphs.add(relevantQuad);
    datasetWithMultipleNamedGraphs.add(
      getMockQuad({
        subject: "https://some.vocab/subject",
        namedGraph: "https://arbitrary-other.vocab/namedGraph",
      })
    );

    const thing = getOneThing(
      datasetWithMultipleNamedGraphs,
      "https://some.vocab/subject",
      { scope: "https://some.vocab/namedGraph" }
    );

    expect(Array.from(thing)).toEqual([relevantQuad]);
  });

  it("ignores Quads in the default graph when specifying an explicit scope", () => {
    const relevantQuad = getMockQuad({
      subject: "https://some.vocab/subject",
      namedGraph: "https://some.vocab/namedGraph",
    });
    const datasetWithMultipleNamedGraphs = dataset();
    datasetWithMultipleNamedGraphs.add(relevantQuad);
    datasetWithMultipleNamedGraphs.add(
      getMockQuad({
        subject: "https://some.vocab/subject",
        namedGraph: undefined,
      })
    );

    const thing = getOneThing(
      datasetWithMultipleNamedGraphs,
      "https://some.vocab/subject",
      { scope: "https://some.vocab/namedGraph" }
    );

    expect(Array.from(thing)).toEqual([relevantQuad]);
  });

  it("is able to specify the scope using a Named Node", () => {
    const relevantQuad = getMockQuad({
      subject: "https://some.vocab/subject",
      namedGraph: "https://some.vocab/namedGraph",
    });
    const datasetWithMultipleNamedGraphs = dataset();
    datasetWithMultipleNamedGraphs.add(relevantQuad);
    datasetWithMultipleNamedGraphs.add(
      getMockQuad({
        subject: "https://some.vocab/subject",
        namedGraph: "https://arbitrary-other.vocab/namedGraph",
      })
    );

    const thing = getOneThing(
      datasetWithMultipleNamedGraphs,
      "https://some.vocab/subject",
      { scope: DataFactory.namedNode("https://some.vocab/namedGraph") }
    );

    expect(Array.from(thing)).toEqual([relevantQuad]);
  });
});

describe("getAllThings", () => {
  it("returns multiple Datasets, each with Quads with the same Subject", () => {
    const thing1Quad = getMockQuad({ subject: "https://some.vocab/subject" });
    const thing2Quad = getMockQuad({
      subject: "https://some-other.vocab/subject",
    });
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(thing1Quad);
    datasetWithMultipleThings.add(thing2Quad);

    const things = getAllThings(datasetWithMultipleThings);

    expect(Array.from(things[0])).toEqual([thing1Quad]);
    expect(Array.from(things[1])).toEqual([thing2Quad]);
  });

  it("returns Quads from all Named Graphs if no scope was specified", () => {
    const quadInDefaultGraph = getMockQuad({
      subject: "https://some.vocab/subject",
    });
    const quadInArbitraryGraph = getMockQuad({
      subject: "https://some.vocab/subject",
      namedGraph: "https://arbitrary.vocab/namedGraph",
    });
    const datasetWithMultipleNamedGraphs = dataset();
    datasetWithMultipleNamedGraphs.add(quadInDefaultGraph);
    datasetWithMultipleNamedGraphs.add(quadInArbitraryGraph);

    const things = getAllThings(datasetWithMultipleNamedGraphs);

    expect(Array.from(things[0]).includes(quadInDefaultGraph)).toBe(true);
    expect(Array.from(things[0]).includes(quadInArbitraryGraph)).toBe(true);
  });

  it("is able to limit the Things' scope to a single Named Graph", () => {
    const relevantQuad = getMockQuad({
      subject: "https://some.vocab/subject",
      namedGraph: "https://some.vocab/namedGraph",
    });
    const datasetWithMultipleNamedGraphs = dataset();
    datasetWithMultipleNamedGraphs.add(relevantQuad);
    datasetWithMultipleNamedGraphs.add(
      getMockQuad({
        subject: "https://some.vocab/subject",
        namedGraph: "https://arbitrary-other.vocab/namedGraph",
      })
    );

    const things = getAllThings(datasetWithMultipleNamedGraphs, {
      scope: "https://some.vocab/namedGraph",
    });

    expect(Array.from(things[0])).toEqual([relevantQuad]);
  });

  it("ignores Quads in the default graph when specifying an explicit scope", () => {
    const relevantQuad = getMockQuad({
      subject: "https://some.vocab/subject",
      namedGraph: "https://some.vocab/namedGraph",
    });
    const datasetWithMultipleNamedGraphs = dataset();
    datasetWithMultipleNamedGraphs.add(relevantQuad);
    datasetWithMultipleNamedGraphs.add(
      getMockQuad({
        subject: "https://some.vocab/subject",
        namedGraph: undefined,
      })
    );

    const things = getAllThings(datasetWithMultipleNamedGraphs, {
      scope: "https://some.vocab/namedGraph",
    });

    expect(Array.from(things[0])).toEqual([relevantQuad]);
  });

  it("is able to specify the scope using a Named Node", () => {
    const relevantQuad = getMockQuad({
      subject: "https://some.vocab/subject",
      namedGraph: "https://some.vocab/namedGraph",
    });
    const datasetWithMultipleNamedGraphs = dataset();
    datasetWithMultipleNamedGraphs.add(relevantQuad);
    datasetWithMultipleNamedGraphs.add(
      getMockQuad({
        subject: "https://some.vocab/subject",
        namedGraph: "https://arbitrary-other.vocab/namedGraph",
      })
    );

    const things = getAllThings(datasetWithMultipleNamedGraphs, {
      scope: DataFactory.namedNode("https://some.vocab/namedGraph"),
    });

    expect(Array.from(things[0])).toEqual([relevantQuad]);
  });

  it("only returns Things whose Subject has an IRI, or is a SubjectLocal", () => {
    const quadWithNamedSubject = getMockQuad({
      subject: "https://some.vocab/subject",
    });
    const quadWithBlankSubject = getMockQuad();
    quadWithBlankSubject.subject = DataFactory.blankNode(
      "Arbitrary blank node"
    );
    const quadWithLocalSubject = getMockQuad();
    const localSubject = Object.assign(
      DataFactory.blankNode("Blank node representing a SubjectLocal"),
      { name: "localSubject" }
    );
    quadWithLocalSubject.subject = localSubject;
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(quadWithNamedSubject);
    datasetWithMultipleThings.add(quadWithBlankSubject);
    datasetWithMultipleThings.add(quadWithLocalSubject);

    const things = getAllThings(datasetWithMultipleThings);

    expect(things.length).toBe(2);
    expect(Array.from(things[0])).toEqual([quadWithNamedSubject]);
    expect(Array.from(things[1])).toEqual([quadWithLocalSubject]);
  });
});

describe("asIri", () => {
  it("returns the IRI of a persisted Thing", () => {
    const persistedThing: Thing = Object.assign(dataset(), {
      iri: "https://some.pod/resource#thing",
    });

    expect(asIri(persistedThing)).toBe("https://some.pod/resource#thing");
  });

  it("returns the IRI of a local Thing relative to a given base IRI", () => {
    const localThing = Object.assign(dataset(), { name: "some-name" });

    expect(asIri(localThing, "https://some.pod/resource")).toBe(
      "https://some.pod/resource#some-name"
    );
  });

  it("throws an error when a local Thing was given without a base IRI", () => {
    const localThing = Object.assign(dataset(), { name: "some-name" });

    expect(() => asIri(localThing, undefined as any)).toThrowError(
      "The IRI of a Thing that has not been persisted cannot be determined without a base IRI."
    );
  });
});
