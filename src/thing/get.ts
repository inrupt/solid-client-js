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

import type { Quad_Object, NamedNode, Literal } from "@rdfjs/types";
import { Thing, Url, UrlString } from "../interfaces";
import {
  deserializeBoolean,
  deserializeDatetime,
  deserializeDate,
  deserializeTime,
  deserializeDecimal,
  deserializeInteger,
  xmlSchemaTypes,
  XmlSchemaTypeIri,
  internal_isValidUrl,
  Time,
} from "../datatypes";
import { internal_throwIfNotThing } from "./thing.internal";
import { ValidPropertyUrlExpectedError } from "./thing";
import { internal_toIriString } from "../interfaces.internal";
import {
  getBlankNodeValue,
  getLocalNodeName,
  isBlankNodeId,
  isLocalNodeIri,
} from "../rdf.internal";
import { DataFactory } from "../rdfjs.internal";

/**
 * Returns the URLs of all Properties that the given [[Thing ]]has values for.b
 *
 * @param thing The [[Thing]] of which to get that Property URLs that have a value.
 * @returns The URLs of the Properties for which values are defined for the given Thing.
 * @hidden This is an advanced API that should not be needed for most Solid use cases. If you do find yourself needing this, please file a feature request sharing your use case.
 */
export function getPropertyAll(thing: Thing): UrlString[] {
  return Object.keys(thing.predicates).filter(
    (predicate) => getTerm(thing, predicate) !== null
  );
}

/**
 * Returns the URL value of the specified Property from a [[Thing]].
 * If the Property is not present or its value is not of type URL, returns null.
 * If the Property has multiple URL values, returns one of its URL values.
 *
 * @param thing The [[Thing]] to read a URL value from.
 * @param property The Property whose URL value to return.
 * @returns A URL value for the given Property if present, or null if the Property is not present or the value is not of type URL.
 */
export function getUrl(
  thing: Thing,
  property: Url | UrlString
): UrlString | null {
  internal_throwIfNotThing(thing);
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const predicateUrl = internal_toIriString(property);
  const firstUrl = thing.predicates[predicateUrl]?.namedNodes?.[0] ?? null;
  if (firstUrl === null) {
    return null;
  }
  return isLocalNodeIri(firstUrl) ? `#${getLocalNodeName(firstUrl)}` : firstUrl;
}
/** @hidden Alias of [[getUrl]] for those who prefer IRI terminology. */
export const getIri = getUrl;

/**
 * Returns the URL values of the specified Property from a [[Thing]].
 * If the Property is not present, returns an empty array.
 * If the Property's value is not of type URL, omits that value in the array.
 *
 * @param thing The [[Thing]] to read the URL values from.
 * @param property The Property whose URL values to return.
 * @returns An array of URL values for the given Property.
 */
export function getUrlAll(
  thing: Thing,
  property: Url | UrlString
): UrlString[] {
  internal_throwIfNotThing(thing);
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const predicateUrl = internal_toIriString(property);
  return (
    thing.predicates[predicateUrl]?.namedNodes?.map((iri) =>
      isLocalNodeIri(iri) ? `#${getLocalNodeName(iri)}` : iri
    ) ?? []
  );
}
/** @hidden Alias of [[getUrlAll]] for those who prefer IRI terminology. */
export const getIriAll = getUrlAll;

/**
 * Returns the boolean value of the specified Property from a [[Thing]].
 * If the Property is not present or its value is not of type boolean, returns null.
 * If the Property has multiple boolean values, returns one of its values.
 *
 * @param thing The [[Thing]] to read a boolean value from.
 * @param property The Property whose boolean value to return.
 * @returns A boolean value for the given Property if present, or null if the Property is not present or the value is not of type boolean.
 */
export function getBoolean(
  thing: Thing,
  property: Url | UrlString
): boolean | null {
  internal_throwIfNotThing(thing);
  const literalString = getLiteralOfType(
    thing,
    property,
    xmlSchemaTypes.boolean
  );

  if (literalString === null) {
    return null;
  }

  return deserializeBoolean(literalString);
}

