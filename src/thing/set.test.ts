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
import { DataFactory } from "n3";
import { IriString, ThingLocal, LocalNode } from "../interfaces";
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

function getMockQuad(
  subject: IriString,
  predicate: IriString,
  object: IriString
): Quad {
  return DataFactory.quad(
    DataFactory.namedNode(subject),
    predicate,
    DataFactory.namedNode(object)
  );
}
function getMockThing(quad: Quad) {
  const thing = dataset();
  thing.add(quad);
  return Object.assign(thing, { url: quad.subject.value });
}
function literalOfType(
  literalType: "string" | "integer" | "decimal" | "boolean" | "dateTime",
  literalValue: string
) {
  return DataFactory.literal(
    literalValue,
    DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#" + literalType)
  );
}

function quadHas(
  quad: Quad,
  values: { subject?: IriString; predicate?: IriString; object?: Term }
): boolean {
  if (
    values.subject &&
    !DataFactory.namedNode(values.subject).equals(quad.subject)
  ) {
    return false;
  }
  if (
    values.predicate &&
    !DataFactory.namedNode(values.predicate).equals(quad.predicate)
  ) {
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
      "https://arbitrary.pod/resource#object1"
    );
    const existingQuad2 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object2"
    );
    const thing = getMockThing(existingQuad1);
    thing.add(existingQuad2);

    const updatedThing = setUrl(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://some.pod/other-resource#object"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toEqual(true);
  });

  it("accepts values as Named Nodes", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setUrl(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toEqual(true);
  });

  it("accepts values as ThingPersisteds", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);
    const targetThing = Object.assign(dataset(), {
      url: "https://some.pod/other-resource#object",
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
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toEqual(true);
  });

  it("accepts values as ThingLocals", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object"
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
    expect(updatedQuads[0].subject.value).toEqual(
      INRUPT_TEST_IRI.arbitrarySubject
    );
    expect(updatedQuads[0].predicate.value).toEqual(
      INRUPT_TEST_IRI.arbitraryPredicate
    );
    expect((updatedQuads[0].object as LocalNode).name).toEqual("localObject");
  });

  it("accepts Predicates as Named Nodes", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setUrl(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://some.pod/other-resource#object"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toEqual(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    setUrl(
      thing,
      "https://arbitrary.vocab/predicate",
      "https://arbitrary.pod/other-resource#object"
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
      "https://some.pod/other-resource#object"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect((updatedQuads[0].subject as LocalNode).name).toEqual("localSubject");
    expect(updatedQuads[0].predicate).toEqual(
      INRUPT_TEST_IRI.arbitraryPredicate
    );
    expect(updatedQuads[0].object.value).toEqual(
      "https://some.pod/other-resource#object"
    );
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://some.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setUrl(
      thing,
      "https://some.vocab/other-predicate",
      "https://some.pod/resource#object"
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
        predicate: "https://some.vocab/other-predicate",
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
      "https://arbitrary.pod/resource#object1"
    );
    const existingQuad2 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object2"
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
        object: literalOfType("boolean", "1"),
      })
    ).toEqual(true);
  });

  it("accepts Predicates as Named Nodes", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object"
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
        object: literalOfType("boolean", "0"),
      })
    ).toEqual(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://some.pod/resource#object"
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
        DataFactory.namedNode("https://arbitrary.pod/resource#object")
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
        object: literalOfType("boolean", "1"),
      })
    ).toEqual(true);
    expect(updatedThing.localSubject.name).toEqual("localSubject");
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://some.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setBoolean(
      thing,
      "https://some.vocab/other-predicate",
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
        predicate: "https://some.vocab/other-predicate",
        object: literalOfType("boolean", "1"),
      })
    ).toEqual(true);
  });
});

describe("setDatetime", () => {
  it("replaces existing values with the given datetime for the given Predicate", () => {
    const existingQuad1 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object1"
    );
    const existingQuad2 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object2"
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
        object: literalOfType("dateTime", "1990-11-12T13:37:42Z"),
      })
    ).toEqual(true);
  });

  it("accepts Predicates as Named Nodes", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object"
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
        object: literalOfType("dateTime", "1990-11-12T13:37:42Z"),
      })
    ).toEqual(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://some.pod/resource#object"
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
        DataFactory.namedNode("https://arbitrary.pod/resource#object")
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
        object: literalOfType("dateTime", "1990-11-12T13:37:42Z"),
      })
    ).toEqual(true);
    expect(updatedThing.localSubject.name).toEqual("localSubject");
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://some.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setDatetime(
      thing,
      "https://some.vocab/other-predicate",
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
        predicate: "https://some.vocab/other-predicate",
        object: literalOfType("dateTime", "1990-11-12T13:37:42Z"),
      })
    ).toEqual(true);
  });
});

