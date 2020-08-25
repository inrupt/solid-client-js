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
  setTerm,
} from "./set";

function getMockQuad(
  subject: IriString,
  predicate: IriString,
  object: IriString
): Quad {
  return DataFactory.quad(
    DataFactory.namedNode(subject),
    DataFactory.namedNode(predicate),
    DataFactory.namedNode(object)
  );
}
function getMockThing(quad: Quad) {
  const thing = dataset();
  thing.add(quad);
  return Object.assign(thing, { internal_url: quad.subject.value });
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
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object1"
    );
    const existingQuad2 = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object2"
    );
    const thing = getMockThing(existingQuad1);
    thing.add(existingQuad2);

    const updatedThing = setUrl(
      thing,
      "https://some.vocab/predicate",
      "https://some.pod/other-resource#object"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toBe(true);
  });

  it("accepts values as Named Nodes", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setUrl(
      thing,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toBe(true);
  });

  it("accepts values as ThingPersisteds", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);
    const targetThing = Object.assign(dataset(), {
      internal_url: "https://some.pod/other-resource#object",
    });

    const updatedThing = setUrl(
      thing,
      "https://some.vocab/predicate",
      targetThing
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toBe(true);
  });

  it("accepts values as ThingLocals", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);
    const datasetWithThingLocal = dataset();
    const localSubject: LocalNode = Object.assign(DataFactory.blankNode(), {
      internal_name: "localObject",
    });
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = setUrl(
      thing,
      "https://some.vocab/predicate",
      thingLocal
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(updatedQuads[0].subject.value).toBe(
      "https://some.pod/resource#subject"
    );
    expect(updatedQuads[0].predicate.value).toBe(
      "https://some.vocab/predicate"
    );
    expect((updatedQuads[0].object as LocalNode).internal_name).toBe(
      "localObject"
    );
  });

  it("accepts Properties as Named Nodes", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setUrl(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "https://some.pod/other-resource#object"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toBe(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
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
      internal_name: "localSubject",
    });
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = setUrl(
      thingLocal,
      "https://some.vocab/predicate",
      "https://some.pod/other-resource#object"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect((updatedQuads[0].subject as LocalNode).internal_name).toBe(
      "localSubject"
    );
    expect(updatedQuads[0].predicate.value).toBe(
      "https://some.vocab/predicate"
    );
    expect(updatedQuads[0].object.value).toBe(
      "https://some.pod/other-resource#object"
    );
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
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
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/resource#object"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/other-predicate",
        object: DataFactory.namedNode("https://some.pod/resource#object"),
      })
    ).toBe(true);
  });
});

describe("setBoolean", () => {
  it("replaces existing values with the given boolean for the given Predicate", () => {
    const existingQuad1 = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object1"
    );
    const existingQuad2 = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object2"
    );
    const thing = getMockThing(existingQuad1);
    thing.add(existingQuad2);

    const updatedThing = setBoolean(
      thing,
      "https://some.vocab/predicate",
      true
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("boolean", "true"),
      })
    ).toBe(true);
  });

  it("accepts Properties as Named Nodes", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setBoolean(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      false
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("boolean", "false"),
      })
    ).toBe(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://some.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    setBoolean(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      true
    );

    expect(Array.from(thing)).toEqual([existingQuad]);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { internal_name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(
      DataFactory.quad(
        localSubject,
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.pod/resource#object")
      )
    );
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = setBoolean(
      thingLocal,
      "https://some.vocab/predicate",
      true
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        predicate: "https://some.vocab/predicate",
        object: literalOfType("boolean", "true"),
      })
    ).toBe(true);
    expect(updatedThing.internal_localSubject.internal_name).toBe(
      "localSubject"
    );
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
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
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/resource#object"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/other-predicate",
        object: literalOfType("boolean", "true"),
      })
    ).toBe(true);
  });
});

describe("setDatetime", () => {
  it("replaces existing values with the given datetime for the given Predicate", () => {
    const existingQuad1 = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object1"
    );
    const existingQuad2 = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object2"
    );
    const thing = getMockThing(existingQuad1);
    thing.add(existingQuad2);

    const updatedThing = setDatetime(
      thing,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("dateTime", "1990-11-12T13:37:42.000Z"),
      })
    ).toBe(true);
  });

  it("accepts Properties as Named Nodes", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setDatetime(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("dateTime", "1990-11-12T13:37:42.000Z"),
      })
    ).toBe(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://some.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    setDatetime(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(Array.from(thing)).toEqual([existingQuad]);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { internal_name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(
      DataFactory.quad(
        localSubject,
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.pod/resource#object")
      )
    );
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = setDatetime(
      thingLocal,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        predicate: "https://some.vocab/predicate",
        object: literalOfType("dateTime", "1990-11-12T13:37:42.000Z"),
      })
    ).toBe(true);
    expect(updatedThing.internal_localSubject.internal_name).toBe(
      "localSubject"
    );
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
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
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/resource#object"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/other-predicate",
        object: literalOfType("dateTime", "1990-11-12T13:37:42.000Z"),
      })
    ).toBe(true);
  });
});

