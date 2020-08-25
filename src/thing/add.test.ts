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
  addTerm,
} from "./add";

function getMockEmptyThing(iri = "https://arbitrary.vocab/subject") {
  const thing = dataset();
  return Object.assign(thing, { internal_url: iri });
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
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addUrl(
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
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addUrl(
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

  it("accepts values as ThingPersisteds", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");
    const targetThing = getMockEmptyThing(
      "https://some.pod/other-resource#object"
    );

    const updatedThing = addUrl(
      thing,
      "https://some.vocab/predicate",
      targetThing
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

  it("accepts values as ThingLocals", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");
    const localSubject: LocalNode = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { internal_name: "localObject" }
    );
    const datasetWithThingLocal = dataset();
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = addUrl(
      thing,
      "https://some.vocab/predicate",
      thingLocal
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
      })
    ).toBe(true);
    expect((updatedQuads[0].object as LocalNode).internal_name).toBe(
      "localObject"
    );
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addUrl(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
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
      { internal_name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = addUrl(
      thingLocal,
      "https://some.vocab/predicate",
      "https://some.pod/other-resource#object"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toBe(true);
    expect((updatedQuads[0].subject as LocalNode).internal_name).toBe(
      "localSubject"
    );
  });

  it("preserves existing values for the same Predicate", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");
    thing.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.pod/resource#subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://some.pod/other-resource#object")
      )
    );

    const updatedThing = addUrl(
      thing,
      "https://some.vocab/predicate",
      "https://some.pod/yet-another-resource#object"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode(
          "https://some.pod/yet-another-resource#object"
        ),
      })
    ).toBe(true);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");
    thing.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.pod/resource#subject"),
        DataFactory.namedNode("https://some-other.vocab/predicate"),
        literalOfType("string", "Some other value")
      )
    );

    const updatedThing = addUrl(
      thing,
      "https://some.vocab/predicate",
      "https://some.pod/other-resource#object"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some-other.vocab/predicate",
        object: literalOfType("string", "Some other value"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toBe(true);
  });
});

describe("addBoolean", () => {
  it("adds the given boolean value for the given predicate", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addBoolean(
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
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addBoolean(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      false
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("boolean", "false"),
      })
    ).toBe(true);
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
      { internal_name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = addBoolean(
      thingLocal,
      "https://some.vocab/predicate",
      true
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        predicate: "https://some.vocab/predicate",
        object: literalOfType("boolean", "true"),
      })
    ).toBe(true);
    expect((updatedQuads[0].subject as LocalNode).internal_name).toBe(
      "localSubject"
    );
  });

  it("preserves existing values for the same Predicate", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");
    thing.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.pod/resource#subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        literalOfType("boolean", "false")
      )
    );

    const updatedThing = addBoolean(
      thing,
      "https://some.vocab/predicate",
      true
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("boolean", "false"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("boolean", "true"),
      })
    ).toBe(true);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");
    thing.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.pod/resource#subject"),
        DataFactory.namedNode("https://some-other.vocab/predicate"),
        literalOfType("string", "Some other value")
      )
    );

    const updatedThing = addBoolean(
      thing,
      "https://some.vocab/predicate",
      true
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some-other.vocab/predicate",
        object: literalOfType("string", "Some other value"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("boolean", "true"),
      })
    ).toBe(true);
  });
});

describe("addDatetime", () => {
  it("adds the given datetime value for the given predicate", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addDatetime(
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
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addDatetime(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
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
      { internal_name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = addDatetime(
      thingLocal,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        predicate: "https://some.vocab/predicate",
        object: literalOfType("dateTime", "1990-11-12T13:37:42.000Z"),
      })
    ).toBe(true);
    expect((updatedQuads[0].subject as LocalNode).internal_name).toBe(
      "localSubject"
    );
  });

  it("preserves existing values for the same Predicate", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");
    thing.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.pod/resource#subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        literalOfType("dateTime", "1955-06-08T13:37:42.000Z")
      )
    );

    const updatedThing = addDatetime(
      thing,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("dateTime", "1955-06-08T13:37:42.000Z"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("dateTime", "1990-11-12T13:37:42.000Z"),
      })
    ).toBe(true);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");
    thing.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.pod/resource#subject"),
        DataFactory.namedNode("https://some-other.vocab/predicate"),
        literalOfType("string", "Some other value")
      )
    );

    const updatedThing = addDatetime(
      thing,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some-other.vocab/predicate",
        object: literalOfType("string", "Some other value"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("dateTime", "1990-11-12T13:37:42.000Z"),
      })
    ).toBe(true);
  });
});

