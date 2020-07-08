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
  addUrl,
  addBoolean,
  addDatetime,
  addDecimal,
  addInteger,
  addStringWithLocale,
  addStringNoLocale,
  addNamedNode,
  addLiteral,
} from "./add";
import { INRUPT_TEST_IRI } from "../GENERATED/INRUPT_TEST_IRI";

function getMockEmptyThing(iri = INRUPT_TEST_IRI.arbitrarySubject) {
  const thing = dataset();
  return Object.assign(thing, { url: iri });
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

describe("addIri", () => {
  it("adds the given IRI value for the given predicate", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);

    const updatedThing = addUrl(
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
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);

    const updatedThing = addUrl(
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

  it("accepts values as ThingPersisteds", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);
    const targetThing = getMockEmptyThing(
      "https://some.pod/other-resource#object"
    );

    const updatedThing = addUrl(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      targetThing
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

  it("accepts values as ThingLocals", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);
    const localSubject: LocalNode = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localObject" }
    );
    const datasetWithThingLocal = dataset();
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = addUrl(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      thingLocal
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
      })
    ).toEqual(true);
    expect((updatedQuads[0].object as LocalNode).name).toEqual("localObject");
  });

  it("accepts Predicates as Named Nodes", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);

    const updatedThing = addUrl(
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

  it("does not modify the input Thing", () => {
    const thing = getMockEmptyThing("https://arbitrary.pod/resource#subject");

    const updatedThing = addUrl(
      thing,
      "https://arbitrary.vocab/predicate",
      "https://arbitrary.pod/other-resource#object"
    );

    expect(Array.from(thing)).toHaveLength(0);
    expect(Array.from(updatedThing)).toHaveLength(1);
  });

  it("also works on ThingLocals", () => {
    const localSubject: LocalNode = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = addUrl(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://some.pod/other-resource#object"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toEqual(true);
    expect((updatedQuads[0].subject as LocalNode).name).toEqual("localSubject");
  });

  it("preserves existing values for the same Predicate", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);
    thing.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        DataFactory.namedNode("https://some.pod/other-resource#object")
      )
    );

    const updatedThing = addUrl(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://some.pod/yet-another-resource#object"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.namedNode(
          "https://some.pod/yet-another-resource#object"
        ),
      })
    ).toEqual(true);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);
    thing.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryOtherPredicate,
        literalOfType("string", "Some other value")
      )
    );

    const updatedThing = addUrl(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "https://some.pod/other-resource#object"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryOtherPredicate,
        object: literalOfType("string", "Some other value"),
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toEqual(true);
  });
});

describe("addBoolean", () => {
  it("adds the given boolean value for the given predicate", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);

    const updatedThing = addBoolean(
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
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);

    const updatedThing = addBoolean(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      false
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType("boolean", "0"),
      })
    ).toEqual(true);
  });

  it("does not modify the input Thing", () => {
    const thing = getMockEmptyThing("https://arbitrary.pod/resource#subject");

    const updatedThing = addBoolean(
      thing,
      "https://arbitrary.vocab/predicate",
      true
    );

    expect(Array.from(thing)).toHaveLength(0);
    expect(Array.from(updatedThing)).toHaveLength(1);
  });

  it("also works on ThingLocals", () => {
    const localSubject: LocalNode = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = addBoolean(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      true
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType("boolean", "1"),
      })
    ).toEqual(true);
    expect((updatedQuads[0].subject as LocalNode).name).toEqual("localSubject");
  });

  it("preserves existing values for the same Predicate", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);
    thing.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        literalOfType("boolean", "0")
      )
    );

    const updatedThing = addBoolean(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      true
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType("boolean", "0"),
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType("boolean", "1"),
      })
    ).toEqual(true);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);
    thing.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryOtherPredicate,
        literalOfType("string", "Some other value")
      )
    );

    const updatedThing = addBoolean(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      true
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryOtherPredicate,
        object: literalOfType("string", "Some other value"),
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType("boolean", "1"),
      })
    ).toEqual(true);
  });
});

describe("addDatetime", () => {
  it("adds the given datetime value for the given predicate", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);

    const updatedThing = addDatetime(
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
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);

    const updatedThing = addDatetime(
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

  it("does not modify the input Thing", () => {
    const thing = getMockEmptyThing("https://arbitrary.pod/resource#subject");

    const updatedThing = addDatetime(
      thing,
      "https://arbitrary.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(Array.from(thing)).toHaveLength(0);
    expect(Array.from(updatedThing)).toHaveLength(1);
  });

  it("also works on ThingLocals", () => {
    const localSubject: LocalNode = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = addDatetime(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType("dateTime", "1990-11-12T13:37:42Z"),
      })
    ).toEqual(true);
    expect((updatedQuads[0].subject as LocalNode).name).toEqual("localSubject");
  });

  it("preserves existing values for the same Predicate", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);
    thing.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        literalOfType("dateTime", "1955-06-08T13:37:42Z")
      )
    );

    const updatedThing = addDatetime(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType("dateTime", "1955-06-08T13:37:42Z"),
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType("dateTime", "1990-11-12T13:37:42Z"),
      })
    ).toEqual(true);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);
    thing.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryOtherPredicate,
        literalOfType("string", "Some other value")
      )
    );

    const updatedThing = addDatetime(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryOtherPredicate,
        object: literalOfType("string", "Some other value"),
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType("dateTime", "1990-11-12T13:37:42Z"),
      })
    ).toEqual(true);
  });
});

