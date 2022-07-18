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
import { UrlString, Url, Thing, IriString } from "../interfaces";
import { internal_throwIfNotThing } from "./thing.internal";
import {
  serializeBoolean,
  serializeDatetime,
  serializeDate,
  serializeDecimal,
  serializeInteger,
  normalizeLocale,
  XmlSchemaTypeIri,
  xmlSchemaTypes,
  internal_isValidUrl,
  isNamedNode,
  serializeTime,
  Time,
} from "../datatypes";
import {
  asIri,
  isThing,
  isThingLocal,
  ValidPropertyUrlExpectedError,
  ValidValueUrlExpectedError,
} from "./thing";
import { internal_toIriString } from "../interfaces.internal";
import { freeze, getBlankNodeId } from "../rdf.internal";

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
  if (!isThing(url) && !internal_isValidUrl(url)) {
    throw new ValidValueUrlExpectedError(url);
  }

  const predicateIri = internal_toIriString(property);

  const existingPredicate = thing.predicates[predicateIri] ?? {};
  const existingNamedNodes = existingPredicate.namedNodes ?? [];

  let iriToAdd: IriString;
  if (isNamedNode(url)) {
    iriToAdd = url.value;
  } else if (typeof url === "string") {
    iriToAdd = url;
  } else if (isThingLocal(url)) {
    iriToAdd = url.url;
  } else {
    iriToAdd = asIri(url);
  }
  const updatedNamedNodes = freeze(
    existingNamedNodes.concat(internal_toIriString(iriToAdd))
  );

  const updatedPredicate = freeze({
    ...existingPredicate,
    namedNodes: updatedNamedNodes,
  });
  const updatedPredicates = freeze({
    ...thing.predicates,
    [predicateIri]: updatedPredicate,
  });
  const updatedThing = freeze({
    ...thing,
    predicates: updatedPredicates,
  });

  return updatedThing;
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
 * Create a new Thing with a date added for a Property.
 *
 * This preserves existing values for the given Property. To replace them, see [[setDate]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to add a date value to.
 * @param property Property for which to add the given date value.
 * @param value Date to add to `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with the given value added for the given Property.
 * @since 1.10.0
 */
export const addDate: AddOfType<Date> = (thing, property, value) => {
  internal_throwIfNotThing(thing);
  return addLiteralOfType(
    thing,
    property,
    serializeDate(value),
    xmlSchemaTypes.date
  );
};

/**
 * Create a new Thing with a time added for a Property.
 *
 * This preserves existing values for the given Property. To replace them, see [[setDatetime]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to add a datetime value to.
 * @param property Property for which to add the given datetime value.
 * @param value time to add to `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with the given value added for the given Property.
 * @since 1.10.0
 */
export const addTime: AddOfType<Time> = (thing, property, value) => {
  internal_throwIfNotThing(thing);
  return addLiteralOfType(
    thing,
    property,
    serializeTime(value),
    xmlSchemaTypes.time
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
 * Create a new Thing with an English string added for a Property.
 *
 * This preserves existing values for the given Property. To replace them, see [[setStringEnglish]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to add a localised string value to.
 * @param property Property for which to add the given string value.
 * @param value String to add to `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with the given value added for the given Property.
 * @since 1.13.0
 */
export function addStringEnglish<T extends Thing>(
  thing: T,
  property: Url | UrlString,
  value: string
): T {
  return addStringWithLocale(thing, property, value, "en");
}

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
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }

  const predicateIri = internal_toIriString(property);
  const normalizedLocale = normalizeLocale(locale);

  const existingPredicate = thing.predicates[predicateIri] ?? {};
  const existingLangStrings = existingPredicate.langStrings ?? {};
  const existingStringsInLocale = existingLangStrings[normalizedLocale] ?? [];

  const updatedStringsInLocale = freeze(existingStringsInLocale.concat(value));
  const updatedLangStrings = freeze({
    ...existingLangStrings,
    [normalizedLocale]: updatedStringsInLocale,
  });
  const updatedPredicate = freeze({
    ...existingPredicate,
    langStrings: updatedLangStrings,
  });
  const updatedPredicates = freeze({
    ...thing.predicates,
    [predicateIri]: updatedPredicate,
  });
  const updatedThing = freeze({
    ...thing,
    predicates: updatedPredicates,
  });

  return updatedThing;
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
  return addUrl(thing, property, value.value);
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
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const typeIri = value.datatype.value;
  if (typeIri === xmlSchemaTypes.langString) {
    return addStringWithLocale(thing, property, value.value, value.language);
  }

  return addLiteralOfType(thing, property, value.value, value.datatype.value);
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
  if (value.termType === "NamedNode") {
    return addNamedNode(thing, property, value);
  }
  if (value.termType === "Literal") {
    return addLiteral(thing, property, value);
  }

  if (value.termType === "BlankNode") {
    internal_throwIfNotThing(thing);
    if (!internal_isValidUrl(property)) {
      throw new ValidPropertyUrlExpectedError(property);
    }

    const predicateIri = internal_toIriString(property);

    const existingPredicate = thing.predicates[predicateIri] ?? {};
    const existingBlankNodes = existingPredicate.blankNodes ?? [];

    const updatedBlankNodes = freeze(
      existingBlankNodes.concat(getBlankNodeId(value))
    );
    const updatedPredicate = freeze({
      ...existingPredicate,
      blankNodes: updatedBlankNodes,
    });
    const updatedPredicates = freeze({
      ...thing.predicates,
      [predicateIri]: updatedPredicate,
    });
    const updatedThing = freeze({
      ...thing,
      predicates: updatedPredicates,
    });

    return updatedThing;
  }

  throw new Error(
    `Term type [${value.termType}] is not supported by @inrupt/solid-client.`
  );
}

function addLiteralOfType<T extends Thing>(
  thing: T,
  property: Url | UrlString,
  value: string,
  type: XmlSchemaTypeIri | UrlString
): T {
  internal_throwIfNotThing(thing);
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }

  const predicateIri = internal_toIriString(property);

  const existingPredicate = thing.predicates[predicateIri] ?? {};
  const existingLiterals = existingPredicate.literals ?? {};
  const existingValuesOfType = existingLiterals[type] ?? [];

  const updatedValuesOfType = freeze(existingValuesOfType.concat(value));
  const updatedLiterals = freeze({
    ...existingLiterals,
    [type]: updatedValuesOfType,
  });
  const updatedPredicate = freeze({
    ...existingPredicate,
    literals: updatedLiterals,
  });
  const updatedPredicates = freeze({
    ...thing.predicates,
    [predicateIri]: updatedPredicate,
  });
  const updatedThing = freeze({
    ...thing,
    predicates: updatedPredicates,
  });

  return updatedThing;
}

/**
 * @param thing Thing to add a value to.
 * @param property Property on which to add the given value.
 * @param value Value to add to `thing` for the given `property`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Property.
 */
export type AddOfType<Type> = <T extends Thing>(
  thing: T,
  property: Url | UrlString,
  value: Type
) => T;
