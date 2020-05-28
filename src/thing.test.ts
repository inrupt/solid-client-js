import { describe, it, expect } from "@jest/globals";
import { dataset } from "@rdfjs/dataset";
import { NamedNode } from "rdf-js";
import { DataFactory } from "n3";
import {
  getThingOne,
  getThingAll,
  setThing,
  removeThing,
  createThing,
  asIri,
} from "./thing";
import {
  IriString,
  Thing,
  ThingLocal,
  ThingPersisted,
  LitDataset,
  DatasetInfo,
  ChangeLog,
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

describe("getThingOne", () => {
  it("returns a Dataset with just Quads in there with the given Subject", () => {
    const relevantQuad = getMockQuad({ subject: "https://some.vocab/subject" });
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(relevantQuad);
    datasetWithMultipleThings.add(
      getMockQuad({ subject: "https://arbitrary-other.vocab/subject" })
    );

    const thing = getThingOne(
      datasetWithMultipleThings,
      "https://some.vocab/subject"
    );

    expect(Array.from(thing)).toEqual([relevantQuad]);
  });

  it("accepts a Named Node as the Subject identifier", () => {
    const relevantQuad = getMockQuad({ subject: "https://some.vocab/subject" });
    const datasetWithAThing = dataset();
    datasetWithAThing.add(relevantQuad);

    const thing = getThingOne(
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

    const thing = getThingOne(datasetWithThingLocal, localSubject);

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

    const thing = getThingOne(
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

    const thing = getThingOne(
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

    const thing = getThingOne(
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

    const thing = getThingOne(
      datasetWithMultipleNamedGraphs,
      "https://some.vocab/subject",
      { scope: DataFactory.namedNode("https://some.vocab/namedGraph") }
    );

    expect(Array.from(thing)).toEqual([relevantQuad]);
  });
});

describe("getThingAll", () => {
  it("returns multiple Datasets, each with Quads with the same Subject", () => {
    const thing1Quad = getMockQuad({ subject: "https://some.vocab/subject" });
    const thing2Quad = getMockQuad({
      subject: "https://some-other.vocab/subject",
    });
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(thing1Quad);
    datasetWithMultipleThings.add(thing2Quad);

    const things = getThingAll(datasetWithMultipleThings);

    expect(Array.from(things[0])).toEqual([thing1Quad]);
    expect(Array.from(things[1])).toEqual([thing2Quad]);
  });

  it("returns one Thing per unique Subject", () => {
    const thing1Quad1 = getMockQuad({
      subject: "https://some.vocab/subject",
      object: "https://some.vocab/object1",
    });
    const thing1Quad2 = getMockQuad({
      subject: "https://some.vocab/subject",
      object: "https://some.vocab/object2",
    });
    const thing2Quad = getMockQuad({
      subject: "https://some-other.vocab/subject",
    });
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(thing1Quad1);
    datasetWithMultipleThings.add(thing1Quad2);
    datasetWithMultipleThings.add(thing2Quad);

    const things = getThingAll(datasetWithMultipleThings);

    expect(things).toHaveLength(2);
    expect(Array.from(things[0])).toEqual([thing1Quad1, thing1Quad2]);
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

    const things = getThingAll(datasetWithMultipleNamedGraphs);

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

    const things = getThingAll(datasetWithMultipleNamedGraphs, {
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

    const things = getThingAll(datasetWithMultipleNamedGraphs, {
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

    const things = getThingAll(datasetWithMultipleNamedGraphs, {
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

    const things = getThingAll(datasetWithMultipleThings);

    expect(things).toHaveLength(2);
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

  it("keeps track of additions and deletions in the attached change log", () => {
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

    expect(updatedDataset.changeLog.additions).toEqual([newThingQuad]);
    expect(updatedDataset.changeLog.deletions).toEqual([oldThingQuad]);
  });

  it("preserves existing change logs", () => {
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
    const datasetWithExistingChangeLog: LitDataset & ChangeLog = Object.assign(
      dataset(),
      {
        changeLog: {
          additions: [existingAddition],
          deletions: [existingDeletion],
        },
      }
    );
    datasetWithExistingChangeLog.add(oldThingQuad);
    datasetWithExistingChangeLog.add(otherQuad);

    const newThingQuad = getMockQuad({
      subject: "https://some.vocab/subject",
      object: "https://some.vocab/new-object",
    });
    const newThing: Thing = Object.assign(dataset(), {
      iri: "https://some.vocab/subject",
    });
    newThing.add(newThingQuad);

    const updatedDataset = setThing(datasetWithExistingChangeLog, newThing);

    expect(updatedDataset.changeLog.additions).toEqual([
      existingAddition,
      newThingQuad,
    ]);
    expect(updatedDataset.changeLog.deletions).toEqual([
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
    const datasetWithExistingChangeLog: LitDataset & ChangeLog = Object.assign(
      dataset(),
      {
        changeLog: {
          additions: [existingAddition],
          deletions: [existingDeletion],
        },
      }
    );
    datasetWithExistingChangeLog.add(oldThingQuad);
    datasetWithExistingChangeLog.add(otherQuad);

    const newThingQuad = getMockQuad({
      subject: "https://some.vocab/subject",
      object: "https://some.vocab/new-object",
    });
    const newThing: Thing = Object.assign(dataset(), {
      iri: "https://some.vocab/subject",
    });
    newThing.add(newThingQuad);

    setThing(datasetWithExistingChangeLog, newThing);

    expect(Array.from(datasetWithExistingChangeLog)).toEqual([
      oldThingQuad,
      otherQuad,
    ]);
    expect(datasetWithExistingChangeLog.changeLog.additions).toEqual([
      existingAddition,
    ]);
    expect(datasetWithExistingChangeLog.changeLog.deletions).toEqual([
      existingDeletion,
    ]);
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
    const datasetWithNamedNode: LitDataset & DatasetInfo = Object.assign(
      dataset(),
      {
        datasetInfo: { fetchedFrom: "https://some.pod/resource" },
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
    const datasetWithLocalSubject: LitDataset & DatasetInfo = Object.assign(
      dataset(),
      {
        datasetInfo: { fetchedFrom: "https://some.pod/resource" },
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

  it("keeps track of deletions in the attached change log", () => {
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

    expect(updatedDataset.changeLog.additions).toEqual([]);
    expect(updatedDataset.changeLog.deletions).toHaveLength(2);
    expect(updatedDataset.changeLog.deletions.includes(sameSubjectQuad)).toBe(
      true
    );
    expect(updatedDataset.changeLog.deletions.includes(thingQuad)).toBe(true);
  });

  it("preserves existing change logs", () => {
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
    const datasetWithExistingChangeLog: LitDataset & ChangeLog = Object.assign(
      dataset(),
      {
        changeLog: {
          additions: [existingAddition],
          deletions: [existingDeletion],
        },
      }
    );
    datasetWithExistingChangeLog.add(thingQuad);

    const thing: Thing = Object.assign(dataset(), {
      iri: "https://some.vocab/subject",
    });
    thing.add(thingQuad);

    const updatedDataset = removeThing(datasetWithExistingChangeLog, thing);

    expect(updatedDataset.changeLog.additions).toEqual([existingAddition]);
    expect(updatedDataset.changeLog.deletions).toEqual([
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
    expect(updatedDataset.changeLog.deletions).toEqual([thingQuad]);
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
      (datasetWithMultipleThings as LitDataset & ChangeLog).changeLog
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
    expect(updatedDataset.changeLog.deletions).toEqual([thingQuad]);
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
    expect(updatedDataset.changeLog.deletions).toEqual([thingQuad]);
  });

  it("can reconcile given LocalNodes with existing NamedNodes if the LitDataset has a resource IRI attached", () => {
    const oldThingQuad = getMockQuad({
      subject: "https://some.pod/resource#subject",
      object: "https://some.vocab/old-object",
    });
    const datasetWithNamedNode: LitDataset & DatasetInfo = Object.assign(
      dataset(),
      {
        datasetInfo: { fetchedFrom: "https://some.pod/resource" },
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
    const datasetWithLocalNode: LitDataset & DatasetInfo = Object.assign(
      dataset(),
      {
        datasetInfo: { fetchedFrom: "https://some.pod/resource" },
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
    expect(updatedDataset.changeLog.deletions).toEqual([thingQuad]);
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
