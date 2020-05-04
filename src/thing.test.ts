import {
  getOneThing,
  getAllThings,
  setThing,
  removeThing,
  getOneStringInLocale,
  getOneStringUnlocalised,
  getOneInteger,
  getOneDecimal,
  getOneBoolean,
  getOneDatetime,
  createThing,
  asIri,
  getOneIri,
  getOneLiteral,
  getOneNamedNode,
  getAllIris,
  getAllStringUnlocaliseds,
  getAllStringsInLocale,
  getAllIntegers,
  getAllDecimals,
  getAllBooleans,
  getAllDatetimes,
  getAllLiterals,
  getAllNamedNodes,
  removeIri,
} from "./thing";
import { dataset } from "@rdfjs/dataset";
import { NamedNode, Quad, Literal } from "rdf-js";
import { DataFactory } from "n3";
import {
  IriString,
  Thing,
  ThingLocal,
  ThingPersisted,
  LitDataset,
  MetadataStruct,
  DiffStruct,
} from "./index";

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

  it("accepts a LocalNode as the Subject identifier", () => {
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

  it("only returns Things whose Subject has an IRI, or is a LocalNode", () => {
    const quadWithNamedSubject = getMockQuad({
      subject: "https://some.vocab/subject",
    });
    const quadWithBlankSubject = getMockQuad();
    quadWithBlankSubject.subject = DataFactory.blankNode(
      "Arbitrary blank node"
    );
    const quadWithLocalSubject = getMockQuad();
    const localSubject = Object.assign(
      DataFactory.blankNode("Blank node representing a LocalNode"),
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

describe("setThing", () => {
  it("returns a Dataset with only the Thing's Quads having the Thing's Subject", () => {
    const oldThingQuad = getMockQuad({
      subject: "https://some.vocab/subject",
      object: "https://some.vocab/old-object",
    });
    const otherQuad = getMockQuad({
      subject: "https://arbitrary-other.vocab/subject",
    });
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(oldThingQuad);
    datasetWithMultipleThings.add(otherQuad);

    const newThingQuad = getMockQuad({
      subject: "https://some.vocab/subject",
      object: "https://some.vocab/new-object",
    });
    const newThing: Thing = Object.assign(dataset(), {
      iri: "https://some.vocab/subject",
    });
    newThing.add(newThingQuad);

    const updatedDataset = setThing(datasetWithMultipleThings, newThing);

    expect(Array.from(updatedDataset)).toEqual([otherQuad, newThingQuad]);
  });

  it("keeps track of additions and deletions in the attached diff", () => {
    const oldThingQuad = getMockQuad({
      subject: "https://some.vocab/subject",
      object: "https://some.vocab/old-object",
    });
    const otherQuad = getMockQuad({
      subject: "https://arbitrary-other.vocab/subject",
    });
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(oldThingQuad);
    datasetWithMultipleThings.add(otherQuad);

    const newThingQuad = getMockQuad({
      subject: "https://some.vocab/subject",
      object: "https://some.vocab/new-object",
    });
    const newThing: Thing = Object.assign(dataset(), {
      iri: "https://some.vocab/subject",
    });
    newThing.add(newThingQuad);

    const updatedDataset = setThing(datasetWithMultipleThings, newThing);

    expect(updatedDataset.diff.additions).toEqual([newThingQuad]);
    expect(updatedDataset.diff.deletions).toEqual([oldThingQuad]);
  });

  it("preserves existing diffs", () => {
    const oldThingQuad = getMockQuad({
      subject: "https://some.vocab/subject",
      object: "https://some.vocab/old-object",
    });
    const otherQuad = getMockQuad({
      subject: "https://arbitrary-other.vocab/subject",
    });
    const existingAddition = getMockQuad({
      object: "https://some.vocab/addition-object",
    });
    const existingDeletion = getMockQuad({
      object: "https://some.vocab/deletion-object",
    });
    const datasetWithExistingDiff: LitDataset & DiffStruct = Object.assign(
      dataset(),
      {
        diff: { additions: [existingAddition], deletions: [existingDeletion] },
      }
    );
    datasetWithExistingDiff.add(oldThingQuad);
    datasetWithExistingDiff.add(otherQuad);

    const newThingQuad = getMockQuad({
      subject: "https://some.vocab/subject",
      object: "https://some.vocab/new-object",
    });
    const newThing: Thing = Object.assign(dataset(), {
      iri: "https://some.vocab/subject",
    });
    newThing.add(newThingQuad);

    const updatedDataset = setThing(datasetWithExistingDiff, newThing);

    expect(updatedDataset.diff.additions).toEqual([
      existingAddition,
      newThingQuad,
    ]);
    expect(updatedDataset.diff.deletions).toEqual([
      existingDeletion,
      oldThingQuad,
    ]);
  });

  it("does not modify the original LitDataset", () => {
    const oldThingQuad = getMockQuad({
      subject: "https://some.vocab/subject",
      object: "https://some.vocab/old-object",
    });
    const otherQuad = getMockQuad({
      subject: "https://arbitrary-other.vocab/subject",
    });
    const existingAddition = getMockQuad({
      object: "https://some.vocab/addition-object",
    });
    const existingDeletion = getMockQuad({
      object: "https://some.vocab/deletion-object",
    });
    const datasetWithExistingDiff: LitDataset & DiffStruct = Object.assign(
      dataset(),
      {
        diff: { additions: [existingAddition], deletions: [existingDeletion] },
      }
    );
    datasetWithExistingDiff.add(oldThingQuad);
    datasetWithExistingDiff.add(otherQuad);

    const newThingQuad = getMockQuad({
      subject: "https://some.vocab/subject",
      object: "https://some.vocab/new-object",
    });
    const newThing: Thing = Object.assign(dataset(), {
      iri: "https://some.vocab/subject",
    });
    newThing.add(newThingQuad);

    setThing(datasetWithExistingDiff, newThing);

    expect(Array.from(datasetWithExistingDiff)).toEqual([
      oldThingQuad,
      otherQuad,
    ]);
    expect(datasetWithExistingDiff.diff.additions).toEqual([existingAddition]);
    expect(datasetWithExistingDiff.diff.deletions).toEqual([existingDeletion]);
  });

  it("does not modify Quads with unexpected Subjects", () => {
    const unexpectedQuad = DataFactory.quad(
      DataFactory.variable("Arbitrary unexpected Subject type"),
      DataFactory.namedNode("https://arbitrary.vocab/predicate"),
      DataFactory.namedNode("https://arbitrary.vocab/object")
    );
    const datasetWithUnexpectedQuad = dataset();
    datasetWithUnexpectedQuad.add(unexpectedQuad);

    const thing: Thing = Object.assign(dataset(), {
      iri: "https://arbitrary.vocab/subject",
    });

    const updatedDataset = setThing(datasetWithUnexpectedQuad, thing);

    expect(Array.from(updatedDataset)).toEqual([unexpectedQuad]);
  });

  it("can recognise LocalNodes", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Blank node representing a LocalNode"),
      { name: "localSubject" }
    );
    const mockPredicate = DataFactory.namedNode(
      "https://arbitrary.vocab/predicate"
    );
    const oldThingQuad = DataFactory.quad(
      localSubject,
      mockPredicate,
      DataFactory.namedNode("https://some.vocab/old-object")
    );
    const datasetWithLocalSubject = dataset();
    datasetWithLocalSubject.add(oldThingQuad);

    const newThingQuad = DataFactory.quad(
      localSubject,
      mockPredicate,
      DataFactory.namedNode("https://some.vocab/new-object")
    );
    const newThing: Thing = Object.assign(dataset(), { name: "localSubject" });
    newThing.add(newThingQuad);

    const updatedDataset = setThing(datasetWithLocalSubject, newThing);

    expect(Array.from(updatedDataset)).toEqual([newThingQuad]);
  });

  it("can reconcile new LocalNodes with existing NamedNodes if the LitDataset has a resource IRI attached", () => {
    const oldThingQuad = getMockQuad({
      subject: "https://some.pod/resource#subject",
      object: "https://some.vocab/old-object",
    });
    const datasetWithNamedNode: LitDataset & MetadataStruct = Object.assign(
      dataset(),
      {
        metadata: { fetchedFrom: "https://some.pod/resource" },
      }
    );
    datasetWithNamedNode.add(oldThingQuad);

    const localSubject = Object.assign(
      DataFactory.blankNode("Blank node representing a LocalNode"),
      { name: "subject" }
    );
    const mockPredicate = DataFactory.namedNode(
      "https://arbitrary.vocab/predicate"
    );
    const newThingQuad = DataFactory.quad(
      localSubject,
      mockPredicate,
      DataFactory.namedNode("https://some.vocab/new-object")
    );
    const newThing: Thing = Object.assign(dataset(), { name: "subject" });
    newThing.add(newThingQuad);

    const updatedDataset = setThing(datasetWithNamedNode, newThing);

    expect(Array.from(updatedDataset)).toEqual([newThingQuad]);
  });

  it("can reconcile new NamedNodes with existing LocalNodes if the LitDataset has a resource IRI attached", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Blank node representing a LocalNode"),
      { name: "subject" }
    );
    const mockPredicate = DataFactory.namedNode(
      "https://arbitrary.vocab/predicate"
    );
    const oldThingQuad = DataFactory.quad(
      localSubject,
      mockPredicate,
      DataFactory.namedNode("https://some.vocab/new-object")
    );
    const datasetWithLocalSubject: LitDataset & MetadataStruct = Object.assign(
      dataset(),
      {
        metadata: { fetchedFrom: "https://some.pod/resource" },
      }
    );
    datasetWithLocalSubject.add(oldThingQuad);

    const newThingQuad = getMockQuad({
      subject: "https://some.pod/resource#subject",
      object: "https://some.vocab/old-object",
    });
    const newThing: Thing = Object.assign(dataset(), { name: "subject" });
    newThing.add(newThingQuad);

    const updatedDataset = setThing(datasetWithLocalSubject, newThing);

    expect(Array.from(updatedDataset)).toEqual([newThingQuad]);
  });

  it("only updates LocalNodes if the LitDataset has no known IRI", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Blank node representing a LocalNode"),
      { name: "localSubject" }
    );
    const mockPredicate = DataFactory.namedNode(
      "https://arbitrary.vocab/predicate"
    );
    const oldThingQuad = DataFactory.quad(
      localSubject,
      mockPredicate,
      DataFactory.namedNode("https://some.vocab/old-object")
    );
    const similarSubjectQuad = getMockQuad({
      subject: "https://some.pod/resource#localSubject",
    });
    const datasetWithLocalSubject = dataset();
    datasetWithLocalSubject.add(oldThingQuad);
    datasetWithLocalSubject.add(similarSubjectQuad);

    const newThingQuad = DataFactory.quad(
      localSubject,
      mockPredicate,
      DataFactory.namedNode("https://some.vocab/new-object")
    );
    const newThing: Thing = Object.assign(dataset(), { name: "localSubject" });
    newThing.add(newThingQuad);

    const updatedDataset = setThing(datasetWithLocalSubject, newThing);

    expect(Array.from(updatedDataset)).toEqual([
      similarSubjectQuad,
      newThingQuad,
    ]);
  });
});