describe("setDecimal", () => {
  it("replaces existing values with the given decimal for the given Predicate", () => {
    const existingQuad1 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object1"
    );
    const existingQuad2 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object2"
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
        object: literalOfType("decimal", "13.37"),
      })
    ).toEqual(true);
  });

  it("accepts Predicates as Named Nodes", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object"
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
        object: literalOfType("decimal", "13.37"),
      })
    ).toEqual(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://some.pod/resource#object"
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
        DataFactory.namedNode("https://arbitrary.pod/resource#object")
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
        object: literalOfType("decimal", "13.37"),
      })
    ).toEqual(true);
    expect(updatedThing.localSubject.name).toEqual("localSubject");
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://some.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setDecimal(
      thing,
      "https://some.vocab/other-predicate",
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
        predicate: "https://some.vocab/other-predicate",
        object: literalOfType("decimal", "13.37"),
      })
    ).toEqual(true);
  });
});

describe("setInteger", () => {
  it("replaces existing values with the given integer for the given Predicate", () => {
    const existingQuad1 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object1"
    );
    const existingQuad2 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object2"
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
        object: literalOfType("integer", "42"),
      })
    ).toEqual(true);
  });

  it("accepts Predicates as Named Nodes", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object"
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
        object: literalOfType("integer", "42"),
      })
    ).toEqual(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://some.pod/resource#object"
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
        DataFactory.namedNode("https://arbitrary.pod/resource#object")
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
        object: literalOfType("integer", "42"),
      })
    ).toEqual(true);
    expect(updatedThing.localSubject.name).toEqual("localSubject");
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://some.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setInteger(
      thing,
      "https://some.vocab/other-predicate",
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
        predicate: "https://some.vocab/other-predicate",
        object: literalOfType("integer", "42"),
      })
    ).toEqual(true);
  });
});

describe("setStringWithLocale", () => {
  it("replaces existing values with the given localised string for the given Predicate", () => {
    const existingQuad1 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object1"
    );
    const existingQuad2 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object2"
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
      "https://arbitrary.pod/resource#object"
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
      "https://some.pod/resource#object"
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
        DataFactory.namedNode("https://arbitrary.pod/resource#object")
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
      "https://some.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setStringWithLocale(
      thing,
      "https://some.vocab/other-predicate",
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
        predicate: "https://some.vocab/other-predicate",
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
      "https://arbitrary.pod/resource#object1"
    );
    const existingQuad2 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object2"
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
        object: literalOfType("string", "Some string value"),
      })
    ).toEqual(true);
  });

  it("accepts Predicates as Named Nodes", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object"
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
        object: literalOfType("string", "Some string value"),
      })
    ).toEqual(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://some.pod/resource#object"
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
        DataFactory.namedNode("https://arbitrary.pod/resource#object")
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
        object: literalOfType("string", "Some string value"),
      })
    ).toEqual(true);
    expect(updatedThing.localSubject.name).toEqual("localSubject");
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://some.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setStringNoLocale(
      thing,
      "https://some.vocab/other-predicate",
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
        predicate: "https://some.vocab/other-predicate",
        object: literalOfType("string", "Some string value"),
      })
    ).toEqual(true);
  });
});

describe("setNamedNode", () => {
  it("replaces existing values with the given Named Node for the given Predicate", () => {
    const existingQuad1 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object1"
    );
    const existingQuad2 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object2"
    );
    const thing = getMockThing(existingQuad1);
    thing.add(existingQuad2);

    const updatedThing = setNamedNode(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toEqual(true);
  });

  it("accepts Predicates as Named Nodes", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setNamedNode(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toEqual(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    setNamedNode(
      thing,
      "https://arbitrary.vocab/predicate",
      DataFactory.namedNode("https://arbitrary.pod/other-resource#object")
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
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect((updatedQuads[0].subject as LocalNode).name).toEqual("localSubject");
    expect(updatedQuads[0].predicate.value).toEqual(
      INRUPT_TEST_IRI.arbitraryPredicate
    );
    expect(updatedQuads[0].object.value).toEqual(
      "https://some.pod/other-resource#object"
    );
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://some.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setNamedNode(
      thing,
      "https://some.vocab/other-predicate",
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
        predicate: "https://some.vocab/other-predicate",
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
      "https://arbitrary.pod/resource#object1"
    );
    const existingQuad2 = getMockQuad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://arbitrary.pod/resource#object2"
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
      "https://arbitrary.pod/resource#object"
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
      "https://some.pod/resource#object"
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
        DataFactory.namedNode("https://arbitrary.pod/resource#object")
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
      "https://some.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setLiteral(
      thing,
      "https://some.vocab/other-predicate",
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
        predicate: "https://some.vocab/other-predicate",
        object: DataFactory.literal("Some string value"),
      })
    ).toEqual(true);
  });
});
