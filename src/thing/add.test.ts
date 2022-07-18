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
import { Thing } from "../interfaces";
import {
  addUrl,
  addBoolean,
  addDatetime,
  addDate,
  addTime,
  addDecimal,
  addInteger,
  addStringEnglish,
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
import { localNodeSkolemPrefix } from "../rdf.internal";

describe("addIri", () => {
  it("adds the given IRI value for the given predicate", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addUrl(
      thing,
      "https://some.vocab/predicate",
      "https://some.pod/other-resource#object"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toStrictEqual({
      namedNodes: ["https://some.pod/other-resource#object"],
    });
  });

  it("accepts values as Named Nodes", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addUrl(
      thing,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toStrictEqual({
      namedNodes: ["https://some.pod/other-resource#object"],
    });
  });

  it("accepts values as ThingPersisteds", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");
    const targetThing = mockThingFrom("https://some.pod/other-resource#object");

    const updatedThing = addUrl(
      thing,
      "https://some.vocab/predicate",
      targetThing
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toStrictEqual({
      namedNodes: ["https://some.pod/other-resource#object"],
    });
  });

  it("accepts values as ThingLocals", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");
    const thingLocal = mockThingFrom(`${localNodeSkolemPrefix}localObject`);

    const updatedThing = addUrl(
      thing,
      "https://some.vocab/predicate",
      thingLocal
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toStrictEqual({
      namedNodes: [`${localNodeSkolemPrefix}localObject`],
    });
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addUrl(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "https://some.pod/other-resource#object"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toStrictEqual({
      namedNodes: ["https://some.pod/other-resource#object"],
    });
  });

  it("does not modify the input Thing", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addUrl(
      thing,
      "https://some.vocab/predicate",
      "https://some.pod/other-resource#object"
    );

    expect(thing).not.toStrictEqual(updatedThing);
    expect(thing.predicates["https://some.vocab/predicate"]).toBeUndefined();
    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toStrictEqual({
      namedNodes: ["https://some.pod/other-resource#object"],
    });
  });

  it("also works on ThingLocals", () => {
    const thingLocal = mockThingFrom(
      "https://arbitrary.pod/will-be-replaced-by-local-url"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}arbitrary-subject-name`;

    const updatedThing = addUrl(
      thingLocal,
      "https://some.vocab/predicate",
      "https://some.pod/other-resource#object"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toStrictEqual({
      namedNodes: ["https://some.pod/other-resource#object"],
    });
  });

  it("preserves existing values for the same Predicate", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some.vocab/predicate": {
          namedNodes: ["https://some.pod/other-resource#object"],
        },
      },
    };

    const updatedThing = addUrl(
      thing,
      "https://some.vocab/predicate",
      "https://some.pod/yet-another-resource#object"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toStrictEqual({
      namedNodes: [
        "https://some.pod/other-resource#object",
        "https://some.pod/yet-another-resource#object",
      ],
    });
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some-other.vocab/predicate": {
          namedNodes: ["https://some.pod/other-resource#object"],
        },
      },
    };

    const updatedThing = addUrl(
      thing,
      "https://some.vocab/predicate",
      "https://some.pod/other-resource#object"
    );

    expect(updatedThing.predicates).toStrictEqual({
      "https://some-other.vocab/predicate": {
        namedNodes: ["https://some.pod/other-resource#object"],
      },
      "https://some.vocab/predicate": {
        namedNodes: ["https://some.pod/other-resource#object"],
      },
    });
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      addUrl(
        null as unknown as Thing,
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
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addBoolean(
      thing,
      "https://some.vocab/predicate",
      true
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#boolean"
      ]
    ).toStrictEqual(["true"]);
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addBoolean(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      false
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#boolean"
      ]
    ).toStrictEqual(["false"]);
  });

  it("does not modify the input Thing", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addBoolean(
      thing,
      "https://some.vocab/predicate",
      true
    );

    expect(thing).not.toStrictEqual(updatedThing);
    expect(thing.predicates).toStrictEqual({});
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#boolean"
      ]
    ).toStrictEqual(["true"]);
  });

  it("also works on ThingLocals", () => {
    const thingLocal = mockThingFrom(
      "https://arbitrary.pod/will-be-replaced-by-local-url"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}localSubject`;

    const updatedThing = addBoolean(
      thingLocal,
      "https://some.vocab/predicate",
      true
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#boolean"
      ]
    ).toStrictEqual(["true"]);
  });

  it("preserves existing values for the same Predicate", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some.vocab/predicate": {
          literals: { "http://www.w3.org/2001/XMLSchema#boolean": ["false"] },
        },
      },
    };

    const updatedThing = addBoolean(
      thing,
      "https://some.vocab/predicate",
      true
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#boolean"
      ]
    ).toStrictEqual(["false", "true"]);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some-other.vocab/predicate": {
          literals: { "http://www.w3.org/2001/XMLSchema#boolean": ["false"] },
        },
      },
    };

    const updatedThing = addBoolean(
      thing,
      "https://some.vocab/predicate",
      true
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#boolean"
      ]
    ).toStrictEqual(["true"]);
    expect(
      updatedThing.predicates["https://some-other.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#boolean"
      ]
    ).toStrictEqual(["false"]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      addBoolean(
        null as unknown as Thing,
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
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addDatetime(
      thing,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#dateTime"
      ]
    ).toStrictEqual(["1990-11-12T13:37:42.000Z"]);
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addDatetime(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#dateTime"
      ]
    ).toStrictEqual(["1990-11-12T13:37:42.000Z"]);
  });

  it("does not modify the input Thing", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addDatetime(
      thing,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(thing).not.toStrictEqual(updatedThing);
    expect(thing.predicates["https://some.vocab/predicate"]).toBeUndefined();
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#dateTime"
      ]
    ).toStrictEqual(["1990-11-12T13:37:42.000Z"]);
  });

  it("also works on ThingLocals", () => {
    const thingLocal = mockThingFrom(
      "https://arbitrary.pod/will-be-replaced-by-local-url"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}localSubject`;

    const updatedThing = addDatetime(
      thingLocal,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#dateTime"
      ]
    ).toStrictEqual(["1990-11-12T13:37:42.000Z"]);
  });

  it("preserves existing values for the same Predicate", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some.vocab/predicate": {
          literals: {
            "http://www.w3.org/2001/XMLSchema#dateTime": [
              "1955-06-08T13:37:42.000Z",
            ],
          },
        },
      },
    };

    const updatedThing = addDatetime(
      thing,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#dateTime"
      ]
    ).toStrictEqual(["1955-06-08T13:37:42.000Z", "1990-11-12T13:37:42.000Z"]);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some-other.vocab/predicate": {
          literals: {
            "http://www.w3.org/2001/XMLSchema#string": ["Some other value"],
          },
        },
      },
    };

    const updatedThing = addDatetime(
      thing,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0))
    );

    expect(
      updatedThing.predicates["https://some-other.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#string"
      ]
    ).toStrictEqual(["Some other value"]);
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#dateTime"
      ]
    ).toStrictEqual(["1990-11-12T13:37:42.000Z"]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      addDatetime(
        null as unknown as Thing,
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

describe("addDate", () => {
  it("adds the given date value for the given predicate", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addDate(
      thing,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#date"
      ]
    ).toStrictEqual(["1990-11-12Z"]);
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addDate(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      new Date(Date.UTC(1990, 10, 12))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#date"
      ]
    ).toStrictEqual(["1990-11-12Z"]);
  });

  it("does not modify the input Thing", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addDate(
      thing,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12))
    );

    expect(thing).not.toStrictEqual(updatedThing);
    expect(thing.predicates["https://some.vocab/predicate"]).toBeUndefined();
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#date"
      ]
    ).toStrictEqual(["1990-11-12Z"]);
  });

  it("also works on ThingLocals", () => {
    const thingLocal = mockThingFrom(
      "https://arbitrary.pod/will-be-replaced-by-local-url"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}localSubject`;

    const updatedThing = addDate(
      thingLocal,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#date"
      ]
    ).toStrictEqual(["1990-11-12Z"]);
  });

  it("preserves existing values for the same Predicate", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some.vocab/predicate": {
          literals: {
            "http://www.w3.org/2001/XMLSchema#date": ["1955-06-08Z"],
          },
        },
      },
    };

    const updatedThing = addDate(
      thing,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12))
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#date"
      ]
    ).toStrictEqual(["1955-06-08Z", "1990-11-12Z"]);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some-other.vocab/predicate": {
          literals: {
            "http://www.w3.org/2001/XMLSchema#string": ["Some other value"],
          },
        },
      },
    };

    const updatedThing = addDate(
      thing,
      "https://some.vocab/predicate",
      new Date(Date.UTC(1990, 10, 12))
    );

    expect(
      updatedThing.predicates["https://some-other.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#string"
      ]
    ).toStrictEqual(["Some other value"]);
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#date"
      ]
    ).toStrictEqual(["1990-11-12Z"]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      addDate(
        null as unknown as Thing,
        "https://arbitrary.vocab/predicate",
        new Date(Date.UTC(1990, 10, 12))
      )
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      addDate(
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
      addDate(
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

describe("addTime", () => {
  it("adds the given time value for the given predicate", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addTime(thing, "https://some.vocab/predicate", {
      hour: 13,
      minute: 37,
      second: 42,
    });

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#time"
      ]
    ).toStrictEqual(["13:37:42"]);
  });

  it("accepts milliseconds", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addTime(thing, "https://some.vocab/predicate", {
      hour: 13,
      minute: 37,
      second: 42,
      millisecond: 367,
    });

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#time"
      ]
    ).toStrictEqual(["13:37:42.367"]);
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addTime(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      {
        hour: 13,
        minute: 37,
        second: 42,
      }
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#time"
      ]
    ).toStrictEqual(["13:37:42"]);
  });

  it("does not modify the input Thing", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addTime(thing, "https://some.vocab/predicate", {
      hour: 13,
      minute: 37,
      second: 42,
    });

    expect(thing).not.toStrictEqual(updatedThing);
    expect(thing.predicates["https://some.vocab/predicate"]).toBeUndefined();
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#time"
      ]
    ).toStrictEqual(["13:37:42"]);
  });

  it("also works on ThingLocals", () => {
    const thingLocal = mockThingFrom(
      "https://arbitrary.pod/will-be-replaced-by-local-url"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}localSubject`;

    const updatedThing = addTime(thingLocal, "https://some.vocab/predicate", {
      hour: 13,
      minute: 37,
      second: 42,
    });

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#time"
      ]
    ).toStrictEqual(["13:37:42"]);
  });

  it("preserves existing values for the same Predicate", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some.vocab/predicate": {
          literals: {
            "http://www.w3.org/2001/XMLSchema#time": ["13:37:42"],
          },
        },
      },
    };

    const updatedThing = addTime(thing, "https://some.vocab/predicate", {
      hour: 13,
      minute: 40,
      second: 42,
    });

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#time"
      ]
    ).toStrictEqual(["13:37:42", "13:40:42"]);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some-other.vocab/predicate": {
          literals: {
            "http://www.w3.org/2001/XMLSchema#string": ["Some other value"],
          },
        },
      },
    };

    const updatedThing = addTime(thing, "https://some.vocab/predicate", {
      hour: 13,
      minute: 37,
      second: 42,
    });

    expect(
      updatedThing.predicates["https://some-other.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#string"
      ]
    ).toStrictEqual(["Some other value"]);
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#time"
      ]
    ).toStrictEqual(["13:37:42"]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      addTime(null as unknown as Thing, "https://arbitrary.vocab/predicate", {
        hour: 13,
        minute: 37,
        second: 42,
      })
    ).toThrow("Expected a Thing, but received: [null].");
  });

  it("throws an error when passed an invalid property URL", () => {
    expect(() =>
      addTime(
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
      addTime(
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

describe("addDecimal", () => {
  it("adds the given decimal value for the given predicate", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addDecimal(
      thing,
      "https://some.vocab/predicate",
      13.37
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#decimal"
      ]
    ).toStrictEqual(["13.37"]);
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addDecimal(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      13.37
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#decimal"
      ]
    ).toStrictEqual(["13.37"]);
  });

  it("does not modify the input Thing", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addDecimal(
      thing,
      "https://some.vocab/predicate",
      13.37
    );

    expect(thing).not.toStrictEqual(updatedThing);
    expect(thing.predicates).toStrictEqual({});
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#decimal"
      ]
    ).toStrictEqual(["13.37"]);
  });

  it("also works on ThingLocals", () => {
    const thingLocal = mockThingFrom(
      "https://arbitrary.pod/will-be-replaced-by-local-url"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}localSubject`;

    const updatedThing = addDecimal(
      thingLocal,
      "https://some.vocab/predicate",
      13.37
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#decimal"
      ]
    ).toStrictEqual(["13.37"]);
  });

  it("preserves existing values for the same Predicate", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some.vocab/predicate": {
          literals: { "http://www.w3.org/2001/XMLSchema#decimal": ["4.2"] },
        },
      },
    };

    const updatedThing = addDecimal(
      thing,
      "https://some.vocab/predicate",
      13.37
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#decimal"
      ]
    ).toStrictEqual(["4.2", "13.37"]);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some-other.vocab/predicate": {
          literals: {
            "http://www.w3.org/2001/XMLSchema#string": ["Some other value"],
          },
        },
      },
    };

    const updatedThing = addDecimal(
      thing,
      "https://some.vocab/predicate",
      13.37
    );

    expect(
      updatedThing.predicates["https://some-other.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#string"
      ]
    ).toStrictEqual(["Some other value"]);
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#decimal"
      ]
    ).toStrictEqual(["13.37"]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      addDecimal(
        null as unknown as Thing,
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
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addInteger(thing, "https://some.vocab/predicate", 42);

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#integer"
      ]
    ).toStrictEqual(["42"]);
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addInteger(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      42
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#integer"
      ]
    ).toStrictEqual(["42"]);
  });

  it("does not modify the input Thing", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addInteger(thing, "https://some.vocab/predicate", 42);

    expect(thing).not.toStrictEqual(updatedThing);
    expect(thing.predicates).toStrictEqual({});
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#integer"
      ]
    ).toStrictEqual(["42"]);
  });

  it("also works on ThingLocals", () => {
    const thingLocal = mockThingFrom(
      "https://arbitrary.pod/will-be-replaced-by-local-url"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}localSubject`;

    const updatedThing = addInteger(
      thingLocal,
      "https://some.vocab/predicate",
      42
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#integer"
      ]
    ).toStrictEqual(["42"]);
  });

  it("preserves existing values for the same Predicate", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some.vocab/predicate": {
          literals: { "http://www.w3.org/2001/XMLSchema#integer": ["1337"] },
        },
      },
    };

    const updatedThing = addInteger(thing, "https://some.vocab/predicate", 42);

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#integer"
      ]
    ).toStrictEqual(["1337", "42"]);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some-other.vocab/predicate": {
          literals: {
            "http://www.w3.org/2001/XMLSchema#string": ["Some other value"],
          },
        },
      },
    };

    const updatedThing = addInteger(thing, "https://some.vocab/predicate", 42);

    expect(
      updatedThing.predicates["https://some-other.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#string"
      ]
    ).toStrictEqual(["Some other value"]);
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#integer"
      ]
    ).toStrictEqual(["42"]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      addInteger(
        null as unknown as Thing,
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

describe("addStringEnglish", () => {
  it("adds the given value as an English string for the given predicate", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addStringEnglish(
      thing,
      "https://some.vocab/predicate",
      "Some string"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].langStrings
    ).toStrictEqual({
      en: ["Some string"],
    });
  });
});

describe("addStringWithLocale", () => {
  it("adds the given localised string value for the given predicate", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addStringWithLocale(
      thing,
      "https://some.vocab/predicate",
      "Some string",
      "en-GB"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].langStrings
    ).toStrictEqual({
      "en-gb": ["Some string"],
    });
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addStringWithLocale(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "Some string",
      "en-GB"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].langStrings
    ).toStrictEqual({
      "en-gb": ["Some string"],
    });
  });

  it("does not modify the input Thing", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addStringWithLocale(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "Some string",
      "en-GB"
    );

    expect(thing).not.toStrictEqual(updatedThing);
    expect(thing.predicates).toStrictEqual({});
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].langStrings
    ).toStrictEqual({
      "en-gb": ["Some string"],
    });
  });

  it("also works on ThingLocals", () => {
    const thingLocal = mockThingFrom(
      "https://arbitrary.pod/will-be-replaced-by-local-url"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}localSubject`;

    const updatedThing = addStringWithLocale(
      thingLocal,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "Some string",
      "en-GB"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].langStrings
    ).toStrictEqual({
      "en-gb": ["Some string"],
    });
  });

  it("preserves existing values for the same Predicate", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some.vocab/predicate": {
          langStrings: { "nl-nl": ["Some string"] },
        },
      },
    };

    const updatedThing = addStringWithLocale(
      thing,
      "https://some.vocab/predicate",
      "Some string",
      "en-GB"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].langStrings
    ).toStrictEqual({
      "nl-nl": ["Some string"],
      "en-gb": ["Some string"],
    });
  });

  it("preserves existing values for the same Predicate and locale", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some.vocab/predicate": {
          langStrings: { "nl-nl": ["Some string"] },
        },
      },
    };

    const updatedThing = addStringWithLocale(
      thing,
      "https://some.vocab/predicate",
      "Some other string",
      "nl-nl"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].langStrings
    ).toStrictEqual({
      "nl-nl": ["Some string", "Some other string"],
    });
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some-other.vocab/predicate": {
          literals: {
            "http://www.w3.org/2001/XMLSchema#string": ["Some other value"],
          },
        },
      },
    };

    const updatedThing = addStringWithLocale(
      thing,
      "https://some.vocab/predicate",
      "Some string",
      "en-GB"
    );

    expect(
      updatedThing.predicates["https://some-other.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#string"
      ]
    ).toStrictEqual(["Some other value"]);
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].langStrings
    ).toStrictEqual({
      "en-gb": ["Some string"],
    });
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      addStringWithLocale(
        null as unknown as Thing,
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
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addStringNoLocale(
      thing,
      "https://some.vocab/predicate",
      "Some string value"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#string"
      ]
    ).toStrictEqual(["Some string value"]);
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addStringNoLocale(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      "Some string value"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#string"
      ]
    ).toStrictEqual(["Some string value"]);
  });

  it("does not modify the input Thing", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addStringNoLocale(
      thing,
      "https://some.vocab/predicate",
      "Some string value"
    );

    expect(thing).not.toStrictEqual(updatedThing);
    expect(thing.predicates).toStrictEqual({});
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#string"
      ]
    ).toStrictEqual(["Some string value"]);
  });

  it("also works on ThingLocals", () => {
    const thingLocal = mockThingFrom(
      "https://arbitrary.pod/will-be-replaced-by-local-url"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}localSubject`;

    const updatedThing = addStringNoLocale(
      thingLocal,
      "https://some.vocab/predicate",
      "Some string value"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#string"
      ]
    ).toStrictEqual(["Some string value"]);
  });

  it("preserves existing values for the same Predicate", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some.vocab/predicate": {
          literals: {
            "http://www.w3.org/2001/XMLSchema#string": [
              "Some other string value",
            ],
          },
        },
      },
    };

    const updatedThing = addStringNoLocale(
      thing,
      "https://some.vocab/predicate",
      "Some string value"
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#string"
      ]
    ).toStrictEqual(["Some other string value", "Some string value"]);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some-other.vocab/predicate": {
          literals: { "http://www.w3.org/2001/XMLSchema#integer": ["42"] },
        },
      },
    };

    const updatedThing = addStringNoLocale(
      thing,
      "https://some.vocab/predicate",
      "Some string value"
    );

    expect(
      updatedThing.predicates["https://some-other.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#integer"
      ]
    ).toStrictEqual(["42"]);
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#string"
      ]
    ).toStrictEqual(["Some string value"]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      addStringNoLocale(
        null as unknown as Thing,
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
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addNamedNode(
      thing,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toStrictEqual({
      namedNodes: ["https://some.pod/other-resource#object"],
    });
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addNamedNode(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toStrictEqual({
      namedNodes: ["https://some.pod/other-resource#object"],
    });
  });

  it("does not modify the input Thing", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addNamedNode(
      thing,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    expect(thing).not.toStrictEqual(updatedThing);
    expect(thing.predicates).toStrictEqual({});
    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toStrictEqual({
      namedNodes: ["https://some.pod/other-resource#object"],
    });
  });

  it("also works on ThingLocals", () => {
    const thingLocal = mockThingFrom(
      "https://arbitrary.pod/will-be-replaced-by-local-url"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}localSubject`;

    const updatedThing = addNamedNode(
      thingLocal,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toStrictEqual({
      namedNodes: ["https://some.pod/other-resource#object"],
    });
  });

  it("preserves existing values for the same Predicate", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some.vocab/predicate": {
          namedNodes: ["https://some.pod/other-resource#object"],
        },
      },
    };

    const updatedThing = addNamedNode(
      thing,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/yet-another-resource#object")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toStrictEqual({
      namedNodes: [
        "https://some.pod/other-resource#object",
        "https://some.pod/yet-another-resource#object",
      ],
    });
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some-other.vocab/predicate": {
          literals: {
            "http://www.w3.org/2001/XMLSchema#string": ["Some other value"],
          },
        },
      },
    };

    const updatedThing = addNamedNode(
      thing,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    expect(
      updatedThing.predicates["https://some-other.vocab/predicate"]
    ).toStrictEqual({
      literals: {
        "http://www.w3.org/2001/XMLSchema#string": ["Some other value"],
      },
    });
    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toStrictEqual({
      namedNodes: ["https://some.pod/other-resource#object"],
    });
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      addNamedNode(
        null as unknown as Thing,
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
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addLiteral(
      thing,
      "https://some.vocab/predicate",
      DataFactory.literal("Some string value")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#string"
      ]
    ).toStrictEqual(["Some string value"]);
  });

  it("adds the given langString Literal value for the given predicate", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addLiteral(
      thing,
      "https://some.vocab/predicate",
      DataFactory.literal("Some string value", "nl-nl")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].langStrings![
        "nl-nl"
      ]
    ).toStrictEqual(["Some string value"]);
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addLiteral(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.literal("Some string value")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#string"
      ]
    ).toStrictEqual(["Some string value"]);
  });

  it("does not modify the input Thing", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addLiteral(
      thing,
      "https://some.vocab/predicate",
      DataFactory.literal("Some string value")
    );

    expect(thing).not.toStrictEqual(updatedThing);
    expect(thing.predicates).toStrictEqual({});
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#string"
      ]
    ).toStrictEqual(["Some string value"]);
  });

  it("also works on ThingLocals", () => {
    const thingLocal = mockThingFrom(
      "https://arbitrary.pod/will-be-replaced-by-local-url"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}localSubject`;

    const updatedThing = addLiteral(
      thingLocal,
      "https://some.vocab/predicate",
      DataFactory.literal("Some string value")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#string"
      ]
    ).toStrictEqual(["Some string value"]);
  });

  it("preserves existing values for the same Predicate", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some.vocab/predicate": {
          literals: {
            "http://www.w3.org/2001/XMLSchema#string": [
              "Some other string value",
            ],
          },
        },
      },
    };

    const updatedThing = addLiteral(
      thing,
      "https://some.vocab/predicate",
      DataFactory.literal("Some string value")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#string"
      ]
    ).toStrictEqual(["Some other string value", "Some string value"]);
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some-other.vocab/predicate": {
          literals: { "http://www.w3.org/2001/XMLSchema#integer": ["42"] },
        },
      },
    };

    const updatedThing = addLiteral(
      thing,
      "https://some.vocab/predicate",
      DataFactory.literal("Some string value")
    );

    expect(
      updatedThing.predicates["https://some-other.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#integer"
      ]
    ).toStrictEqual(["42"]);
    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#string"
      ]
    ).toStrictEqual(["Some string value"]);
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      addLiteral(
        null as unknown as Thing,
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
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addTerm(
      thing,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toStrictEqual({
      namedNodes: ["https://some.pod/other-resource#object"],
    });
  });

  it("adds the given Literal value for the given predicate", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addTerm(
      thing,
      "https://some.vocab/predicate",
      DataFactory.literal(
        "Some string",
        DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#string")
      )
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].literals![
        "http://www.w3.org/2001/XMLSchema#string"
      ]
    ).toStrictEqual(["Some string"]);
  });

  it("adds the given Blank Node value for the given predicate", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addTerm(
      thing,
      "https://some.vocab/predicate",
      DataFactory.blankNode("some-blank-node-id")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"].blankNodes
    ).toStrictEqual(["_:some-blank-node-id"]);
  });

  it("accepts Properties as Named Nodes", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addTerm(
      thing,
      DataFactory.namedNode("https://some.vocab/predicate"),
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toStrictEqual({
      namedNodes: ["https://some.pod/other-resource#object"],
    });
  });

  it("does not modify the input Thing", () => {
    const thing = mockThingFrom("https://some.pod/resource#subject");

    const updatedThing = addTerm(
      thing,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    expect(thing).not.toStrictEqual(updatedThing);
    expect(thing.predicates).toStrictEqual({});
    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toStrictEqual({
      namedNodes: ["https://some.pod/other-resource#object"],
    });
  });

  it("also works on ThingLocals", () => {
    const thingLocal = mockThingFrom(
      "https://arbitrary.pod/will-be-replaced-by-local-url"
    );
    (thingLocal.url as string) = `${localNodeSkolemPrefix}localSubject`;

    const updatedThing = addTerm(
      thingLocal,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toStrictEqual({
      namedNodes: ["https://some.pod/other-resource#object"],
    });
  });

  it("preserves existing values for the same Predicate", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some.vocab/predicate": {
          blankNodes: ["_:some-blank-node"],
        },
      },
    };

    const updatedThing = addTerm(
      thing,
      "https://some.vocab/predicate",
      DataFactory.blankNode("some-other-blank-node")
    );

    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toStrictEqual({
      blankNodes: ["_:some-blank-node", "_:some-other-blank-node"],
    });
  });

  it("preserves existing Quads with different Predicates", () => {
    const thing: Thing = {
      type: "Subject",
      url: "https://some.pod/resource#subject",
      predicates: {
        "https://some-other.vocab/predicate": {
          literals: {
            "http://www.w3.org/2001/XMLSchema#string": ["Some other value"],
          },
        },
      },
    };

    const updatedThing = addTerm(
      thing,
      "https://some.vocab/predicate",
      DataFactory.namedNode("https://some.pod/other-resource#object")
    );

    expect(
      updatedThing.predicates["https://some-other.vocab/predicate"]
    ).toStrictEqual({
      literals: {
        "http://www.w3.org/2001/XMLSchema#string": ["Some other value"],
      },
    });
    expect(
      updatedThing.predicates["https://some.vocab/predicate"]
    ).toStrictEqual({
      namedNodes: ["https://some.pod/other-resource#object"],
    });
  });

  it("throws an error when passed something other than a Thing", () => {
    expect(() =>
      addTerm(
        null as unknown as Thing,
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
        DataFactory.blankNode()
      )
    ).toThrow(
      "Expected a valid URL to identify a property, but received: [not-a-url]."
    );
  });

  it("throws an error when passed a value of a different type than we understand", () => {
    expect(() =>
      addTerm(
        mockThingFrom("https://arbitrary.pod/resource#thing"),
        "https://arbitrary.vocab/predicate",
        { termType: "Unsupported term type", value: "Arbitrary value" } as any
      )
    ).toThrow(
      "Term type [Unsupported term type] is not supported by @inrupt/solid-client."
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