describe("removeThing", () => {
  it("returns a Dataset that excludes Quads with the Thing's Subject", () => {
    const thingQuad = getMockQuad({
      subject: "https://some.vocab/subject",
      object: "https://some.vocab/new-object",
    });
    const sameSubjectQuad = getMockQuad({
      subject: "https://some.vocab/subject",
      object: "https://some.vocab/old-object",
    });
    const otherQuad = getMockQuad({
      subject: "https://arbitrary-other.vocab/subject",
    });
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(thingQuad);
    datasetWithMultipleThings.add(sameSubjectQuad);
    datasetWithMultipleThings.add(otherQuad);

    const thing: Thing = Object.assign(dataset(), {
      iri: "https://some.vocab/subject",
    });
    thing.add(thingQuad);

    const updatedDataset = removeThing(datasetWithMultipleThings, thing);

    expect(Array.from(updatedDataset)).toEqual([otherQuad]);
  });

  it("keeps track of deletions in the attached diff", () => {
    const thingQuad = getMockQuad({
      subject: "https://some.vocab/subject",
      object: "https://some.vocab/new-object",
    });
    const sameSubjectQuad = getMockQuad({
      subject: "https://some.vocab/subject",
      object: "https://some.vocab/old-object",
    });
    const otherQuad = getMockQuad({
      subject: "https://arbitrary-other.vocab/subject",
    });
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(thingQuad);
    datasetWithMultipleThings.add(sameSubjectQuad);
    datasetWithMultipleThings.add(otherQuad);

    const thing: Thing = Object.assign(dataset(), {
      iri: "https://some.vocab/subject",
    });
    thing.add(thingQuad);

    const updatedDataset = removeThing(datasetWithMultipleThings, thing);

    expect(updatedDataset.diff.additions).toEqual([]);
    expect(updatedDataset.diff.deletions.length).toBe(2);
    expect(updatedDataset.diff.deletions.includes(sameSubjectQuad)).toBe(true);
    expect(updatedDataset.diff.deletions.includes(thingQuad)).toBe(true);
  });

  it("preserves existing diffs", () => {
    const thingQuad = getMockQuad({
      subject: "https://some.vocab/subject",
      object: "https://some.vocab/new-object",
    });
    const existingAddition = getMockQuad({
      object: "https://some.vocab/addition-object",
    });
    const existingDeletion = getMockQuad({
      object: "https://some.vocab/deletion-object",
    });
    const datasetWithExistingDiff: LitDataset & DiffStruct = Object.assign(
      dataset(),
      {
        diff: { additions: [existingAddition], deletions: [existingDeletion] },
      }
    );
    datasetWithExistingDiff.add(thingQuad);

    const thing: Thing = Object.assign(dataset(), {
      iri: "https://some.vocab/subject",
    });
    thing.add(thingQuad);

    const updatedDataset = removeThing(datasetWithExistingDiff, thing);

    expect(updatedDataset.diff.additions).toEqual([existingAddition]);
    expect(updatedDataset.diff.deletions).toEqual([
      existingDeletion,
      thingQuad,
    ]);
  });

  it("returns a Dataset that excludes Quads with a given Subject IRI", () => {
    const thingQuad = getMockQuad({
      subject: "https://some.vocab/subject",
      object: "https://some.vocab/new-object",
    });
    const otherQuad = getMockQuad({
      subject: "https://arbitrary-other.vocab/subject",
    });
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(thingQuad);
    datasetWithMultipleThings.add(otherQuad);

    const updatedDataset = removeThing(
      datasetWithMultipleThings,
      "https://some.vocab/subject"
    );

    expect(Array.from(updatedDataset)).toEqual([otherQuad]);
    expect(updatedDataset.diff.deletions).toEqual([thingQuad]);
  });

  it("does not modify the original LitDataset", () => {
    const thingQuad = getMockQuad({
      subject: "https://some.vocab/subject",
      object: "https://some.vocab/new-object",
    });
    const otherQuad = getMockQuad({
      subject: "https://arbitrary-other.vocab/subject",
    });
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(thingQuad);
    datasetWithMultipleThings.add(otherQuad);

    removeThing(datasetWithMultipleThings, "https://some.vocab/subject");

    expect(Array.from(datasetWithMultipleThings)).toEqual([
      thingQuad,
      otherQuad,
    ]);
    expect(
      (datasetWithMultipleThings as LitDataset & DiffStruct).diff
    ).toBeUndefined();
  });

  it("does not modify Quads with unexpected Subjects", () => {
    const unexpectedQuad = DataFactory.quad(
      DataFactory.variable("Arbitrary unexpected Subject type"),
      DataFactory.namedNode("https://arbitrary.vocab/predicate"),
      DataFactory.namedNode("https://arbitrary.vocab/object")
    );
    const datasetWithUnexpectedQuad = dataset();
    datasetWithUnexpectedQuad.add(unexpectedQuad);

    const thing: Thing = Object.assign(dataset(), {
      iri: "https://arbitrary.vocab/subject",
    });

    const updatedDataset = removeThing(datasetWithUnexpectedQuad, thing);

    expect(Array.from(updatedDataset)).toEqual([unexpectedQuad]);
  });

  it("returns a Dataset that excludes Quads with a given NamedNode as their Subject", () => {
    const thingQuad = getMockQuad({
      subject: "https://some.vocab/subject",
      object: "https://some.vocab/new-object",
    });
    const otherQuad = getMockQuad({
      subject: "https://arbitrary-other.vocab/subject",
    });
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(thingQuad);
    datasetWithMultipleThings.add(otherQuad);

    const updatedDataset = removeThing(
      datasetWithMultipleThings,
      DataFactory.namedNode("https://some.vocab/subject")
    );

    expect(Array.from(updatedDataset)).toEqual([otherQuad]);
    expect(updatedDataset.diff.deletions).toEqual([thingQuad]);
  });

  it("can recognise LocalNodes", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Blank node representing a LocalNode"),
      { name: "localSubject" }
    );
    const mockPredicate = DataFactory.namedNode(
      "https://arbitrary.vocab/predicate"
    );
    const thingQuad = DataFactory.quad(
      localSubject,
      mockPredicate,
      DataFactory.namedNode("https://some.vocab/old-object")
    );
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(thingQuad);

    const updatedDataset = removeThing(datasetWithMultipleThings, localSubject);

    expect(Array.from(updatedDataset)).toEqual([]);
    expect(updatedDataset.diff.deletions).toEqual([thingQuad]);
  });

  it("can reconcile given LocalNodes with existing NamedNodes if the LitDataset has a resource IRI attached", () => {
    const oldThingQuad = getMockQuad({
      subject: "https://some.pod/resource#subject",
      object: "https://some.vocab/old-object",
    });
    const datasetWithNamedNode: LitDataset & MetadataStruct = Object.assign(
      dataset(),
      {
        metadata: { fetchedFrom: "https://some.pod/resource" },
      }
    );
    datasetWithNamedNode.add(oldThingQuad);

    const localSubject = Object.assign(
      DataFactory.blankNode("Blank node representing a LocalNode"),
      { name: "subject" }
    );

    const updatedDataset = removeThing(datasetWithNamedNode, localSubject);

    expect(Array.from(updatedDataset)).toEqual([]);
  });

  it("can reconcile given NamedNodes with existing LocalNodes if the LitDataset has a resource IRI attached", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Blank node representing a LocalNode"),
      { name: "subject" }
    );
    const mockPredicate = DataFactory.namedNode(
      "https://arbitrary.vocab/predicate"
    );
    const thingQuad = DataFactory.quad(
      localSubject,
      mockPredicate,
      DataFactory.namedNode("https://some.vocab/new-object")
    );
    const datasetWithLocalNode: LitDataset & MetadataStruct = Object.assign(
      dataset(),
      {
        metadata: { fetchedFrom: "https://some.pod/resource" },
      }
    );
    datasetWithLocalNode.add(thingQuad);

    const updatedDataset = removeThing(
      datasetWithLocalNode,
      DataFactory.namedNode("https://some.pod/resource#subject")
    );

    expect(Array.from(updatedDataset)).toEqual([]);
  });

  it("only removes LocalNodes if the LitDataset has no known IRI", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Blank node representing a LocalNode"),
      { name: "localSubject" }
    );
    const mockPredicate = DataFactory.namedNode(
      "https://arbitrary.vocab/predicate"
    );
    const thingQuad = DataFactory.quad(
      localSubject,
      mockPredicate,
      DataFactory.namedNode("https://some.vocab/old-object")
    );
    const similarSubjectQuad = getMockQuad({
      subject: "https://some.pod/resource#localSubject",
    });
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(thingQuad);
    datasetWithMultipleThings.add(similarSubjectQuad);

    const updatedDataset = removeThing(datasetWithMultipleThings, localSubject);

    expect(Array.from(updatedDataset)).toEqual([similarSubjectQuad]);
    expect(updatedDataset.diff.deletions).toEqual([thingQuad]);
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
function getMockThingWithLiteralsFor(
  predicate: IriString,
  literal1Value: string,
  literal2Value: string,
  literalType: "string" | "integer" | "decimal" | "boolean" | "dateTime"
): Thing {
  const quad1 = getMockQuadWithLiteralFor(
    predicate,
    literal1Value,
    literalType
  );
  const quad2 = getMockQuadWithLiteralFor(
    predicate,
    literal2Value,
    literalType
  );
  const thing = dataset();
  thing.add(quad1);
  thing.add(quad2);

  return Object.assign(thing, { iri: "https://arbitrary.vocab/subject" });
}

