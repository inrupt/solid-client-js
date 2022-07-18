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

import { DataFactory } from "n3";
import { dataset } from "@rdfjs/dataset";
import {
  getThing,
  getThingAll,
  setThing,
  removeThing,
  createThing,
  asUrl,
  isThing,
  thingAsMarkdown,
  ThingExpectedError,
  ValidThingUrlExpectedError,
  ValidPropertyUrlExpectedError,
  ValidValueUrlExpectedError,
} from "./thing";
import { internal_throwIfNotThing } from "./thing.internal";
import {
  Thing,
  ThingLocal,
  ThingPersisted,
  SolidDataset,
  SolidClientError,
  WithServerResourceInfo,
} from "../interfaces";
import { createSolidDataset } from "../resource/solidDataset";
import { mockThingFrom } from "./mock";
import {
  addStringNoLocale,
  addInteger,
  addStringWithLocale,
  addIri,
  addBoolean,
  addDatetime,
  addDecimal,
} from "./add";
import { WithAcl } from "../acl/acl";
import { mockSolidDatasetFrom } from "../resource/mock";
import { internal_setAcl } from "../acl/acl.internal";
import { LocalNodeIri, localNodeSkolemPrefix } from "../rdf.internal";

describe("createThing", () => {
  it("automatically generates a unique name for the Thing", () => {
    const thing1: ThingLocal = createThing();
    const thing2: ThingLocal = createThing();

    expect(typeof thing1.url).toBe("string");
    expect(thing1.url.length).toBeGreaterThan(localNodeSkolemPrefix.length);
    expect(thing1.url).not.toBe(thing2.url);
  });

  it("uses the given name, if any", () => {
    const thing: ThingLocal = createThing({ name: "some-name" });

    expect(thing.url).toBe(`${localNodeSkolemPrefix}some-name`);
  });

  it("uses the given IRI, if any", () => {
    const thing: ThingPersisted = createThing({
      url: "https://some.pod/resource#thing",
    });

    expect(thing.url).toBe("https://some.pod/resource#thing");
  });

  it("throws an error if the given URL is invalid", () => {
    expect(() => createThing({ url: "Invalid IRI" })).toThrow();
  });
});

describe("isThing", () => {
  it("returns true for a ThingLocal", () => {
    expect(isThing(createThing())).toBe(true);
  });

  it("returns true for a ThingPersisted", () => {
    expect(isThing(mockThingFrom("https://arbitrary.pod/resource#thing"))).toBe(
      true
    );
  });

  it("returns false for an atomic data type", () => {
    expect(isThing("This is not a Thing")).toBe(false);
  });

  it("returns false for a regular JavaScript object", () => {
    expect(isThing({ not: "a Thing" })).toBe(false);
  });

  it("returns false for a plain RDF/JS Dataset", () => {
    expect(isThing(dataset())).toBe(false);
  });

  it("returns false for a SolidDataset", () => {
    expect(isThing(createSolidDataset())).toBe(false);
  });
});

