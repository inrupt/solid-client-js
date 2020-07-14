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
import { NamedNode } from "rdf-js";
// import { DataFactory } from "n3";
import { DataFactory } from "./rdfjs";
import {
  getThingOne,
  getThingAll,
  setThing,
  removeThing,
  createThing,
  asUrl,
  toNode,
} from "./thing";
import {
  IriString,
  Thing,
  ThingLocal,
  ThingPersisted,
  LitDataset,
  WithResourceInfo,
  WithChangeLog,
  LocalNode,
  unstable_WithAcl,
  unstable_AclDataset,
  stringAsIri,
} from "./interfaces";
import { INRUPT_TEST_IRI } from "./GENERATED/INRUPT_TEST_IRI";

function getMockQuad(
  terms: Partial<{
    subject: IriString;
    predicate: IriString;
    object: IriString;
    namedGraph: IriString;
  }> = {}
) {
  const subject: NamedNode = terms.subject ?? INRUPT_TEST_IRI.arbitrarySubject;
  const predicate: NamedNode =
    terms.predicate ?? INRUPT_TEST_IRI.arbitraryPredicate;
  const object: NamedNode = terms.object ?? INRUPT_TEST_IRI.arbitraryObject;
  const namedGraph: NamedNode | undefined = terms.namedGraph
    ? terms.namedGraph
    : undefined;
  return DataFactory.quad(subject, predicate, object, namedGraph);
}

describe("createThing", () => {
  it("automatically generates a unique name for the Thing", () => {
    const thing1: ThingLocal = createThing();
    const thing2: ThingLocal = createThing();

    expect(typeof thing1.localSubject.name).toEqual("string");
    expect(thing1.localSubject.name.length).toBeGreaterThan(0);
    expect(thing1.localSubject.name).not.toEqual(thing2.localSubject.name);
  });

  it("uses the given name, if any", () => {
    const thing: ThingLocal = createThing({ name: "some-name" });

    expect(thing.localSubject.name).toEqual("some-name");
  });

  it("uses the given IRI, if any", () => {
    const thing: ThingPersisted = createThing({
      url: stringAsIri("https://some.pod/resource#thing"),
    });

    expect(thing.url).toEqual(stringAsIri("https://some.pod/resource#thing"));
  });

  it("throws an error if the given URL is invalid", () => {
    expect(() => createThing({ url: stringAsIri("Invalid IRI") })).toThrow();
  });
});

