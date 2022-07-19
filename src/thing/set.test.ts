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
import { IriString, Thing } from "../interfaces";
import {
  setUrl,
  setBoolean,
  setDatetime,
  setDate,
  setTime,
  setDecimal,
  setInteger,
  setStringEnglish,
  setStringWithLocale,
  setStringNoLocale,
  setNamedNode,
  setLiteral,
  setTerm,
} from "./set";
import { mockThingFrom } from "./mock";
import {
  ValidPropertyUrlExpectedError,
  ValidValueUrlExpectedError,
} from "./thing";
import { localNodeSkolemPrefix } from "../rdf.internal";

function getMockThingWithLiteralFor(
  predicate: IriString,
  literalValue: string,
  literalType:
    | "string"
    | "integer"
    | "decimal"
    | "boolean"
    | "dateTime"
    | "time"
): Thing {
  return {
    type: "Subject",
    url: "https://arbitrary.vocab/subject",
    predicates: {
      [predicate]: {
        literals: {
          [`http://www.w3.org/2001/XMLSchema#${literalType}`]: [literalValue],
        },
      },
    },
  };
}
function getMockThingWithNamedNode(
  predicate: IriString,
  object: IriString
): Thing {
  return {
    type: "Subject",
    url: "https://arbitrary.vocab/subject",
    predicates: {
      [predicate]: {
        namedNodes: [object],
      },
    },
  };
}