describe("addDecimal", () => {
  it("adds the given decimal value for the given predicate", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);

    const updatedThing = addDecimal(
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
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);

    const updatedThing = addDecimal(
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

  it("does not modify the input Thing", () => {
    const thing = getMockEmptyThing("https://arbitrary.pod/resource#subject");

    const updatedThing = addDecimal(
      thing,
      "https://arbitrary.vocab/predicate",
      13.37
    );

    expect(Array.from(thing)).toHaveLength(0);
    expect(Array.from(updatedThing)).toHaveLength(1);
  });

  it("also works on ThingLocals", () => {
    const localSubject: LocalNode = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = addDecimal(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      13.37
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType("decimal", "13.37"),
      })
    ).toEqual(true);
    expect((updatedQuads[0].subject as LocalNode).name).toEqual("localSubject");
  });

  it("preserves existing values for the same Predicate", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);
    thing.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        literalOfType("decimal", "4.2")
      )
    );

    const updatedThing = addDecimal(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      13.37
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType("decimal", "4.2"),
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType("decimal", "13.37"),
      })
    ).toEqual(true);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);
    thing.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryOtherPredicate,
        literalOfType("string", "Some other value")
      )
    );

    const updatedThing = addDecimal(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      13.37
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryOtherPredicate,
        object: literalOfType("string", "Some other value"),
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType("decimal", "13.37"),
      })
    ).toEqual(true);
  });
});

describe("addInteger", () => {
  it("adds the given integer value for the given predicate", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);

    const updatedThing = addInteger(
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
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);

    const updatedThing = addInteger(
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

  it("does not modify the input Thing", () => {
    const thing = getMockEmptyThing("https://arbitrary.pod/resource#subject");

    const updatedThing = addInteger(
      thing,
      "https://arbitrary.vocab/predicate",
      42
    );

    expect(Array.from(thing)).toHaveLength(0);
    expect(Array.from(updatedThing)).toHaveLength(1);
  });

  it("also works on ThingLocals", () => {
    const localSubject: LocalNode = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = addInteger(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      42
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType("integer", "42"),
      })
    ).toEqual(true);
    expect((updatedQuads[0].subject as LocalNode).name).toEqual("localSubject");
  });

  it("preserves existing values for the same Predicate", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);
    thing.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        literalOfType("integer", "1337")
      )
    );

    const updatedThing = addInteger(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      42
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType("integer", "1337"),
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType("integer", "42"),
      })
    ).toEqual(true);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);
    thing.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryOtherPredicate,
        literalOfType("string", "Some other value")
      )
    );

    const updatedThing = addInteger(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      42
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryOtherPredicate,
        object: literalOfType("string", "Some other value"),
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType("integer", "42"),
      })
    ).toEqual(true);
  });
});

describe("addStringWithLocale", () => {
  it("adds the given localised string value for the given predicate", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);

    const updatedThing = addStringWithLocale(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some string",
      "en-GB"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.literal("Some string", "en-gb"),
      })
    ).toEqual(true);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);

    const updatedThing = addStringWithLocale(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some string",
      "en-GB"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.literal("Some string", "en-gb"),
      })
    ).toEqual(true);
  });

  it("does not modify the input Thing", () => {
    const thing = getMockEmptyThing("https://arbitrary.pod/resource#subject");

    const updatedThing = addStringWithLocale(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some string",
      "en-GB"
    );

    expect(Array.from(thing)).toHaveLength(0);
    expect(Array.from(updatedThing)).toHaveLength(1);
  });

  it("also works on ThingLocals", () => {
    const localSubject: LocalNode = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = addStringWithLocale(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some string",
      "en-GB"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.literal("Some string", "en-gb"),
      })
    ).toEqual(true);
    expect((updatedQuads[0].subject as LocalNode).name).toEqual("localSubject");
  });

  it("preserves existing values for the same Predicate", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);
    thing.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        DataFactory.literal("Some string", "nl-NL")
      )
    );

    const updatedThing = addStringWithLocale(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some string",
      "en-GB"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.literal("Some string", "nl-nl"),
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.literal("Some string", "en-gb"),
      })
    ).toEqual(true);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);
    thing.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryOtherPredicate,
        literalOfType("string", "Some other value")
      )
    );

    const updatedThing = addStringWithLocale(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some string",
      "en-GB"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryOtherPredicate,
        object: literalOfType("string", "Some other value"),
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.literal("Some string", "en-gb"),
      })
    ).toEqual(true);
  });
});