describe("getThing", () => {
  const mockThing1Iri = "https://some.pod/resource#subject1";
  const mockThing2Iri = "https://some.pod/resource#subject2";
  const otherGraphIri = "https://some.vocab/graph";
  const mockThing1: ThingPersisted = {
    type: "Subject",
    url: mockThing1Iri,
    predicates: {
      "https://arbitrary.vocab/predicate": {
        namedNodes: ["https://arbitrary.vocab/predicate"],
      },
    },
  };
  const mockThing2: ThingPersisted = {
    type: "Subject",
    url: mockThing2Iri,
    predicates: {
      "https://arbitrary.vocab/predicate": {
        namedNodes: ["https://arbitrary.vocab/predicate"],
      },
    },
  };
  const mockLocalThingIri =
    `${localNodeSkolemPrefix}localSubject` as LocalNodeIri;
  const mockLocalThing: ThingLocal = {
    type: "Subject",
    url: mockLocalThingIri,
    predicates: {
      "https://arbitrary.vocab/predicate": {
        namedNodes: ["https://arbitrary.vocab/predicate"],
      },
    },
  };
  function getMockDataset(
    things = [mockThing1, mockThing2],
    otherGraphThings = [mockThing1]
  ): SolidDataset {
    const solidDataset: SolidDataset = {
      type: "Dataset",
      graphs: {
        default: {},
        [otherGraphIri]: {},
      },
    };
    things.forEach((thing) => {
      // The assertion allows writing to what we've declared to be a read-only property:
      (solidDataset.graphs.default[thing.url] as any) = thing;
    });
    otherGraphThings.forEach((thing) => {
      // The assertion allows writing to what we've declared to be a read-only property:
      (solidDataset.graphs[otherGraphIri][thing.url] as any) = thing;
    });
    return solidDataset;
  }

  it("returns a Dataset with just Quads in there with the given Subject", () => {
    const thing = getThing(getMockDataset(), mockThing1Iri);

    expect(thing).toStrictEqual(mockThing1);
  });

  it("accepts a Named Node as the Subject identifier", () => {
    const thing = getThing(
      getMockDataset(),
      DataFactory.namedNode(mockThing1Iri)
    );

    expect(thing).toStrictEqual(mockThing1);
  });

  it("accepts a LocalNode as the Subject identifier", () => {
    const thing = getThing(
      getMockDataset([mockLocalThing]),
      DataFactory.namedNode(mockLocalThingIri)
    );

    expect(thing).toStrictEqual(mockLocalThing);
  });

  it("returns null if the given SolidDataset does not include Quads with the given Subject", () => {
    const thing = getThing(
      getMockDataset([]),
      "https://arbitrary.vocab/subject"
    );

    expect(thing).toBeNull();
  });

  it("accepts a LocalNode as the Subject identifier even for Things with resolved IRIs", () => {
    const mockDataset = getMockDataset([mockThing1]);
    const mockDatasetWithResourceInfo: SolidDataset & WithServerResourceInfo = {
      ...mockDataset,
      internal_resourceInfo: {
        isRawData: false,
        linkedResources: {},
        sourceIri: mockThing1Iri.substring(
          0,
          mockThing1Iri.length - "subject1".length
        ),
      },
    };
    const thing = getThing(
      mockDatasetWithResourceInfo,
      `${localNodeSkolemPrefix}subject1`
    );

    expect(thing).toStrictEqual(mockThing1);
  });

  it("only returns Quads from the default graph if no scope was specified", () => {
    expect(
      getThing(getMockDataset([mockThing1], [mockThing2]), mockThing2Iri)
    ).toBeNull();
    expect(
      getThing(getMockDataset([mockThing1], [mockThing2]), mockThing1Iri)
    ).toStrictEqual(mockThing1);
  });

  it("is able to limit the Thing's scope to a single Named Graph", () => {
    expect(
      getThing(getMockDataset([mockThing1], [mockThing2]), mockThing2Iri, {
        scope: otherGraphIri,
      })
    ).toStrictEqual(mockThing2);
  });

  it("is able to specify the scope using a Named Node", () => {
    expect(
      getThing(getMockDataset([mockThing1], [mockThing2]), mockThing2Iri, {
        scope: DataFactory.namedNode(otherGraphIri),
      })
    ).toStrictEqual(mockThing2);
  });

  it("returns null if the given scope does not include the requested Thing", () => {
    expect(
      getThing(getMockDataset([mockThing1], [mockThing2]), mockThing1Iri, {
        scope: otherGraphIri,
      })
    ).toBeNull();
  });

  it("returns null if the given scope does not include any Things", () => {
    expect(
      getThing(getMockDataset([mockThing1], [mockThing2]), mockThing2Iri, {
        scope: "https://arbitrary.vocab/other-graph",
      })
    ).toBeNull();
  });

  it("throws an error when given an invalid URL", () => {
    expect(() => getThing(getMockDataset(), "not-a-url")).toThrow(
      "Expected a valid URL to identify a Thing, but received: [not-a-url]."
    );
  });

  it("throws an instance of ThingUrlExpectedError on invalid URLs", () => {
    let thrownError;
    try {
      getThing(getMockDataset(), "not-a-url");
    } catch (e) {
      thrownError = e;
    }

    expect(thrownError).toBeInstanceOf(ValidThingUrlExpectedError);
  });
});