/**
 * Returns the boolean values of the specified Property from a [[Thing]].
 * If the Property is not present, returns an empty array.
 * If the Property's value is not of type boolean, omits that value in the array.
 *
 * @param thing The [[Thing]] to read the boolean values from.
 * @param property The Property whose boolean values to return.
 * @returns An array of boolean values for the given Property.
 */
export function getBooleanAll(
  thing: Thing,
  property: Url | UrlString
): boolean[] {
  internal_throwIfNotThing(thing);
  const literalStrings = getLiteralAllOfType(
    thing,
    property,
    xmlSchemaTypes.boolean
  );

  return literalStrings
    .map(deserializeBoolean)
    .filter((possibleBoolean) => possibleBoolean !== null) as boolean[];
}

/**
 * Returns the datetime value of the specified Property from a [[Thing]].
 * If the Property is not present or its value is not of type datetime, returns null.
 * If the Property has multiple datetime values, returns one of its values.
 *
 * @param thing The [[Thing]] to read a datetime value from.
 * @param property The Property whose datetime value to return.
 * @returns A datetime value for the given Property if present, or null if the Property is not present or the value is not of type datetime.
 */
export function getDatetime(
  thing: Thing,
  property: Url | UrlString
): Date | null {
  internal_throwIfNotThing(thing);
  const literalString = getLiteralOfType(
    thing,
    property,
    xmlSchemaTypes.dateTime
  );

  if (literalString === null) {
    return null;
  }

  return deserializeDatetime(literalString);
}

/**
 * Returns the datetime values of the specified Property from a [[Thing]].
 * If the Property is not present, returns an empty array.
 * If the Property's value is not of type datetime, omits that value in the array.
 *
 * @param thing The [[Thing]] to read the datetime values from.
 * @param property The Property whose datetime values to return.
 * @returns An array of datetime values for the given Property.
 */
export function getDatetimeAll(
  thing: Thing,
  property: Url | UrlString
): Date[] {
  internal_throwIfNotThing(thing);
  const literalStrings = getLiteralAllOfType(
    thing,
    property,
    xmlSchemaTypes.dateTime
  );

  return literalStrings
    .map(deserializeDatetime)
    .filter((potentialDatetime) => potentialDatetime !== null) as Date[];
}

/**
 * Returns the date value of the specified Property from a [[Thing]].
 * If the Property is not present or its value is not of type date, returns null.
 * If the Property has multiple date values, returns one of its values.
 *
 * @param thing The [[Thing]] to read a date value from.
 * @param property The Property whose date value to return.
 * @returns A date value for the given Property if present, or null if the Property is not present or the value is not of type date.
 * @since 1.10.0
 */
export function getDate(thing: Thing, property: Url | UrlString): Date | null {
  internal_throwIfNotThing(thing);

  const literalString = getLiteralOfType(thing, property, xmlSchemaTypes.date);

  if (literalString === null) {
    return null;
  }

  return deserializeDate(literalString);
}

/**
 * Returns the date values of the specified Property from a [[Thing]].
 * If the Property is not present, returns an empty array.
 * If the Property's value is not of type date, omits that value in the array.
 *
 * @param thing The [[Thing]] to read the date values from.
 * @param property The Property whose date values to return.
 * @returns An array of date values for the given Property.
 * @since 1.10.0
 */
export function getDateAll(thing: Thing, property: Url | UrlString): Date[] {
  internal_throwIfNotThing(thing);
  const literalStrings = getLiteralAllOfType(
    thing,
    property,
    xmlSchemaTypes.date
  );

  return literalStrings
    .map(deserializeDate)
    .filter((potentialDate) => potentialDate !== null) as Date[];
}

/**
 * Returns the time value of the specified Property from a [[Thing]].
 * If the Property is not present or its value is not of type time, returns null.
 * If the Property has multiple time values, returns one of its values.
 *
 * @param thing The [[Thing]] to read a time value from.
 * @param property The Property whose time value to return.
 * @returns A time value for the given Property if present, or null if the Property is not present or the value is not of type time.
 * @since 1.10.0
 */