describe("getOneIri", () => {
  function getMockQuadWithIri(
    predicate: IriString,
    iri: IriString = "https://arbitrary.vocab/object"
  ): Quad {
    const quad = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode(predicate),
      DataFactory.namedNode(iri)
    );
    return quad;
  }
  function getMockThingWithIri(
    predicate: IriString,
    iri: IriString = "https://arbitrary.vocab/object"
  ): Thing {
    const quad = getMockQuadWithIri(predicate, iri);
    const thing = dataset();
    thing.add(quad);

    return Object.assign(thing, { iri: "https://arbitrary.vocab/subject" });
  }

  it("returns the IRI value for the given Predicate", () => {
    const thingWithIri = getMockThingWithIri(
      "https://some.vocab/predicate",
      "https://some.vocab/object"
    );

    expect(getOneIri(thingWithIri, "https://some.vocab/predicate")).toBe(
      "https://some.vocab/object"
    );
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithIri = getMockThingWithIri(
      "https://some.vocab/predicate",
      "https://some.vocab/object"
    );

    expect(
      getOneIri(
        thingWithIri,
        DataFactory.namedNode("https://some.vocab/predicate")
      )
    ).toBe("https://some.vocab/object");
  });

  it("returns null if no IRI value was found", () => {
    const thingWithoutIri = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getOneIri(thingWithoutIri, "https://some.vocab/predicate")
    ).toBeNull();
  });

  it("does not return non-IRI values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );
    thingWithDifferentDatatypes.add(
      getMockQuadWithIri(
        "https://some.vocab/predicate",
        "https://some.vocab/object"
      )
    );
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.vocab/subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.vocab/object")
      )
    );

    expect(
      getOneIri(thingWithDifferentDatatypes, "https://some.vocab/predicate")
    ).toBe("https://some.vocab/object");
  });

  it("returns null if no IRI value was found for the given Predicate", () => {
    const thingWithIri = getMockThingWithIri("https://some.vocab/predicate");

    expect(
      getOneIri(thingWithIri, "https://some-other.vocab/predicate")
    ).toBeNull();
  });
});