describe("getThingAll", () => {
  const mockThing1Iri = "https://some.vocab/subject1";
  const mockThing2Iri = "https://some.vocab/subject2";
  const otherGraphIri = "https://some.vocab/graph";
  const mockThing1: ThingPersisted = {
    type: "Subject",
    url: mockThing1Iri,
    predicates: {
      "https://arbitrary.vocab/predicate": {
        namedNodes: ["https://arbitrary.vocab/predicate"],
      },
    },
  };
  const mockThing2: ThingPersisted = {
    type: "Subject",
    url: mockThing2Iri,
    predicates: {
      "https://arbitrary.vocab/predicate": {
        namedNodes: ["https://arbitrary.vocab/predicate"],
      },
    },
  };
  function getMockDataset(
    things = [mockThing1, mockThing2],
    otherGraphThings = [mockThing1]
  ): SolidDataset {
    const solidDataset: SolidDataset = {
      type: "Dataset",
      graphs: {
        default: {},
        [otherGraphIri]: {},
      },
    };
    things.forEach((thing) => {
      // The assertion allows writing to what we've declared to be a read-only property:
      (solidDataset.graphs.default[thing.url] as any) = thing;
    });
    otherGraphThings.forEach((thing) => {
      // The assertion allows writing to what we've declared to be a read-only property:
      (solidDataset.graphs[otherGraphIri][thing.url] as any) = thing;
    });
    return solidDataset;
  }

  it("returns the individual Things", () => {
    const things = getThingAll(getMockDataset([mockThing1, mockThing2]));

    expect(things).toStrictEqual([mockThing1, mockThing2]);
  });

  it("does not return Things with a Blank Node as the Subject by default", () => {
    const mockDataset = getMockDataset([mockThing1]);
    const blankNode = {
      predicates: {
        "https://arbitrary.predicate": {
          namedNodes: ["https://arbitrary.value"],
        },
      },
      type: "Subject",
      url: "_:blankNodeId",
    };
    (mockDataset.graphs.default["_:blankNodeId"] as any) = blankNode;
    const things = getThingAll(mockDataset);

    expect(things).toHaveLength(1);
    expect(things).toStrictEqual([mockThing1]);
  });

  it("returns Things with a Blank Node as the Subject if specified", () => {
    const mockDataset = getMockDataset([mockThing1]);
    const blankNode = {
      predicates: {
        "https://arbitrary.predicate": {
          namedNodes: ["https://arbitrary.value"],
        },
      },
      type: "Subject",
      url: "_:blankNodeId",
    };
    (mockDataset.graphs.default["_:blankNodeId"] as any) = blankNode;
    const things = getThingAll(mockDataset, { acceptBlankNodes: true });

    expect(things).toHaveLength(2);
    expect(things).toStrictEqual([mockThing1, blankNode]);
  });

  it("returns Quads from the default Graphs if no scope was specified", () => {
    const things = getThingAll(getMockDataset([mockThing1], [mockThing2]));

    expect(things).toStrictEqual([mockThing1]);
  });

  it("ignores Quads in the default graph when specifying an explicit scope", () => {
    const things = getThingAll(getMockDataset([mockThing1], [mockThing2]), {
      scope: otherGraphIri,
    });

    expect(things).toStrictEqual([mockThing2]);
  });

  it("is able to specify the scope using a Named Node", () => {
    const things = getThingAll(getMockDataset([mockThing1], [mockThing2]), {
      scope: DataFactory.namedNode(otherGraphIri),
    });

    expect(things).toStrictEqual([mockThing2]);
  });

  it("returns an empty array if the given scope does not include any Things", () => {
    const things = getThingAll(getMockDataset([mockThing1], [mockThing2]), {
      scope: "https://arbitrary.vocab/other-graph",
    });

    expect(things).toStrictEqual([]);
  });
});

