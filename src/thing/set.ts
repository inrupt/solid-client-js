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

import { Literal, NamedNode, Quad_Object } from "rdf-js";
import { Thing, Url, UrlString } from "../interfaces";
import {
  asNamedNode,
  serializeBoolean,
  serializeDatetime,
  serializeDecimal,
  serializeInteger,
  normalizeLocale,
  XmlSchemaTypeIri,
  xmlSchemaTypes,
  internal_isValidUrl,
} from "../datatypes";
import { DataFactory } from "../rdfjs";
import { internal_toNode, internal_throwIfNotThing } from "./thing.internal";
import { removeAll } from "./remove";
import {
  isThing,
  ValidPropertyUrlExpectedError,
  ValidValueUrlExpectedError,
} from "./thing";

/**
 * Create a new Thing with existing values replaced by the given URL for the given Property.
 *
 * To preserve existing values, see [[addUrl]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to set a URL value on.
 * @param property Property for which to set the given URL value.
 * @param url URL to set on `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Property.
 */
export const setUrl: SetOfType<Url | UrlString | Thing> = (
  thing,
  property,
  url
) => {
  internal_throwIfNotThing(thing);
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  if (!isThing(url) && !internal_isValidUrl(url)) {
    throw new ValidValueUrlExpectedError(url);
  }

  const newThing = removeAll(thing, property);
  const predicateNode = asNamedNode(property);

  newThing.add(
    DataFactory.quad(
      internal_toNode(newThing),
      predicateNode,
      internal_toNode(url)
    )
  );

  return newThing;
};
/** @hidden Alias of [[setUrl]] for those who prefer IRI terminology. */
export const setIri = setUrl;

/**
 * Create a new Thing with existing values replaced by the given boolean for the given Property.
 *
 * To preserve existing values, see [[addBoolean]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to set a boolean value on.
 * @param property Property for which to set the given boolean value.
 * @param value Boolean to set on `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Property.
 */
export const setBoolean: SetOfType<boolean> = (thing, property, value) => {
  internal_throwIfNotThing(thing);
  return setLiteralOfType(
    thing,
    property,
    serializeBoolean(value),
    xmlSchemaTypes.boolean
  );
};

/**
 * Create a new Thing with existing values replaced by the given datetime for the given Property.
 *
 * To preserve existing values, see [[addDatetime]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to set an datetime value on.
 * @param property Property for which to set the given datetime value.
 * @param value Datetime to set on `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Property.
 */
export const setDatetime: SetOfType<Date> = (thing, property, value) => {
  internal_throwIfNotThing(thing);
  return setLiteralOfType(
    thing,
    property,
    serializeDatetime(value),
    xmlSchemaTypes.dateTime
  );
};

/**
 * Create a new Thing with existing values replaced by the given decimal for the given Property.
 *
 * To preserve existing values, see [[addDecimal]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to set a decimal value on.
 * @param property Property for which to set the given decimal value.
 * @param value Decimal to set on `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Property.
 */
export const setDecimal: SetOfType<number> = (thing, property, value) => {
  internal_throwIfNotThing(thing);
  return setLiteralOfType(
    thing,
    property,
    serializeDecimal(value),
    xmlSchemaTypes.decimal
  );
};

/**
 * Create a new Thing with existing values replaced by the given integer for the given Property.
 *
 * To preserve existing values, see [[addInteger]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to set an integer value on.
 * @param property Property for which to set the given integer value.
 * @param value Integer to set on `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Property.
 */
export const setInteger: SetOfType<number> = (thing, property, value) => {
  internal_throwIfNotThing(thing);
  return setLiteralOfType(
    thing,
    property,
    serializeInteger(value),
    xmlSchemaTypes.integer
  );
};

/**
 * Create a new Thing with existing values replaced by the given localised string for the given Property.
 *
 * To preserve existing values, see [[addStringWithLocale]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to set a localised string value on.
 * @param property Property for which to set the given localised string value.
 * @param value Localised string to set on `thing` for the given `property`.
 * @param locale Locale of the added string.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Property.
 */
export function setStringWithLocale<T extends Thing>(
  thing: T,
  property: Url | UrlString,
  value: string,
  locale: string
): T {
  internal_throwIfNotThing(thing);
  const literal = DataFactory.literal(value, normalizeLocale(locale));
  return setLiteral(thing, property, literal);
}

/**
 * Create a new Thing with existing values replaced by the given unlocalised string for the given Property.
 *
 * To preserve existing values, see [[addStringNoLocale]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to set an unlocalised string value on.
 * @param property Property for which to set the given unlocalised string value.
 * @param value Unlocalised string to set on `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Property.
 */
export const setStringNoLocale: SetOfType<string> = (
  thing,
  property,
  value
) => {
  internal_throwIfNotThing(thing);
  return setLiteralOfType(thing, property, value, xmlSchemaTypes.string);
};

/**
 * Create a new Thing with existing values replaced by the given Named Node for the given Property.
 *
 * This replaces existing values for the given Property. To preserve them, see [[addNamedNode]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @ignore This should not be needed due to the other set*() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @param thing The [[Thing]] to set a NamedNode on.
 * @param property Property for which to set the value.
 * @param value The NamedNode to set on `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Property.
 */
export function setNamedNode<T extends Thing>(
  thing: T,
  property: Url | UrlString,
  value: NamedNode
): T {
  internal_throwIfNotThing(thing);
  return setTerm(thing, property, value);
}

/**
 * Create a new Thing with existing values replaced by the given Literal for the given Property.
 *
 * This replaces existing values for the given Property. To preserve them, see [[addLiteral]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @ignore This should not be needed due to the other set*() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @param thing The [[Thing]] to set a Literal on.
 * @param property Property for which to set the value.
 * @param value The Literal to set on `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Property.
 */
export function setLiteral<T extends Thing>(
  thing: T,
  property: Url | UrlString,
  value: Literal
): T {
  internal_throwIfNotThing(thing);
  return setTerm(thing, property, value);
}

/**
 * Creates a new Thing with existing values replaced by the given Term for the given Property.
 *
 * This replaces existing values for the given Property. To preserve them, see [[addTerm]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @ignore This should not be needed due to the other set*() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @param thing The [[Thing]] to set a Term on.
 * @param property Property for which to set the value.
 * @param value The raw RDF/JS value to set on `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Property.
 * @since 0.3.0
 */
export function setTerm<T extends Thing>(
  thing: T,
  property: Url | UrlString,
  value: Quad_Object
): T {
  internal_throwIfNotThing(thing);
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }

  const newThing = removeAll(thing, property);
  const predicateNode = asNamedNode(property);
  newThing.add(
    DataFactory.quad(internal_toNode(newThing), predicateNode, value)
  );

  return newThing;
}

function setLiteralOfType<T extends Thing>(
  thing: T,
  property: Url | UrlString,
  value: string,
  type: XmlSchemaTypeIri
): T;
function setLiteralOfType(
  thing: Thing,
  property: Url | UrlString,
  value: string,
  type: XmlSchemaTypeIri
): Thing {
  const literal = DataFactory.literal(value, DataFactory.namedNode(type));
  return setLiteral(thing, property, literal);
}

/**
 * Create a new Thing with existing values replaced by the given value for the given Property.
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to set a value on.
 * @param property Property for which to set the given value.
 * @param value Value to set on `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Property.
 */
type SetOfType<Type> = <T extends Thing>(
  thing: T,
  property: Url | UrlString,
  value: Type
) => T;