describe("getAllIris", () => {
  function getMockQuadWithIri(
    predicate: IriString,
    iri: IriString = "https://arbitrary.vocab/object"
  ): Quad {
    const quad = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode(predicate),
      DataFactory.namedNode(iri)
    );
    return quad;
  }
  function getMockThingWithIris(
    predicate: IriString,
    iri1: IriString = "https://arbitrary.vocab/object1",
    iri2: IriString = "https://arbitrary.vocab/object2"
  ): Thing {
    const quad1 = getMockQuadWithIri(predicate, iri1);
    const quad2 = getMockQuadWithIri(predicate, iri2);
    const thing = dataset();
    thing.add(quad1);
    thing.add(quad2);

    return Object.assign(thing, { iri: "https://arbitrary.vocab/subject" });
  }

  it("returns the IRI values for the given Predicate", () => {
    const thingWithIris = getMockThingWithIris(
      "https://some.vocab/predicate",
      "https://some.vocab/object1",
      "https://some.vocab/object2"
    );

    expect(getAllIris(thingWithIris, "https://some.vocab/predicate")).toEqual([
      "https://some.vocab/object1",
      "https://some.vocab/object2",
    ]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithIris = getMockThingWithIris(
      "https://some.vocab/predicate",
      "https://some.vocab/object1",
      "https://some.vocab/object2"
    );

    expect(
      getAllIris(
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

    expect(
      getAllIris(thingWithoutIris, "https://some.vocab/predicate")
    ).toEqual([]);
  });

  it("does not return non-IRI values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );
    thingWithDifferentDatatypes.add(
      getMockQuadWithIri(
        "https://some.vocab/predicate",
        "https://some.vocab/object"
      )
    );

    expect(
      getAllIris(thingWithDifferentDatatypes, "https://some.vocab/predicate")
    ).toEqual(["https://some.vocab/object"]);
  });

  it("returns an empty array if no IRI value was found for the given Predicate", () => {
    const thingWithIri = getMockThingWithIris("https://some.vocab/predicate");

    expect(
      getAllIris(thingWithIri, "https://some-other.vocab/predicate")
    ).toEqual([]);
  });
});

describe("removeIri", () => {
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
  ): Thing {
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

    const updatedThing = removeIri(
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

    const updatedThing = removeIri(
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

    const updatedThing = removeIri(
      thingWithIri,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/resource#name")
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("removes multiple instances of the same IRI for the same Predicate", () => {
    const thingWithDuplicateIri = getMockThingWithIri(
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );
    thingWithDuplicateIri.add(Array.from(thingWithDuplicateIri)[0]);

    const updatedThing = removeIri(
      thingWithDuplicateIri,
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    expect(Array.from(updatedThing)).toEqual([]);
  });

  it("records the deletion in the diff", () => {
    const thingWithIri = getMockThingWithIri(
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    const updatedThing = removeIri(
      thingWithIri,
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    expect(updatedThing.diff.deletions.length).toBe(1);
    expect(updatedThing.diff.deletions[0].predicate.value).toBe(
      "https://some.vocab/predicate"
    );
    expect(updatedThing.diff.deletions[0].object.value).toBe(
      "https://some.pod/resource#name"
    );
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

    const updatedThing = removeIri(
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

    const updatedThing = removeIri(
      thingWithIri,
      "https://some.vocab/predicate",
      "https://some.pod/resource#name"
    );

    expect(Array.from(updatedThing)).toEqual([mockQuadWithString]);
  });

  it("resolves LocalNodes", () => {
    const localNode = Object.assign(
      DataFactory.blankNode("Blank node representing a LocalNode"),
      { name: "localNode" }
    );
    const quadWithLocalNode = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      localNode
    );
    const datasetWithLocalNode = dataset();
    datasetWithLocalNode.add(quadWithLocalNode);
    const thingWithLocalNode: Thing = Object.assign(datasetWithLocalNode, {
      iri: "https://arbitrary.vocab/subject",
    });

    const updatedThing = removeIri(
      thingWithLocalNode,
      "https://some.vocab/predicate",
      localNode
    );

    expect(Array.from(updatedThing)).toEqual([]);
    expect(updatedThing.diff.deletions).toEqual([quadWithLocalNode]);
  });

  it("can match NamedNodes to LocalNodes on ThingPersisteds", () => {
    const localNode = Object.assign(
      DataFactory.blankNode("Blank node representing a LocalNode"),
      { name: "localNode" }
    );
    const quadWithLocalNode = DataFactory.quad(
      DataFactory.namedNode("https://some.vocab/resource#subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      localNode
    );
    const datasetWithLocalNode = dataset();
    datasetWithLocalNode.add(quadWithLocalNode);
    const thingWithLocalNode: Thing = Object.assign(datasetWithLocalNode, {
      iri: "https://some.vocab/resource#subject",
    });

    const updatedThing = removeIri(
      thingWithLocalNode,
      "https://some.vocab/predicate",
      "https://some.vocab/resource#localNode"
    );

    expect(Array.from(updatedThing)).toEqual([]);
    expect(updatedThing.diff.deletions).toEqual([quadWithLocalNode]);
  });

  const quadWithLocalNode = DataFactory.quad(
    DataFactory.namedNode("https://some.vocab/resource#subject"),
    DataFactory.namedNode("https://some.vocab/predicate"),
    DataFactory.namedNode("https://some.vocab/resource#localNode")
  );
  const datasetWithLocalNode = dataset();
  datasetWithLocalNode.add(quadWithLocalNode);
  const thingWithLocalNode: Thing = Object.assign(datasetWithLocalNode, {
    iri: "https://some.vocab/resource#subject",
  });

  it("can match LocalNodes to NamedNodes on ThingPersisteds", () => {
    const localNode = Object.assign(
      DataFactory.blankNode("Blank node representing a LocalNode"),
      { name: "localNode" }
    );
    const updatedThing = removeIri(
      thingWithLocalNode,
      "https://some.vocab/predicate",
      localNode
    );

    expect(Array.from(updatedThing)).toEqual([]);
    expect(updatedThing.diff.deletions).toEqual([quadWithLocalNode]);
  });
});

describe("getOneStringUnlocalised", () => {
  it("returns the string value for the given Predicate", () => {
    const thingWithStringUnlocalised = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some value",
      "string"
    );

    expect(
      getOneStringUnlocalised(
        thingWithStringUnlocalised,
        "https://some.vocab/predicate"
      )
    ).toBe("Some value");
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithStringUnlocalised = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some value",
      "string"
    );

    expect(
      getOneStringUnlocalised(
        thingWithStringUnlocalised,
        DataFactory.namedNode("https://some.vocab/predicate")
      )
    ).toBe("Some value");
  });

  it("returns null if no string value was found", () => {
    const thingWithoutStringUnlocalised = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getOneStringUnlocalised(
        thingWithoutStringUnlocalised,
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
    thingWithDifferentDatatypes.add(
      getMockQuadWithLiteralFor(
        "https://some.vocab/predicate",
        "Some value",
        "string"
      )
    );
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.vocab/subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.vocab/object")
      )
    );

    expect(
      getOneStringUnlocalised(
        thingWithDifferentDatatypes,
        "https://some.vocab/predicate"
      )
    ).toBe("Some value");
  });

  it("returns null if no string value was found for the given Predicate", () => {
    const thingWithStringUnlocalised = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary value",
      "string"
    );

    expect(
      getOneStringUnlocalised(
        thingWithStringUnlocalised,
        "https://some-other.vocab/predicate"
      )
    ).toBeNull();
  });
});

describe("getAllStringUnlocaliseds", () => {
  it("returns the string values for the given Predicate", () => {
    const thingWithStringUnlocaliseds = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "Some value 1",
      "Some value 2",
      "string"
    );

    expect(
      getAllStringUnlocaliseds(
        thingWithStringUnlocaliseds,
        "https://some.vocab/predicate"
      )
    ).toEqual(["Some value 1", "Some value 2"]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithStringUnlocaliseds = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "Some value 1",
      "Some value 2",
      "string"
    );

    expect(
      getAllStringUnlocaliseds(
        thingWithStringUnlocaliseds,
        DataFactory.namedNode("https://some.vocab/predicate")
      )
    ).toEqual(["Some value 1", "Some value 2"]);
  });

  it("returns an empty array if no string values were found", () => {
    const thingWithoutStringUnlocaliseds = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getAllStringUnlocaliseds(
        thingWithoutStringUnlocaliseds,
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
    thingWithDifferentDatatypes.add(
      getMockQuadWithLiteralFor(
        "https://some.vocab/predicate",
        "Some value",
        "string"
      )
    );
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.vocab/subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.vocab/object")
      )
    );

    expect(
      getAllStringUnlocaliseds(
        thingWithDifferentDatatypes,
        "https://some.vocab/predicate"
      )
    ).toEqual(["Some value"]);
  });

  it("returns an empty array if no string values were found for the given Predicate", () => {
    const thingWithStringUnlocalised = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary value",
      "string"
    );

    expect(
      getAllStringUnlocaliseds(
        thingWithStringUnlocalised,
        "https://some-other.vocab/predicate"
      )
    ).toEqual([]);
  });
});

describe("getOneStringInLocale", () => {
  it("returns the string value for the given Predicate in the given locale", () => {
    const literalWithLocale = DataFactory.literal("Some value", "nl-NL");
    const quad = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      literalWithLocale
    );
    const thing = dataset();
    thing.add(quad);
    const thingWithLocaleString = Object.assign(thing, {
      iri: "https://arbitrary.vocab/subject",
    });

    expect(
      getOneStringInLocale(
        thingWithLocaleString,
        "https://some.vocab/predicate",
        "nl-NL"
      )
    ).toBe("Some value");
  });

  it("accepts Predicates as Named Nodes", () => {
    const literalWithLocale = DataFactory.literal("Some value", "nl-NL");
    const quad = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      literalWithLocale
    );
    const thing = dataset();
    thing.add(quad);
    const thingWithLocaleString = Object.assign(thing, {
      iri: "https://arbitrary.vocab/subject",
    });

    expect(
      getOneStringInLocale(
        thingWithLocaleString,
        DataFactory.namedNode("https://some.vocab/predicate"),
        "nl-NL"
      )
    ).toBe("Some value");
  });

  it("supports matching locales with different casing", () => {
    const literalWithLocale = DataFactory.literal("Some value", "nl-NL");
    const quad = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      literalWithLocale
    );
    const thing = dataset();
    thing.add(quad);
    const thingWithLocaleString = Object.assign(thing, {
      iri: "https://arbitrary.vocab/subject",
    });

    expect(
      getOneStringInLocale(
        thingWithLocaleString,
        "https://some.vocab/predicate",
        "NL-nL"
      )
    ).toBe("Some value");
  });

  it("returns null if no locale string value was found", () => {
    const thingWithoutStringUnlocalised = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getOneStringInLocale(
        thingWithoutStringUnlocalised,
        "https://some.vocab/predicate",
        "nl-NL"
      )
    ).toBeNull();
  });

  it("returns null if no locale string with the requested locale was found", () => {
    const literalWithLocale = DataFactory.literal("Some value", "nl-NL");
    const quad = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      literalWithLocale
    );
    const thing = dataset();
    thing.add(quad);
    const thingWithDifferentLocaleString = Object.assign(thing, {
      iri: "https://arbitrary.vocab/subject",
    });

    expect(
      getOneStringInLocale(
        thingWithDifferentLocaleString,
        "https://some.vocab/predicate",
        "en-GB"
      )
    ).toBeNull();
    expect(
      getOneStringInLocale(
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
    thingWithDifferentDatatypes.add(quadWithLocaleString);
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.vocab/subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.vocab/object")
      )
    );

    expect(
      getOneStringInLocale(
        thingWithDifferentDatatypes,
        "https://some.vocab/predicate",
        "nl-NL"
      )
    ).toBe("Some value");
  });

  it("returns null if no locale string was found for the given Predicate", () => {
    const literalWithLocale = DataFactory.literal("Arbitrary value", "nl-NL");
    const quad = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      literalWithLocale
    );
    const thing = dataset();
    thing.add(quad);
    const thingWithLocaleString = Object.assign(thing, {
      iri: "https://arbitrary.vocab/subject",
    });

    expect(
      getOneStringInLocale(
        thingWithLocaleString,
        "https://some-other.vocab/predicate",
        "nl-NL"
      )
    ).toBeNull();
  });
});

