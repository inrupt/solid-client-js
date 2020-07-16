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
  Url,
  UrlString,
  ThingLocal,
  ThingPersisted,
} from "../interfaces";
import {
  asNamedNode,
  serializeBoolean,
  serializeDatetime,
  serializeDecimal,
  serializeInteger,
  normalizeLocale,
  // XmlSchemaTypeIri,
  // xmlSchemaTypes,
} from "../datatypes";
import { DataFactory } from "../rdfjs";
import { XSD } from "@solid/lit-vocab-common-rdfjs";
import { toNode } from "../thing";
import { removeAll } from "./remove";

/**
 * Create a new Thing with existing values replaced by the given URL for the given Predicate.
 *
 * To preserve existing values, see [[addUrl]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to set a URL value on.
 * @param predicate Predicate for which to set the given URL value.
 * @param url URL to set on `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Predicate.
 */
export const setUrl: SetOfType<Url | UrlString | Thing> = (
  thing,
  predicate,
  url
) => {
  const newThing = removeAll(thing, predicate);

  const predicateNode = asNamedNode(predicate);
  newThing.add(DataFactory.quad(toNode(newThing), predicateNode, toNode(url)));

  return newThing;
};
/** @hidden Alias of [[setUrl]] for those who prefer IRI terminology. */
export const setIri = setUrl;

/**
 * Create a new Thing with existing values replaced by the given boolean for the given Predicate.
 *
 * To preserve existing values, see [[addBoolean]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to set a boolean value on.
 * @param predicate Predicate for which to set the given boolean value.
 * @param value Boolean to set on `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Predicate.
 */
export const setBoolean: SetOfType<boolean> = (thing, predicate, value) => {
  return setLiteralOfType(
    thing,
    predicate,
    serializeBoolean(value),
    XSD.boolean_
  );
};

/**
 * Create a new Thing with existing values replaced by the given datetime for the given Predicate.
 *
 * To preserve existing values, see [[addDatetime]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to set an datetime value on.
 * @param predicate Predicate for which to set the given datetime value.
 * @param value Datetime to set on `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Predicate.
 */
export const setDatetime: SetOfType<Date> = (thing, predicate, value) => {
  return setLiteralOfType(
    thing,
    predicate,
    serializeDatetime(value),
    XSD.dateTime
  );
};

/**
 * Create a new Thing with existing values replaced by the given decimal for the given Predicate.
 *
 * To preserve existing values, see [[addDecimal]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to set a decimal value on.
 * @param predicate Predicate for which to set the given decimal value.
 * @param value Decimal to set on `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Predicate.
 */
export const setDecimal: SetOfType<number> = (thing, predicate, value) => {
  return setLiteralOfType(
    thing,
    predicate,
    serializeDecimal(value),
    XSD.decimal
  );
};

/**
 * Create a new Thing with existing values replaced by the given integer for the given Predicate.
 *
 * To preserve existing values, see [[addInteger]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to set an integer value on.
 * @param predicate Predicate for which to set the given integer value.
 * @param value Integer to set on `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Predicate.
 */
export const setInteger: SetOfType<number> = (thing, predicate, value) => {
  return setLiteralOfType(
    thing,
    predicate,
    serializeInteger(value),
    XSD.integer
  );
};

/**
 * Create a new Thing with existing values replaced by the given localised string for the given Predicate.
 *
 * To preserve existing values, see [[addStringWithLocale]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to set a localised string value on.
 * @param predicate Predicate for which to set the given localised string value.
 * @param value Localised string to set on `thing` for the given `predicate`.
 * @param locale Locale of the added string.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Predicate.
 */
export function setStringWithLocale<T extends Thing>(
  thing: T,
  predicate: Url | UrlString,
  value: string,
  locale: string
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function setStringWithLocale(
  thing: Thing,
  predicate: Url | UrlString,
  value: string,
  locale: string
): Thing {
  const literal = DataFactory.literal(value, normalizeLocale(locale));
  return setLiteral(thing, predicate, literal);
}

/**
 * Create a new Thing with existing values replaced by the given unlocalised string for the given Predicate.
 *
 * To preserve existing values, see [[addStringNoLocale]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to set an unlocalised string value on.
 * @param predicate Predicate for which to set the given unlocalised string value.
 * @param value Unlocalised string to set on `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Predicate.
 */
export const setStringNoLocale: SetOfType<string> = (
  thing,
  predicate,
  value
) => {
  return setLiteralOfType(thing, predicate, value, XSD.string);
};

/**
 * Create a new Thing with existing values replaced by the given Named Node for the given Predicate.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setNamedNode]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @ignore This should not be needed due to the other set*() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @param thing The [[Thing]] to set a NamedNode on.
 * @param predicate Predicate for which to set the value.
 * @param value The NamedNode to set on `tihng` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Predicate.
 */
export function setNamedNode<T extends Thing>(
  thing: T,
  predicate: Url | UrlString,
  value: NamedNode
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function setNamedNode(
  thing: Thing,
  predicate: Url | UrlString,
  value: NamedNode
): Thing {
  const newThing = removeAll(thing, predicate);

  const predicateNode = asNamedNode(predicate);
  newThing.add(DataFactory.quad(toNode(newThing), predicateNode, value));

  return newThing;
}

/**
 * Create a new Thing with existing values replaced by the given Literal for the given Predicate.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setLiteral]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @ignore This should not be needed due to the other set*() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @param thing The [[Thing]] to set a Literal on.
 * @param predicate Predicate for which to set the value.
 * @param value The Literal to set on `tihng` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Predicate.
 */
export function setLiteral<T extends Thing>(
  thing: T,
  predicate: Url | UrlString,
  value: Literal
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function setLiteral(
  thing: Thing,
  predicate: Url | UrlString,
  value: Literal
): Thing {
  const newThing = removeAll(thing, predicate);

  const predicateNode = asNamedNode(predicate);
  newThing.add(DataFactory.quad(toNode(newThing), predicateNode, value));

  return newThing;
}

function setLiteralOfType<T extends Thing>(
  thing: T,
  predicate: Url | UrlString,
  value: string,
  type: Url
): T extends ThingLocal ? ThingLocal : ThingPersisted;
function setLiteralOfType(
  thing: Thing,
  predicate: Url | UrlString,
  value: string,
  type: Url
): Thing {
  const literal = DataFactory.literal(value, type);
  return setLiteral(thing, predicate, literal);
}

/**
 * Create a new Thing with existing values replaced by the given value for the given Predicate.
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to set a value on.
 * @param predicate Predicate for which to set the given value.
 * @param value Value to set on `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Predicate.
 */
type SetOfType<Type> = <T extends Thing>(
  thing: T,
  predicate: Url | UrlString,
  value: Type
) => T extends ThingLocal ? ThingLocal : ThingPersisted;
