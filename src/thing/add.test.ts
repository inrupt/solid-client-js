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

import { Quad, Term } from "rdf-js";
import { DataFactory } from "n3";
import { dataset } from "@rdfjs/dataset";
import { IriString, ThingLocal, LocalNode, Thing } from "../interfaces";
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
import { mockThingFrom } from "./mock";
import {
  ValidPropertyUrlExpectedError,
  ValidValueUrlExpectedError,
} from "./thing";
import { getMatchingQuads } from "../rdfjs.test";

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

    expect(updatedThing.size).toBe(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: "https://some.pod/other-resource#object",
      })
    ).toHaveLength(1);
  });

  it("accepts values as Named Nodes", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addUrl(
      thing,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    expect(updatedThing.size).toBe(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: "https://some.pod/other-resource#object",
      })
    ).toHaveLength(1);
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

    expect(updatedThing.size).toBe(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: "https://some.pod/other-resource#object",
      })
    ).toHaveLength(1);
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

    expect(updatedThing.size).toBe(1);
    const matchingQuads = getMatchingQuads(updatedThing, {
      subject: "https://some.pod/resource#subject",
      predicate: "https://some.vocab/predicate",
    });
    expect((matchingQuads[0].object as LocalNode).internal_name).toBe(
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

    expect(updatedThing.size).toBe(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: "https://some.pod/other-resource#object",
      })
    ).toHaveLength(1);
  });

  it("does not modify the input Thing", () => {
    const thing = getMockEmptyThing("https://arbitrary.pod/resource#subject");

    const updatedThing = addUrl(
      thing,
      "https://arbitrary.vocab/predicate",
      "https://arbitrary.pod/other-resource#object"
    );

    expect(thing.size).toBe(0);
    expect(updatedThing.size).toBe(1);
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

    expect(updatedThing.size).toBe(1);
    const matchingQuads = getMatchingQuads(updatedThing, {
      predicate: "https://some.vocab/predicate",
      object: "https://some.pod/other-resource#object",
    });
    expect((matchingQuads[0].subject as LocalNode).internal_name).toBe(
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

    expect(updatedThing.size).toBe(2);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: "https://some.pod/other-resource#object",
      })
    ).toHaveLength(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: "https://some.pod/yet-another-resource#object",
      })
    ).toHaveLength(1);
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

    expect(updatedThing.size).toBe(2);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some-other.vocab/predicate",
        object: literalOfType("string", "Some other value"),
      })
    ).toHaveLength(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: "https://some.pod/other-resource#object",
      })
    ).toHaveLength(1);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      addUrl(
        (null as unknown) as Thing,
        "https://arbitrary.vocab/predicate",
        "https://arbitrary.url"
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      addUrl(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        "https://arbitrary.url"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      addUrl(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        "https://arbitrary.url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });

  it("throws an error when passed an invalid URL value", () => {
    expect(() =>
      addUrl(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "https://arbitrary.vocab/predicate",
        "not-a-url"
      )
    ).toThrow("Expected a valid URL value, but received: [not-a-url].");
  });

  it("throws an instance of ValidValueUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      addUrl(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "https://arbitrary.vocab/predicate",
        "not-a-url"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidValueUrlExpectedError);
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

    expect(updatedThing.size).toBe(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("boolean", "true"),
      })
    ).toHaveLength(1);
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addBoolean(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      false
    );

    expect(updatedThing.size).toBe(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("boolean", "false"),
      })
    ).toHaveLength(1);
  });

  it("does not modify the input Thing", () => {
    const thing = getMockEmptyThing("https://arbitrary.pod/resource#subject");

    const updatedThing = addBoolean(
      thing,
      "https://arbitrary.vocab/predicate",
      true
    );

    expect(thing.size).toBe(0);
    expect(updatedThing.size).toBe(1);
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

    expect(updatedThing.size).toBe(1);
    const matchingQuads = getMatchingQuads(updatedThing, {
      predicate: "https://some.vocab/predicate",
      object: literalOfType("boolean", "true"),
    });
    expect((matchingQuads[0].subject as LocalNode).internal_name).toBe(
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

    expect(updatedThing.size).toBe(2);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("boolean", "false"),
      })
    ).toHaveLength(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("boolean", "true"),
      })
    ).toHaveLength(1);
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

    expect(updatedThing.size).toBe(2);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some-other.vocab/predicate",
        object: literalOfType("string", "Some other value"),
      })
    ).toHaveLength(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("boolean", "true"),
      })
    ).toHaveLength(1);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      addBoolean(
        (null as unknown) as Thing,
        "https://arbitrary.vocab/predicate",
        true
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      addBoolean(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        true
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      addBoolean(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        true
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
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

    expect(updatedThing.size).toBe(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("dateTime", "1990-11-12T13:37:42.000Z"),
      })
    ).toHaveLength(1);
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addDatetime(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(updatedThing.size).toBe(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("dateTime", "1990-11-12T13:37:42.000Z"),
      })
    ).toHaveLength(1);
  });

  it("does not modify the input Thing", () => {
    const thing = getMockEmptyThing("https://arbitrary.pod/resource#subject");

    const updatedThing = addDatetime(
      thing,
      "https://arbitrary.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(thing.size).toBe(0);
    expect(updatedThing.size).toBe(1);
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

    expect(updatedThing.size).toBe(1);
    const matchingQuads = getMatchingQuads(updatedThing, {
      predicate: "https://some.vocab/predicate",
      object: literalOfType("dateTime", "1990-11-12T13:37:42.000Z"),
    });
    expect((matchingQuads[0].subject as LocalNode).internal_name).toBe(
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

    expect(updatedThing.size).toBe(2);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("dateTime", "1955-06-08T13:37:42.000Z"),
      })
    ).toHaveLength(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("dateTime", "1990-11-12T13:37:42.000Z"),
      })
    ).toHaveLength(1);
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

    expect(updatedThing.size).toBe(2);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some-other.vocab/predicate",
        object: literalOfType("string", "Some other value"),
      })
    ).toHaveLength(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("dateTime", "1990-11-12T13:37:42.000Z"),
      })
    ).toHaveLength(1);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      addDatetime(
        (null as unknown) as Thing,
        "https://arbitrary.vocab/predicate",
        new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      addDatetime(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      addDatetime(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
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

    expect(updatedThing.size).toBe(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("decimal", "13.37"),
      })
    ).toHaveLength(1);
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addDecimal(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      13.37
    );

    expect(updatedThing.size).toBe(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("decimal", "13.37"),
      })
    ).toHaveLength(1);
  });

  it("does not modify the input Thing", () => {
    const thing = getMockEmptyThing("https://arbitrary.pod/resource#subject");

    const updatedThing = addDecimal(
      thing,
      "https://arbitrary.vocab/predicate",
      13.37
    );

    expect(thing.size).toBe(0);
    expect(updatedThing.size).toBe(1);
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

    expect(updatedThing.size).toBe(1);
    const matchedQuads = getMatchingQuads(updatedThing, {
      predicate: "https://some.vocab/predicate",
      object: literalOfType("decimal", "13.37"),
    });
    expect((matchedQuads[0].subject as LocalNode).internal_name).toBe(
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

    expect(updatedThing.size).toBe(2);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("decimal", "4.2"),
      })
    ).toHaveLength(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("decimal", "13.37"),
      })
    ).toHaveLength(1);
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

    expect(updatedThing.size).toBe(2);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some-other.vocab/predicate",
        object: literalOfType("string", "Some other value"),
      })
    ).toHaveLength(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("decimal", "13.37"),
      })
    ).toHaveLength(1);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      addDecimal(
        (null as unknown) as Thing,
        "https://arbitrary.vocab/predicate",
        13.37
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      addDecimal(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        13.37
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      addDecimal(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        13.37
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("addInteger", () => {
  it("adds the given integer value for the given predicate", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addInteger(thing, "https://some.vocab/predicate", 42);

    expect(updatedThing.size).toBe(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("integer", "42"),
      })
    ).toHaveLength(1);
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addInteger(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      42
    );

    expect(updatedThing.size).toBe(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("integer", "42"),
      })
    ).toHaveLength(1);
  });

  it("does not modify the input Thing", () => {
    const thing = getMockEmptyThing("https://arbitrary.pod/resource#subject");

    const updatedThing = addInteger(
      thing,
      "https://arbitrary.vocab/predicate",
      42
    );

    expect(thing.size).toBe(0);
    expect(updatedThing.size).toBe(1);
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

    expect(updatedThing.size).toBe(1);
    const matchedQuads = getMatchingQuads(updatedThing, {
      predicate: "https://some.vocab/predicate",
      object: literalOfType("integer", "42"),
    });
    expect((matchedQuads[0].subject as LocalNode).internal_name).toBe(
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

    expect(updatedThing.size).toBe(2);
    expect(
      getMatchingQuads(updatedThing, {
        predicate: "https://some.vocab/predicate",
        object: literalOfType("integer", "1337"),
      })
    ).toHaveLength(1);
    expect(
      getMatchingQuads(updatedThing, {
        predicate: "https://some.vocab/predicate",
        object: literalOfType("integer", "42"),
      })
    ).toHaveLength(1);
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

    expect(updatedThing.size).toBe(2);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some-other.vocab/predicate",
        object: literalOfType("string", "Some other value"),
      })
    ).toHaveLength(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("integer", "42"),
      })
    ).toHaveLength(1);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      addInteger(
        (null as unknown) as Thing,
        "https://arbitrary.vocab/predicate",
        42
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      addInteger(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        42
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      addInteger(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        42
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
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

    expect(updatedThing.size).toBe(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some string", "en-gb"),
      })
    ).toHaveLength(1);
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addStringWithLocale(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "Some string",
      "en-GB"
    );

    expect(updatedThing.size).toBe(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some string", "en-gb"),
      })
    ).toHaveLength(1);
  });

  it("does not modify the input Thing", () => {
    const thing = getMockEmptyThing("https://arbitrary.pod/resource#subject");

    const updatedThing = addStringWithLocale(
      thing,
      DataFactory.namedNode("https://arbitrary.vocab/predicate"),
      "Some string",
      "en-GB"
    );

    expect(thing.size).toBe(0);
    expect(updatedThing.size).toBe(1);
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

    expect(updatedThing.size).toBe(1);
    const matchedQuads = getMatchingQuads(updatedThing, {
      predicate: "https://some.vocab/predicate",
      object: DataFactory.literal("Some string", "en-gb"),
    });
    expect((matchedQuads[0].subject as LocalNode).internal_name).toBe(
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

    expect(updatedThing.size).toBe(2);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some string", "nl-NL"),
      })
    ).toHaveLength(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some string", "en-gb"),
      })
    ).toHaveLength(1);
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

    expect(updatedThing.size).toBe(2);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some-other.vocab/predicate",
        object: literalOfType("string", "Some other value"),
      })
    ).toHaveLength(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some string", "en-gb"),
      })
    ).toHaveLength(1);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      addStringWithLocale(
        (null as unknown) as Thing,
        "https://arbitrary.vocab/predicate",
        "Arbitrary string",
        "nl-NL"
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      addStringWithLocale(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        "Arbitrary string",
        "nl-NL"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      addStringWithLocale(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        "Arbitrary string",
        "nl-NL"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
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

    expect(updatedThing.size).toBe(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("string", "Some string value"),
      })
    ).toHaveLength(1);
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addStringNoLocale(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "Some string value"
    );

    expect(updatedThing.size).toBe(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("string", "Some string value"),
      })
    ).toHaveLength(1);
  });

  it("does not modify the input Thing", () => {
    const thing = getMockEmptyThing("https://arbitrary.pod/resource#subject");

    const updatedThing = addStringNoLocale(
      thing,
      "https://arbitrary.vocab/predicate",
      "Arbitrary string value"
    );

    expect(thing.size).toBe(0);
    expect(updatedThing.size).toBe(1);
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

    expect(updatedThing.size).toBe(1);
    const matchedQuads = getMatchingQuads(updatedThing, {
      predicate: "https://some.vocab/predicate",
      object: literalOfType("string", "Some string value"),
    });
    expect((matchedQuads[0].subject as LocalNode).internal_name).toBe(
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

    expect(updatedThing.size).toBe(2);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("string", "Some other string value"),
      })
    ).toHaveLength(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("string", "Some string value"),
      })
    ).toHaveLength(1);
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

    expect(updatedThing.size).toBe(2);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some-other.vocab/predicate",
        object: literalOfType("integer", "42"),
      })
    ).toHaveLength(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: literalOfType("string", "Some string value"),
      })
    ).toHaveLength(1);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      addStringNoLocale(
        (null as unknown) as Thing,
        "https://arbitrary.vocab/predicate",
        "Arbitrary string"
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      addStringNoLocale(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        "Arbitrary string"
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      addStringNoLocale(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        "Arbitrary string"
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
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

    expect(updatedThing.size).toBe(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: "https://some.pod/other-resource#object",
      })
    ).toHaveLength(1);
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addNamedNode(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    expect(updatedThing.size).toBe(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: "https://some.pod/other-resource#object",
      })
    ).toHaveLength(1);
  });

  it("does not modify the input Thing", () => {
    const thing = getMockEmptyThing("https://arbitrary.pod/resource#subject");

    const updatedThing = addNamedNode(
      thing,
      "https://arbitrary.vocab/predicate",
      DataFactory.namedNode("https://arbitrary.pod/other-resource#object")
    );

    expect(thing.size).toBe(0);
    expect(updatedThing.size).toBe(1);
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

    expect(updatedThing.size).toBe(1);
    const matchedQuads = getMatchingQuads(updatedThing, {
      predicate: "https://some.vocab/predicate",
      object: "https://some.pod/other-resource#object",
    });
    expect((matchedQuads[0].subject as LocalNode).internal_name).toBe(
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

    expect(updatedThing.size).toBe(2);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: "https://some.pod/other-resource#object",
      })
    ).toHaveLength(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: "https://some.pod/yet-another-resource#object",
      })
    ).toHaveLength(1);
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

    expect(updatedThing.size).toBe(2);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some-other.vocab/predicate",
        object: literalOfType("string", "Some other value"),
      })
    ).toHaveLength(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: "https://some.pod/other-resource#object",
      })
    ).toHaveLength(1);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      addNamedNode(
        (null as unknown) as Thing,
        "https://arbitrary.vocab/predicate",
        DataFactory.namedNode("https://arbitrary.pod/resource#object")
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      addNamedNode(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        DataFactory.namedNode("https://arbitrary.vocab/object")
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      addNamedNode(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        DataFactory.namedNode("https://arbitrary.vocab/object")
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
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

    expect(updatedThing.size).toBe(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some string value"),
      })
    ).toHaveLength(1);
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addLiteral(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal("Some string value")
    );

    expect(updatedThing.size).toBe(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some string value"),
      })
    ).toHaveLength(1);
  });

  it("does not modify the input Thing", () => {
    const thing = getMockEmptyThing("https://arbitrary.pod/resource#subject");

    const updatedThing = addLiteral(
      thing,
      "https://arbitrary.vocab/predicate",
      DataFactory.literal("Arbitrary string value")
    );

    expect(thing.size).toBe(0);
    expect(updatedThing.size).toBe(1);
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

    expect(updatedThing.size).toBe(1);
    const matchedQuads = getMatchingQuads(updatedThing, {
      predicate: "https://some.vocab/predicate",
      object: DataFactory.literal("Some string value"),
    });
    expect((matchedQuads[0].subject as LocalNode).internal_name).toBe(
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

    expect(updatedThing.size).toBe(2);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some other string value"),
      })
    ).toHaveLength(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some string value"),
      })
    ).toHaveLength(1);
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

    expect(updatedThing.size).toBe(2);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some-other.vocab/predicate",
        object: literalOfType("integer", "42"),
      })
    ).toHaveLength(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal("Some string value"),
      })
    ).toHaveLength(1);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      addLiteral(
        (null as unknown) as Thing,
        "https://arbitrary.vocab/predicate",
        DataFactory.literal("Arbitrary string value")
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      addLiteral(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        DataFactory.literal("Arbitrary string value")
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      addLiteral(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        DataFactory.literal("Arbitrary string value")
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
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

    expect(updatedThing.size).toBe(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: "https://some.pod/other-resource#object",
      })
    ).toHaveLength(1);
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

    expect(updatedThing.size).toBe(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: DataFactory.literal(
          "Some string",
          DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#string")
        ),
      })
    ).toHaveLength(1);
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = getMockEmptyThing("https://some.pod/resource#subject");

    const updatedThing = addTerm(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    expect(updatedThing.size).toBe(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: "https://some.pod/other-resource#object",
      })
    ).toHaveLength(1);
  });

  it("does not modify the input Thing", () => {
    const thing = getMockEmptyThing("https://arbitrary.pod/resource#subject");

    const updatedThing = addTerm(
      thing,
      "https://arbitrary.vocab/predicate",
      DataFactory.namedNode("https://arbitrary.pod/other-resource#object")
    );

    expect(thing.size).toBe(0);
    expect(updatedThing.size).toBe(1);
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

    expect(updatedThing.size).toBe(1);
    const matchedQuads = getMatchingQuads(updatedThing, {
      predicate: "https://some.vocab/predicate",
      object: "https://some.pod/other-resource#object",
    });
    expect((matchedQuads[0].subject as LocalNode).internal_name).toBe(
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

    expect(updatedThing.size).toBe(2);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: "https://some.pod/other-resource#object",
      })
    ).toHaveLength(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: "https://some.pod/yet-another-resource#object",
      })
    ).toHaveLength(1);
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

    expect(updatedThing.size).toBe(2);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some-other.vocab/predicate",
        object: literalOfType("string", "Some other value"),
      })
    ).toHaveLength(1);
    expect(
      getMatchingQuads(updatedThing, {
        subject: "https://some.pod/resource#subject",
        predicate: "https://some.vocab/predicate",
        object: "https://some.pod/other-resource#object",
      })
    ).toHaveLength(1);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      addTerm(
        (null as unknown) as Thing,
        "https://arbitrary.vocab/predicate",
        DataFactory.namedNode("https://arbitrary.pod/resource#object")
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      addTerm(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        DataFactory.namedNode("https://arbitrary.vocab/object")
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      addTerm(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        DataFactory.namedNode("https://arbitrary.vocab/object")
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});
