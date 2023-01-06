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

import type { Literal, Quad_Object, NamedNode } from "@rdfjs/types";
import { Time } from "../datatypes";
import {
  Thing,
  ThingLocal,
  ThingPersisted,
  Url,
  UrlString,
} from "../interfaces";
import {
  addBoolean,
  addDate,
  addDatetime,
  addTime,
  addDecimal,
  addInteger,
  addIri,
  addLiteral,
  addNamedNode,
  AddOfType,
  addStringNoLocale,
  addStringWithLocale,
  addTerm,
  addUrl,
} from "./add";
import {
  removeAll,
  removeBoolean,
  removeDate,
  removeDatetime,
  removeTime,
  removeDecimal,
  removeInteger,
  removeIri,
  removeLiteral,
  removeNamedNode,
  RemoveOfType,
  removeStringNoLocale,
  removeStringWithLocale,
  removeUrl,
} from "./remove";
import {
  setBoolean,
  setDate,
  setDatetime,
  setTime,
  setDecimal,
  setInteger,
  setIri,
  setLiteral,
  setNamedNode,
  SetOfType,
  setStringNoLocale,
  setStringWithLocale,
  setTerm,
  setUrl,
} from "./set";
import {
  createThing,
  CreateThingLocalOptions,
  CreateThingOptions,
  CreateThingPersistedOptions,
  isThing,
} from "./thing";

type Adder<Type, T extends Thing> = (
  property: Parameters<AddOfType<Type>>[1],
  value: Parameters<AddOfType<Type>>[2]
) => ThingBuilder<T>;
type Setter<Type, T extends Thing> = (
  property: Parameters<SetOfType<Type>>[1],
  value: Parameters<SetOfType<Type>>[2]
) => ThingBuilder<T>;
type Remover<Type, T extends Thing> = (
  property: Parameters<RemoveOfType<Type>>[1],
  value: Parameters<RemoveOfType<Type>>[2]
) => ThingBuilder<T>;

// Unfortunately this interface has too many properties for TypeScript to infer,
// hence the duplication between the interface and the implementation method names.
/**
 * A Fluent interface to build a [[Thing]].
 *
 * Add, replace or remove property values using consecutive calls to `.add*()`,
 * `.set*()` and `.remove*()`, then finally generate a [[Thing]] with the given
 * properties using `.build()`.
 * @since 1.9.0
 */
export type ThingBuilder<T extends Thing> = {
  build: () => T;
  addUrl: Adder<Url | UrlString | Thing, T>;
  addIri: Adder<Url | UrlString | Thing, T>;
  addBoolean: Adder<boolean, T>;
  addDatetime: Adder<Date, T>;
  addDate: Adder<Date, T>;
  addTime: Adder<Time, T>;
  addDecimal: Adder<number, T>;
  addInteger: Adder<number, T>;
  addStringNoLocale: Adder<string, T>;
  addStringEnglish: Adder<string, T>;
  addStringWithLocale: (
    property: Parameters<typeof addStringWithLocale>[1],
    value: Parameters<typeof addStringWithLocale>[2],
    locale: Parameters<typeof addStringWithLocale>[3]
  ) => ThingBuilder<T>;
  addNamedNode: Adder<NamedNode, T>;
  addLiteral: Adder<Literal, T>;
  addTerm: Adder<Quad_Object, T>;
  setUrl: Setter<Url | UrlString | Thing, T>;
  setIri: Setter<Url | UrlString | Thing, T>;
  setBoolean: Setter<boolean, T>;
  setDatetime: Setter<Date, T>;
  setDate: Setter<Date, T>;
  setTime: Setter<Time, T>;
  setDecimal: Setter<number, T>;
  setInteger: Setter<number, T>;
  setStringNoLocale: Setter<string, T>;
  setStringEnglish: Setter<string, T>;
  setStringWithLocale: (
    property: Parameters<typeof setStringWithLocale>[1],
    value: Parameters<typeof setStringWithLocale>[2],
    locale: Parameters<typeof setStringWithLocale>[3]
  ) => ThingBuilder<T>;
  setNamedNode: Setter<NamedNode, T>;
  setLiteral: Setter<Literal, T>;
  setTerm: Setter<Quad_Object, T>;
  removeAll: (property: Parameters<typeof removeLiteral>[1]) => ThingBuilder<T>;
  removeUrl: Remover<Url | UrlString | Thing, T>;
  removeIri: Remover<Url | UrlString | Thing, T>;
  removeBoolean: Remover<boolean, T>;
  removeDatetime: Remover<Date, T>;
  removeDate: Remover<Date, T>;
  removeTime: Remover<Time, T>;
  removeDecimal: Remover<number, T>;
  removeInteger: Remover<number, T>;
  removeStringNoLocale: Remover<string, T>;
  removeStringEnglish: Remover<string, T>;
  removeStringWithLocale: (
    property: Parameters<typeof removeStringWithLocale>[1],
    value: Parameters<typeof removeStringWithLocale>[2],
    locale: Parameters<typeof removeStringWithLocale>[3]
  ) => ThingBuilder<T>;
  removeNamedNode: Remover<NamedNode, T>;
  removeLiteral: Remover<Literal, T>;
};