describe("getAllStringsInLocale", () => {
  it("returns the string values for the given Predicate in the given locale", () => {
    const literalWithLocale1 = DataFactory.literal("Some value 1", "nl-NL");
    const quad1 = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      literalWithLocale1
    );
    const literalWithLocale2 = DataFactory.literal("Some value 2", "nl-NL");
    const quad2 = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      literalWithLocale2
    );
    const thing = dataset();
    thing.add(quad1);
    thing.add(quad2);
    const thingWithLocaleStrings = Object.assign(thing, {
      iri: "https://arbitrary.vocab/subject",
    });

    expect(
      getAllStringsInLocale(
        thingWithLocaleStrings,
        "https://some.vocab/predicate",
        "nl-NL"
      )
    ).toEqual(["Some value 1", "Some value 2"]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const literalWithLocale1 = DataFactory.literal("Some value 1", "nl-NL");
    const quad1 = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      literalWithLocale1
    );
    const literalWithLocale2 = DataFactory.literal("Some value 2", "nl-NL");
    const quad2 = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      literalWithLocale2
    );
    const thing = dataset();
    thing.add(quad1);
    thing.add(quad2);
    const thingWithLocaleStrings = Object.assign(thing, {
      iri: "https://arbitrary.vocab/subject",
    });

    expect(
      getAllStringsInLocale(
        thingWithLocaleStrings,
        DataFactory.namedNode("https://some.vocab/predicate"),
        "nl-NL"
      )
    ).toEqual(["Some value 1", "Some value 2"]);
  });

  it("supports matching locales with different casing", () => {
    const literalWithLocale = DataFactory.literal("Some value", "nl-NL");
    const quad = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      literalWithLocale
    );
    const thing = dataset();
    thing.add(quad);
    const thingWithLocaleString = Object.assign(thing, {
      iri: "https://arbitrary.vocab/subject",
    });

    expect(
      getAllStringsInLocale(
        thingWithLocaleString,
        "https://some.vocab/predicate",
        "NL-nL"
      )
    ).toEqual(["Some value"]);
  });

  it("returns an empty array if no locale string values were found", () => {
    const thingWithoutStringUnlocaliseds = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getAllStringsInLocale(
        thingWithoutStringUnlocaliseds,
        "https://some.vocab/predicate",
        "nl-NL"
      )
    ).toEqual([]);
  });

  it("returns an empty array if no locale strings with the requested locale were found", () => {
    const literalWithLocale = DataFactory.literal("Some value", "nl-NL");
    const quad = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      literalWithLocale
    );
    const thing = dataset();
    thing.add(quad);
    const thingWithDifferentLocaleStrings = Object.assign(thing, {
      iri: "https://arbitrary.vocab/subject",
    });

    expect(
      getAllStringsInLocale(
        thingWithDifferentLocaleStrings,
        "https://some.vocab/predicate",
        "en-GB"
      )
    ).toEqual([]);
    expect(
      getAllStringsInLocale(
        thingWithDifferentLocaleStrings,
        "https://some.vocab/predicate",
        "nl"
      )
    ).toEqual([]);
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
    thingWithDifferentDatatypes.add(quadWithLocaleString);
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.vocab/subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.vocab/object")
      )
    );

    expect(
      getAllStringsInLocale(
        thingWithDifferentDatatypes,
        "https://some.vocab/predicate",
        "nl-NL"
      )
    ).toEqual(["Some value"]);
  });

  it("returns an empty array if no locale strings were found for the given Predicate", () => {
    const literalWithLocale = DataFactory.literal("Arbitrary value", "nl-NL");
    const quad = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      literalWithLocale
    );
    const thing = dataset();
    thing.add(quad);
    const thingWithLocaleString = Object.assign(thing, {
      iri: "https://arbitrary.vocab/subject",
    });

    expect(
      getAllStringsInLocale(
        thingWithLocaleString,
        "https://some-other.vocab/predicate",
        "nl-NL"
      )
    ).toEqual([]);
  });
});