describe("addStringNoLocale", () => {
  it("adds the given unlocalised string value for the given predicate", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);

    const updatedThing = addStringNoLocale(
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
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);

    const updatedThing = addStringNoLocale(
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

  it("does not modify the input Thing", () => {
    const thing = getMockEmptyThing("https://arbitrary.pod/resource#subject");

    const updatedThing = addStringNoLocale(
      thing,
      "https://arbitrary.vocab/predicate",
      "Arbitrary string value"
    );

    expect(Array.from(thing)).toHaveLength(0);
    expect(Array.from(updatedThing)).toHaveLength(1);
  });

  it("also works on ThingLocals", () => {
    const localSubject: LocalNode = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = addStringNoLocale(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some string value"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType("string", "Some string value"),
      })
    ).toEqual(true);
    expect((updatedQuads[0].subject as LocalNode).name).toEqual("localSubject");
  });

  it("preserves existing values for the same Predicate", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);
    thing.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        literalOfType("string", "Some other string value")
      )
    );

    const updatedThing = addStringNoLocale(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some string value"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType("string", "Some other string value"),
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType("string", "Some string value"),
      })
    ).toEqual(true);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);
    thing.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryOtherPredicate,
        literalOfType("integer", "42")
      )
    );

    const updatedThing = addStringNoLocale(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some string value"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryOtherPredicate,
        object: literalOfType("integer", "42"),
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: literalOfType("string", "Some string value"),
      })
    ).toEqual(true);
  });
});

describe("addNamedNode", () => {
  it("adds the given NamedNode value for the given predicate", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);

    const updatedThing = addNamedNode(
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
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);

    const updatedThing = addNamedNode(
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

  it("does not modify the input Thing", () => {
    const thing = getMockEmptyThing("https://arbitrary.pod/resource#subject");

    const updatedThing = addNamedNode(
      thing,
      "https://arbitrary.vocab/predicate",
      DataFactory.namedNode("https://arbitrary.pod/other-resource#object")
    );

    expect(Array.from(thing)).toHaveLength(0);
    expect(Array.from(updatedThing)).toHaveLength(1);
  });

  it("also works on ThingLocals", () => {
    const localSubject: LocalNode = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = addNamedNode(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toEqual(true);
    expect((updatedQuads[0].subject as LocalNode).name).toEqual("localSubject");
  });

  it("preserves existing values for the same Predicate", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);
    thing.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        DataFactory.namedNode("https://some.pod/other-resource#object")
      )
    );

    const updatedThing = addNamedNode(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.namedNode("https://some.pod/yet-another-resource#object")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.namedNode(
          "https://some.pod/yet-another-resource#object"
        ),
      })
    ).toEqual(true);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);
    thing.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryOtherPredicate,
        literalOfType("string", "Some other value")
      )
    );

    const updatedThing = addNamedNode(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryOtherPredicate,
        object: literalOfType("string", "Some other value"),
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toEqual(true);
  });
});

describe("addLiteral", () => {
  it("adds the given Literal value for the given predicate", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);

    const updatedThing = addLiteral(
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
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);

    const updatedThing = addLiteral(
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

  it("does not modify the input Thing", () => {
    const thing = getMockEmptyThing("https://arbitrary.pod/resource#subject");

    const updatedThing = addLiteral(
      thing,
      "https://arbitrary.vocab/predicate",
      DataFactory.literal("Arbitrary string value")
    );

    expect(Array.from(thing)).toHaveLength(0);
    expect(Array.from(updatedThing)).toHaveLength(1);
  });

  it("also works on ThingLocals", () => {
    const datasetWithThingLocal = dataset();
    const localSubject: LocalNode = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { name: "localSubject" }
    );
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      localSubject: localSubject,
    });

    const updatedThing = addLiteral(
      thingLocal,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal("Some string value")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.literal("Some string value"),
      })
    ).toEqual(true);
    expect((updatedQuads[0].subject as LocalNode).name).toEqual("localSubject");
  });

  it("preserves existing values for the same Predicate", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);
    thing.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        DataFactory.literal("Some other string value")
      )
    );

    const updatedThing = addLiteral(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal("Some string value")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.literal("Some other string value"),
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.literal("Some string value"),
      })
    ).toEqual(true);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockEmptyThing(INRUPT_TEST_IRI.arbitrarySubject);
    thing.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryOtherPredicate,
        literalOfType("integer", "42")
      )
    );

    const updatedThing = addLiteral(
      thing,
      INRUPT_TEST_IRI.arbitraryPredicate,
      DataFactory.literal("Some string value")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryOtherPredicate,
        object: literalOfType("integer", "42"),
      })
    ).toEqual(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: INRUPT_TEST_IRI.arbitrarySubject,
        predicate: INRUPT_TEST_IRI.arbitraryPredicate,
        object: DataFactory.literal("Some string value"),
      })
    ).toEqual(true);
  });
});