/**
 * Modify a [[Thing]], setting multiple properties in a single expresssion.
 *
 * For example, you can initialise several properties of a given Thing as follows:
 *
 *     const me = buildThing(createThing({ name: "profile-vincent" }))
 *       .addUrl(rdf.type, schema.Person)
 *       .addStringNoLocale(schema.givenName, "Vincent")
 *       .build();
 *
 * Take note of the final call to `.build()` to obtain the actual Thing.
 *
 * @param init A Thing to modify.
 * @returns a [[ThingBuilder]], a Fluent API that allows you to set multiple properties in a single expression.
 * @since 1.9.0
 */
export function buildThing(init: ThingLocal): ThingBuilder<ThingLocal>;
/**
 * Modify a [[Thing]], setting multiple properties in a single expresssion.
 *
 * For example, you can initialise several properties of a given Thing as follows:
 *
 *     const me = buildThing(createThing({ url: "https://example.pod/profile#vincent" }))
 *       .addUrl(rdf.type, schema.Person)
 *       .addStringNoLocale(schema.givenName, "Vincent")
 *       .build();
 *
 * Take note of the final call to `.build()` to obtain the actual Thing.
 *
 * @param init A Thing to modify.
 * @returns a [[ThingBuilder]], a Fluent API that allows you to set multiple properties in a single expression.
 * @since 1.9.0
 */
export function buildThing(init: ThingPersisted): ThingBuilder<ThingPersisted>;
/**
 * Create a [[Thing]], setting multiple properties in a single expresssion.
 *
 * For example, you can create a new Thing and initialise several properties as follows:
 *
 *     const me = buildThing({ name: "profile-vincent" })
 *       .addUrl(rdf.type, schema.Person)
 *       .addStringNoLocale(schema.givenName, "Vincent")
 *       .build();
 *
 * Take note of the final call to `.build()` to obtain the actual Thing.
 *
 * @param init Options used to initialise a new Thing.
 * @returns a [[ThingBuilder]], a Fluent API that allows you to set multiple properties in a single expression.
 * @since 1.9.0
 */
export function buildThing(
  init: CreateThingLocalOptions
): ThingBuilder<ThingLocal>;
/**
 * Create a [[Thing]], setting multiple properties in a single expresssion.
 *
 * For example, you can create a new Thing and initialise several properties as follows:
 *
 *     const me = buildThing({ url: "https://example.pod/profile#vincent" })
 *       .addUrl(rdf.type, schema.Person)
 *       .addStringNoLocale(schema.givenName, "Vincent")
 *       .build();
 *
 * Take note of the final call to `.build()` to obtain the actual Thing.
 *
 * @param init Optionally pass an existing [[Thing]] to modify the properties of. If left empty, `buildThing` will initialise a new Thing.
 * @returns a [[ThingBuilder]], a Fluent API that allows you to set multiple properties in a single expression.
 * @since 1.9.0
 */
export function buildThing(
  init: CreateThingPersistedOptions
): ThingBuilder<ThingPersisted>;
/**
 * Create a [[Thing]], setting multiple properties in a single expresssion.
 *
 * For example, you can create a new Thing and initialise several properties as follows:
 *
 *     const me = buildThing()
 *       .addUrl(rdf.type, schema.Person)
 *       .addStringNoLocale(schema.givenName, "Vincent")
 *       .build();
 *
 * Take note of the final call to `.build()` to obtain the actual Thing.
 *
 * @returns a [[ThingBuilder]], a Fluent API that allows you to set multiple properties in a single expression.
 * @since 1.9.0
 */
export function buildThing(): ThingBuilder<ThingLocal>;
/**
 * Create or modify a [[Thing]], setting multiple properties in a single expresssion.
 *
 * For example, you can create a new Thing and initialise several properties as follows:
 *
 *     const me = buildThing()
 *       .addUrl(rdf.type, schema.Person)
 *       .addStringNoLocale(schema.givenName, "Vincent")
 *       .build();
 *
 * Take note of the final call to `.build()` to obtain the actual Thing.
 *
 * @param init Optionally pass an existing [[Thing]] to modify the properties of. If left empty, `buildThing` will initialise a new Thing.
 * @returns a [[ThingBuilder]], a Fluent API that allows you to set multiple properties in a single expression.
 * @since 1.9.0
 */