describe("setThing", () => {
  const mockThing1Iri = "https://some.vocab/subject1";
  const mockThing2Iri = "https://some.vocab/subject2";
  const mockThing1: ThingPersisted = {
    type: "Subject",
    url: mockThing1Iri,
    predicates: {
      "https://arbitrary.vocab/predicate": {
        namedNodes: ["https://arbitrary.vocab/predicate"],
      },
    },
  };
  const mockThing2: ThingPersisted = {
    type: "Subject",
    url: mockThing2Iri,
    predicates: {
      "https://arbitrary.vocab/predicate": {
        namedNodes: ["https://arbitrary.vocab/predicate"],
      },
    },
  };
  function getMockDataset(things = [mockThing1, mockThing2]): SolidDataset {
    const solidDataset: SolidDataset = {
      type: "Dataset",
      graphs: {
        default: {},
      },
    };
    things.forEach((thing) => {
      // The assertion allows writing to what we've declared to be a read-only property:
      (solidDataset.graphs.default[thing.url] as any) = thing;
    });
    return solidDataset;
  }

  it("returns a Dataset with the new Thing added to it", () => {
    const datasetWithExistingThings = getMockDataset([mockThing1]);

    const updatedDataset = setThing(datasetWithExistingThings, mockThing2);

    expect(updatedDataset.graphs).toStrictEqual(
      getMockDataset([mockThing1, mockThing2]).graphs
    );
  });

  it("keeps track of additions and deletions in the attached change log", () => {
    const datasetWithExistingThings = getMockDataset([mockThing1]);

    const updatedDataset = setThing(datasetWithExistingThings, mockThing2);

    expect(updatedDataset.internal_changeLog.additions).toHaveLength(1);
    expect(updatedDataset.internal_changeLog.deletions).toHaveLength(0);
    expect(updatedDataset.internal_changeLog.additions[0].subject.value).toBe(
      mockThing2Iri
    );
  });

  it("reconciles deletions and additions in the change log", () => {
    const datasetWithExistingThings = getMockDataset([mockThing1, mockThing2]);

    const datasetWithThing2Removed = removeThing(
      datasetWithExistingThings,
      mockThing2
    );

    expect(datasetWithThing2Removed.internal_changeLog.additions).toHaveLength(
      0
    );
    expect(datasetWithThing2Removed.internal_changeLog.deletions).toHaveLength(
      1
    );

    const datasetWithThing2AddedAgain = setThing(
      datasetWithThing2Removed,
      mockThing2
    );

    expect(
      datasetWithThing2AddedAgain.internal_changeLog.additions
    ).toHaveLength(0);
    expect(
      datasetWithThing2AddedAgain.internal_changeLog.deletions
    ).toHaveLength(0);
  });

  it("preserves existing change logs", () => {
    const datasetWithoutThings = getMockDataset([]);

    const datasetWithThing1Added = setThing(datasetWithoutThings, mockThing1);

    expect(datasetWithThing1Added.internal_changeLog.additions).toHaveLength(1);
    expect(datasetWithThing1Added.internal_changeLog.deletions).toHaveLength(0);

    const datasetWithThing2AddedToo = setThing(
      datasetWithThing1Added,
      mockThing2
    );

    expect(datasetWithThing2AddedToo.internal_changeLog.additions).toHaveLength(
      2
    );
    expect(datasetWithThing2AddedToo.internal_changeLog.deletions).toHaveLength(
      0
    );
  });

  it("does not modify the original SolidDataset", () => {
    const datasetWithExistingThings = getMockDataset([mockThing1]);

    const updatedDataset = setThing(datasetWithExistingThings, mockThing2);

    expect(updatedDataset).not.toStrictEqual(datasetWithExistingThings);
  });

  it("can reconcile new LocalNodes with existing NamedNodes if the SolidDataset has a resource IRI attached", () => {
    let solidDataset = mockSolidDatasetFrom("https://some.pod/resource");
    const originalThing: ThingPersisted = {
      type: "Subject",
      url: "https://some.pod/resource#subjectName",
      predicates: {
        "https://arbitrary.predicate": {
          namedNodes: ["https://arbitrary.value"],
        },
      },
    };
    solidDataset = setThing(solidDataset, originalThing);

    const updatedThing: ThingLocal = {
      type: "Subject",
      url: `${localNodeSkolemPrefix}subjectName` as LocalNodeIri,
      predicates: {
        "https://some.predicate": {
          namedNodes: ["https://some.value"],
        },
      },
    };
    const updatedDataset = setThing(solidDataset, updatedThing);

    expect(
      getThing(updatedDataset, "https://some.pod/resource#subjectName")
        ?.predicates
    ).toStrictEqual(updatedThing.predicates);
  });

  it("only updates LocalNodes if the SolidDataset has no known IRI", () => {
    let solidDataset = createSolidDataset();
    const originalThing: ThingPersisted = {
      type: "Subject",
      url: "https://some.pod/resource#subjectName",
      predicates: {
        "https://arbitrary.predicate": {
          namedNodes: ["https://arbitrary.value"],
        },
      },
    };
    solidDataset = setThing(solidDataset, originalThing);

    const updatedThing: ThingLocal = {
      type: "Subject",
      url: `${localNodeSkolemPrefix}subjectName` as LocalNodeIri,
      predicates: {
        "https://some.predicate": {
          namedNodes: ["https://some.value"],
        },
      },
    };
    const updatedDataset = setThing(solidDataset, updatedThing);

    expect(
      getThing(updatedDataset, "https://some.pod/resource#subjectName")
    ).toStrictEqual(originalThing);
  });
});

