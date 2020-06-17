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
import {
  Thing,
  UrlString,
  ThingLocal,
  ThingPersisted,
  Url,
} from "../interfaces";
import { cloneThing, toNode } from "../thing";
import {
  asNamedNode,
  serializeBoolean,
  serializeDatetime,
  serializeDecimal,
  serializeInteger,
  normalizeLocale,
  XmlSchemaTypeIri,
  xmlSchemaTypes,
} from "../datatypes";
import { DataFactory } from "../rdfjs";

/**
 * Create a new Thing with a URL added for a Predicate.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setUrl]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to add a URL value to.
 * @param predicate Predicate for which to add the given URL value.
 * @param url URL to add to `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value added for the given Predicate.
 */
export const addUrl: AddOfType<Url | UrlString | Thing> = (
  thing,
  predicate,
  url
) => {
  const predicateNode = asNamedNode(predicate);
  const newThing = cloneThing(thing);

  newThing.add(DataFactory.quad(toNode(newThing), predicateNode, toNode(url)));
  return newThing;
};
/** @hidden Alias for [[addUrl]] for those who prefer IRI terminology. */
export const addIri = addUrl;

/**
 * Create a new Thing with a boolean added for a Predicate.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setBoolean]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to add a boolean value to.
 * @param predicate Predicate for which to add the given boolean value.
 * @param value Boolean to add to `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value added for the given Predicate.
 */
export const addBoolean: AddOfType<boolean> = (thing, predicate, value) => {
  return addLiteralOfType(
    thing,
    predicate,
    serializeBoolean(value),
    xmlSchemaTypes.boolean
  );
};

/**
 * Create a new Thing with a datetime added for a Predicate.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setDatetime]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to add a datetime value to.
 * @param predicate Predicate for which to add the given datetime value.
 * @param value Datetime to add to `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value added for the given Predicate.
 */
export const addDatetime: AddOfType<Date> = (thing, predicate, value) => {
  return addLiteralOfType(
    thing,
    predicate,
    serializeDatetime(value),
    xmlSchemaTypes.dateTime
  );
};

/**
 * Create a new Thing with a decimal added for a Predicate.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setDecimal]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to add a decimal value to.
 * @param predicate Predicate for which to add the given decimal value.
 * @param value Decimal to add to `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value added for the given Predicate.
 */
export const addDecimal: AddOfType<number> = (thing, predicate, value) => {
  return addLiteralOfType(
    thing,
    predicate,
    serializeDecimal(value),
    xmlSchemaTypes.decimal
  );
};

/**
 * Create a new Thing with an integer added for a Predicate.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setInteger]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to add an integer value to.
 * @param predicate Predicate for which to add the given integer value.
 * @param value Integer to add to `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value added for the given Predicate.
 */
export const addInteger: AddOfType<number> = (thing, predicate, value) => {
  return addLiteralOfType(
    thing,
    predicate,
    serializeInteger(value),
    xmlSchemaTypes.integer
  );
};

/**
 * Create a new Thing with a localised string added for a Predicate.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setStringInLocale]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to add a localised string value to.
 * @param predicate Predicate for which to add the given string value.
 * @param value String to add to `thing` for the given `predicate`.
 * @param locale Locale of the added string.
 * @returns A new Thing equal to the input Thing with the given value added for the given Predicate.
 */
export function addStringInLocale<T extends Thing>(
  thing: T,
  predicate: Url | UrlString,
  value: string,
  locale: string
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function addStringInLocale(
  thing: Thing,
  predicate: Url | UrlString,
  value: string,
  locale: string
): Thing {
  const literal = DataFactory.literal(value, normalizeLocale(locale));
  return addLiteral(thing, predicate, literal);
}

/**
 * Create a new Thing with an unlocalised string added for a Predicate.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setStringNoLocale]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to add an unlocalised string value to.
 * @param predicate Predicate for which to add the given string value.
 * @param value String to add to `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value added for the given Predicate.
 */
export const addStringNoLocale: AddOfType<string> = (
  thing,
  predicate,
  value
) => {
  return addLiteralOfType(thing, predicate, value, xmlSchemaTypes.string);
};

/**
 * Create a new Thing with a Named Node added for a Predicate.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setNamedNode]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @ignore This should not be needed due to the other add*One() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @param thing The [[Thing]] to add a Named Node to.
 * @param predicate Predicate for which to add a value.
 * @param value The Named Node to add.
 * @returns A new Thing equal to the input Thing with the given value added for the given Predicate.
 */
export function addNamedNode<T extends Thing>(
  thing: T,
  predicate: Url | UrlString,
  value: NamedNode
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function addNamedNode(
  thing: Thing,
  predicate: Url | UrlString,
  value: NamedNode
): Thing {
  const predicateNode = asNamedNode(predicate);
  const newThing = cloneThing(thing);

  newThing.add(DataFactory.quad(toNode(newThing), predicateNode, value));
  return newThing;
}

/**
 * Create a new Thing with a Literal added for a Predicate.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setLiteral]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @ignore This should not be needed due to the other add*One() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @param thing The [[Thing]] to add a Literal to.
 * @param predicate Predicate for which to add a value.
 * @param value The Literal to add.
 * @returns A new Thing equal to the input Thing with the given value added for the given Predicate.
 */
export function addLiteral<T extends Thing>(
  thing: T,
  predicate: Url | UrlString,
  value: Literal
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function addLiteral(
  thing: Thing,
  predicate: Url | UrlString,
  value: Literal
): Thing {
  const predicateNode = asNamedNode(predicate);
  const newThing = cloneThing(thing);

  newThing.add(DataFactory.quad(toNode(newThing), predicateNode, value));
  return newThing;
}

function addLiteralOfType<T extends Thing>(
  thing: T,
  predicate: Url | UrlString,
  value: string,
  type: XmlSchemaTypeIri
): T extends ThingLocal ? ThingLocal : ThingPersisted;
function addLiteralOfType(
  thing: Thing,
  predicate: Url | UrlString,
  value: string,
  type: UrlString
): Thing {
  const literal = DataFactory.literal(value, type);
  return addLiteral(thing, predicate, literal);
}

/**
 * @param thing Thing to add a value to.
 * @param predicate Predicate on which to add the given value.
 * @param value Value to add to `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
type AddOfType<Type> = <T extends Thing>(
  thing: T,
  predicate: Url | UrlString,
  value: Type
) => T extends ThingLocal ? ThingLocal : ThingPersisted;