describe("addDecimal", () => {
  it("adds the given decimal value for the given predicate", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addDecimal(
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
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addDecimal(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
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
      { internal_name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = addDecimal(
      thingLocal,
      "https://some.vocab/predicate",
      13.37
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        predicate: "https://some.vocab/predicate",
        object: literalOfType("decimal", "13.37"),
      })
    ).toBe(true);
    expect((updatedQuads[0].subject as LocalNode).internal_name).toBe(
      "localSubject"
    );
  });

  it("preserves existing values for the same Predicate", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");
    thing.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.pod/resource#subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        literalOfType("decimal", "4.2")
      )
    );

    const updatedThing = addDecimal(
      thing,
      "https://some.vocab/predicate",
      13.37
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("decimal", "4.2"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("decimal", "13.37"),
      })
    ).toBe(true);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");
    thing.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.pod/resource#subject"),
        DataFactory.namedNode("https://some-other.vocab/predicate"),
        literalOfType("string", "Some other value")
      )
    );

    const updatedThing = addDecimal(
      thing,
      "https://some.vocab/predicate",
      13.37
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some-other.vocab/predicate",
        object: literalOfType("string", "Some other value"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("decimal", "13.37"),
      })
    ).toBe(true);
  });
});

describe("addInteger", () => {
  it("adds the given integer value for the given predicate", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addInteger(thing, "https://some.vocab/predicate", 42);

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
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addInteger(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      42
    );

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
      { internal_name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = addInteger(
      thingLocal,
      "https://some.vocab/predicate",
      42
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        predicate: "https://some.vocab/predicate",
        object: literalOfType("integer", "42"),
      })
    ).toBe(true);
    expect((updatedQuads[0].subject as LocalNode).internal_name).toBe(
      "localSubject"
    );
  });

  it("preserves existing values for the same Predicate", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");
    thing.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.pod/resource#subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        literalOfType("integer", "1337")
      )
    );

    const updatedThing = addInteger(thing, "https://some.vocab/predicate", 42);

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("integer", "1337"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("integer", "42"),
      })
    ).toBe(true);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");
    thing.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.pod/resource#subject"),
        DataFactory.namedNode("https://some-other.vocab/predicate"),
        literalOfType("string", "Some other value")
      )
    );

    const updatedThing = addInteger(thing, "https://some.vocab/predicate", 42);

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some-other.vocab/predicate",
        object: literalOfType("string", "Some other value"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("integer", "42"),
      })
    ).toBe(true);
  });
});

describe("addStringWithLocale", () => {
  it("adds the given localised string value for the given predicate", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addStringWithLocale(
      thing,
      "https://some.vocab/predicate",
      "Some string",
      "en-GB"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some string", "en-gb"),
      })
    ).toBe(true);
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addStringWithLocale(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "Some string",
      "en-GB"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some string", "en-gb"),
      })
    ).toBe(true);
  });

  it("does not modify the input Thing", () => {
    const thing = getMockEmptyThing("https://arbitrary.pod/resource#subject");

    const updatedThing = addStringWithLocale(
      thing,
      DataFactory.namedNode("https://arbitrary.vocab/predicate"),
      "Some string",
      "en-GB"
    );

    expect(Array.from(thing)).toHaveLength(0);
    expect(Array.from(updatedThing)).toHaveLength(1);
  });

  it("also works on ThingLocals", () => {
    const localSubject: LocalNode = Object.assign(
      DataFactory.blankNode("Arbitrary blank node"),
      { internal_name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = addStringWithLocale(
      thingLocal,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "Some string",
      "en-GB"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some string", "en-gb"),
      })
    ).toBe(true);
    expect((updatedQuads[0].subject as LocalNode).internal_name).toBe(
      "localSubject"
    );
  });

  it("preserves existing values for the same Predicate", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");
    thing.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.pod/resource#subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.literal("Some string", "nl-NL")
      )
    );

    const updatedThing = addStringWithLocale(
      thing,
      "https://some.vocab/predicate",
      "Some string",
      "en-GB"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some string", "nl-nl"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some string", "en-gb"),
      })
    ).toBe(true);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");
    thing.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.pod/resource#subject"),
        DataFactory.namedNode("https://some-other.vocab/predicate"),
        literalOfType("string", "Some other value")
      )
    );

    const updatedThing = addStringWithLocale(
      thing,
      "https://some.vocab/predicate",
      "Some string",
      "en-GB"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some-other.vocab/predicate",
        object: literalOfType("string", "Some other value"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some string", "en-gb"),
      })
    ).toBe(true);
  });
});

