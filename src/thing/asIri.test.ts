/**
 * Copyright 2021 Inrupt Inc.
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

import { Thing, ThingLocal, ThingPersisted } from "../interfaces";
import { LocalNodeIri, localNodeSkolemPrefix } from "../rdf.internal";

import { asUrl } from "./asIri";
import { mockThingFrom } from "./mock";
import { createThing } from "./thing";

describe("asIri", () => {
  it("returns the IRI of a persisted Thing", () => {
    const persistedThing = mockThingFrom("https://some.pod/resource#thing");

    expect(asUrl(persistedThing)).toBe("https://some.pod/resource#thing");
  });

  it("returns the IRI of a local Thing relative to a given base IRI", () => {
    const localThing: ThingLocal = {
      type: "Subject",
      predicates: {},
      url: (localNodeSkolemPrefix + "some-name") as LocalNodeIri,
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

    // @ts-expect-error
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
      url: (localNodeSkolemPrefix + "some-name") as LocalNodeIri,
    };

    expect(() => asUrl(localThing, undefined as any)).toThrow(
      "The URL of a Thing that has not been persisted cannot be determined without a base URL."
    );
  });
});