describe("removeThing", () => {
  const mockThing1Iri = "https://some.vocab/subject1";
  const mockThing2Iri = "https://some.vocab/subject2";
  const mockThing1: ThingPersisted = {
    type: "Subject",
    url: mockThing1Iri,
    predicates: {
      "https://arbitrary.vocab/predicate": {
        namedNodes: ["https://arbitrary.vocab/predicate"],
      },
    },
  };
  const mockThing2: ThingPersisted = {
    type: "Subject",
    url: mockThing2Iri,
    predicates: {
      "https://arbitrary.vocab/predicate": {
        namedNodes: ["https://arbitrary.vocab/predicate"],
      },
    },
  };
  const mockLocalThingIri =
    `${localNodeSkolemPrefix}localSubject` as LocalNodeIri;
  const mockLocalThing: ThingLocal = {
    type: "Subject",
    url: mockLocalThingIri,
    predicates: {
      "https://arbitrary.vocab/predicate": {
        namedNodes: ["https://arbitrary.vocab/predicate"],
      },
    },
  };
  function getMockDataset(things = [mockThing1, mockThing2]): SolidDataset {
    const solidDataset: SolidDataset = {
      type: "Dataset",
      graphs: {
        default: {},
      },
    };
    things.forEach((thing) => {
      // The assertion allows writing to what we've declared to be a read-only property:
      (solidDataset.graphs.default[thing.url] as any) = thing;
    });
    return solidDataset;
  }

  it("returns a Dataset that excludes Quads with the Thing's Subject", () => {
    const datasetWithMultipleThings = getMockDataset([mockThing1, mockThing2]);

    const updatedDataset = removeThing(datasetWithMultipleThings, mockThing2);

    expect(updatedDataset.graphs).toStrictEqual(
      getMockDataset([mockThing1]).graphs
    );
  });

  it("keeps track of deletions in the attached change log", () => {
    const datasetWithExistingThings = getMockDataset([mockThing1, mockThing2]);

    const updatedDataset = removeThing(datasetWithExistingThings, mockThing2);

    expect(updatedDataset.internal_changeLog.additions).toHaveLength(0);
    expect(updatedDataset.internal_changeLog.deletions).toHaveLength(1);
    expect(updatedDataset.internal_changeLog.deletions[0].subject.value).toBe(
      mockThing2Iri
    );
  });

  it("reconciles deletions in the change log with additions", () => {
    const datasetWithExistingThings = getMockDataset([mockThing1]);

    const datasetWithThing2Added = setThing(
      datasetWithExistingThings,
      mockThing2
    );

    expect(datasetWithThing2Added.internal_changeLog.additions).toHaveLength(1);
    expect(datasetWithThing2Added.internal_changeLog.deletions).toHaveLength(0);

    const datasetWithThing2RemovedAgain = removeThing(
      datasetWithExistingThings,
      mockThing2
    );

    expect(
      datasetWithThing2RemovedAgain.internal_changeLog.additions
    ).toHaveLength(0);
    expect(
      datasetWithThing2RemovedAgain.internal_changeLog.deletions
    ).toHaveLength(0);
  });

  it("preserves existing change logs", () => {
    const datasetWithoutThings = getMockDataset([mockThing2]);

    const datasetWithThing1Added = setThing(datasetWithoutThings, mockThing1);

    expect(datasetWithThing1Added.internal_changeLog.additions).toHaveLength(1);
    expect(datasetWithThing1Added.internal_changeLog.deletions).toHaveLength(0);

    const datasetWithThing2AddedToo = removeThing(
      datasetWithThing1Added,
      mockThing2
    );

    expect(datasetWithThing2AddedToo.internal_changeLog.additions).toHaveLength(
      1
    );
    expect(datasetWithThing2AddedToo.internal_changeLog.deletions).toHaveLength(
      1
    );
  });

  it("preserves attached ACLs", () => {
    const datasetWithFetchedAcls: SolidDataset & WithAcl = internal_setAcl(
      mockSolidDatasetFrom("https://some.vocab/"),
      {
        resourceAcl: null,
        fallbackAcl: null,
      }
    );
    // The assertion is to tell the type system we can write to this:
    (datasetWithFetchedAcls.graphs.default[mockThing1Iri] as Thing) =
      mockThing1;

    const updatedDataset = removeThing(datasetWithFetchedAcls, mockThing1);

    expect(updatedDataset.internal_acl).toEqual({
      resourceAcl: null,
      fallbackAcl: null,
    });
  });

  it("returns a Dataset that excludes Quads with a given Subject IRI", () => {
    const datasetWithMultipleThings = getMockDataset([mockThing1, mockThing2]);

    const updatedDataset = removeThing(
      datasetWithMultipleThings,
      mockThing2Iri
    );

    expect(updatedDataset.graphs).toStrictEqual(
      getMockDataset([mockThing1]).graphs
    );
  });

  it("does not modify the original SolidDataset", () => {
    const datasetWithMultipleThings = getMockDataset([mockThing1, mockThing2]);

    const updatedDataset = removeThing(
      datasetWithMultipleThings,
      mockThing2Iri
    );

    expect(datasetWithMultipleThings.graphs).not.toStrictEqual(
      updatedDataset.graphs
    );
  });

  it("returns a Dataset that excludes Quads with a given NamedNode as their Subject", () => {
    const datasetWithMultipleThings = getMockDataset([mockThing1, mockThing2]);

    const updatedDataset = removeThing(
      datasetWithMultipleThings,
      DataFactory.namedNode(mockThing2Iri)
    );

    expect(updatedDataset.graphs).toStrictEqual(
      getMockDataset([mockThing1]).graphs
    );
  });

  it("can recognise LocalNodes", () => {
    const solidDataset = getMockDataset([mockLocalThing]);

    const updatedDataset = removeThing(solidDataset, mockLocalThingIri);

    expect(getThingAll(updatedDataset)).toHaveLength(0);
  });

  it("can reconcile given LocalNodes with existing NamedNodes if the SolidDataset has a resource IRI attached", () => {
    let solidDataset = mockSolidDatasetFrom("https://some.pod/resource");
    const thingWithFullIri: ThingPersisted = {
      type: "Subject",
      url: "https://some.pod/resource#subjectName",
      predicates: {
        "https://arbitrary.predicate": {
          namedNodes: ["https://arbitrary.value"],
        },
      },
    };
    solidDataset = setThing(solidDataset, thingWithFullIri);

    const updatedDataset = removeThing(
      solidDataset,
      `${localNodeSkolemPrefix}subjectName`
    );

    expect(getThingAll(updatedDataset)).toHaveLength(0);
  });

  it("only removes LocalNodes if the SolidDataset has no known IRI", () => {
    let solidDataset = createSolidDataset();
    const resolvedThing: ThingPersisted = {
      type: "Subject",
      url: "https://some.pod/resource#subjectName",
      predicates: {
        "https://arbitrary.predicate": {
          namedNodes: ["https://arbitrary.value"],
        },
      },
    };
    const localThing: ThingLocal = {
      type: "Subject",
      url: `${localNodeSkolemPrefix}subjectName` as LocalNodeIri,
      predicates: {
        "https://some.predicate": {
          namedNodes: ["https://some.value"],
        },
      },
    };
    solidDataset = setThing(solidDataset, resolvedThing);
    solidDataset = setThing(solidDataset, localThing);

    const updatedDataset = removeThing(solidDataset, localThing);

    expect(
      getThing(updatedDataset, "https://some.pod/resource#subjectName")
    ).toStrictEqual(resolvedThing);
  });
});