export function buildThing(
  init: Thing | CreateThingOptions = createThing()
): ThingBuilder<Thing> {
  let thing = isThing(init) ? init : createThing(init);

  function getAdder<Type>(adder: AddOfType<Type>) {
    return (
      property: Parameters<typeof adder>[1],
      value: Parameters<typeof adder>[2]
    ) => {
      thing = adder(thing, property, value);
      return builder;
    };
  }

  function getSetter<Type>(setter: SetOfType<Type>) {
    return (
      property: Parameters<typeof setter>[1],
      value: Parameters<typeof setter>[2]
    ) => {
      thing = setter(thing, property, value);
      return builder;
    };
  }

  function getRemover<Type>(remover: RemoveOfType<Type>) {
    return (
      property: Parameters<typeof remover>[1],
      value: Parameters<typeof remover>[2]
    ) => {
      thing = remover(thing, property, value);
      return builder;
    };
  }

  const builder: ThingBuilder<Thing> = {
    build: () => thing,
    addUrl: getAdder(addUrl),
    addIri: getAdder(addIri),
    addBoolean: getAdder(addBoolean),
    addDatetime: getAdder(addDatetime),
    addDate: getAdder(addDate),
    addTime: getAdder(addTime),
    addDecimal: getAdder(addDecimal),
    addInteger: getAdder(addInteger),
    addStringNoLocale: getAdder(addStringNoLocale),
    addStringEnglish: (
      property: Parameters<typeof addStringWithLocale>[1],
      value: Parameters<typeof addStringWithLocale>[2]
    ) => {
      thing = addStringWithLocale(thing, property, value, "en");
      return builder;
    },
    addStringWithLocale: (
      property: Parameters<typeof addStringWithLocale>[1],
      value: Parameters<typeof addStringWithLocale>[2],
      locale: Parameters<typeof addStringWithLocale>[3]
    ) => {
      thing = addStringWithLocale(thing, property, value, locale);
      return builder;
    },
    addNamedNode: getAdder(addNamedNode),
    addLiteral: getAdder(addLiteral),
    addTerm: getAdder(addTerm),
    setUrl: getSetter(setUrl),
    setIri: getSetter(setIri),
    setBoolean: getSetter(setBoolean),
    setDatetime: getSetter(setDatetime),
    setDate: getSetter(setDate),
    setTime: getSetter(setTime),
    setDecimal: getSetter(setDecimal),
    setInteger: getSetter(setInteger),
    setStringNoLocale: getSetter(setStringNoLocale),
    setStringEnglish: (
      property: Parameters<typeof setStringWithLocale>[1],
      value: Parameters<typeof setStringWithLocale>[2]
    ) => {
      thing = setStringWithLocale(thing, property, value, "en");
      return builder;
    },
    setStringWithLocale: (
      property: Parameters<typeof setStringWithLocale>[1],
      value: Parameters<typeof setStringWithLocale>[2],
      locale: Parameters<typeof setStringWithLocale>[3]
    ) => {
      thing = setStringWithLocale(thing, property, value, locale);
      return builder;
    },
    setNamedNode: getSetter(setNamedNode),
    setLiteral: getSetter(setLiteral),
    setTerm: getSetter(setTerm),
    removeAll: (property: Parameters<typeof removeAll>[1]) => {
      thing = removeAll(thing, property);
      return builder;
    },
    removeUrl: getRemover(removeUrl),
    removeIri: getRemover(removeIri),
    removeBoolean: getRemover(removeBoolean),
    removeDatetime: getRemover(removeDatetime),
    removeDate: getRemover(removeDate),
    removeTime: getRemover(removeTime),
    removeDecimal: getRemover(removeDecimal),
    removeInteger: getRemover(removeInteger),
    removeStringNoLocale: getRemover(removeStringNoLocale),
    removeStringEnglish: (
      property: Parameters<typeof removeStringWithLocale>[1],
      value: Parameters<typeof removeStringWithLocale>[2]
    ) => buildThing(removeStringWithLocale(thing, property, value, "en")),
    removeStringWithLocale: (
      property: Parameters<typeof removeStringWithLocale>[1],
      value: Parameters<typeof removeStringWithLocale>[2],
      locale: Parameters<typeof removeStringWithLocale>[3]
    ) => buildThing(removeStringWithLocale(thing, property, value, locale)),
    removeNamedNode: getRemover(removeNamedNode),
    removeLiteral: getRemover(removeLiteral),
  };

  return builder;
}