describe("getThingOne", () => {
  it("returns a Dataset with just Quads in there with the given Subject", () => {
    const relevantQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
    });
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(relevantQuad);
    datasetWithMultipleThings.add(
      getMockQuad({ subject: INRUPT_TEST_IRI.arbitraryOtherSubject })
    );

    const thing = getThingOne(
      datasetWithMultipleThings,
      INRUPT_TEST_IRI.arbitrarySubject
    );

    expect(Array.from(thing)).toEqual([relevantQuad]);
  });

  it("accepts a Named Node as the Subject identifier", () => {
    const relevantQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
    });
    const datasetWithAThing = dataset();
    datasetWithAThing.add(relevantQuad);

    const thing = getThingOne(
      datasetWithAThing,
      INRUPT_TEST_IRI.arbitrarySubject
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
      subject: INRUPT_TEST_IRI.arbitrarySubject,
    });
    const quadInArbitraryGraph = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      namedGraph: INRUPT_TEST_IRI.arbitraryNamedGraph,
    });
    const datasetWithMultipleNamedGraphs = dataset();
    datasetWithMultipleNamedGraphs.add(quadInDefaultGraph);
    datasetWithMultipleNamedGraphs.add(quadInArbitraryGraph);

    const thing = getThingOne(
      datasetWithMultipleNamedGraphs,
      INRUPT_TEST_IRI.arbitrarySubject
    );

    expect(thing.size).toEqual(2);
    expect(Array.from(thing)).toContain(quadInDefaultGraph);
    expect(Array.from(thing)).toContain(quadInArbitraryGraph);
  });

  it("is able to limit the Thing's scope to a single Named Graph", () => {
    const relevantQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      namedGraph: INRUPT_TEST_IRI.arbitraryNamedGraph,
    });
    const datasetWithMultipleNamedGraphs = dataset();
    datasetWithMultipleNamedGraphs.add(relevantQuad);
    datasetWithMultipleNamedGraphs.add(
      getMockQuad({
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        namedGraph: INRUPT_TEST_IRI.arbitraryOtherNamedGraph,
      })
    );

    const thing = getThingOne(
      datasetWithMultipleNamedGraphs,
      INRUPT_TEST_IRI.arbitrarySubject,
      { scope: INRUPT_TEST_IRI.arbitraryNamedGraph }
    );

    expect(Array.from(thing)).toEqual([relevantQuad]);
  });

  it("ignores Quads in the default graph when specifying an explicit scope", () => {
    const relevantQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      namedGraph: INRUPT_TEST_IRI.arbitraryNamedGraph,
    });
    const datasetWithMultipleNamedGraphs = dataset();
    datasetWithMultipleNamedGraphs.add(relevantQuad);
    datasetWithMultipleNamedGraphs.add(
      getMockQuad({
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        namedGraph: undefined,
      })
    );

    const thing = getThingOne(
      datasetWithMultipleNamedGraphs,
      INRUPT_TEST_IRI.arbitrarySubject,
      { scope: INRUPT_TEST_IRI.arbitraryNamedGraph }
    );

    expect(Array.from(thing)).toEqual([relevantQuad]);
  });

  it("is able to specify the scope using a Named Node", () => {
    const relevantQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      namedGraph: INRUPT_TEST_IRI.arbitraryNamedGraph,
    });
    const datasetWithMultipleNamedGraphs = dataset();
    datasetWithMultipleNamedGraphs.add(relevantQuad);
    datasetWithMultipleNamedGraphs.add(
      getMockQuad({
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        namedGraph: INRUPT_TEST_IRI.arbitraryOtherNamedGraph,
      })
    );

    const thing = getThingOne(
      datasetWithMultipleNamedGraphs,
      INRUPT_TEST_IRI.arbitrarySubject,
      { scope: INRUPT_TEST_IRI.arbitraryNamedGraph }
    );

    expect(Array.from(thing)).toEqual([relevantQuad]);
  });
});