describe("asIri", () => {
  it("returns the IRI of a persisted Thing", () => {
    const persistedThing = mockThingFrom("https://some.pod/resource#thing");

    expect(asUrl(persistedThing)).toBe("https://some.pod/resource#thing");
  });

  it("returns the IRI of a local Thing relative to a given base IRI", () => {
    const localThing: ThingLocal = {
      type: "Subject",
      predicates: {},
      url: `${localNodeSkolemPrefix}some-name` as LocalNodeIri,
    };

    expect(asUrl(localThing, "https://some.pod/resource")).toBe(
      "https://some.pod/resource#some-name"
    );
  });

  it("accepts a Thing of which it is not known whether it is persisted yet", () => {
    const thing = mockThingFrom("https://some.pod/resource#thing");

    expect(asUrl(thing as Thing, "https://arbitrary.url")).toBe(
      "https://some.pod/resource#thing"
    );
  });

  it("triggers a TypeScript error when passed a ThingLocal without a base IRI", () => {
    const localThing: ThingLocal = createThing();

    // @ts-expect-error This is the entire point of this unit test:
    expect(() => asUrl(localThing)).toThrow();
  });

  // This currently fails because a plain `Thing` always has a `url` property that is a string,
  // and is therefore indistinguishable from a `ThingPersisted`. Not sure what the solution is yet.
  // Meanwhile TS users won't get a build-time error if they're passing a plain `Thing`,
  // which is annoying but not a major issue.
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip("triggers a TypeScript error when passed a Thing without a base IRI", () => {
    const plainThing = createThing() as Thing;

    // @ts-expect<disabled because it does not work yet>-error
    expect(() => asUrl(plainThing)).toThrow();
  });

  it("does not trigger a TypeScript error when passed a ThingPersisted without a base IRI", () => {
    // We're only checking for the absence TypeScript errors:
    expect.assertions(0);
    const resolvedThing: ThingPersisted = mockThingFrom(
      "https://some.pod/resource#thing"
    );

    // This should not error:
    asUrl(resolvedThing);
  });

  it("throws an error when a local Thing was given without a base IRI", () => {
    const localThing: ThingLocal = {
      type: "Subject",
      predicates: {},
      url: `${localNodeSkolemPrefix}some-name` as LocalNodeIri,
    };

    expect(() => asUrl(localThing, undefined as any)).toThrow(
      "The URL of a Thing that has not been persisted cannot be determined without a base URL."
    );
  });
});

