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

import type { Literal, NamedNode, Quad_Object } from "@rdfjs/types";
import { Thing, Url, UrlString } from "../interfaces";
import { internal_isValidUrl, Time } from "../datatypes";
import { internal_throwIfNotThing } from "./thing.internal";
import { removeAll } from "./remove";
import {
  isThing,
  ValidPropertyUrlExpectedError,
  ValidValueUrlExpectedError,
} from "./thing";
import {
  addBoolean,
  addDatetime,
  addDate,
  addDecimal,
  addInteger,
  addLiteral,
  addNamedNode,
  addStringNoLocale,
  addStringWithLocale,
  addTerm,
  addTime,
  addUrl,
} from "./add";

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

  return addUrl(removeAll(thing, property), property, url);
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
  return addBoolean(removeAll(thing, property), property, value);
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
  return addDatetime(removeAll(thing, property), property, value);
};

/**
 * Create a new Thing with existing values replaced by the given date for the given Property.
 *
 * To preserve existing values, see [[addDate]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to set an date value on.
 * @param property Property for which to set the given date value.
 * @param value Date to set on `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Property.
 * @since 1.10.0
 */
export const setDate: SetOfType<Date> = (thing, property, value) => {
  internal_throwIfNotThing(thing);
  return addDate(removeAll(thing, property), property, value);
};

/**
 * Create a new Thing with existing values replaced by the given time for the given Property.
 *
 * To preserve existing values, see [[addTime]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to set an time value on.
 * @param property Property for which to set the given time value.
 * @param value time to set on `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Property.
 * @since 1.10.0
 */
export const setTime: SetOfType<Time> = (thing, property, value) => {
  internal_throwIfNotThing(thing);
  return addTime(removeAll(thing, property), property, value);
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
  return addDecimal(removeAll(thing, property), property, value);
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
  return addInteger(removeAll(thing, property), property, value);
};

/**
 * Create a new Thing with existing values replaced by the given English string for the given
 * Property.
 *
 * To preserve existing values, see [[addStringEnglish]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to set a localised string value on.
 * @param property Property for which to set the given localised string value.
 * @param value Localised string to set on `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Property.
 * @since 1.13.0
 */
export function setStringEnglish<T extends Thing>(
  thing: T,
  property: Url | UrlString,
  value: string
): T {
  return setStringWithLocale(thing, property, value, "en");
}

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
  return addStringWithLocale(
    removeAll(thing, property),
    property,
    value,
    locale
  );
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
  return addStringNoLocale(removeAll(thing, property), property, value);
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
  return addNamedNode(removeAll(thing, property), property, value);
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
  return addLiteral(removeAll(thing, property), property, value);
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

  return addTerm(removeAll(thing, property), property, value);
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
export type SetOfType<Type> = <T extends Thing>(
  thing: T,
  property: Url | UrlString,
  value: Type
) => T;