describe("addStringNoLocale", () => {
  it("adds the given unlocalised string value for the given predicate", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addStringNoLocale(
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
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addStringNoLocale(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
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
      { internal_name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = addStringNoLocale(
      thingLocal,
      "https://some.vocab/predicate",
      "Some string value"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        predicate: "https://some.vocab/predicate",
        object: literalOfType("string", "Some string value"),
      })
    ).toBe(true);
    expect((updatedQuads[0].subject as LocalNode).internal_name).toBe(
      "localSubject"
    );
  });

  it("preserves existing values for the same Predicate", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");
    thing.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.pod/resource#subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        literalOfType("string", "Some other string value")
      )
    );

    const updatedThing = addStringNoLocale(
      thing,
      "https://some.vocab/predicate",
      "Some string value"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("string", "Some other string value"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("string", "Some string value"),
      })
    ).toBe(true);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");
    thing.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.pod/resource#subject"),
        DataFactory.namedNode("https://some-other.vocab/predicate"),
        literalOfType("integer", "42")
      )
    );

    const updatedThing = addStringNoLocale(
      thing,
      "https://some.vocab/predicate",
      "Some string value"
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some-other.vocab/predicate",
        object: literalOfType("integer", "42"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("string", "Some string value"),
      })
    ).toBe(true);
  });
});

describe("addNamedNode", () => {
  it("adds the given NamedNode value for the given predicate", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addNamedNode(
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
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addNamedNode(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
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
      { internal_name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = addNamedNode(
      thingLocal,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toBe(true);
    expect((updatedQuads[0].subject as LocalNode).internal_name).toBe(
      "localSubject"
    );
  });

  it("preserves existing values for the same Predicate", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");
    thing.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.pod/resource#subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://some.pod/other-resource#object")
      )
    );

    const updatedThing = addNamedNode(
      thing,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/yet-another-resource#object")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode(
          "https://some.pod/yet-another-resource#object"
        ),
      })
    ).toBe(true);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");
    thing.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.pod/resource#subject"),
        DataFactory.namedNode("https://some-other.vocab/predicate"),
        literalOfType("string", "Some other value")
      )
    );

    const updatedThing = addNamedNode(
      thing,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some-other.vocab/predicate",
        object: literalOfType("string", "Some other value"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toBe(true);
  });
});

describe("addLiteral", () => {
  it("adds the given Literal value for the given predicate", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addLiteral(
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
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addLiteral(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
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
      { internal_name: "localSubject" }
    );
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = addLiteral(
      thingLocal,
      "https://some.vocab/predicate",
      DataFactory.literal("Some string value")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some string value"),
      })
    ).toBe(true);
    expect((updatedQuads[0].subject as LocalNode).internal_name).toBe(
      "localSubject"
    );
  });

  it("preserves existing values for the same Predicate", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");
    thing.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.pod/resource#subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.literal("Some other string value")
      )
    );

    const updatedThing = addLiteral(
      thing,
      "https://some.vocab/predicate",
      DataFactory.literal("Some string value")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some other string value"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some string value"),
      })
    ).toBe(true);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");
    thing.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.pod/resource#subject"),
        DataFactory.namedNode("https://some-other.vocab/predicate"),
        literalOfType("integer", "42")
      )
    );

    const updatedThing = addLiteral(
      thing,
      "https://some.vocab/predicate",
      DataFactory.literal("Some string value")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some-other.vocab/predicate",
        object: literalOfType("integer", "42"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some string value"),
      })
    ).toBe(true);
  });
});

describe("addTerm", () => {
  it("adds the given NamedNode value for the given predicate", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addTerm(
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

  it("adds the given Literal value for the given predicate", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addTerm(
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
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addTerm(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
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

  it("does not modify the input Thing", () => {
    const thing = getMockEmptyThing("https://arbitrary.pod/resource#subject");

    const updatedThing = addTerm(
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
      { internal_name: "localSubject" }
    );
    const datasetWithThingLocal = dataset();
    const thingLocal: ThingLocal = Object.assign(datasetWithThingLocal, {
      internal_localSubject: localSubject,
    });

    const updatedThing = addTerm(
      thingLocal,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(1);
    expect(
      quadHas(updatedQuads[0], {
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toBe(true);
    expect((updatedQuads[0].subject as LocalNode).internal_name).toBe(
      "localSubject"
    );
  });

  it("preserves existing values for the same Predicate", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");
    thing.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.pod/resource#subject"),
        DataFactory.namedNode("https://some.vocab/predicate"),
        DataFactory.namedNode("https://some.pod/other-resource#object")
      )
    );

    const updatedThing = addTerm(
      thing,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/yet-another-resource#object")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode(
          "https://some.pod/yet-another-resource#object"
        ),
      })
    ).toBe(true);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");
    thing.add(
      DataFactory.quad(
        DataFactory.namedNode("https://some.pod/resource#subject"),
        DataFactory.namedNode("https://some-other.vocab/predicate"),
        literalOfType("string", "Some other value")
      )
    );

    const updatedThing = addTerm(
      thing,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    const updatedQuads = Array.from(updatedThing);
    expect(updatedQuads).toHaveLength(2);
    expect(
      quadHas(updatedQuads[0], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some-other.vocab/predicate",
        object: literalOfType("string", "Some other value"),
      })
    ).toBe(true);
    expect(
      quadHas(updatedQuads[1], {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.namedNode("https://some.pod/other-resource#object"),
      })
    ).toBe(true);
  });
});