describe("setIri", () => {
  it("replaces existing values with the given IRI for the given Predicate", () => {
    const thing = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object"
    );

    const updatedThing = setUrl(
      thing,
      "https://some.vocab/predicate",
      "https://some.pod/other-resource#object"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual(["https://some.pod/other-resource#object"]);
  });

  it("accepts values as Named Nodes", () => {
    const thing = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object"
    );

    const updatedThing = setUrl(
      thing,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual(["https://some.pod/other-resource#object"]);
  });

  it("accepts values as ThingPersisteds", () => {
    const thing = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object"
    );
    const targetThing = mockThingFrom("https://some.pod/other-resource#object");

    const updatedThing = setUrl(
      thing,
      "https://some.vocab/predicate",
      targetThing
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual(["https://some.pod/other-resource#object"]);
  });

  it("accepts values as ThingLocals", () => {
    const thing = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object"
    );
    const thingLocal = mockThingFrom("https://some.pod/other-resource#object");
    (thingLocal.url as string) = `${localNodeSkolemPrefix}localObject`;

    const updatedThing = setUrl(
      thing,
      "https://some.vocab/predicate",
      thingLocal
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual([`${localNodeSkolemPrefix}localObject`]);
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object"
    );

    const updatedThing = setUrl(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "https://some.pod/other-resource#object"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual(["https://some.pod/other-resource#object"]);
  });

  it("does not modify the input Thing", () => {
    const thing = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.pod/resource#object"
    );

    const updatedThing = setUrl(
      thing,
      "https://some.vocab/predicate",
      "https://some.pod/other-resource#object"
    );

    expect(thing).not.toStrictEqual(updatedThing);
    expect(
      thing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual(["https://some.pod/resource#object"]);
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual(["https://some.pod/other-resource#object"]);
  });

  it("also works on ThingLocals", () => {
    const thingLocal = mockThingFrom(
      "https://arbitrary.pod/will-be-replaced-by-local-url"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}localSubject`;

    const updatedThing = setUrl(
      thingLocal,
      "https://some.vocab/predicate",
      "https://some.pod/other-resource#object"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual(["https://some.pod/other-resource#object"]);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.pod/resource#object"
    );

    const updatedThing = setUrl(
      thing,
      "https://some.vocab/other-predicate",
      "https://some.pod/resource#object"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual(["https://some.pod/resource#object"]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      setUrl(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        "https://arbitrary.url"
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      setUrl(
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
      setUrl(
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
      setUrl(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "https://arbitrary.vocab/predicate",
        "not-a-url"
      )
    ).toThrow("Expected a valid URL value, but received: [not-a-url].");
  });

  it("throws an instance of ValidValueUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      setUrl(
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

describe("setBoolean", () => {
  it("replaces existing values with the given boolean for the given Predicate", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );

    const updatedThing = setBoolean(
      thing,
      "https://some.vocab/predicate",
      true
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#boolean": ["true"],
    });
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );

    const updatedThing = setBoolean(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      false
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#boolean": ["false"],
    });
  });

  it("does not modify the input Thing", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const updatedThing = setBoolean(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      true
    );

    expect(thing).not.toStrictEqual(updatedThing);
    expect(
      thing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string"],
    });
  });

  it("also works on ThingLocals", () => {
    const thingLocal = mockThingFrom(
      "https://arbitrary.pod/will-be-replaced-by-local-url"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}localSubject`;

    const updatedThing = setBoolean(
      thingLocal,
      "https://some.vocab/predicate",
      true
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#boolean": ["true"],
    });
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.pod/resource#object"
    );

    const updatedThing = setBoolean(
      thing,
      "https://some.vocab/other-predicate",
      true
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual(["https://some.pod/resource#object"]);
    expect(
      updatedThing.predicates["https://some.vocab/other-predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#boolean": ["true"],
    });
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      setBoolean(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        true
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      setBoolean(
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
      setBoolean(
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

describe("setDatetime", () => {
  it("replaces existing values with the given datetime for the given Predicate", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );

    const updatedThing = setDatetime(
      thing,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#dateTime": ["1990-11-12T13:37:42.000Z"],
    });
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );

    const updatedThing = setDatetime(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#dateTime": ["1990-11-12T13:37:42.000Z"],
    });
  });

  it("does not modify the input Thing", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const updatedThing = setDatetime(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(thing).not.toStrictEqual(updatedThing);
    expect(
      thing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#dateTime": ["1990-11-12T13:37:42.000Z"],
    });
  });

  it("also works on ThingLocals", () => {
    const thingLocal = mockThingFrom(
      "https://arbitrary.pod/will-be-replaced-by-local-url"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}localSubject`;

    const updatedThing = setDatetime(
      thingLocal,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#dateTime": ["1990-11-12T13:37:42.000Z"],
    });
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const updatedThing = setDatetime(
      thing,
      "https://some.vocab/other-predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/other-predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#dateTime": ["1990-11-12T13:37:42.000Z"],
    });
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      setDatetime(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      setDatetime(
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
      setDatetime(
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

describe("setDate", () => {
  it("replaces existing values with the given date for the given Predicate", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );

    const updatedThing = setDate(
      thing,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#date": ["1990-11-12Z"],
    });
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );

    const updatedThing = setDate(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      new Date(Date.UTC(1990, 10, 12))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#date": ["1990-11-12Z"],
    });
  });

  it("does not modify the input Thing", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const updatedThing = setDate(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      new Date(Date.UTC(1990, 10, 12))
    );

    expect(thing).not.toStrictEqual(updatedThing);
    expect(
      thing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#date": ["1990-11-12Z"],
    });
  });

  it("also works on ThingLocals", () => {
    const thingLocal = mockThingFrom(
      "https://arbitrary.pod/will-be-replaced-by-local-url"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}localSubject`;

    const updatedThing = setDate(
      thingLocal,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#date": ["1990-11-12Z"],
    });
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const updatedThing = setDate(
      thing,
      "https://some.vocab/other-predicate",
      new Date(Date.UTC(1990, 10, 12))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/other-predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#date": ["1990-11-12Z"],
    });
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      setDate(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        new Date(Date.UTC(1990, 10, 12))
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      setDate(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        new Date(Date.UTC(1990, 10, 12))
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      setDate(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        new Date(Date.UTC(1990, 10, 12))
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("setTime", () => {
  it("replaces existing values with the given time for the given Predicate", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );

    const updatedThing = setTime(thing, "https://some.vocab/predicate", {
      hour: 13,
      minute: 37,
      second: 42,
    });

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#time": ["13:37:42"],
    });
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );

    const updatedThing = setTime(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      {
        hour: 13,
        minute: 37,
        second: 42,
      }
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#time": ["13:37:42"],
    });
  });

  it("does not modify the input Thing", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const updatedThing = setTime(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      {
        hour: 13,
        minute: 37,
        second: 42,
      }
    );

    expect(thing).not.toStrictEqual(updatedThing);
    expect(
      thing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#time": ["13:37:42"],
    });
  });

  it("also works on ThingLocals", () => {
    const thingLocal = mockThingFrom(
      "https://arbitrary.pod/will-be-replaced-by-local-url"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}localSubject`;

    const updatedThing = setTime(thingLocal, "https://some.vocab/predicate", {
      hour: 13,
      minute: 37,
      second: 42,
    });

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#time": ["13:37:42"],
    });
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const updatedThing = setTime(thing, "https://some.vocab/other-predicate", {
      hour: 13,
      minute: 37,
      second: 42,
    });

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/other-predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#time": ["13:37:42"],
    });
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      setTime(null as unknown as Thing, "https://arbitrary.vocab/predicate", {
        hour: 13,
        minute: 37,
        second: 42,
      })
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      setTime(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        {
          hour: 13,
          minute: 37,
          second: 42,
        }
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an instance of ValidPropertyUrlExpectedError when passed an invalid property URL", () => {
    let thrownError;

    try {
      setTime(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "not-a-url",
        {
          hour: 13,
          minute: 37,
          second: 42,
        }
      );
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toBeInstanceOf(ValidPropertyUrlExpectedError);
  });
});

describe("setDecimal", () => {
  it("replaces existing values with the given decimal for the given Predicate", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );

    const updatedThing = setDecimal(
      thing,
      "https://some.vocab/predicate",
      13.37
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#decimal": ["13.37"],
    });
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );

    const updatedThing = setDecimal(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      13.37
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#decimal": ["13.37"],
    });
  });

  it("does not modify the input Thing", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const updatedThing = setDecimal(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      13.37
    );

    expect(thing).not.toStrictEqual(updatedThing);
    expect(
      thing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#decimal": ["13.37"],
    });
  });

  it("also works on ThingLocals", () => {
    const thingLocal = mockThingFrom(
      "https://arbitrary.pod/will-be-replaced-by-local-url"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}localSubject`;

    const updatedThing = setDecimal(
      thingLocal,
      "https://some.vocab/predicate",
      13.37
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#decimal": ["13.37"],
    });
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const updatedThing = setDecimal(
      thing,
      "https://some.vocab/other-predicate",
      13.37
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/other-predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#decimal": ["13.37"],
    });
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      setDecimal(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        13.37
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      setDecimal(
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
      setDecimal(
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

describe("setInteger", () => {
  it("replaces existing values with the given integer for the given Predicate", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );

    const updatedThing = setInteger(thing, "https://some.vocab/predicate", 42);

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#integer": ["42"],
    });
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );

    const updatedThing = setInteger(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      42
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#integer": ["42"],
    });
  });

  it("does not modify the input Thing", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const updatedThing = setInteger(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      42
    );

    expect(thing).not.toStrictEqual(updatedThing);
    expect(
      thing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#integer": ["42"],
    });
  });

  it("also works on ThingLocals", () => {
    const thingLocal = mockThingFrom(
      "https://arbitrary.pod/will-be-replaced-by-local-url"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}localSubject`;

    const updatedThing = setInteger(
      thingLocal,
      "https://some.vocab/predicate",
      42
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#integer": ["42"],
    });
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const updatedThing = setInteger(
      thing,
      "https://some.vocab/other-predicate",
      42
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/other-predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#integer": ["42"],
    });
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      setInteger(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        42
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      setInteger(
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
      setInteger(
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

describe("setStringEnglish", () => {
  it("replaces existing values with the given English string for the given Predicate", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );

    const updatedThing = setStringEnglish(
      thing,
      "https://some.vocab/predicate",
      "Some string value"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toBeUndefined();
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].langStrings
    ).toStrictEqual({
      en: ["Some string value"],
    });
  });
});

describe("setStringWithLocale", () => {
  it("replaces existing values with the given localised string for the given Predicate", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );

    const updatedThing = setStringWithLocale(
      thing,
      "https://some.vocab/predicate",
      "Some string value",
      "en-GB"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toBeUndefined();
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].langStrings
    ).toStrictEqual({
      "en-gb": ["Some string value"],
    });
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );

    const updatedThing = setStringWithLocale(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "Some string value",
      "en-GB"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].langStrings
    ).toStrictEqual({
      "en-gb": ["Some string value"],
    });
  });

  it("does not modify the input Thing", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const updatedThing = setStringWithLocale(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "Some string value",
      "en-GB"
    );

    expect(thing).not.toStrictEqual(updatedThing);
    expect(
      thing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].langStrings
    ).toStrictEqual({
      "en-gb": ["Some string value"],
    });
  });

  it("also works on ThingLocals", () => {
    const thingLocal = mockThingFrom(
      "https://arbitrary.pod/will-be-replaced-by-local-url"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}localSubject`;

    const updatedThing = setStringWithLocale(
      thingLocal,
      "https://some.vocab/predicate",
      "Some string value",
      "en-GB"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].langStrings
    ).toStrictEqual({
      "en-gb": ["Some string value"],
    });
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const updatedThing = setStringWithLocale(
      thing,
      "https://some.vocab/other-predicate",
      "Some string value",
      "en-GB"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/other-predicate"].langStrings
    ).toStrictEqual({
      "en-gb": ["Some string value"],
    });
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      setStringWithLocale(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        "Arbitrary string",
        "nl-NL"
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      setStringWithLocale(
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
      setStringWithLocale(
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

describe("setStringNoLocale", () => {
  it("replaces existing values with the given unlocalised string for the given Predicate", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );

    const updatedThing = setStringNoLocale(
      thing,
      "https://some.vocab/predicate",
      "Some string value"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string value"],
    });
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );

    const updatedThing = setStringNoLocale(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "Some string value"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string value"],
    });
  });

  it("does not modify the input Thing", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const updatedThing = setStringNoLocale(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "Some other string value"
    );

    expect(thing).not.toStrictEqual(updatedThing);
    expect(
      thing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some other string value"],
    });
  });

  it("also works on ThingLocals", () => {
    const thingLocal = mockThingFrom(
      "https://arbitrary.pod/will-be-replaced-by-local-url"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}localSubject`;

    const updatedThing = setStringNoLocale(
      thingLocal,
      "https://some.vocab/predicate",
      "Some string value"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string value"],
    });
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const updatedThing = setStringNoLocale(
      thing,
      "https://some.vocab/other-predicate",
      "Some string value"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/other-predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string value"],
    });
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      setStringNoLocale(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        "Arbitrary string"
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      setStringNoLocale(
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
      setStringNoLocale(
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

describe("setNamedNode", () => {
  it("replaces existing values with the given Named Node for the given Predicate", () => {
    const thing = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object"
    );

    const updatedThing = setNamedNode(
      thing,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual(["https://some.pod/other-resource#object"]);
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://arbitrary.pod/resource#object"
    );

    const updatedThing = setNamedNode(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual(["https://some.pod/other-resource#object"]);
  });

  it("does not modify the input Thing", () => {
    const thing = getMockThingWithNamedNode(
      "https://some.vocab/predicate",
      "https://some.pod/resource#object"
    );

    const updatedThing = setNamedNode(
      thing,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    expect(thing).not.toStrictEqual(updatedThing);
    expect(
      thing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual(["https://some.pod/resource#object"]);
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual(["https://some.pod/other-resource#object"]);
  });

  it("also works on ThingLocals", () => {
    const thingLocal = mockThingFrom(
      "https://arbitrary.pod/will-be-replaced-by-local-url"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}localSubject`;

    const updatedThing = setNamedNode(
      thingLocal,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual(["https://some.pod/other-resource#object"]);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const updatedThing = setNamedNode(
      thing,
      "https://some.vocab/other-predicate",
      DataFactory.namedNode("https://some.pod/resource#object")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/other-predicate"].namedNodes
    ).toStrictEqual(["https://some.pod/resource#object"]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      setNamedNode(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        DataFactory.namedNode("https://arbitrary.pod/resource#object")
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      setNamedNode(
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
      setNamedNode(
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

describe("setLiteral", () => {
  it("replaces existing values with the given Literal for the given Predicate", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );

    const updatedThing = setLiteral(
      thing,
      "https://some.vocab/predicate",
      DataFactory.literal("Some string value")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string value"],
    });
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );

    const updatedThing = setLiteral(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal("Some string value")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string value"],
    });
  });

  it("does not modify the input Thing", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const updatedThing = setLiteral(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal("Some string value")
    );

    expect(thing).not.toStrictEqual(updatedThing);
    expect(
      thing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string value"],
    });
  });

  it("also works on ThingLocals", () => {
    const thingLocal = mockThingFrom(
      "https://arbitrary.pod/will-be-replaced-by-local-url"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}localSubject`;

    const updatedThing = setLiteral(
      thingLocal,
      "https://some.vocab/predicate",
      DataFactory.literal("Some string value")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string value"],
    });
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const updatedThing = setLiteral(
      thing,
      "https://some.vocab/other-predicate",
      DataFactory.literal("Some string value")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/other-predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string value"],
    });
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      setLiteral(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        DataFactory.literal("Arbitrary string value")
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      setLiteral(
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
      setLiteral(
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

describe("setTerm", () => {
  it("replaces existing values with the given Named Node for the given Predicate", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );

    const updatedThing = setTerm(
      thing,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual(["https://some.pod/other-resource#object"]);
  });

  it("replaces existing values with the given Literal for the given Predicate", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );

    const updatedThing = setTerm(
      thing,
      "https://some.vocab/predicate",
      DataFactory.literal(
        "Some string",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#string")
      )
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string"],
    });
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Arbitrary string",
      "string"
    );

    const updatedThing = setTerm(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual(["https://some.pod/other-resource#object"]);
  });

  it("does not modify the input Thing", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const updatedThing = setTerm(
      thing,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    expect(thing).not.toStrictEqual(updatedThing);
    expect(
      thing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual(["https://some.pod/other-resource#object"]);
  });

  it("also works on ThingLocals", () => {
    const thingLocal = mockThingFrom(
      "https://arbitrary.pod/will-be-replaced-by-local-url"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}localSubject`;

    const updatedThing = setTerm(
      thingLocal,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].namedNodes
    ).toStrictEqual(["https://some.pod/other-resource#object"]);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing = getMockThingWithLiteralFor(
      "https://some.vocab/predicate",
      "Some string",
      "string"
    );

    const updatedThing = setTerm(
      thing,
      "https://some.vocab/other-predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals
    ).toStrictEqual({
      "http://www.w3.org/2001/XMLSchema#string": ["Some string"],
    });
    expect(
      updatedThing.predicates["https://some.vocab/other-predicate"].namedNodes
    ).toStrictEqual(["https://some.pod/other-resource#object"]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      setTerm(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        DataFactory.namedNode("https://arbitrary.pod/resource#object")
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      setTerm(
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
      setTerm(
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
