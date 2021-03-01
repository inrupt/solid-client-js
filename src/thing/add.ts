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
import { Thing, UrlString, Url } from "../interfaces";
import {
  internal_cloneThing,
  internal_toNode,
  internal_throwIfNotThing,
} from "./thing.internal";
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
import {
  isThing,
  ValidPropertyUrlExpectedError,
  ValidValueUrlExpectedError,
} from "./thing";

/**
 * Create a new Thing with a URL added for a Property.
 *
 * This preserves existing values for the given Property. To replace them, see [[setUrl]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to add a URL value to.
 * @param property Property for which to add the given URL value.
 * @param url URL to add to `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with the given value added for the given Property.
 */
export const addUrl: AddOfType<Url | UrlString | Thing> = (
  thing,
  property,
  url
) => {
  internal_throwIfNotThing(thing);
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const predicateNode = asNamedNode(property);
  const newThing = internal_cloneThing(thing);

  if (!isThing(url) && !internal_isValidUrl(url)) {
    throw new ValidValueUrlExpectedError(url);
  }

  newThing.add(
    DataFactory.quad(
      internal_toNode(newThing),
      predicateNode,
      internal_toNode(url)
    )
  );
  return newThing;
};
/** @hidden Alias for [[addUrl]] for those who prefer IRI terminology. */
export const addIri = addUrl;

/**
 * Create a new Thing with a boolean added for a Property.
 *
 * This preserves existing values for the given Property. To replace them, see [[setBoolean]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to add a boolean value to.
 * @param property Property for which to add the given boolean value.
 * @param value Boolean to add to `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with the given value added for the given Property.
 */
export const addBoolean: AddOfType<boolean> = (thing, property, value) => {
  internal_throwIfNotThing(thing);
  return addLiteralOfType(
    thing,
    property,
    serializeBoolean(value),
    xmlSchemaTypes.boolean
  );
};

/**
 * Create a new Thing with a datetime added for a Property.
 *
 * This preserves existing values for the given Property. To replace them, see [[setDatetime]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to add a datetime value to.
 * @param property Property for which to add the given datetime value.
 * @param value Datetime to add to `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with the given value added for the given Property.
 */
export const addDatetime: AddOfType<Date> = (thing, property, value) => {
  internal_throwIfNotThing(thing);
  return addLiteralOfType(
    thing,
    property,
    serializeDatetime(value),
    xmlSchemaTypes.dateTime
  );
};

/**
 * Create a new Thing with a decimal added for a Property.
 *
 * This preserves existing values for the given Property. To replace them, see [[setDecimal]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to add a decimal value to.
 * @param property Property for which to add the given decimal value.
 * @param value Decimal to add to `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with the given value added for the given Property.
 */
export const addDecimal: AddOfType<number> = (thing, property, value) => {
  internal_throwIfNotThing(thing);
  return addLiteralOfType(
    thing,
    property,
    serializeDecimal(value),
    xmlSchemaTypes.decimal
  );
};

/**
 * Create a new Thing with an integer added for a Property.
 *
 * This preserves existing values for the given Property. To replace them, see [[setInteger]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to add an integer value to.
 * @param property Property for which to add the given integer value.
 * @param value Integer to add to `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with the given value added for the given Property.
 */
export const addInteger: AddOfType<number> = (thing, property, value) => {
  internal_throwIfNotThing(thing);
  return addLiteralOfType(
    thing,
    property,
    serializeInteger(value),
    xmlSchemaTypes.integer
  );
};

/**
 * Create a new Thing with a localised string added for a Property.
 *
 * This preserves existing values for the given Property. To replace them, see [[setStringWithLocale]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to add a localised string value to.
 * @param property Property for which to add the given string value.
 * @param value String to add to `thing` for the given `property`.
 * @param locale Locale of the added string.
 * @returns A new Thing equal to the input Thing with the given value added for the given Property.
 */
export function addStringWithLocale<T extends Thing>(
  thing: T,
  property: Url | UrlString,
  value: string,
  locale: string
): T {
  internal_throwIfNotThing(thing);
  const literal = DataFactory.literal(value, normalizeLocale(locale));
  return addLiteral(thing, property, literal);
}

/**
 * Create a new Thing with an unlocalised string added for a Property.
 *
 * This preserves existing values for the given Property. To replace them, see [[setStringNoLocale]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to add an unlocalised string value to.
 * @param property Property for which to add the given string value.
 * @param value String to add to `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with the given value added for the given Property.
 */
export const addStringNoLocale: AddOfType<string> = (
  thing,
  property,
  value
) => {
  internal_throwIfNotThing(thing);
  return addLiteralOfType(thing, property, value, xmlSchemaTypes.string);
};

/**
 * Create a new Thing with a Named Node added for a Property.
 *
 * This preserves existing values for the given Property. To replace them, see [[setNamedNode]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @ignore This should not be needed due to the other add*() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @param thing The [[Thing]] to add a Named Node to.
 * @param property Property for which to add a value.
 * @param value The Named Node to add.
 * @returns A new Thing equal to the input Thing with the given value added for the given Property.
 */
export function addNamedNode<T extends Thing>(
  thing: T,
  property: Url | UrlString,
  value: NamedNode
): T {
  internal_throwIfNotThing(thing);
  return addTerm(thing, property, value);
}

/**
 * Create a new Thing with a Literal added for a Property.
 *
 * This preserves existing values for the given Property. To replace them, see [[setLiteral]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @ignore This should not be needed due to the other add*() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @param thing The [[Thing]] to add a Literal to.
 * @param property Property for which to add a value.
 * @param value The Literal to add.
 * @returns A new Thing equal to the input Thing with the given value added for the given Property.
 */
export function addLiteral<T extends Thing>(
  thing: T,
  property: Url | UrlString,
  value: Literal
): T {
  internal_throwIfNotThing(thing);
  return addTerm(thing, property, value);
}

/**
 * Creates a new Thing with a Term added for a Property.
 *
 * This preserves existing values for the given Property. To replace them, see [[setTerm]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @ignore This should not be needed due to the other add*() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @param thing The [[Thing]] to add a Term to.
 * @param property Property for which to add a value.
 * @param value The Term to add.
 * @returns A new Thing equal to the input Thing with the given value added for the given Property.
 * @since 0.3.0
 */
export function addTerm<T extends Thing>(
  thing: T,
  property: Url | UrlString,
  value: Quad_Object
): T {
  internal_throwIfNotThing(thing);
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const predicateNode = asNamedNode(property);
  const newThing = internal_cloneThing(thing);

  newThing.add(
    DataFactory.quad(internal_toNode(newThing), predicateNode, value)
  );
  return newThing;
}

function addLiteralOfType<T extends Thing>(
  thing: T,
  property: Url | UrlString,
  value: string,
  type: XmlSchemaTypeIri
): T {
  const literal = DataFactory.literal(value, DataFactory.namedNode(type));
  return addLiteral(thing, property, literal);
}

/**
 * @param thing Thing to add a value to.
 * @param property Property on which to add the given value.
 * @param value Value to add to `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Property.
 */
type AddOfType<Type> = <T extends Thing>(
  thing: T,
  property: Url | UrlString,
  value: Type
) => T;