describe("setDecimal", () => {
  it("replaces existing values with the given decimal for the given Predicate", () => {
    const existingQuad1 = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object1"
    );
    const existingQuad2 = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object2"
    );
    const thing = getMockThing(existingQuad1);
    thing.add(existingQuad2);

    const updatedThing = setDecimal(
      thing,
      "https://some.vocab/predicate",
      13.37
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("decimal", "13.37"),
      })
    ).toBe(true);
  });

  it("accepts Properties as Named Nodes", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setDecimal(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      13.37
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("decimal", "13.37"),
      })
    ).toBe(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://some.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    setDecimal(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      13.37
    );

    expect(Array.from(thing)).toEqual([existingQuad]);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { internal_name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(
      DataFactory.quad(
        localSubject,
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.pod/resource#object")
      )
    );
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = setDecimal(
      thingLocal,
      "https://some.vocab/predicate",
      13.37
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        predicate: "https://some.vocab/predicate",
        object: literalOfType("decimal", "13.37"),
      })
    ).toBe(true);
    expect(updatedThing.internal_localSubject.internal_name).toBe(
      "localSubject"
    );
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
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
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/resource#object"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/other-predicate",
        object: literalOfType("decimal", "13.37"),
      })
    ).toBe(true);
  });
});

describe("setInteger", () => {
  it("replaces existing values with the given integer for the given Predicate", () => {
    const existingQuad1 = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object1"
    );
    const existingQuad2 = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object2"
    );
    const thing = getMockThing(existingQuad1);
    thing.add(existingQuad2);

    const updatedThing = setInteger(thing, "https://some.vocab/predicate", 42);

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("integer", "42"),
      })
    ).toBe(true);
  });

  it("accepts Properties as Named Nodes", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setInteger(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      42
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("integer", "42"),
      })
    ).toBe(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://some.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    setInteger(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      42
    );

    expect(Array.from(thing)).toEqual([existingQuad]);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { internal_name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(
      DataFactory.quad(
        localSubject,
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.pod/resource#object")
      )
    );
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = setInteger(
      thingLocal,
      "https://some.vocab/predicate",
      42
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        predicate: "https://some.vocab/predicate",
        object: literalOfType("integer", "42"),
      })
    ).toBe(true);
    expect(updatedThing.internal_localSubject.internal_name).toBe(
      "localSubject"
    );
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
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
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/resource#object"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/other-predicate",
        object: literalOfType("integer", "42"),
      })
    ).toBe(true);
  });
});

describe("setStringWithLocale", () => {
  it("replaces existing values with the given localised string for the given Predicate", () => {
    const existingQuad1 = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object1"
    );
    const existingQuad2 = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object2"
    );
    const thing = getMockThing(existingQuad1);
    thing.add(existingQuad2);

    const updatedThing = setStringWithLocale(
      thing,
      "https://some.vocab/predicate",
      "Some string value",
      "en-GB"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some string value", "en-gb"),
      })
    ).toBe(true);
  });

  it("accepts Properties as Named Nodes", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setStringWithLocale(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "Some string value",
      "en-GB"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some string value", "en-gb"),
      })
    ).toBe(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://some.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    setStringWithLocale(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "Some string value",
      "en-GB"
    );

    expect(Array.from(thing)).toEqual([existingQuad]);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { internal_name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(
      DataFactory.quad(
        localSubject,
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.pod/resource#object")
      )
    );
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = setStringWithLocale(
      thingLocal,
      "https://some.vocab/predicate",
      "Some string value",
      "en-GB"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some string value", "en-gb"),
      })
    ).toBe(true);
    expect(updatedThing.internal_localSubject.internal_name).toBe(
      "localSubject"
    );
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
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
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/resource#object"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/other-predicate",
        object: DataFactory.literal("Some string value", "en-gb"),
      })
    ).toBe(true);
  });
});

describe("setStringNoLocale", () => {
  it("replaces existing values with the given unlocalised string for the given Predicate", () => {
    const existingQuad1 = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object1"
    );
    const existingQuad2 = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object2"
    );
    const thing = getMockThing(existingQuad1);
    thing.add(existingQuad2);

    const updatedThing = setStringNoLocale(
      thing,
      "https://some.vocab/predicate",
      "Some string value"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("string", "Some string value"),
      })
    ).toBe(true);
  });

  it("accepts Properties as Named Nodes", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setStringNoLocale(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "Some string value"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("string", "Some string value"),
      })
    ).toBe(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://some.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    setStringNoLocale(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "Some string value"
    );

    expect(Array.from(thing)).toEqual([existingQuad]);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { internal_name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(
      DataFactory.quad(
        localSubject,
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.pod/resource#object")
      )
    );
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = setStringNoLocale(
      thingLocal,
      "https://some.vocab/predicate",
      "Some string value"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        predicate: "https://some.vocab/predicate",
        object: literalOfType("string", "Some string value"),
      })
    ).toBe(true);
    expect(updatedThing.internal_localSubject.internal_name).toBe(
      "localSubject"
    );
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
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
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/resource#object"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/other-predicate",
        object: literalOfType("string", "Some string value"),
      })
    ).toBe(true);
  });
});

