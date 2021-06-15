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

import {
  Thing,
  ThingLocal,
  ThingPersisted,
  Url,
  UrlString,
} from "../interfaces";
import {
  addBoolean,
  addDatetime,
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
  removeDatetime,
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
  setDatetime,
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
  addDecimal: Adder<number, T>;
  addInteger: Adder<number, T>;
  addStringNoLocale: Adder<string, T>;
  addStringWithLocale: (
    property: Parameters<typeof addStringWithLocale>[1],
    value: Parameters<typeof addStringWithLocale>[2],
    locale: Parameters<typeof addStringWithLocale>[3]
  ) => ThingBuilder<T>;
  addNamedNode: (
    property: Parameters<typeof addNamedNode>[1],
    value: Parameters<typeof addNamedNode>[2]
  ) => ThingBuilder<T>;
  addLiteral: (
    property: Parameters<typeof addLiteral>[1],
    value: Parameters<typeof addLiteral>[2]
  ) => ThingBuilder<T>;
  addTerm: (
    property: Parameters<typeof addTerm>[1],
    value: Parameters<typeof addTerm>[2]
  ) => ThingBuilder<T>;
  setUrl: Setter<Url | UrlString | Thing, T>;
  setIri: Setter<Url | UrlString | Thing, T>;
  setBoolean: Setter<boolean, T>;
  setDatetime: Setter<Date, T>;
  setDecimal: Setter<number, T>;
  setInteger: Setter<number, T>;
  setStringNoLocale: Setter<string, T>;
  setStringWithLocale: (
    property: Parameters<typeof setStringWithLocale>[1],
    value: Parameters<typeof setStringWithLocale>[2],
    locale: Parameters<typeof setStringWithLocale>[3]
  ) => ThingBuilder<T>;
  setNamedNode: (
    property: Parameters<typeof setNamedNode>[1],
    value: Parameters<typeof setNamedNode>[2]
  ) => ThingBuilder<T>;
  setLiteral: (
    property: Parameters<typeof setLiteral>[1],
    value: Parameters<typeof setLiteral>[2]
  ) => ThingBuilder<T>;
  setTerm: (
    property: Parameters<typeof setTerm>[1],
    value: Parameters<typeof setTerm>[2]
  ) => ThingBuilder<T>;
  removeAll: (property: Parameters<typeof removeLiteral>[1]) => ThingBuilder<T>;
  removeUrl: Remover<Url | UrlString | Thing, T>;
  removeIri: Remover<Url | UrlString | Thing, T>;
  removeBoolean: Remover<boolean, T>;
  removeDatetime: Remover<Date, T>;
  removeDecimal: Remover<number, T>;
  removeInteger: Remover<number, T>;
  removeStringNoLocale: Remover<string, T>;
  removeStringWithLocale: (
    property: Parameters<typeof removeStringWithLocale>[1],
    value: Parameters<typeof removeStringWithLocale>[2],
    locale: Parameters<typeof removeStringWithLocale>[3]
  ) => ThingBuilder<T>;
  removeNamedNode: (
    property: Parameters<typeof removeNamedNode>[1],
    value: Parameters<typeof removeNamedNode>[2]
  ) => ThingBuilder<T>;
  removeLiteral: (
    property: Parameters<typeof removeLiteral>[1],
    value: Parameters<typeof removeLiteral>[2]
  ) => ThingBuilder<T>;
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
  const thing = isThing(init) ? init : createThing(init);
  return {
    build: () => thing,
    addUrl: getAdder(thing, addUrl),
    addIri: getAdder(thing, addIri),
    addBoolean: getAdder(thing, addBoolean),
    addDatetime: getAdder(thing, addDatetime),
    addDecimal: getAdder(thing, addDecimal),
    addInteger: getAdder(thing, addInteger),
    addStringNoLocale: getAdder(thing, addStringNoLocale),
    addStringWithLocale: (
      property: Parameters<typeof addStringWithLocale>[1],
      value: Parameters<typeof addStringWithLocale>[2],
      locale: Parameters<typeof addStringWithLocale>[3]
    ) => buildThing(addStringWithLocale(thing, property, value, locale)),
    addNamedNode: getAdder(thing, addNamedNode),
    addLiteral: getAdder(thing, addLiteral),
    addTerm: getAdder(thing, addTerm),
    setUrl: getSetter(thing, setUrl),
    setIri: getSetter(thing, setIri),
    setBoolean: getSetter(thing, setBoolean),
    setDatetime: getSetter(thing, setDatetime),
    setDecimal: getSetter(thing, setDecimal),
    setInteger: getSetter(thing, setInteger),
    setStringNoLocale: getSetter(thing, setStringNoLocale),
    setStringWithLocale: (
      property: Parameters<typeof setStringWithLocale>[1],
      value: Parameters<typeof setStringWithLocale>[2],
      locale: Parameters<typeof setStringWithLocale>[3]
    ) => buildThing(setStringWithLocale(thing, property, value, locale)),
    setNamedNode: getSetter(thing, setNamedNode),
    setLiteral: getSetter(thing, setLiteral),
    setTerm: getSetter(thing, setTerm),
    removeAll: (property: Parameters<typeof removeAll>[1]) =>
      buildThing(removeAll(thing, property)),
    removeUrl: getRemover(thing, removeUrl),
    removeIri: getRemover(thing, removeIri),
    removeBoolean: getRemover(thing, removeBoolean),
    removeDatetime: getRemover(thing, removeDatetime),
    removeDecimal: getRemover(thing, removeDecimal),
    removeInteger: getRemover(thing, removeInteger),
    removeStringNoLocale: getRemover(thing, removeStringNoLocale),
    removeStringWithLocale: (
      property: Parameters<typeof removeStringWithLocale>[1],
      value: Parameters<typeof removeStringWithLocale>[2],
      locale: Parameters<typeof removeStringWithLocale>[3]
    ) => buildThing(removeStringWithLocale(thing, property, value, locale)),
    removeNamedNode: getRemover(thing, removeNamedNode),
    removeLiteral: getRemover(thing, removeLiteral),
  };
}

function getAdder<Type, T extends Thing>(thing: T, adder: AddOfType<Type>) {
  return (
    property: Parameters<typeof adder>[1],
    value: Parameters<typeof adder>[2]
  ) => {
    return buildThing(adder(thing, property, value));
  };
}

function getSetter<Type, T extends Thing>(thing: T, setter: SetOfType<Type>) {
  return (
    property: Parameters<typeof setter>[1],
    value: Parameters<typeof setter>[2]
  ) => {
    return buildThing(setter(thing, property, value));
  };
}

function getRemover<Type, T extends Thing>(
  thing: T,
  remover: RemoveOfType<Type>
) {
  return (
    property: Parameters<typeof remover>[1],
    value: Parameters<typeof remover>[2]
  ) => {
    return buildThing(remover(thing, property, value));
  };
}