export function getTime(thing: Thing, property: Url | UrlString): Time | null {
  internal_throwIfNotThing(thing);
  const literalString = getLiteralOfType(thing, property, xmlSchemaTypes.time);

  if (literalString === null) {
    return null;
  }

  return deserializeTime(literalString);
}

/**
 * Returns the time values of the specified Property from a [[Thing]].
 * If the Property is not present, returns an empty array.
 * If the Property's value is not of type time, omits that value in the array.
 *
 * @param thing The [[Thing]] to read the time values from.
 * @param property The Property whose time values to return.
 * @returns An array of time values for the given Property.
 * @since 1.10.0
 */
export function getTimeAll(thing: Thing, property: Url | UrlString): Time[] {
  internal_throwIfNotThing(thing);
  const literalStrings = getLiteralAllOfType(
    thing,
    property,
    xmlSchemaTypes.time
  );

  return literalStrings
    .map(deserializeTime)
    .filter((potentialTime) => potentialTime !== null) as Time[];
}

/**
 * Returns the decimal value of the specified Property from a [[Thing]].
 * If the Property is not present or its value is not of type decimal, returns null.
 * If the Property has multiple decimal values, returns one of its values.
 *
 * @param thing The [[Thing]] to read a decimal value from.
 * @param property The Property whose decimal value to return.
 * @returns A decimal value for the given Property if present, or null if the Property is not present or the value is not of type decimal.
 */
export function getDecimal(
  thing: Thing,
  property: Url | UrlString
): number | null {
  internal_throwIfNotThing(thing);
  const literalString = getLiteralOfType(
    thing,
    property,
    xmlSchemaTypes.decimal
  );

  if (literalString === null) {
    return null;
  }

  return deserializeDecimal(literalString);
}

/**
 * Returns the decimal values of the specified Property from a [[Thing]].
 * If the Property is not present, returns an empty array.
 * If the Property's value is not of type decimal, omits that value in the array.
 *
 * @param thing The [[Thing]] to read the decimal values from.
 * @param property The Property whose decimal values to return.
 * @returns An array of decimal values for the given Property.
 */
export function getDecimalAll(
  thing: Thing,
  property: Url | UrlString
): number[] {
  internal_throwIfNotThing(thing);
  const literalStrings = getLiteralAllOfType(
    thing,
    property,
    xmlSchemaTypes.decimal
  );

  return literalStrings
    .map((literalString) => deserializeDecimal(literalString))
    .filter((potentialDecimal) => potentialDecimal !== null) as number[];
}

/**
 * Returns the integer value of the specified Property from a [[Thing]].
 * If the Property is not present or its value is not of type integer, returns null.
 * If the Property has multiple integer values, returns one of its values.
 *
 * @param thing The [[Thing]] to read an integer value from.
 * @param property The Property whose integer value to return.
 * @returns A integer value for the given Property if present, or null if the Property is not present or the value is not of type datetime.
 */
export function getInteger(
  thing: Thing,
  property: Url | UrlString
): number | null {
  internal_throwIfNotThing(thing);
  const literalString = getLiteralOfType(
    thing,
    property,
    xmlSchemaTypes.integer
  );

  if (literalString === null) {
    return null;
  }

  return deserializeInteger(literalString);
}

/**
 * Returns the integer values of the specified Property from a [[Thing]].
 * If the Property is not present, returns an empty array.
 * If the Property's value is not of type integer, omits that value in the array.
 *
 * @param thing The [[Thing]] to read the integer values from.
 * @param property The Property whose integer values to return.
 * @returns An array of integer values for the given Property.
 */
export function getIntegerAll(
  thing: Thing,
  property: Url | UrlString
): number[] {
  internal_throwIfNotThing(thing);
  const literalStrings = getLiteralAllOfType(
    thing,
    property,
    xmlSchemaTypes.integer
  );

  return literalStrings
    .map((literalString) => deserializeInteger(literalString))
    .filter((potentialInteger) => potentialInteger !== null) as number[];
}

/**
 * Returns the English (language tag "en") string value of the specified Property from a [[Thing]].
 * If the Property is not present as a string in English, returns null.
 * If the Property has multiple English string values, returns one of its values.
 *
 * @param thing The [[Thing]] to read a localised string value from.
 * @param property The Property whose localised string value to return.
 * @returns An English string value for the given Property if present, or null otherwise.
 * @since 1.13.0
 */
