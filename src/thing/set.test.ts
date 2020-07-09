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
import { Quad, Term } from "rdf-js";
import { DataFactory } from "../rdfjs";
import {
  IriString,
  ThingLocal,
  LocalNode,
  Iri,
  Thing,
  ThingPersisted,
} from "../interfaces";
import {
  setUrl,
  setBoolean,
  setDatetime,
  setDecimal,
  setInteger,
  setStringWithLocale,
  setStringNoLocale,
  setNamedNode,
  setLiteral,
} from "./set";
import { INRUPT_TEST_IRI } from "../GENERATED/INRUPT_TEST_IRI";
import { XSD } from "@solid/lit-vocab-common-rdfext";

function getMockQuad(
  subject: IriString,
  predicate: IriString,
  object: IriString
): Quad {
  return DataFactory.quad(subject, predicate, object);
}
function getMockThing(quad: Quad): ThingPersisted {
  const thing = dataset();
  thing.add(quad);
  // PMCB55: This was failing because our Thing type (in fact ThingPersisted)
  // adds to the RDF/JS Dataset type an 'url' variable which can have a type of
  // NamedNode, whereas RDF/JS Quad Subjects are typed as (NamedNode, BlankNode
  // or Variable). Therefore we need to explicitly force our Quad Subject to
  // explicitly be a NamedNode (and only a NamedNode).
  // return Object.assign(thing, { url: quad.subject });
  return Object.assign(thing, {
    url: DataFactory.namedNode(quad.subject.value),
  });
}
function literalOfType(literalType: Iri, literalValue: string) {
  return DataFactory.literal(literalValue, literalType);
}

function quadHas(
  quad: Quad,
  values: { subject?: IriString; predicate?: IriString; object?: Term }
): boolean {
  if (values.subject && !values.subject.equals(quad.subject)) {
    return false;
  }
  if (values.predicate && !values.predicate.equals(quad.predicate)) {
    return false;
  }
  if (values.object && !values.object.equals(quad.object)) {
    return false;
  }
  return true;
}

describe("setIri", () => {
  it("replaces existing values with the given IRI for the given Predicate", () => {
    const existingQuad1 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const existingQuad2 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryOtherObject
    );
    const thing = getMockThing(existingQuad1);
    thing.add(existingQuad2);

    const updatedThing = setUrl(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryOtherObject
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: INRUPT_TEST_IRI.arbitraryOtherObject,
      })
    ).toEqual(true);
  });

  it("accepts values as Named Nodes", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setUrl(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryOtherObject
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: INRUPT_TEST_IRI.arbitraryOtherObject,
      })
    ).toEqual(true);
  });

  it("accepts values as ThingPersisteds", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);
    const targetThing = Object.assign(dataset(), {
      url: INRUPT_TEST_IRI.arbitraryOtherObject,
    });

    const updatedThing = setUrl(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      targetThing
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: INRUPT_TEST_IRI.arbitraryOtherObject,
      })
    ).toEqual(true);
  });

  it("accepts values as ThingLocals", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);
    const datasetWithThingLocal = dataset();
    const localSubject: LocalNode = Object.assign(DataFactory.blankNode(), {
      name: "localObject",
    });
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = setUrl(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      thingLocal
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(updatedQuads[0].subject).toEqual(INRUPT_TEST_IRI.arbitrarySubject);
    expect(updatedQuads[0].predicate).toEqual(
      INRUPT_TEST_IRI.arbitraryPredicate
    );
    expect((updatedQuads[0].object as LocalNode).name).toEqual("localObject");
  });

  it("accepts Predicates as Named Nodes", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setUrl(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryOtherObject
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: INRUPT_TEST_IRI.arbitraryOtherObject,
      })
    ).toEqual(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    setUrl(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryOtherObject
    );

    expect(Array.from(thing)).toEqual([existingQuad]);
  });

  it("also works on ThingLocals", () => {
    const datasetWithThingLocal = dataset();
    const localSubject: LocalNode = Object.assign(DataFactory.blankNode(), {
      name: "localSubject",
    });
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = setUrl(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryOtherObject
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect((updatedQuads[0].subject as LocalNode).name).toEqual("localSubject");
    expect(updatedQuads[0].predicate).toEqual(
      INRUPT_TEST_IRI.arbitraryPredicate
    );
    expect(updatedQuads[0].object).toEqual(
      INRUPT_TEST_IRI.arbitraryOtherObject
    );
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setUrl(
      thing,
      INRUPT_TEST_IRI.arbitraryOtherPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: INRUPT_TEST_IRI.arbitraryObject,
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryOtherPredicate,
        object: INRUPT_TEST_IRI.arbitraryObject,
      })
    ).toEqual(true);
  });
});

