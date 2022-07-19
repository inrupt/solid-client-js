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
import { buildThing } from "./build";
import * as adders from "./add";
import * as setters from "./set";
import * as removers from "./remove";
import { asIri, createThing, isThing } from "./thing";
import { ThingLocal } from "../interfaces";
import { getInteger, getStringWithLocale } from "./get";

describe("Thing Builder API", () => {
  it("adds the same properties as non-fluent functions", () => {
    const startingThing = createThing();

    const builtThing = buildThing(startingThing)
      .addInteger("https://some.vocab/predicate", 42)
      .addStringEnglish("https://some.vocab/predicate", "Some English string")
      .addStringWithLocale(
        "https://some.vocab/predicate",
        "Some string",
        "nl-nl"
      )
      .build();

    let nonBuilderThing = adders.addInteger(
      startingThing,
      "https://some.vocab/predicate",
      42
    );
    nonBuilderThing = adders.addStringEnglish(
      nonBuilderThing,
      "https://some.vocab/predicate",
      "Some English string"
    );
    nonBuilderThing = adders.addStringWithLocale(
      nonBuilderThing,
      "https://some.vocab/predicate",
      "Some string",
      "nl-nl"
    );

    expect(builtThing).toStrictEqual(nonBuilderThing);
  });

  it("replaces the same properties as the non-fluent functions", () => {
    let startingThing = adders.addDecimal(
      createThing(),
      "https://some.vocab/predicate",
      4.2
    );
    startingThing = adders.addStringWithLocale(
      startingThing,
      "https://some-other.vocab/predicate",
      "Some string",
      "nl-nl"
    );

    const builtThing = buildThing(startingThing)
      .setDecimal("https://some.vocab/predicate", 13.37)
      .setStringEnglish(
        "https://some-other.vocab/predicate",
        "Some English string"
      )
      .setStringWithLocale(
        "https://some-other.vocab/predicate",
        "Some other string",
        "nl-nl"
      )
      .build();

    let nonBuilderThing = setters.setDecimal(
      startingThing,
      "https://some.vocab/predicate",
      13.37
    );
    nonBuilderThing = setters.setStringEnglish(
      nonBuilderThing,
      "https://some-other.vocab/predicate",
      "Some English string"
    );
    nonBuilderThing = setters.setStringWithLocale(
      nonBuilderThing,
      "https://some-other.vocab/predicate",
      "Some other string",
      "nl-nl"
    );

    expect(builtThing).toStrictEqual(nonBuilderThing);
  });

  it("removes the same properties as the non-fluent functions", () => {
    let startingThing = adders.addDecimal(
      createThing(),
      "https://some.vocab/predicate",
      4.2
    );
    startingThing = adders.addStringEnglish(
      startingThing,
      "https://some.vocab/predicate-english",
      "Some English string"
    );
    startingThing = adders.addStringWithLocale(
      startingThing,
      "https://some.vocab/predicate",
      "Some string",
      "en-gb"
    );
    startingThing = adders.addBoolean(
      startingThing,
      "https://some-other.vocab/predicate",
      true
    );
    startingThing = adders.addStringNoLocale(
      startingThing,
      "https://yet-another.vocab/predicate",
      "Some unlocalised string"
    );

    const builtThing = buildThing(startingThing)
      .removeStringEnglish(
        "https://some.vocab/predicate-english",
        "Some English string"
      )
      .removeStringWithLocale(
        "https://some.vocab/predicate",
        "Some string",
        "en-gb"
      )
      .removeBoolean("https://some-other.vocab/predicate", true)
      .removeAll("https://yet-another.vocab/predicate")
      .build();

    let nonBuilderThing = removers.removeStringEnglish(
      startingThing,
      "https://some.vocab/predicate-english",
      "Some English string"
    );
    nonBuilderThing = removers.removeStringWithLocale(
      nonBuilderThing,
      "https://some.vocab/predicate",
      "Some string",
      "en-gb"
    );
    nonBuilderThing = removers.removeBoolean(
      nonBuilderThing,
      "https://some-other.vocab/predicate",
      true
    );
    nonBuilderThing = removers.removeAll(
      nonBuilderThing,
      "https://yet-another.vocab/predicate"
    );

    expect(builtThing).toStrictEqual(nonBuilderThing);
  });

  it("initialises a new Thing if not passed one", () => {
    const thing = buildThing().build();

    expect(isThing(thing)).toBe(true);
  });

  it("can take options for the Thing initialisation", () => {
    const thing = buildThing({
      url: "https://some.pod/resource#thing",
    }).build();
    expect(asIri(thing)).toBe("https://some.pod/resource#thing");
  });

  it("preserves the type (ThingLocal or ThingPersisted) of Things passed to it", () => {
    // We're only going to check for expected TypeScript errors:
    expect.assertions(0);

    // @ts-expect-error Since we're passing the `url` option, `buildThing`
    // should return a ThingPersisted, which should cause an error when
    // assigning to a ThingLocal variable:
    const _thingPersistedDirect: ThingLocal = buildThing({
      url: "https://some.pod/resource#thing",
    }).build();

    // @ts-expect-error Since we're passing a ThingPersisted as the starting
    // Thing, `buildThing` should also return a ThingPersisted, which should
    // cause an error when assigning to a ThingLocal variable:
    const _thingPersisted: ThingLocal = buildThing(
      createThing({ url: "https://some.pod/resource#thing" })
    ).build();

    // Since we're passing the `name` option, `buildThing` should return a ThingLocal,
    // which should not cause an error when assigning to a ThingLocal variable:
    const _thingLocalDirect: ThingLocal = buildThing({ name: "thing" }).build();

    // Since we're passing a ThingLocal as the starting Thing,
    // `buildThing` should also return a ThingLocal,
    // which should not cause an error when assigning to a ThingLocal variable:
    const _thingLocal: ThingLocal = buildThing(
      createThing({ name: "thing" })
    ).build();
  });

  it("has equivalents for every adder", () => {
    const adderNames = Object.keys(adders).filter(
      (adderName) => adderName.substring(0, 3) === "add"
    );
    expect.assertions(adderNames.length * 2);

    const builder = buildThing();

    adderNames.forEach((adderName) => {
      expect((builder as Record<string, unknown>)[adderName]).toBeDefined();
      expect(typeof (builder as Record<string, unknown>)[adderName]).toBe(
        "function"
      );
    });
  });

  it("has equivalents for every setter", () => {
    const setterNames = Object.keys(setters).filter(
      (setterName) => setterName.substring(0, 3) === "set"
    );
    expect.assertions(setterNames.length * 2);

    const builder = buildThing();

    setterNames.forEach((setterName) => {
      expect((builder as Record<string, unknown>)[setterName]).toBeDefined();
      expect(typeof (builder as Record<string, unknown>)[setterName]).toBe(
        "function"
      );
    });
  });

  it("has equivalents for every remover", () => {
    const removerNames = Object.keys(removers).filter(
      (removerName) => removerName.substring(0, 6) === "remove"
    );
    expect.assertions(removerNames.length * 2);

    const builder = buildThing();

    removerNames.forEach((removerName) => {
      expect((builder as Record<string, unknown>)[removerName]).toBeDefined();
      expect(typeof (builder as Record<string, unknown>)[removerName]).toBe(
        "function"
      );
    });
  });

  it("has methods that need not be chained", () => {
    const builder = buildThing().addInteger("https://some.vocab/predicate", 42);
    builder.addStringWithLocale(
      "https://some.vocab/predicate",
      "Some string",
      "nl-nl"
    );

    const thing = builder.build();

    expect(getInteger(thing, "https://some.vocab/predicate")).toBe(42);
    expect(
      getStringWithLocale(thing, "https://some.vocab/predicate", "nl-nl")
    ).toBe("Some string");
  });
});