describe("getOneStringInLocale", () => {
  it("returns the string value for the given Predicate in the given locale", () => {
    const literalWithLocale = DataFactory.literal("Some value", "nl-NL");
    const quad = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      literalWithLocale
    );
    const thing = dataset();
    thing.add(quad);
    const thingWithLocaleString = Object.assign(thing, {
      iri: "https://arbitrary.vocab/subject",
    });

    expect(
      getOneStringInLocale(
        thingWithLocaleString,
        "https://some.vocab/predicate",
        "nl-NL"
      )
    ).toBe("Some value");
  });

  it("accepts Predicates as Named Nodes", () => {
    const literalWithLocale = DataFactory.literal("Some value", "nl-NL");
    const quad = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      literalWithLocale
    );
    const thing = dataset();
    thing.add(quad);
    const thingWithLocaleString = Object.assign(thing, {
      iri: "https://arbitrary.vocab/subject",
    });

    expect(
      getOneStringInLocale(
        thingWithLocaleString,
        DataFactory.namedNode("https://some.vocab/predicate"),
        "nl-NL"
      )
    ).toBe("Some value");
  });

  it("supports matching locales with different casing", () => {
    const literalWithLocale = DataFactory.literal("Some value", "nl-NL");
    const quad = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      literalWithLocale
    );
    const thing = dataset();
    thing.add(quad);
    const thingWithLocaleString = Object.assign(thing, {
      iri: "https://arbitrary.vocab/subject",
    });

    expect(
      getOneStringInLocale(
        thingWithLocaleString,
        "https://some.vocab/predicate",
        "NL-nL"
      )
    ).toBe("Some value");
  });

  it("returns null if no locale string value was found", () => {
    const thingWithoutStringUnlocalised = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getOneStringInLocale(
        thingWithoutStringUnlocalised,
        "https://some.vocab/predicate",
        "nl-NL"
      )
    ).toBeNull();
  });

  it("returns null if no locale string with the requested locale was found", () => {
    const literalWithLocale = DataFactory.literal("Some value", "nl-NL");
    const quad = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      literalWithLocale
    );
    const thing = dataset();
    thing.add(quad);
    const thingWithDifferentLocaleString = Object.assign(thing, {
      iri: "https://arbitrary.vocab/subject",
    });

    expect(
      getOneStringInLocale(
        thingWithDifferentLocaleString,
        "https://some.vocab/predicate",
        "en-GB"
      )
    ).toBeNull();
    expect(
      getOneStringInLocale(
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
    thingWithDifferentDatatypes.add(quadWithLocaleString);
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.vocab/subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.vocab/object")
      )
    );

    expect(
      getOneStringInLocale(
        thingWithDifferentDatatypes,
        "https://some.vocab/predicate",
        "nl-NL"
      )
    ).toBe("Some value");
  });

  it("returns null if no locale string was found for the given Predicate", () => {
    const literalWithLocale = DataFactory.literal("Arbitrary value", "nl-NL");
    const quad = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode("https://some.vocab/predicate"),
      literalWithLocale
    );
    const thing = dataset();
    thing.add(quad);
    const thingWithLocaleString = Object.assign(thing, {
      iri: "https://arbitrary.vocab/subject",
    });

    expect(
      getOneStringInLocale(
        thingWithLocaleString,
        "https://some-other.vocab/predicate",
        "nl-NL"
      )
    ).toBeNull();
  });
});

describe("getOneInteger", () => {
  it("returns the integer value for the given Predicate", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getOneInteger(thingWithInteger, "https://some.vocab/predicate")
    ).toBe(42);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getOneInteger(
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
      getOneInteger(thingWithoutInteger, "https://some.vocab/predicate")
    ).toBeNull();
  });

  it("does not return non-integer values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary value",
      "string"
    );
    thingWithDifferentDatatypes.add(
      getMockQuadWithLiteralFor("https://some.vocab/predicate", "42", "integer")
    );
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.vocab/subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.vocab/object")
      )
    );

    expect(
      getOneInteger(thingWithDifferentDatatypes, "https://some.vocab/predicate")
    ).toBe(42);
  });

  it("returns null if no integer value was found for the given Predicate", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getOneInteger(thingWithInteger, "https://some-other.vocab/predicate")
    ).toBeNull();
  });
});

describe("getAllIntegers", () => {
  it("returns the integer values for the given Predicate", () => {
    const thingWithIntegers = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "42",
      "1337",
      "integer"
    );

    expect(
      getAllIntegers(thingWithIntegers, "https://some.vocab/predicate")
    ).toEqual([42, 1337]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithIntegers = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "42",
      "1337",
      "integer"
    );

    expect(
      getAllIntegers(
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
      getAllIntegers(thingWithoutIntegers, "https://some.vocab/predicate")
    ).toEqual([]);
  });

  it("does not return non-integer values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary value",
      "string"
    );
    thingWithDifferentDatatypes.add(
      getMockQuadWithLiteralFor("https://some.vocab/predicate", "42", "integer")
    );
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.vocab/subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.vocab/object")
      )
    );

    expect(
      getAllIntegers(
        thingWithDifferentDatatypes,
        "https://some.vocab/predicate"
      )
    ).toEqual([42]);
  });

  it("returns an empty array if no integer values were found for the given Predicate", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "42",
      "integer"
    );

    expect(
      getAllIntegers(thingWithInteger, "https://some-other.vocab/predicate")
    ).toEqual([]);
  });
});

describe("getOneDecimal", () => {
  it("returns the decimal value for the given Predicate", () => {
    const thingWithDecimal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13.37",
      "decimal"
    );

    expect(
      getOneDecimal(thingWithDecimal, "https://some.vocab/predicate")
    ).toBe(13.37);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithDecimal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13.37",
      "decimal"
    );

    expect(
      getOneDecimal(
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
      getOneDecimal(thingWithoutDecimal, "https://some.vocab/predicate")
    ).toBeNull();
  });

  it("does not return non-decimal values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary value",
      "string"
    );
    thingWithDifferentDatatypes.add(
      getMockQuadWithLiteralFor(
        "https://some.vocab/predicate",
        "13.37",
        "decimal"
      )
    );
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.vocab/subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.vocab/object")
      )
    );

    expect(
      getOneDecimal(thingWithDifferentDatatypes, "https://some.vocab/predicate")
    ).toBe(13.37);
  });

  it("returns null if no decimal value was found for the given Predicate", () => {
    const thingWithDecimal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13.37",
      "decimal"
    );

    expect(
      getOneDecimal(thingWithDecimal, "https://some-other.vocab/predicate")
    ).toBeNull();
  });
});