describe("setBoolean", () => {
  it("replaces existing values with the given boolean for the given Predicate", () => {
    const existingQuad1 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const existingQuad2 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryOtherObject
    );
    const thing = getMockThing(existingQuad1);
    thing.add(existingQuad2);

    const updatedThing = setBoolean(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      true
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType(XSD.boolean_, "1"),
      })
    ).toEqual(true);
  });

  it("accepts Predicates as Named Nodes", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setBoolean(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      false
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType(XSD.boolean_, "0"),
      })
    ).toEqual(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    setBoolean(thing, INRUPT_TEST_IRI.arbitraryPredicate, true);

    expect(Array.from(thing)).toEqual([existingQuad]);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(
      DataFactory.quad(
        localSubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = setBoolean(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      true
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType(XSD.boolean_, "1"),
      })
    ).toEqual(true);
    expect(updatedThing.localSubject.name).toEqual("localSubject");
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setBoolean(
      thing,
      INRUPT_TEST_IRI.arbitraryOtherPredicate,
      true
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: INRUPT_TEST_IRI.arbitraryObject,
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryOtherPredicate,
        object: literalOfType(XSD.boolean_, "1"),
      })
    ).toEqual(true);
  });
});

describe("setDatetime", () => {
  it("replaces existing values with the given datetime for the given Predicate", () => {
    const existingQuad1 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const existingQuad2 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryOtherObject
    );
    const thing = getMockThing(existingQuad1);
    thing.add(existingQuad2);

    const updatedThing = setDatetime(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType(XSD.dateTime, "1990-11-12T13:37:42Z"),
      })
    ).toEqual(true);
  });

  it("accepts Predicates as Named Nodes", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setDatetime(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType(XSD.dateTime, "1990-11-12T13:37:42Z"),
      })
    ).toEqual(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    setDatetime(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(Array.from(thing)).toEqual([existingQuad]);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(
      DataFactory.quad(
        localSubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = setDatetime(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType(XSD.dateTime, "1990-11-12T13:37:42Z"),
      })
    ).toEqual(true);
    expect(updatedThing.localSubject.name).toEqual("localSubject");
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setDatetime(
      thing,
      INRUPT_TEST_IRI.arbitraryOtherPredicate,
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: INRUPT_TEST_IRI.arbitraryObject,
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryOtherPredicate,
        object: literalOfType(XSD.dateTime, "1990-11-12T13:37:42Z"),
      })
    ).toEqual(true);
  });
});

describe("setDecimal", () => {
  it("replaces existing values with the given decimal for the given Predicate", () => {
    const existingQuad1 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const existingQuad2 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryOtherObject
    );
    const thing = getMockThing(existingQuad1);
    thing.add(existingQuad2);

    const updatedThing = setDecimal(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      13.37
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType(XSD.decimal, "13.37"),
      })
    ).toEqual(true);
  });

  it("accepts Predicates as Named Nodes", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setDecimal(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      13.37
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType(XSD.decimal, "13.37"),
      })
    ).toEqual(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    setDecimal(thing, INRUPT_TEST_IRI.arbitraryPredicate, 13.37);

    expect(Array.from(thing)).toEqual([existingQuad]);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(
      DataFactory.quad(
        localSubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = setDecimal(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      13.37
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType(XSD.decimal, "13.37"),
      })
    ).toEqual(true);
    expect(updatedThing.localSubject.name).toEqual("localSubject");
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setDecimal(
      thing,
      INRUPT_TEST_IRI.arbitraryOtherPredicate,
      13.37
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: INRUPT_TEST_IRI.arbitraryObject,
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryOtherPredicate,
        object: literalOfType(XSD.decimal, "13.37"),
      })
    ).toEqual(true);
  });
});

describe("setInteger", () => {
  it("replaces existing values with the given integer for the given Predicate", () => {
    const existingQuad1 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const existingQuad2 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryOtherObject
    );
    const thing = getMockThing(existingQuad1);
    thing.add(existingQuad2);

    const updatedThing = setInteger(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      42
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType(XSD.integer, "42"),
      })
    ).toEqual(true);
  });

  it("accepts Predicates as Named Nodes", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setInteger(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      42
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType(XSD.integer, "42"),
      })
    ).toEqual(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    setInteger(thing, INRUPT_TEST_IRI.arbitraryPredicate, 42);

    expect(Array.from(thing)).toEqual([existingQuad]);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(
      DataFactory.quad(
        localSubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = setInteger(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      42
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType(XSD.integer, "42"),
      })
    ).toEqual(true);
    expect(updatedThing.localSubject.name).toEqual("localSubject");
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setInteger(
      thing,
      INRUPT_TEST_IRI.arbitraryOtherPredicate,
      42
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: INRUPT_TEST_IRI.arbitraryObject,
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryOtherPredicate,
        object: literalOfType(XSD.integer, "42"),
      })
    ).toEqual(true);
  });
});