export function getStringEnglish(
  thing: Thing,
  property: Url | UrlString
): string | null {
  return getStringWithLocale(thing, property, "en");
}

/**
 * Returns the localized string value of the specified Property from a [[Thing]].
 * If the Property is not present as a string in the specified locale, returns null.
 * If the Property has multiple string values for the specified locale, returns one of its values.
 *
 * @param thing The [[Thing]] to read a localised string value from.
 * @param property The Property whose localised string value to return.
 * @param locale The desired locale for the string value.
 * @returns A localised string value for the given Property if present in the specified `locale`, or null otherwise.
 */
export function getStringWithLocale(
  thing: Thing,
  property: Url | UrlString,
  locale: string
): string | null {
  internal_throwIfNotThing(thing);
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const predicateIri = internal_toIriString(property);
  const langStrings = thing.predicates[predicateIri]?.langStrings ?? {};
  const existingLocales = Object.keys(langStrings);
  const matchingLocale = existingLocales.find(
    (existingLocale) =>
      existingLocale.toLowerCase() === locale.toLowerCase() &&
      Array.isArray(langStrings[existingLocale]) &&
      langStrings[existingLocale].length > 0
  );
  return typeof matchingLocale === "string"
    ? langStrings[matchingLocale][0]
    : null;
}

/**
 * Returns the English (language tag "en") string values of the specified Property from a [[Thing]].
 * If the Property is not present, returns an empty array.
 * If the Property's value is not an English string, omits that value in the array.
 *
 * @param thing The [[Thing]] to read a localised string value from.
 * @param property The Property whose localised string value to return.
 * @returns An array of English string values for the given Property.
 */
export function getStringEnglishAll(
  thing: Thing,
  property: Url | UrlString
): string[] {
  return getStringWithLocaleAll(thing, property, "en");
}

/**
 * Returns the localized string values of the specified Property from a [[Thing]].
 * If the Property is not present, returns an empty array.
 * If the Property's value is not a string of the specified locale, omits that value in the array.
 *
 * @param thing The [[Thing]] to read the localised string values from.
 * @param property The Property whose localised string values to return.
 * @param locale The desired locale for the string values.
 * @returns An array of localised string values for the given Property.
 */
export function getStringWithLocaleAll(
  thing: Thing,
  property: Url | UrlString,
  locale: string
): string[] {
  internal_throwIfNotThing(thing);
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const predicateIri = internal_toIriString(property);
  const langStrings = thing.predicates[predicateIri]?.langStrings ?? {};
  const existingLocales = Object.keys(langStrings);
  const matchingLocale = existingLocales.find(
    (existingLocale) =>
      existingLocale.toLowerCase() === locale.toLowerCase() &&
      Array.isArray(langStrings[existingLocale]) &&
      langStrings[existingLocale].length > 0
  );
  return typeof matchingLocale === "string"
    ? [...langStrings[matchingLocale]]
    : [];
}

/**
 * Returns all localized string values mapped by the locales for the specified property from the
 * specified [[Thing]] (explicitly filters out non-language string literals).
 *
 * @param thing The [[Thing]] to read the localised string values from.
 * @param property The Property whose localised string values to return.
 * @returns A Map of objects, keyed on locale with the value an array of string values (for that locale).
 */
export function getStringByLocaleAll(
  thing: Thing,
  property: Url | UrlString
): Map<string, string[]> {
  internal_throwIfNotThing(thing);
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const predicateIri = internal_toIriString(property);
  const stringsByLocale = thing.predicates[predicateIri]?.langStrings ?? {};
  return new Map(
    Object.entries(stringsByLocale).map(([locale, values]) => [
      locale,
      [...values],
    ])
  );
}

/**
 * Returns the string value of the specified Property from a [[Thing]].
 * If the Property is not present or its value is not of type string, returns null.
 * If the Property has multiple string values, returns one of its values.
 *
 * @param thing The [[Thing]] to read a string value from.
 * @param property The Property whose string value to return.
 * @returns A string value for the given Property if present, or null if the Property is not present or the value is not of type string.
 */