describe("getAllDecimals", () => {
  it("returns the decimal values for the given Predicate", () => {
    const thingWithDecimals = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "13.37",
      "7.2",
      "decimal"
    );

    expect(
      getAllDecimals(thingWithDecimals, "https://some.vocab/predicate")
    ).toEqual([13.37, 7.2]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithDecimals = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "13.37",
      "7.2",
      "decimal"
    );

    expect(
      getAllDecimals(
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
      getAllDecimals(thingWithoutDecimals, "https://some.vocab/predicate")
    ).toEqual([]);
  });

  it("does not return non-decimal values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary value",
      "string"
    );
    thingWithDifferentDatatypes.add(
      getMockQuadWithLiteralFor(
        "https://some.vocab/predicate",
        "13.37",
        "decimal"
      )
    );
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.vocab/subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.vocab/object")
      )
    );

    expect(
      getAllDecimals(
        thingWithDifferentDatatypes,
        "https://some.vocab/predicate"
      )
    ).toEqual([13.37]);
  });

  it("returns an empty array if no decimal values were found for the given Predicate", () => {
    const thingWithDecimal = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "13.37",
      "decimal"
    );

    expect(
      getAllDecimals(thingWithDecimal, "https://some-other.vocab/predicate")
    ).toEqual([]);
  });
});

describe("getOneBoolean", () => {
  it("returns the boolean value for the given Predicate", () => {
    const thingWithBoolean = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1",
      "boolean"
    );

    expect(
      getOneBoolean(thingWithBoolean, "https://some.vocab/predicate")
    ).toBe(true);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithBoolean = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "0",
      "boolean"
    );

    expect(
      getOneBoolean(
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
      getOneBoolean(thingWithoutBoolean, "https://some.vocab/predicate")
    ).toBeNull();
  });

  it("does not return non-boolean values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary value",
      "string"
    );
    thingWithDifferentDatatypes.add(
      getMockQuadWithLiteralFor("https://some.vocab/predicate", "1", "boolean")
    );
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.vocab/subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.vocab/object")
      )
    );

    expect(
      getOneBoolean(thingWithDifferentDatatypes, "https://some.vocab/predicate")
    ).toBe(true);
  });

  it("returns null if no boolean value was found for the given Predicate", () => {
    const thingWithBoolean = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1",
      "boolean"
    );

    expect(
      getOneBoolean(thingWithBoolean, "https://some-other.vocab/predicate")
    ).toBeNull();
  });

  it("returns null if an invalid value, marked as boolean, was found for the given Predicate", () => {
    const thingWithNonBoolean = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Not a boolean",
      "boolean"
    );

    expect(
      getOneBoolean(thingWithNonBoolean, "https://some.vocab/predicate")
    ).toBeNull();
  });
});

describe("getAllBooleans", () => {
  it("returns the boolean values for the given Predicate", () => {
    const thingWithBooleans = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "1",
      "0",
      "boolean"
    );

    expect(
      getAllBooleans(thingWithBooleans, "https://some.vocab/predicate")
    ).toEqual([true, false]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithBooleans = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "1",
      "0",
      "boolean"
    );

    expect(
      getAllBooleans(
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
      getAllBooleans(thingWithoutBooleans, "https://some.vocab/predicate")
    ).toEqual([]);
  });

  it("does not return non-boolean values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary value",
      "string"
    );
    thingWithDifferentDatatypes.add(
      getMockQuadWithLiteralFor("https://some.vocab/predicate", "1", "boolean")
    );
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.vocab/subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.vocab/object")
      )
    );

    expect(
      getAllBooleans(
        thingWithDifferentDatatypes,
        "https://some.vocab/predicate"
      )
    ).toEqual([true]);
  });

  it("returns an empty array if no boolean values were found for the given Predicate", () => {
    const thingWithBoolean = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1",
      "boolean"
    );

    expect(
      getAllBooleans(thingWithBoolean, "https://some-other.vocab/predicate")
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
      getAllBooleans(thingWithNonBoolean, "https://some.vocab/predicate")
    ).toEqual([false]);
  });
});

describe("getOneDatetime", () => {
  it("returns the datetime value for the given Predicate", () => {
    const thingWithDatetime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12T13:37:42Z",
      "dateTime"
    );
    const expectedDate = new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0));

    expect(
      getOneDatetime(thingWithDatetime, "https://some.vocab/predicate")
    ).toEqual(expectedDate);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithDatetime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12T13:37:42Z",
      "dateTime"
    );
    const expectedDate = new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0));

    expect(
      getOneDatetime(
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
      getOneDatetime(thingWithoutDatetime, "https://some.vocab/predicate")
    ).toBeNull();
  });

  it("does not return non-datetime values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary value",
      "string"
    );
    thingWithDifferentDatatypes.add(
      getMockQuadWithLiteralFor(
        "https://some.vocab/predicate",
        "1990-11-12T13:37:42Z",
        "dateTime"
      )
    );
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.vocab/subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.vocab/object")
      )
    );
    const expectedDate = new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0));

    expect(
      getOneDatetime(
        thingWithDifferentDatatypes,
        "https://some.vocab/predicate"
      )
    ).toEqual(expectedDate);
  });

  it("returns null if no datetime value was found for the given Predicate", () => {
    const thingWithDatetime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12T13:37:42Z",
      "dateTime"
    );

    expect(
      getOneDatetime(thingWithDatetime, "https://some-other.vocab/predicate")
    ).toBeNull();
  });

  it("returns null if an invalid value, marked as datetime, was found for the given Predicate", () => {
    const thingWithNonDatetime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Not a datetime",
      "dateTime"
    );

    expect(
      getOneDatetime(thingWithNonDatetime, "https://some.vocab/predicate")
    ).toBeNull();
  });
});

describe("getAllDatetimes", () => {
  it("returns the datetime values for the given Predicate", () => {
    const thingWithDatetimes = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "1955-06-08T13:37:42Z",
      "1990-11-12T13:37:42Z",
      "dateTime"
    );
    const expectedDate1 = new Date(Date.UTC(1955, 5, 8, 13, 37, 42, 0));
    const expectedDate2 = new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0));

    expect(
      getAllDatetimes(thingWithDatetimes, "https://some.vocab/predicate")
    ).toEqual([expectedDate1, expectedDate2]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithDatetimes = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "1955-06-08T13:37:42Z",
      "1990-11-12T13:37:42Z",
      "dateTime"
    );
    const expectedDate1 = new Date(Date.UTC(1955, 5, 8, 13, 37, 42, 0));
    const expectedDate2 = new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0));

    expect(
      getAllDatetimes(
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
      getAllDatetimes(thingWithoutDatetimes, "https://some.vocab/predicate")
    ).toEqual([]);
  });

  it("does not return non-datetime values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary value",
      "string"
    );
    thingWithDifferentDatatypes.add(
      getMockQuadWithLiteralFor(
        "https://some.vocab/predicate",
        "1990-11-12T13:37:42Z",
        "dateTime"
      )
    );
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.vocab/subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.vocab/object")
      )
    );
    const expectedDate = new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0));

    expect(
      getAllDatetimes(
        thingWithDifferentDatatypes,
        "https://some.vocab/predicate"
      )
    ).toEqual([expectedDate]);
  });

  it("returns an empty array if no datetime values were found for the given Predicate", () => {
    const thingWithDatetime = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "1990-11-12T13:37:42Z",
      "dateTime"
    );

    expect(
      getAllDatetimes(thingWithDatetime, "https://some-other.vocab/predicate")
    ).toEqual([]);
  });

  it("does not return invalid values marked as datetime", () => {
    const thingWithNonDatetime = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "Not a datetime",
      "1990-11-12T13:37:42Z",
      "dateTime"
    );

    const expectedDate = new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0));

    expect(
      getAllDatetimes(thingWithNonDatetime, "https://some.vocab/predicate")
    ).toEqual([expectedDate]);
  });
});

