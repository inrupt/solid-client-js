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
import { buildThing } from "./build";
import * as adders from "./add";
import * as setters from "./set";
import * as removers from "./remove";
import { asIri, createThing, isThing } from "./thing";
import { ThingLocal } from "../interfaces";

describe("Thing Builder API", () => {
  it("adds the same properties as non-fluent functions", () => {
    const startingThing = createThing();

    const builtThing = buildThing(startingThing)
      .addInteger("https://some.vocab/predicate", 42)
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
      .removeStringWithLocale(
        "https://some.vocab/predicate",
        "Some string",
        "en-gb"
      )
      .removeBoolean("https://some-other.vocab/predicate", true)
      .removeAll("https://yet-another.vocab/predicate")
      .build();

    let nonBuilderThing = removers.removeStringWithLocale(
      startingThing,
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

    // Since we're passing the `url` option, `buildThing` should return a ThingPersisted,
    // which should cause an error when assigning to a ThingLocal variable:
    // @ts-expect-error
    const _thingPersistedDirect: ThingLocal = buildThing({
      url: "https://some.pod/resource#thing",
    }).build();

    // Since we're passing a ThingPersisted as the starting Thing,
    // `buildThing` should also return a ThingPersisted,
    // which should cause an error when assigning to a ThingLocal variable:
    // @ts-expect-error
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
      expect((builder as Record<string, Function>)[adderName]).toBeDefined();
      expect(typeof (builder as Record<string, Function>)[adderName]).toBe(
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
      expect((builder as Record<string, Function>)[setterName]).toBeDefined();
      expect(typeof (builder as Record<string, Function>)[setterName]).toBe(
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
      expect((builder as Record<string, Function>)[removerName]).toBeDefined();
      expect(typeof (builder as Record<string, Function>)[removerName]).toBe(
        "function"
      );
    });
  });
});