export function getStringNoLocale(
  thing: Thing,
  property: Url | UrlString
): string | null {
  internal_throwIfNotThing(thing);
  const literalString = getLiteralOfType(
    thing,
    property,
    xmlSchemaTypes.string
  );

  return literalString;
}

/**
 * Returns the string values of the specified Property from a [[Thing]].
 * If the Property is not present, returns an empty array.
 * If the Property's value is not of type string, omits that value in the array.
 *
 * @param thing The [[Thing]] to read the string values from.
 * @param property The Property whose string values to return.
 * @returns An array of string values for the given Property.
 */
export function getStringNoLocaleAll(
  thing: Thing,
  property: Url | UrlString
): string[] {
  internal_throwIfNotThing(thing);
  const literalStrings = getLiteralAllOfType(
    thing,
    property,
    xmlSchemaTypes.string
  );

  return literalStrings;
}

/**
 * @param thing The [[Thing]] to read a NamedNode value from.
 * @param property The given Property for which you want the NamedNode value.
 * @returns A NamedNode value for the given Property, if present, or null otherwise.
 * @ignore This should not be needed due to the other get*() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @see https://rdf.js.org/data-model-spec/#namednode-interface
 */
export function getNamedNode(
  thing: Thing,
  property: Url | UrlString
): NamedNode | null {
  const iriString = getIri(thing, property);

  if (iriString === null) {
    return null;
  }

  return DataFactory.namedNode(iriString);
}

/**
 * @param thing The [[Thing]] to read the NamedNode values from.
 * @param property The given Property for which you want the NamedNode values.
 * @returns The NamedNode values for the given Property.
 * @ignore This should not be needed due to the other get*() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @see https://rdf.js.org/data-model-spec/#namednode-interface
 */
export function getNamedNodeAll(
  thing: Thing,
  property: Url | UrlString
): NamedNode[] {
  const iriStrings = getIriAll(thing, property);

  return iriStrings.map((iriString) => DataFactory.namedNode(iriString));
}

/**
 * @param thing The [[Thing]] to read a Literal value from.
 * @param property The given Property for which you want the Literal value.
 * @returns A Literal value for the given Property, if present, or null otherwise.
 * @ignore This should not be needed due to the other get*() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @see https://rdf.js.org/data-model-spec/#literal-interface
 */
export function getLiteral(
  thing: Thing,
  property: Url | UrlString
): Literal | null {
  internal_throwIfNotThing(thing);
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const predicateIri = internal_toIriString(property);
  const langStrings = thing.predicates[predicateIri]?.langStrings ?? {};
  const locales = Object.keys(langStrings);
  if (locales.length > 0) {
    const nonEmptyLocale = locales.find(
      (locale) =>
        Array.isArray(langStrings[locale]) && langStrings[locale].length > 0
    );
    if (typeof nonEmptyLocale === "string") {
      return DataFactory.literal(
        langStrings[nonEmptyLocale][0],
        nonEmptyLocale
      );
    }
  }

  const otherLiterals = thing.predicates[predicateIri]?.literals ?? {};
  const dataTypes = Object.keys(otherLiterals);

  if (dataTypes.length > 0) {
    const nonEmptyDataType = dataTypes.find(
      (dataType) =>
        Array.isArray(otherLiterals[dataType]) &&
        otherLiterals[dataType].length > 0
    );
    if (typeof nonEmptyDataType === "string") {
      return DataFactory.literal(
        otherLiterals[nonEmptyDataType][0],
        DataFactory.namedNode(nonEmptyDataType)
      );
    }
  }

  return null;
}

/**
 * @param thing The [[Thing]] to read the Literal values from.
 * @param property The given Property for which you want the Literal values.
 * @returns The Literal values for the given Property.
 * @ignore This should not be needed due to the other get*All() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @see https://rdf.js.org/data-model-spec/#literal-interface
 */