describe("getThingAll", () => {
  it("returns multiple Datasets, each with Quads with the same Subject", () => {
    const thing1Quad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
    });
    const thing2Quad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitraryOtherSubject,
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
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/object1"),
    });
    const thing1Quad2 = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/object2"),
    });
    const thing2Quad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitraryOtherSubject,
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
      subject: INRUPT_TEST_IRI.arbitrarySubject,
    });
    const quadInArbitraryGraph = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      namedGraph: INRUPT_TEST_IRI.arbitraryNamedGraph,
    });
    const datasetWithMultipleNamedGraphs = dataset();
    datasetWithMultipleNamedGraphs.add(quadInDefaultGraph);
    datasetWithMultipleNamedGraphs.add(quadInArbitraryGraph);

    const things = getThingAll(datasetWithMultipleNamedGraphs);

    expect(Array.from(things[0])).toContain(quadInDefaultGraph);
    expect(Array.from(things[0])).toContain(quadInArbitraryGraph);
  });

  it("is able to limit the Things' scope to a single Named Graph", () => {
    const relevantQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      namedGraph: INRUPT_TEST_IRI.arbitraryNamedGraph,
    });
    const datasetWithMultipleNamedGraphs = dataset();
    datasetWithMultipleNamedGraphs.add(relevantQuad);
    datasetWithMultipleNamedGraphs.add(
      getMockQuad({
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        namedGraph: INRUPT_TEST_IRI.arbitraryOtherNamedGraph,
      })
    );

    const things = getThingAll(datasetWithMultipleNamedGraphs, {
      scope: INRUPT_TEST_IRI.arbitraryNamedGraph,
    });

    expect(Array.from(things[0])).toEqual([relevantQuad]);
  });

  it("ignores Quads in the default graph when specifying an explicit scope", () => {
    const relevantQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      namedGraph: INRUPT_TEST_IRI.arbitraryNamedGraph,
    });
    const datasetWithMultipleNamedGraphs = dataset();
    datasetWithMultipleNamedGraphs.add(relevantQuad);
    datasetWithMultipleNamedGraphs.add(
      getMockQuad({
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        namedGraph: undefined,
      })
    );

    const things = getThingAll(datasetWithMultipleNamedGraphs, {
      scope: INRUPT_TEST_IRI.arbitraryNamedGraph,
    });

    expect(Array.from(things[0])).toEqual([relevantQuad]);
  });

  it("is able to specify the scope using a Named Node", () => {
    const relevantQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      namedGraph: INRUPT_TEST_IRI.arbitraryNamedGraph,
    });
    const datasetWithMultipleNamedGraphs = dataset();
    datasetWithMultipleNamedGraphs.add(relevantQuad);
    datasetWithMultipleNamedGraphs.add(
      getMockQuad({
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        namedGraph: INRUPT_TEST_IRI.arbitraryOtherNamedGraph,
      })
    );

    const things = getThingAll(datasetWithMultipleNamedGraphs, {
      scope: INRUPT_TEST_IRI.arbitraryNamedGraph,
    });

    expect(Array.from(things[0])).toEqual([relevantQuad]);
  });

  it("only returns Things whose Subject has an IRI, or is a LocalNode", () => {
    const quadWithNamedSubject = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
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
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/old-object"),
    });
    const otherQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitraryOtherSubject,
    });
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(oldThingQuad);
    datasetWithMultipleThings.add(otherQuad);

    const newThingQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/new-object"),
    });
    const newThing: Thing = Object.assign(dataset(), {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });
    newThing.add(newThingQuad);

    const updatedDataset = setThing(datasetWithMultipleThings, newThing);

    expect(Array.from(updatedDataset)).toEqual([otherQuad, newThingQuad]);
  });

  it("keeps track of additions and deletions in the attached change log", () => {
    const oldThingQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/old-object"),
    });
    const otherQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitraryOtherSubject,
    });
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(oldThingQuad);
    datasetWithMultipleThings.add(otherQuad);

    const newThingQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/new-object"),
    });
    const newThing: Thing = Object.assign(dataset(), {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });
    newThing.add(newThingQuad);

    const updatedDataset = setThing(datasetWithMultipleThings, newThing);

    expect(updatedDataset.changeLog.additions).toEqual([newThingQuad]);
    expect(updatedDataset.changeLog.deletions).toEqual([oldThingQuad]);
  });

  it("reconciles deletions and additions in the change log", () => {
    const oldThingQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/old-object"),
    });
    const otherQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitraryOtherSubject,
    });
    const addedQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/previously-added-object"),
    });
    const deletedQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/previously-deleted-object"),
    });
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(oldThingQuad);
    datasetWithMultipleThings.add(otherQuad);
    datasetWithMultipleThings.add(addedQuad);
    const datasetWithExistingChangeLog = Object.assign(
      datasetWithMultipleThings,
      {
        changeLog: {
          additions: [addedQuad],
          deletions: [deletedQuad],
        },
      }
    );

    const newThingQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/new-object"),
    });
    const newThing: Thing = Object.assign(dataset(), {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });
    newThing.add(newThingQuad);
    newThing.add(deletedQuad);

    const updatedDataset = setThing(datasetWithExistingChangeLog, newThing);

    expect(updatedDataset.changeLog.additions).toEqual([newThingQuad]);
    expect(updatedDataset.changeLog.deletions).toEqual([oldThingQuad]);
  });

  it("preserves existing change logs", () => {
    const oldThingQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/old-object"),
    });
    const otherQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitraryOtherSubject,
    });
    const existingAddition = getMockQuad({
      object: stringAsIri("https://some.vocab/addition-object"),
    });
    const existingDeletion = getMockQuad({
      object: stringAsIri("https://some.vocab/deletion-object"),
    });
    const datasetWithExistingChangeLog: LitDataset &
      WithChangeLog = Object.assign(dataset(), {
      changeLog: {
        additions: [existingAddition],
        deletions: [existingDeletion],
      },
    });
    datasetWithExistingChangeLog.add(oldThingQuad);
    datasetWithExistingChangeLog.add(otherQuad);

    const newThingQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/new-object"),
    });
    const newThing: Thing = Object.assign(dataset(), {
      url: INRUPT_TEST_IRI.arbitrarySubject,
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
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/old-object"),
    });
    const otherQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitraryOtherSubject,
    });
    const existingAddition = getMockQuad({
      object: stringAsIri("https://some.vocab/addition-object"),
    });
    const existingDeletion = getMockQuad({
      object: stringAsIri("https://some.vocab/deletion-object"),
    });
    const datasetWithExistingChangeLog: LitDataset &
      WithChangeLog = Object.assign(dataset(), {
      changeLog: {
        additions: [existingAddition],
        deletions: [existingDeletion],
      },
    });
    datasetWithExistingChangeLog.add(oldThingQuad);
    datasetWithExistingChangeLog.add(otherQuad);

    const newThingQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/new-object"),
    });
    const newThing: Thing = Object.assign(dataset(), {
      url: INRUPT_TEST_IRI.arbitrarySubject,
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
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const datasetWithUnexpectedQuad = dataset();
    datasetWithUnexpectedQuad.add(unexpectedQuad);

    const thing: Thing = Object.assign(dataset(), {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });

    const updatedDataset = setThing(datasetWithUnexpectedQuad, thing);

    expect(Array.from(updatedDataset)).toEqual([unexpectedQuad]);
  });

  it("can recognise LocalNodes", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Blank node representing a LocalNode"),
      { name: "localSubject" }
    );
    const oldThingQuad = DataFactory.quad(
      localSubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      stringAsIri("https://some.vocab/old-object")
    );
    const datasetWithLocalSubject = dataset();
    datasetWithLocalSubject.add(oldThingQuad);

    const newThingQuad = DataFactory.quad(
      localSubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      stringAsIri("https://some.vocab/new-object")
    );
    const newThing: Thing = Object.assign(dataset(), {
      localSubject: localSubject,
    });
    newThing.add(newThingQuad);

    const updatedDataset = setThing(datasetWithLocalSubject, newThing);

    expect(Array.from(updatedDataset)).toEqual([newThingQuad]);
  });

  it("can reconcile new LocalNodes with existing NamedNodes if the LitDataset has a resource IRI attached", () => {
    // We need the subject of our quad to be a hash-something IRI relative to
    // our resource.
    const subject = INRUPT_TEST_IRI.somePodResourceHashSomeSubject;

    const oldThingQuad = getMockQuad({
      subject: subject,
      object: stringAsIri("https://some.vocab/old-object"),
    });
    const datasetWithNamedNode: LitDataset & WithResourceInfo = Object.assign(
      dataset(),
      {
        resourceInfo: {
          fetchedFrom: INRUPT_TEST_IRI.somePodResource,
          isLitDataset: true,
        },
      }
    );
    datasetWithNamedNode.add(oldThingQuad);

    const localSubject = Object.assign(
      DataFactory.blankNode("Blank node representing a LocalNode"),
      { name: INRUPT_TEST_IRI.hashSomeSubject }
    );
    const newThingQuad = DataFactory.quad(
      localSubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      stringAsIri("https://some.vocab/new-object")
    );
    const newThing: Thing = Object.assign(dataset(), {
      localSubject: localSubject,
    });
    newThing.add(newThingQuad);

    const updatedDataset = setThing(datasetWithNamedNode, newThing);

    expect(Array.from(updatedDataset)).toEqual([newThingQuad]);
  });

  it("can reconcile new NamedNodes with existing LocalNodes if the LitDataset has a resource IRI attached", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Blank node representing a LocalNode"),
      { name: "subject" }
    );
    const oldThingQuad = DataFactory.quad(
      localSubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      stringAsIri("https://some.vocab/new-object")
    );
    const datasetWithLocalSubject: LitDataset &
      WithResourceInfo = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
      },
    });
    datasetWithLocalSubject.add(oldThingQuad);

    const newThingQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/old-object"),
    });
    const newThing: Thing = Object.assign(dataset(), {
      localSubject: localSubject,
    });
    newThing.add(newThingQuad);

    const updatedDataset = setThing(datasetWithLocalSubject, newThing);

    expect(Array.from(updatedDataset)).toEqual([newThingQuad]);
  });

  it("only updates LocalNodes if the LitDataset has no known IRI", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Blank node representing a LocalNode"),
      { name: "localSubject" }
    );
    const oldThingQuad = DataFactory.quad(
      localSubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      stringAsIri("https://some.vocab/old-object")
    );
    const similarSubjectQuad = getMockQuad({
      subject: stringAsIri("https://some.pod/resource#localSubject"),
    });
    const datasetWithLocalSubject = dataset();
    datasetWithLocalSubject.add(oldThingQuad);
    datasetWithLocalSubject.add(similarSubjectQuad);

    const newThingQuad = DataFactory.quad(
      localSubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      stringAsIri("https://some.vocab/new-object")
    );
    const newThing: Thing = Object.assign(dataset(), {
      localSubject: localSubject,
    });
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
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/new-object"),
    });
    const sameSubjectQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/old-object"),
    });
    const otherQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitraryOtherSubject,
    });
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(thingQuad);
    datasetWithMultipleThings.add(sameSubjectQuad);
    datasetWithMultipleThings.add(otherQuad);

    const thing: Thing = Object.assign(dataset(), {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });
    thing.add(thingQuad);

    const updatedDataset = removeThing(datasetWithMultipleThings, thing);

    expect(Array.from(updatedDataset)).toEqual([otherQuad]);
  });

  it("keeps track of deletions in the attached change log", () => {
    const thingQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/new-object"),
    });
    const sameSubjectQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/old-object"),
    });
    const otherQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitraryOtherSubject,
    });
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(thingQuad);
    datasetWithMultipleThings.add(sameSubjectQuad);
    datasetWithMultipleThings.add(otherQuad);

    const thing: Thing = Object.assign(dataset(), {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });
    thing.add(thingQuad);

    const updatedDataset = removeThing(datasetWithMultipleThings, thing);

    expect(updatedDataset.changeLog.additions).toEqual([]);
    expect(updatedDataset.changeLog.deletions).toHaveLength(2);
    expect(updatedDataset.changeLog.deletions).toContain(sameSubjectQuad);
    expect(updatedDataset.changeLog.deletions).toContain(thingQuad);
  });

  it("reconciles deletions in the change log with additions", () => {
    const thingQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/new-object"),
    });
    const sameSubjectQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/old-object"),
    });
    const otherQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitraryOtherSubject,
    });
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(thingQuad);
    datasetWithMultipleThings.add(sameSubjectQuad);
    datasetWithMultipleThings.add(otherQuad);
    const datasetWithChangelog = Object.assign(datasetWithMultipleThings, {
      changeLog: {
        additions: [thingQuad],
        deletions: [],
      },
    });

    const thing: Thing = Object.assign(dataset(), {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });
    thing.add(thingQuad);

    const updatedDataset = removeThing(datasetWithChangelog, thing);

    expect(updatedDataset.changeLog.additions).toEqual([]);
    expect(updatedDataset.changeLog.deletions).toHaveLength(1);
    expect(updatedDataset.changeLog.deletions).toContain(sameSubjectQuad);
  });

  it("preserves existing change logs", () => {
    const thingQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/new-object"),
    });
    const existingAddition = getMockQuad({
      object: stringAsIri("https://some.vocab/addition-object"),
    });
    const existingDeletion = getMockQuad({
      object: stringAsIri("https://some.vocab/deletion-object"),
    });
    const datasetWithExistingChangeLog: LitDataset &
      WithChangeLog = Object.assign(dataset(), {
      changeLog: {
        additions: [existingAddition],
        deletions: [existingDeletion],
      },
    });
    datasetWithExistingChangeLog.add(thingQuad);

    const thing: Thing = Object.assign(dataset(), {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });
    thing.add(thingQuad);

    const updatedDataset = removeThing(datasetWithExistingChangeLog, thing);

    expect(updatedDataset.changeLog.additions).toEqual([existingAddition]);
    expect(updatedDataset.changeLog.deletions).toEqual([
      existingDeletion,
      thingQuad,
    ]);
  });

  it("preserves attached ACLs", () => {
    const thingQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/new-object"),
    });
    const datasetWithFetchedAcls: LitDataset & unstable_WithAcl = Object.assign(
      dataset(),
      {
        acl: {
          resourceAcl: null,
          fallbackAcl: null,
        },
      }
    );
    datasetWithFetchedAcls.add(thingQuad);

    const thing: Thing = Object.assign(dataset(), {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });
    thing.add(thingQuad);

    const updatedDataset = removeThing(datasetWithFetchedAcls, thing);

    expect(updatedDataset.acl).toEqual({
      resourceAcl: null,
      fallbackAcl: null,
    });
  });

  it("preserves metadata on ACL Datasets", () => {
    const thingQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/new-object"),
    });
    const aclDataset: unstable_AclDataset = Object.assign(dataset(), {
      accessTo: INRUPT_TEST_IRI.somePodResource,
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
    });
    aclDataset.add(thingQuad);

    const thing: Thing = Object.assign(dataset(), {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });
    thing.add(thingQuad);

    const updatedDataset = removeThing(aclDataset, thing);

    expect(updatedDataset.accessTo).toEqual(INRUPT_TEST_IRI.somePodResource);
    expect(updatedDataset.resourceInfo).toEqual({
      fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
      isLitDataset: true,
    });
  });

  it("returns a Dataset that excludes Quads with a given Subject IRI", () => {
    const thingQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/new-object"),
    });
    const otherQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitraryOtherSubject,
    });
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(thingQuad);
    datasetWithMultipleThings.add(otherQuad);

    const updatedDataset = removeThing(
      datasetWithMultipleThings,
      INRUPT_TEST_IRI.arbitrarySubject
    );

    expect(Array.from(updatedDataset)).toEqual([otherQuad]);
    expect(updatedDataset.changeLog.deletions).toEqual([thingQuad]);
  });

  it("does not modify the original LitDataset", () => {
    const thingQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/new-object"),
    });
    const otherQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitraryOtherSubject,
    });
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(thingQuad);
    datasetWithMultipleThings.add(otherQuad);

    removeThing(datasetWithMultipleThings, INRUPT_TEST_IRI.arbitrarySubject);

    expect(Array.from(datasetWithMultipleThings)).toEqual([
      thingQuad,
      otherQuad,
    ]);
    expect(
      (datasetWithMultipleThings as LitDataset & WithChangeLog).changeLog
    ).toBeUndefined();
  });

  it("does not modify Quads with unexpected Subjects", () => {
    const unexpectedQuad = DataFactory.quad(
      DataFactory.variable("Arbitrary unexpected Subject type"),
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const datasetWithUnexpectedQuad = dataset();
    datasetWithUnexpectedQuad.add(unexpectedQuad);

    const thing: Thing = Object.assign(dataset(), {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });

    const updatedDataset = removeThing(datasetWithUnexpectedQuad, thing);

    expect(Array.from(updatedDataset)).toEqual([unexpectedQuad]);
  });

  it("returns a Dataset that excludes Quads with a given NamedNode as their Subject", () => {
    const thingQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitrarySubject,
      object: stringAsIri("https://some.vocab/new-object"),
    });
    const otherQuad = getMockQuad({
      subject: INRUPT_TEST_IRI.arbitraryOtherSubject,
    });
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(thingQuad);
    datasetWithMultipleThings.add(otherQuad);

    const updatedDataset = removeThing(
      datasetWithMultipleThings,
      INRUPT_TEST_IRI.arbitrarySubject
    );

    expect(Array.from(updatedDataset)).toEqual([otherQuad]);
    expect(updatedDataset.changeLog.deletions).toEqual([thingQuad]);
  });

  it("can recognise LocalNodes", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Blank node representing a LocalNode"),
      { name: "localSubject" }
    );
    const thingQuad = DataFactory.quad(
      localSubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      stringAsIri("https://some.vocab/old-object")
    );
    const datasetWithMultipleThings = dataset();
    datasetWithMultipleThings.add(thingQuad);

    const updatedDataset = removeThing(datasetWithMultipleThings, localSubject);

    expect(Array.from(updatedDataset)).toEqual([]);
    expect(updatedDataset.changeLog.deletions).toEqual([thingQuad]);
  });

  it("can reconcile given LocalNodes with existing NamedNodes if the LitDataset has a resource IRI attached", () => {
    const oldThingQuad = getMockQuad({
      // We need the subject of our quad to be a hash-something IRI relative to
      // our resource.
      subject: INRUPT_TEST_IRI.somePodResourceHashSomeSubject,
      object: stringAsIri("https://some.vocab/old-object"),
    });
    const datasetWithNamedNode: LitDataset & WithResourceInfo = Object.assign(
      dataset(),
      {
        resourceInfo: {
          fetchedFrom: INRUPT_TEST_IRI.somePodResource,
          isLitDataset: true,
        },
      }
    );
    datasetWithNamedNode.add(oldThingQuad);

    const localSubject = Object.assign(
      DataFactory.blankNode("Blank node representing a LocalNode"),
      { name: INRUPT_TEST_IRI.hashSomeSubject }
    );

    const updatedDataset = removeThing(datasetWithNamedNode, localSubject);

    expect(Array.from(updatedDataset)).toEqual([]);
  });

  it("can reconcile given NamedNodes with existing LocalNodes if the LitDataset has a resource IRI attached", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Blank node representing a LocalNode"),
      { name: INRUPT_TEST_IRI.hashSomeSubject }
    );
    const thingQuad = DataFactory.quad(
      localSubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      stringAsIri("https://some.vocab/new-object")
    );
    const datasetWithLocalNode: LitDataset & WithResourceInfo = Object.assign(
      dataset(),
      {
        resourceInfo: {
          fetchedFrom: INRUPT_TEST_IRI.somePodResource,
          isLitDataset: true,
        },
      }
    );
    datasetWithLocalNode.add(thingQuad);

    // We need the subject of our quad to be a hash-something IRI relative to
    // our resource.
    const subject = INRUPT_TEST_IRI.somePodResourceHashSomeSubject;

    const updatedDataset = removeThing(datasetWithLocalNode, subject);

    expect(Array.from(updatedDataset)).toEqual([]);
  });

  it("only removes LocalNodes if the LitDataset has no known IRI", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Blank node representing a LocalNode"),
      { name: "localSubject" }
    );
    const thingQuad = DataFactory.quad(
      localSubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      stringAsIri("https://some.vocab/old-object")
    );
    const similarSubjectQuad = getMockQuad({
      subject: stringAsIri("https://some.pod/resource#localSubject"),
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
      url: stringAsIri("https://some.pod/resource#thing"),
    });

    expect(asUrl(persistedThing)).toEqual(
      stringAsIri("https://some.pod/resource#thing")
    );
  });

  it("returns the IRI of a local Thing relative to a given base IRI", () => {
    const localSubject: LocalNode = Object.assign(DataFactory.blankNode(), {
      name: "some-name",
    });
    const localThing = Object.assign(dataset(), { localSubject: localSubject });

    expect(asUrl(localThing, INRUPT_TEST_IRI.somePodResource).value).toEqual(
      `${INRUPT_TEST_IRI.somePodResource.value}#some-name`
    );
  });

  it("throws an error when a local Thing was given without a base IRI", () => {
    const localSubject: LocalNode = Object.assign(DataFactory.blankNode(), {
      name: "some-name",
    });
    const localThing = Object.assign(dataset(), { localSubject: localSubject });

    expect(() => asUrl(localThing, undefined as any)).toThrow(
      "The URL of a Thing that has not been persisted cannot be determined without a base URL."
    );
  });
});

describe("toNode", () => {
  it("should result in equal LocalNodes for the same ThingLocal", () => {
    const localSubject: LocalNode = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
    );
    const thing: ThingLocal = Object.assign(dataset(), {
      localSubject: localSubject,
    });
    const node1 = toNode(thing);
    const node2 = toNode(thing);
    expect(node1.equals(node2)).toEqual(true);
  });
});