describe("thingAsMarkdown", () => {
  it("returns a readable version of an empty, unsaved Thing", () => {
    const emptyThing = createThing({ name: "empty-thing" });
    expect(thingAsMarkdown(emptyThing)).toBe(
      "## Thing (no URL yet — identifier: `#empty-thing`)\n\n<empty>\n"
    );
  });
  it("returns a readable version of an empty Thing with a known URL", () => {
    const emptyThing = mockThingFrom("https://some.pod/resource#thing");
    expect(thingAsMarkdown(emptyThing)).toBe(
      "## Thing: https://some.pod/resource#thing\n\n<empty>\n"
    );
  });
  it("returns a readable version of a Thing with just one property", () => {
    let thingWithValue = createThing({ name: "with-one-value" });
    thingWithValue = addStringNoLocale(
      thingWithValue,
      "https://some.vocab/predicate",
      "Some value"
    );
    expect(thingAsMarkdown(thingWithValue)).toBe(
      "## Thing (no URL yet — identifier: `#with-one-value`)\n" +
        "\n" +
        "Property: https://some.vocab/predicate\n" +
        '- "Some value" (string)\n'
    );
  });
  it("returns a readable version of a Thing with multiple properties and values", () => {
    const mockThingObject = createThing({ name: "local-node-object" });
    let thingWithValues = createThing({ name: "with-values" });
    thingWithValues = addStringWithLocale(
      thingWithValues,
      "https://some.vocab/predicate",
      "Some value",
      "en-gb"
    );
    thingWithValues = addStringNoLocale(
      thingWithValues,
      "https://some.vocab/predicate",
      "Some other value"
    );
    thingWithValues = addBoolean(
      thingWithValues,
      "https://some.vocab/predicate",
      true
    );
    thingWithValues = addDatetime(
      thingWithValues,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );
    thingWithValues = addDecimal(
      thingWithValues,
      "https://some.vocab/predicate",
      13.37
    );
    thingWithValues = addInteger(
      thingWithValues,
      "https://some.vocab/predicate",
      42
    );
    thingWithValues = addIri(
      thingWithValues,
      "https://some.vocab/other-predicate",
      "https://some.url"
    );
    thingWithValues = addIri(
      thingWithValues,
      "https://some.vocab/other-predicate",
      mockThingObject
    );
    expect(thingAsMarkdown(thingWithValues)).toBe(
      "## Thing (no URL yet — identifier: `#with-values`)\n" +
        "\n" +
        "Property: https://some.vocab/predicate\n" +
        '- "Some value" (en-gb string)\n' +
        '- "Some other value" (string)\n' +
        "- true (boolean)\n" +
        "- Mon, 12 Nov 1990 13:37:42 GMT (datetime)\n" +
        "- 13.37 (decimal)\n" +
        "- 42 (integer)\n" +
        "\n" +
        "Property: https://some.vocab/other-predicate\n" +
        "- <https://some.url> (URL)\n" +
        "- <#local-node-object> (URL)\n"
    );
  });
  it("returns a readable version of a Thing that points to other Things", () => {
    let thing1 = createThing({ name: "thing1" });
    const thing2 = mockThingFrom("https://some.pod/resource#thing2");
    const thing3 = createThing({ name: "thing3" });
    thing1 = addIri(thing1, "https://some.vocab/predicate", thing2);
    thing1 = addIri(thing1, "https://some.vocab/predicate", thing3);
    expect(thingAsMarkdown(thing1)).toBe(
      "## Thing (no URL yet — identifier: `#thing1`)\n" +
        "\n" +
        "Property: https://some.vocab/predicate\n" +
        "- <https://some.pod/resource#thing2> (URL)\n" +
        "- <#thing3> (URL)\n"
    );
  });
  it("renders when values are invalid", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#thing",
      predicates: {
        "https://some.vocab/predicate": {
          blankNodes: ["_:some-blank-node"],
          literals: {
            "http://www.w3.org/2001/XMLSchema#boolean": ["not-a-boolean"],
            "http://www.w3.org/2001/XMLSchema#dateTime": ["not-a-dateTime"],
            "http://www.w3.org/2001/XMLSchema#decimal": ["not-a-decimal"],
            "http://www.w3.org/2001/XMLSchema#integer": ["not-an-integer"],
            "https://some.vocab/other-type": ["some other value"],
          },
        },
      },
    };
    expect(thingAsMarkdown(thing)).toBe(
      "## Thing: https://some.pod/resource#thing\n" +
        "\n" +
        "Property: https://some.vocab/predicate\n" +
        "- Invalid data: `not-a-boolean` (boolean)\n" +
        "- Invalid data: `not-a-dateTime` (datetime)\n" +
        "- Invalid data: `not-a-decimal` (decimal)\n" +
        "- Invalid data: `not-an-integer` (integer)\n" +
        "- [some other value] (RDF/JS Literal of type: `https://some.vocab/other-type`)\n" +
        "- [some-blank-node] (RDF/JS BlankNode)\n"
    );
  });
});