export function getLiteralAll(
  thing: Thing,
  property: Url | UrlString
): Literal[] {
  internal_throwIfNotThing(thing);
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const predicateIri = internal_toIriString(property);
  let literals: Literal[] = [];

  const langStrings = thing.predicates[predicateIri]?.langStrings ?? {};
  const locales = Object.keys(langStrings);
  for (const locale of locales) {
    const stringsInLocale = langStrings[locale];
    const localeLiterals = stringsInLocale.map((langString) =>
      DataFactory.literal(langString, locale)
    );
    literals = literals.concat(localeLiterals);
  }

  const otherLiterals = thing.predicates[predicateIri]?.literals ?? {};
  const dataTypes = Object.keys(otherLiterals);

  for (const dataType of dataTypes) {
    const values = otherLiterals[dataType];
    const typeNode = DataFactory.namedNode(dataType);
    const dataTypeLiterals = values.map((value) =>
      DataFactory.literal(value, typeNode)
    );
    literals = literals.concat(dataTypeLiterals);
  }

  return literals;
}

/**
 * @param thing The [[Thing]] to read a raw RDF/JS value from.
 * @param property The given Property for which you want the raw value.
 * @returns A Term for the given Property, if present, or null otherwise.
 * @ignore This should not be needed due to the other get*() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @see https://rdf.js.org/data-model-spec/
 * @since 0.3.0
 */
export function getTerm(
  thing: Thing,
  property: Url | UrlString
): Quad_Object | null {
  internal_throwIfNotThing(thing);
  const namedNode = getNamedNode(thing, property);
  if (namedNode !== null) {
    return namedNode;
  }

  const literal = getLiteral(thing, property);
  if (literal !== null) {
    return literal;
  }

  const predicateIri = internal_toIriString(property);
  const blankNodes = thing.predicates[predicateIri]?.blankNodes ?? [];
  if (blankNodes.length > 0) {
    const blankNodeValue = isBlankNodeId(blankNodes[0])
      ? getBlankNodeValue(blankNodes[0])
      : undefined;
    return DataFactory.blankNode(blankNodeValue);
  }

  return null;
}

/**
 * @param thing The [[Thing]] to read the raw RDF/JS values from.
 * @param property The given Property for which you want the raw values.
 * @returns The Terms for the given Property.
 * @ignore This should not be needed due to the other get*() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @see https://rdf.js.org/data-model-spec/
 * @since 0.3.0
 */
export function getTermAll(
  thing: Thing,
  property: Url | UrlString
): Quad_Object[] {
  internal_throwIfNotThing(thing);
  const namedNodes = getNamedNodeAll(thing, property);

  const literals = getLiteralAll(thing, property);

  const predicateIri = internal_toIriString(property);
  const blankNodeValues = thing.predicates[predicateIri]?.blankNodes ?? [];
  const blankNodes = blankNodeValues.map((rawBlankNode) => {
    const blankNodeName = isBlankNodeId(rawBlankNode)
      ? getBlankNodeValue(rawBlankNode)
      : undefined;
    return DataFactory.blankNode(blankNodeName);
  });

  const terms: Quad_Object[] = (namedNodes as Quad_Object[])
    .concat(literals)
    .concat(blankNodes);
  return terms;
}

/**
 * @param thing The [Thing]] to read a Literal of the given type from.
 * @param property The given Property for which you want the Literal value.
 * @param literalType Set type of the Literal data.
 * @returns The stringified value for the given Property and type, if present, or null otherwise.
 */
function getLiteralOfType<Datatype extends XmlSchemaTypeIri>(
  thing: Thing,
  property: Url | UrlString,
  literalType: Datatype
): string | null {
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const predicateIri = internal_toIriString(property);
  return thing.predicates[predicateIri]?.literals?.[literalType]?.[0] ?? null;
}

/**
 * @param thing The [Thing]] to read the Literals of the given type from.
 * @param property The given Property for which you want the Literal values.
 * @param literalType Set type of the Literal data.
 * @returns The stringified values for the given Property and type.
 */
function getLiteralAllOfType<Datatype extends XmlSchemaTypeIri>(
  thing: Thing,
  property: Url | UrlString,
  literalType: Datatype
): string[] {
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const predicateIri = internal_toIriString(property);
  const literalsOfType =
    thing.predicates[predicateIri]?.literals?.[literalType] ?? [];
  return [...literalsOfType];
}
