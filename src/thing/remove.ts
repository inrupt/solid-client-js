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

import { Literal, NamedNode } from "rdf-js";
import { asIri } from "../index";
import {
  Thing,
  Url,
  UrlString,
  ThingPersisted,
  ThingLocal,
} from "../interfaces";
import {
  asNamedNode,
  isNamedNode,
  isLiteral,
  serializeBoolean,
  serializeDatetime,
  serializeDecimal,
  serializeInteger,
  normalizeLocale,
} from "../datatypes";
import { DataFactory } from "../rdfjs";
import { XSD } from "@solid/lit-vocab-common-rdfext";
import { filterThing } from "../thing";

/**
 * Create a new Thing with all values removed for the given Predicate.
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing [[Thing]] to remove values from.
 * @param predicate Predicate for which to remove all values from the Thing.
 * @returns A new Thing equal to the input Thing with all values removed for the given Predicate.
 */
export function removeAll<T extends Thing>(
  thing: T,
  predicate: Url | UrlString
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function removeAll(thing: Thing, predicate: Url | UrlString): Thing {
  const predicateNode = asNamedNode(predicate);

  const updatedThing = filterThing(
    thing,
    (quad) => !quad.predicate.equals(predicateNode)
  );
  return updatedThing;
}

/**
 * Create a new Thing with the given URL removed for the given Predicate.
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to remove a URL value from.
 * @param predicate Predicate for which to remove the given URL value.
 * @param value URL to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export const removeUrl: RemoveOfType<Url | UrlString | ThingPersisted> = (
  thing,
  predicate,
  value
) => {
  const predicateNode = asNamedNode(predicate);

  const iriNode = isNamedNode(value)
    ? value
    : // PMCB55: No longer required (as the compiler prevents it ever happening)!
      // : typeof value === "string"
      // ? asNamedNode(value)
      asNamedNode(asIri(value));

  const updatedThing = filterThing(thing, (quad) => {
    return (
      !quad.predicate.equals(predicateNode) ||
      !isNamedNode(quad.object) ||
      !quad.object.equals(iriNode)
    );
  });
  return updatedThing;
};
/** @hidden Alias of [[removeUrl]] for those who prefer IRI terminology. */
export const removeIri = removeUrl;

/**
 * Create a new Thing with the given boolean removed for the given Predicate.
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to remove a boolean value from.
 * @param predicate Predicate for which to remove the given boolean value.
 * @param value Boolean to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export const removeBoolean: RemoveOfType<boolean> = (
  thing,
  predicate,
  value
) => {
  return removeLiteralOfType(
    thing,
    predicate,
    serializeBoolean(value),
    XSD.boolean_
  );
};

/**
 * Create a new Thing with the given datetime removed for the given Predicate.
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to remove a datetime value from.
 * @param predicate Predicate for which to remove the given datetime value.
 * @param value Datetime to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export const removeDatetime: RemoveOfType<Date> = (thing, predicate, value) => {
  return removeLiteralOfType(
    thing,
    predicate,
    serializeDatetime(value),
    XSD.dateTime
  );
};

/**
 * Create a new Thing with the given decimal removed for the given Predicate.
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to remove a decimal value from.
 * @param predicate Predicate for which to remove the given decimal value.
 * @param value Decimal to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export const removeDecimal: RemoveOfType<number> = (
  thing,
  predicate,
  value
) => {
  return removeLiteralOfType(
    thing,
    predicate,
    serializeDecimal(value),
    XSD.decimal
  );
};

/**
 * Create a new Thing with the given integer removed for the given Predicate.
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to remove an integer value from.
 * @param predicate Predicate for which to remove the given integer value.
 * @param value Integer to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export const removeInteger: RemoveOfType<number> = (
  thing,
  predicate,
  value
) => {
  return removeLiteralOfType(
    thing,
    predicate,
    serializeInteger(value),
    XSD.integer
  );
};

/**
 * Create a new Thing with the given localised string removed for the given Predicate.
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to remove a localised string value from.
 * @param predicate Predicate for which to remove the given localised string value.
 * @param value String to remove from `thing` for the given `predicate`.
 * @param locale Locale of the string to remove.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export function removeStringWithLocale<T extends Thing>(
  thing: T,
  predicate: Url | UrlString,
  value: string,
  locale: string
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function removeStringWithLocale(
  thing: Thing,
  predicate: Url | UrlString,
  value: string,
  locale: string
): Thing {
  // Note: Due to how the `DataFactory.literal` constructor behaves, this function
  // must call directly `removeLiteral` directly, with the locale as the data
  // type of the Literal (which is not a valid NamedNode).
  return removeLiteral(
    thing,
    predicate,
    DataFactory.literal(value, normalizeLocale(locale))
  );
}

/**
 * Create a new Thing with the given unlocalised string removed for the given Predicate.
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to remove an unlocalised string value from.
 * @param predicate Predicate for which to remove the given string value.
 * @param value String to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export const removeStringNoLocale: RemoveOfType<string> = (
  thing,
  predicate,
  value
) => {
  return removeLiteralOfType(thing, predicate, value, XSD.string);
};

/**
 * @ignore This should not be needed due to the other remove*() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @param thing Thing to remove a NamedNode value from.
 * @param predicate Predicate for which to remove the given NamedNode value.
 * @param value NamedNode to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export function removeNamedNode<T extends Thing>(
  thing: T,
  predicate: Url | UrlString,
  value: NamedNode
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function removeNamedNode(
  thing: Thing,
  predicate: Url | UrlString,
  value: NamedNode
): Thing {
  const predicateNode = asNamedNode(predicate);
  const updatedThing = filterThing(thing, (quad) => {
    return (
      !quad.predicate.equals(predicateNode) ||
      !isNamedNode(quad.object) ||
      !quad.object.equals(value)
    );
  });
  return updatedThing;
}

/**
 * @ignore This should not be needed due to the other remove*() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @param thing Thing to remove a Literal value from.
 * @param predicate Predicate for which to remove the given Literal value.
 * @param value Literal to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export function removeLiteral<T extends Thing>(
  thing: T,
  predicate: Url | UrlString,
  value: Literal
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function removeLiteral(
  thing: Thing,
  predicate: Url | UrlString,
  value: Literal
): Thing {
  const predicateNode = asNamedNode(predicate);
  const updatedThing = filterThing(thing, (quad) => {
    return (
      !quad.predicate.equals(predicateNode) ||
      !isLiteral(quad.object) ||
      !quad.object.equals(value)
    );
  });
  return updatedThing;
}

function removeLiteralOfType<T extends Thing>(
  thing: T,
  predicate: Url | UrlString,
  value: string,
  type: Url
): T extends ThingLocal ? ThingLocal : ThingPersisted;
function removeLiteralOfType(
  thing: Thing,
  predicate: Url | UrlString,
  value: string,
  type: Url
): Thing {
  const updatedThing = removeLiteral(
    thing,
    predicate,
    DataFactory.literal(value, type)
  );
  return updatedThing;
}

/**
 * @param thing Thing to remove a value from.
 * @param predicate Predicate for which to remove the given value.
 * @param value Value to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
type RemoveOfType<Type> = <T extends Thing>(
  thing: T,
  predicate: Url | UrlString,
  value: Type
) => T extends ThingLocal ? ThingLocal : ThingPersisted;