describe("setStringWithLocale", () => {
  it("replaces existing values with the given localised string for the given Predicate", () => {
    const existingQuad1 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const existingQuad2 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryOtherObject
    );
    const thing = getMockThing(existingQuad1);
    thing.add(existingQuad2);

    const updatedThing = setStringWithLocale(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some string value",
      "en-GB"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.literal("Some string value", "en-gb"),
      })
    ).toEqual(true);
  });

  it("accepts Predicates as Named Nodes", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setStringWithLocale(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some string value",
      "en-GB"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.literal("Some string value", "en-gb"),
      })
    ).toEqual(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    setStringWithLocale(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some string value",
      "en-GB"
    );

    expect(Array.from(thing)).toEqual([existingQuad]);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(
      DataFactory.quad(
        localSubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = setStringWithLocale(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some string value",
      "en-GB"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.literal("Some string value", "en-gb"),
      })
    ).toEqual(true);
    expect(updatedThing.localSubject.name).toEqual("localSubject");
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setStringWithLocale(
      thing,
      INRUPT_TEST_IRI.arbitraryOtherPredicate,
      "Some string value",
      "en-GB"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: INRUPT_TEST_IRI.arbitraryObject,
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryOtherPredicate,
        object: DataFactory.literal("Some string value", "en-gb"),
      })
    ).toEqual(true);
  });
});

describe("setStringNoLocale", () => {
  it("replaces existing values with the given unlocalised string for the given Predicate", () => {
    const existingQuad1 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const existingQuad2 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryOtherObject
    );
    const thing = getMockThing(existingQuad1);
    thing.add(existingQuad2);

    const updatedThing = setStringNoLocale(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some string value"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType(XSD.string, "Some string value"),
      })
    ).toEqual(true);
  });

  it("accepts Predicates as Named Nodes", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setStringNoLocale(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some string value"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType(XSD.string, "Some string value"),
      })
    ).toEqual(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    setStringNoLocale(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some string value"
    );

    expect(Array.from(thing)).toEqual([existingQuad]);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(
      DataFactory.quad(
        localSubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = setStringNoLocale(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some string value"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType(XSD.string, "Some string value"),
      })
    ).toEqual(true);
    expect(updatedThing.localSubject.name).toEqual("localSubject");
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setStringNoLocale(
      thing,
      INRUPT_TEST_IRI.arbitraryOtherPredicate,
      "Some string value"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: INRUPT_TEST_IRI.arbitraryObject,
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryOtherPredicate,
        object: literalOfType(XSD.string, "Some string value"),
      })
    ).toEqual(true);
  });
});

describe("setNamedNode", () => {
  it("replaces existing values with the given Named Node for the given Predicate", () => {
    const existingQuad1 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const existingQuad2 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryOtherObject
    );
    const thing = getMockThing(existingQuad1);
    thing.add(existingQuad2);

    const updatedThing = setNamedNode(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryOtherObject
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: INRUPT_TEST_IRI.arbitraryOtherObject,
      })
    ).toEqual(true);
  });

  it("accepts Predicates as Named Nodes", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setNamedNode(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryOtherObject
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: INRUPT_TEST_IRI.arbitraryOtherObject,
      })
    ).toEqual(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    setNamedNode(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryOtherObject
    );

    expect(Array.from(thing)).toEqual([existingQuad]);
  });

  it("also works on ThingLocals", () => {
    const datasetWithThingLocal = dataset();
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
    );
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = setNamedNode(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryOtherObject
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect((updatedQuads[0].subject as LocalNode).name).toEqual("localSubject");
    expect(updatedQuads[0].predicate).toEqual(
      INRUPT_TEST_IRI.arbitraryPredicate
    );
    expect(updatedQuads[0].object).toEqual(
      INRUPT_TEST_IRI.arbitraryOtherObject
    );
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setNamedNode(
      thing,
      INRUPT_TEST_IRI.arbitraryOtherPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: INRUPT_TEST_IRI.arbitraryObject,
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryOtherPredicate,
        object: INRUPT_TEST_IRI.arbitraryObject,
      })
    ).toEqual(true);
  });
});

describe("setLiteral", () => {
  it("replaces existing values with the given Literal for the given Predicate", () => {
    const existingQuad1 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const existingQuad2 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryOtherObject
    );
    const thing = getMockThing(existingQuad1);
    thing.add(existingQuad2);

    const updatedThing = setLiteral(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal("Some string value")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.literal("Some string value"),
      })
    ).toEqual(true);
  });

  it("accepts Predicates as Named Nodes", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setLiteral(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal("Some string value")
    );
    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.literal("Some string value"),
      })
    ).toEqual(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    setLiteral(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal("Arbitrary string value")
    );

    expect(Array.from(thing)).toEqual([existingQuad]);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(
      DataFactory.quad(
        localSubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = setLiteral(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal("Some string value")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.literal("Some string value"),
      })
    ).toEqual(true);
    expect(updatedThing.localSubject.name).toEqual("localSubject");
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setLiteral(
      thing,
      INRUPT_TEST_IRI.arbitraryOtherPredicate,
      DataFactory.literal("Some string value")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: INRUPT_TEST_IRI.arbitraryObject,
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryOtherPredicate,
        object: DataFactory.literal("Some string value"),
      })
    ).toEqual(true);
  });
});