describe("getOneLiteral", () => {
  it("returns the Literal for the given Predicate", () => {
    const thingWithLiteral = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const foundLiteral = getOneLiteral(
      thingWithLiteral,
      "https://some.vocab/predicate"
    );
    expect(foundLiteral).not.toBeNull();
    expect((foundLiteral as Literal).termType).toBe("Literal");
    expect((foundLiteral as Literal).value).toBe("Some string");
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithLiteral = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const foundLiteral = getOneLiteral(
      thingWithLiteral,
      DataFactory.namedNode("https://some.vocab/predicate")
    );
    expect(foundLiteral).not.toBeNull();
    expect((foundLiteral as Literal).termType).toBe("Literal");
    expect((foundLiteral as Literal).value).toBe("Some string");
  });

  it("returns null if no Literal value was found", () => {
    const plainDataset = dataset();

    const thingWithoutLiteral: Thing = Object.assign(plainDataset, {
      iri: "https://arbitrary.vocab/subject",
    });

    expect(
      getOneLiteral(thingWithoutLiteral, "https://some.vocab/predicate")
    ).toBeNull();
  });

  it("does not return non-Literal values", () => {
    const thingWithDifferentTermTypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );
    thingWithDifferentTermTypes.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.vocab/subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.vocab/object")
      )
    );

    expect(
      (getOneLiteral(
        thingWithDifferentTermTypes,
        "https://some.vocab/predicate"
      ) as Literal).termType
    ).toBe("Literal");
  });
});

describe("getAllLiterals", () => {
  it("returns the Literals for the given Predicate", () => {
    const thingWithLiterals = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "Some string 1",
      "Some string 2",
      "string"
    );

    const foundLiterals = getAllLiterals(
      thingWithLiterals,
      "https://some.vocab/predicate"
    );
    expect(foundLiterals.length).toBe(2);
    expect((foundLiterals[0] as Literal).termType).toBe("Literal");
    expect((foundLiterals[0] as Literal).value).toBe("Some string 1");
    expect((foundLiterals[1] as Literal).termType).toBe("Literal");
    expect((foundLiterals[1] as Literal).value).toBe("Some string 2");
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithLiterals = getMockThingWithLiteralsFor(
      "https://some.vocab/predicate",
      "Some string 1",
      "Some string 2",
      "string"
    );

    const foundLiterals = getAllLiterals(
      thingWithLiterals,
      DataFactory.namedNode("https://some.vocab/predicate")
    );
    expect(foundLiterals.length).toBe(2);
    expect((foundLiterals[0] as Literal).termType).toBe("Literal");
    expect((foundLiterals[0] as Literal).value).toBe("Some string 1");
    expect((foundLiterals[1] as Literal).termType).toBe("Literal");
    expect((foundLiterals[1] as Literal).value).toBe("Some string 2");
  });

  it("returns an empty array if no Literal values were found", () => {
    const plainDataset = dataset();

    const thingWithoutLiterals: Thing = Object.assign(plainDataset, {
      iri: "https://arbitrary.vocab/subject",
    });

    expect(
      getAllLiterals(thingWithoutLiterals, "https://some.vocab/predicate")
    ).toEqual([]);
  });

  it("does not return non-Literal values", () => {
    const thingWithDifferentTermTypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );
    thingWithDifferentTermTypes.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.vocab/subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.vocab/object")
      )
    );

    const foundLiterals = getAllLiterals(
      thingWithDifferentTermTypes,
      "https://some.vocab/predicate"
    );

    expect(foundLiterals.length).toBe(1);
    expect(foundLiterals[0].termType).toBe("Literal");
  });
});

describe("getOneNamedNode", () => {
  function getMockThingWithNamedNode(
    predicate: IriString,
    object: IriString
  ): Thing {
    const plainDataset = dataset();
    const quad = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode(predicate),
      DataFactory.namedNode(object)
    );
    plainDataset.add(quad);

    const thing: Thing = Object.assign(plainDataset, {
      iri: "https://arbitrary.vocab/subject",
    });
    return thing;
  }

  it("returns the Named Node for the given Predicate", () => {
    const thingWithNamedNode = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.vocab/object"
    );

    const foundNamedNode = getOneNamedNode(
      thingWithNamedNode,
      "https://some.vocab/predicate"
    );
    expect(foundNamedNode).not.toBeNull();
    expect((foundNamedNode as NamedNode).termType).toBe("NamedNode");
    expect((foundNamedNode as NamedNode).value).toBe(
      "https://some.vocab/object"
    );
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithNamedNode = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.vocab/object"
    );

    const foundNamedNode = getOneNamedNode(
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
    const plainDataset = dataset();

    const thingWithoutNamedNode: Thing = Object.assign(plainDataset, {
      iri: "https://arbitrary.vocab/subject",
    });

    expect(
      getOneNamedNode(thingWithoutNamedNode, "https://some.vocab/predicate")
    ).toBeNull();
  });

  it("does not return non-NamedNode values", () => {
    const thingWithDifferentTermTypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );
    thingWithDifferentTermTypes.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.vocab/subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.vocab/object")
      )
    );

    expect(
      (getOneNamedNode(
        thingWithDifferentTermTypes,
        "https://some.vocab/predicate"
      ) as NamedNode).termType
    ).toBe("NamedNode");
  });
});

describe("getAllNamedNodes", () => {
  function getMockThingWithNamedNodes(
    predicate: IriString,
    object1: IriString,
    object2: IriString
  ): Thing {
    const plainDataset = dataset();
    const quad1 = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode(predicate),
      DataFactory.namedNode(object1)
    );
    const quad2 = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.vocab/subject"),
      DataFactory.namedNode(predicate),
      DataFactory.namedNode(object2)
    );
    plainDataset.add(quad1);
    plainDataset.add(quad2);

    const thing: Thing = Object.assign(plainDataset, {
      iri: "https://arbitrary.vocab/subject",
    });
    return thing;
  }

  it("returns the Named Nodes for the given Predicate", () => {
    const thingWithNamedNodes = getMockThingWithNamedNodes(
      "https://some.vocab/predicate",
      "https://some.vocab/object1",
      "https://some.vocab/object2"
    );

    const foundNamedNodes = getAllNamedNodes(
      thingWithNamedNodes,
      "https://some.vocab/predicate"
    );
    expect(foundNamedNodes.length).toBe(2);
    expect(foundNamedNodes[0].termType).toBe("NamedNode");
    expect(foundNamedNodes[0].value).toBe("https://some.vocab/object1");
    expect(foundNamedNodes[1].termType).toBe("NamedNode");
    expect(foundNamedNodes[1].value).toBe("https://some.vocab/object2");
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithNamedNodes = getMockThingWithNamedNodes(
      "https://some.vocab/predicate",
      "https://some.vocab/object1",
      "https://some.vocab/object2"
    );

    const foundNamedNodes = getAllNamedNodes(
      thingWithNamedNodes,
      DataFactory.namedNode("https://some.vocab/predicate")
    );
    expect(foundNamedNodes.length).toBe(2);
    expect(foundNamedNodes[0].termType).toBe("NamedNode");
    expect(foundNamedNodes[0].value).toBe("https://some.vocab/object1");
    expect(foundNamedNodes[1].termType).toBe("NamedNode");
    expect(foundNamedNodes[1].value).toBe("https://some.vocab/object2");
  });

  it("returns an empty array if no Named Node values were found", () => {
    const plainDataset = dataset();

    const thingWithoutNamedNodes: Thing = Object.assign(plainDataset, {
      iri: "https://arbitrary.vocab/subject",
    });

    expect(
      getAllNamedNodes(thingWithoutNamedNodes, "https://some.vocab/predicate")
    ).toEqual([]);
  });

  it("does not return non-NamedNode values", () => {
    const thingWithDifferentTermTypes = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );
    thingWithDifferentTermTypes.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.vocab/subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.vocab/object")
      )
    );

    const foundNamedNodes = getAllNamedNodes(
      thingWithDifferentTermTypes,
      "https://some.vocab/predicate"
    );
    expect(foundNamedNodes.length).toBe(1);
    expect(foundNamedNodes[0].termType).toBe("NamedNode");
  });
});