describe("throwIfNotThing", () => {
  it("throws when passed null", () => {
    expect(() => internal_throwIfNotThing(null as unknown as Thing)).toThrow(
      "Expected a Thing, but received: [null]."
    );
  });

  it("does not throw when passed a Thing", () => {
    expect(() => internal_throwIfNotThing(createThing())).not.toThrow();
  });

  it("throws an instance of a SolidClientError", () => {
    let error;
    try {
      internal_throwIfNotThing(null as unknown as Thing);
    } catch (e: unknown) {
      error = e;
    }
    expect(error).toBeInstanceOf(SolidClientError);
  });

  it("throws an instance of a ThingExpectedError", () => {
    let error;
    try {
      internal_throwIfNotThing(null as unknown as Thing);
    } catch (e: unknown) {
      error = e;
    }
    expect(error).toBeInstanceOf(ThingExpectedError);
  });
});

describe("ValidPropertyUrlExpectedError", () => {
  it("logs the invalid property in its error message", () => {
    const error = new ValidPropertyUrlExpectedError(null);

    expect(error.message).toBe(
      "Expected a valid URL to identify a property, but received: [null]."
    );
  });

  it("logs the value of an invalid URL inside a Named Node in its error message", () => {
    const error = new ValidPropertyUrlExpectedError(
      DataFactory.namedNode("not-a-url")
    );

    expect(error.message).toBe(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("exposes the invalid property", () => {
    const error = new ValidPropertyUrlExpectedError({ not: "a-url" });

    expect(error.receivedProperty).toEqual({ not: "a-url" });
  });
});

describe("ValidValueUrlExpectedError", () => {
  it("logs the invalid property in its error message", () => {
    const error = new ValidValueUrlExpectedError(null);

    expect(error.message).toBe(
      "Expected a valid URL value, but received: [null]."
    );
  });

  it("logs the value of an invalid URL inside a Named Node in its error message", () => {
    const error = new ValidValueUrlExpectedError(
      DataFactory.namedNode("not-a-url")
    );

    expect(error.message).toBe(
      "Expected a valid URL value, but received: [not-a-url]."
    );
  });

  it("exposes the invalid property", () => {
    const error = new ValidValueUrlExpectedError({ not: "a-url" });

    expect(error.receivedValue).toEqual({ not: "a-url" });
  });
});

describe("ValidThingUrlExpectedError", () => {
  it("logs the invalid property in its error message", () => {
    const error = new ValidThingUrlExpectedError(null);

    expect(error.message).toBe(
      "Expected a valid URL to identify a Thing, but received: [null]."
    );
  });

  it("logs the value of an invalid URL inside a Named Node in its error message", () => {
    const error = new ValidThingUrlExpectedError(
      DataFactory.namedNode("not-a-url")
    );

    expect(error.message).toBe(
      "Expected a valid URL to identify a Thing, but received: [not-a-url]."
    );
  });

  it("exposes the invalid property", () => {
    const error = new ValidThingUrlExpectedError({ not: "a-url" });

    expect(error.receivedValue).toEqual({ not: "a-url" });
  });
});