describe("setNamedNode", () => {
  it("replaces existing values with the given Named Node for the given Predicate", () => {
    const existingQuad1 = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object1"
    );
    const existingQuad2 = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object2"
    );
    const thing = getMockThing(existingQuad1);
    thing.add(existingQuad2);

    const updatedThing = setNamedNode(
      thing,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toBe(true);
  });

  it("accepts Properties as Named Nodes", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setNamedNode(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toBe(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
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
      { internal_name: "localSubject" }
    );
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = setNamedNode(
      thingLocal,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect((updatedQuads[0].subject as LocalNode).internal_name).toBe(
      "localSubject"
    );
    expect(updatedQuads[0].predicate.value).toBe(
      "https://some.vocab/predicate"
    );
    expect(updatedQuads[0].object.value).toBe(
      "https://some.pod/other-resource#object"
    );
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://some.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setNamedNode(
      thing,
      "https://some.vocab/other-predicate",
      DataFactory.namedNode("https://some.pod/resource#object")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/resource#object"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/other-predicate",
        object: DataFactory.namedNode("https://some.pod/resource#object"),
      })
    ).toBe(true);
  });
});

describe("setLiteral", () => {
  it("replaces existing values with the given Literal for the given Predicate", () => {
    const existingQuad1 = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object1"
    );
    const existingQuad2 = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object2"
    );
    const thing = getMockThing(existingQuad1);
    thing.add(existingQuad2);

    const updatedThing = setLiteral(
      thing,
      "https://some.vocab/predicate",
      DataFactory.literal("Some string value")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some string value"),
      })
    ).toBe(true);
  });

  it("accepts Properties as Named Nodes", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setLiteral(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal("Some string value")
    );
    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some string value"),
      })
    ).toBe(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://some.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    setLiteral(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal("Arbitrary string value")
    );

    expect(Array.from(thing)).toEqual([existingQuad]);
  });

  it("also works on ThingLocals", () => {
    const localSubject = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { internal_name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    datasetWithThingLocal.add(
      DataFactory.quad(
        localSubject,
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.pod/resource#object")
      )
    );
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = setLiteral(
      thingLocal,
      "https://some.vocab/predicate",
      DataFactory.literal("Some string value")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some string value"),
      })
    ).toBe(true);
    expect(updatedThing.internal_localSubject.internal_name).toBe(
      "localSubject"
    );
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
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
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/resource#object"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/other-predicate",
        object: DataFactory.literal("Some string value"),
      })
    ).toBe(true);
  });
});

describe("setTerm", () => {
  it("replaces existing values with the given Named Node for the given Predicate", () => {
    const existingQuad1 = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object1"
    );
    const existingQuad2 = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object2"
    );
    const thing = getMockThing(existingQuad1);
    thing.add(existingQuad2);

    const updatedThing = setTerm(
      thing,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toBe(true);
  });

  it("replaces existing values with the given Term for the given Predicate", () => {
    const existingQuad1 = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object1"
    );
    const existingQuad2 = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object2"
    );
    const thing = getMockThing(existingQuad1);
    thing.add(existingQuad2);

    const updatedThing = setTerm(
      thing,
      "https://some.vocab/predicate",
      DataFactory.literal(
        "Some string",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#string")
      )
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal(
          "Some string",
          DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#string")
        ),
      })
    ).toBe(true);
  });

  it("accepts Properties as Named Nodes", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setTerm(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toBe(true);
  });

  it("does not modify the input Thing", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    setTerm(
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
      { internal_name: "localSubject" }
    );
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = setTerm(
      thingLocal,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect((updatedQuads[0].subject as LocalNode).internal_name).toBe(
      "localSubject"
    );
    expect(updatedQuads[0].predicate.value).toBe(
      "https://some.vocab/predicate"
    );
    expect(updatedQuads[0].object.value).toBe(
      "https://some.pod/other-resource#object"
    );
  });

  it("preserves existing Quads with different Predicates", () => {
    const existingQuad = getMockQuad(
      "https://some.pod/resource#subject",
      "https://some.vocab/predicate",
      "https://some.pod/resource#object"
    );
    const thing = getMockThing(existingQuad);

    const updatedThing = setTerm(
      thing,
      "https://some.vocab/other-predicate",
      DataFactory.namedNode("https://some.pod/resource#object")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/resource#object"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/other-predicate",
        object: DataFactory.namedNode("https://some.pod/resource#object"),
      })
    ).toBe(true);
  });
});
