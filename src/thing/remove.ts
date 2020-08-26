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
  normalizeLocale,
  XmlSchemaTypeIri,
  xmlSchemaTypes,
  deserializeBoolean,
  deserializeDatetime,
  deserializeDecimal,
  deserializeInteger,
} from "../datatypes";
import { DataFactory } from "../rdfjs";
import { filterThing } from "./thing";

/**
 * Create a new Thing with all values removed for the given Property.
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing [[Thing]] to remove values from.
 * @param property Property for which to remove all values from the Thing.
 * @returns A new Thing equal to the input Thing with all values removed for the given Property.
 */
export function removeAll<T extends Thing>(
  thing: T,
  property: Url | UrlString
): T;
export function removeAll(thing: Thing, property: Url | UrlString): Thing {
  const predicateNode = asNamedNode(property);

  const updatedThing = filterThing(
    thing,
    (quad) => !quad.predicate.equals(predicateNode)
  );
  return updatedThing;
}

/**
 * Create a new Thing with the given URL removed for the given Property.
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to remove a URL value from.
 * @param property Property for which to remove the given URL value.
 * @param value URL to remove from `thing` for the given `Property`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Property.
 */
export const removeUrl: RemoveOfType<Url | UrlString | ThingPersisted> = (
  thing,
  property,
  value
) => {
  const predicateNode = asNamedNode(property);
  const iriNode = isNamedNode(value)
    ? value
    : typeof value === "string"
    ? asNamedNode(value)
    : asNamedNode(asIri(value));

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
 * Create a new Thing with the given boolean removed for the given Property.
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to remove a boolean value from.
 * @param property Property for which to remove the given boolean value.
 * @param value Boolean to remove from `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Property.
 */
export const removeBoolean: RemoveOfType<boolean> = (
  thing,
  property,
  value
) => {
  return removeLiteralMatching(
    thing,
    property,
    xmlSchemaTypes.boolean,
    (foundBoolean) => deserializeBoolean(foundBoolean) === value
  );
};

/**
 * Create a new Thing with the given datetime removed for the given Property.
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to remove a datetime value from.
 * @param property Property for which to remove the given datetime value.
 * @param value Datetime to remove from `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Property.
 */
export const removeDatetime: RemoveOfType<Date> = (thing, property, value) => {
  return removeLiteralMatching(
    thing,
    property,
    xmlSchemaTypes.dateTime,
    (foundDatetime) =>
      deserializeDatetime(foundDatetime)?.getTime() === value.getTime()
  );
};

/**
 * Create a new Thing with the given decimal removed for the given Property.
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to remove a decimal value from.
 * @param property Property for which to remove the given decimal value.
 * @param value Decimal to remove from `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Property.
 */
export const removeDecimal: RemoveOfType<number> = (thing, property, value) => {
  return removeLiteralMatching(
    thing,
    property,
    xmlSchemaTypes.decimal,
    (foundDecimal) => deserializeDecimal(foundDecimal) === value
  );
};

/**
 * Create a new Thing with the given integer removed for the given Property.
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to remove an integer value from.
 * @param property Property for which to remove the given integer value.
 * @param value Integer to remove from `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Property.
 */
export const removeInteger: RemoveOfType<number> = (thing, property, value) => {
  return removeLiteralMatching(
    thing,
    property,
    xmlSchemaTypes.integer,
    (foundInteger) => deserializeInteger(foundInteger) === value
  );
};

/**
 * Create a new Thing with the given localised string removed for the given Property.
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to remove a localised string value from.
 * @param property Property for which to remove the given localised string value.
 * @param value String to remove from `thing` for the given `property`.
 * @param locale Locale of the string to remove.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Property.
 */
export function removeStringWithLocale<T extends Thing>(
  thing: T,
  property: Url | UrlString,
  value: string,
  locale: string
): T {
  // Note: Due to how the `DataFactory.literal` constructor behaves, this function
  // must call directly `removeLiteral` directly, with the locale as the data
  // type of the Literal (which is not a valid NamedNode).
  return removeLiteral(
    thing,
    property,
    DataFactory.literal(value, normalizeLocale(locale))
  );
}

/**
 * Create a new Thing with the given unlocalised string removed for the given Property.
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to remove an unlocalised string value from.
 * @param property Property for which to remove the given string value.
 * @param value String to remove from `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Property.
 */
export const removeStringNoLocale: RemoveOfType<string> = (
  thing,
  property,
  value
) => {
  return removeLiteralMatching(
    thing,
    property,
    xmlSchemaTypes.string,
    (foundString) => foundString === value
  );
};

/**
 * @ignore This should not be needed due to the other remove*() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @param thing Thing to remove a NamedNode value from.
 * @param property Property for which to remove the given NamedNode value.
 * @param value NamedNode to remove from `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Property.
 */
export function removeNamedNode<T extends Thing>(
  thing: T,
  property: Url | UrlString,
  value: NamedNode
): T {
  const predicateNode = asNamedNode(property);
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
 * @param property Property for which to remove the given Literal value.
 * @param value Literal to remove from `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Property.
 */
export function removeLiteral<T extends Thing>(
  thing: T,
  property: Url | UrlString,
  value: Literal
): T {
  const predicateNode = asNamedNode(property);
  const updatedThing = filterThing(thing, (quad) => {
    return (
      !quad.predicate.equals(predicateNode) ||
      !isLiteral(quad.object) ||
      !quad.object.equals(value)
    );
  });
  return updatedThing;
}

/**
 * @param thing Thing to remove a Literal value from.
 * @param property Property for which to remove the given Literal value.
 * @param type Data type that the Literal should be stored as.
 * @param matcher Function that returns true if the given value is an equivalent serialisation of the value to remove. For example, when removing a `false` boolean, the matcher should return true for both "0" and "false".
 */
function removeLiteralMatching<T extends Thing>(
  thing: T,
  property: Url | UrlString,
  type: XmlSchemaTypeIri,
  matcher: (serialisedValue: string) => boolean
): T {
  const predicateNode = asNamedNode(property);
  const updatedThing = filterThing(thing, (quad) => {
    // Copy every value from the old thing into the new thing, unless it:
    return !(
      // has the predicate of the value-to-be-removed,
      (
        quad.predicate.equals(predicateNode) &&
        // also is a literal
        isLiteral(quad.object) &&
        // of the same type as the value-to-be-removed,
        quad.object.datatype.equals(DataFactory.namedNode(type)) &&
        // and has a value determined to be equal to the value-to-be-removed
        // by the given matcher (i.e. because their serialisations are equal):
        matcher(quad.object.value)
      )
    );
  });
  return updatedThing;
}

/**
 * @param thing Thing to remove a value from.
 * @param property Property for which to remove the given value.
 * @param value Value to remove from `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Property.
 */
type RemoveOfType<Type> = <T extends Thing>(
  thing: T,
  property: Url | UrlString,
  value: Type
) => T;
