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

import { Quad_Object, Quad, NamedNode, Literal } from "rdf-js";
import { Thing, Url, UrlString } from "../interfaces";
import {
  asNamedNode,
  isNamedNode,
  isLiteral,
  deserializeBoolean,
  deserializeDatetime,
  deserializeDecimal,
  deserializeInteger,
  xmlSchemaTypes,
  XmlSchemaTypeIri,
  isTerm,
  internal_isValidUrl,
} from "../datatypes";
import { internal_throwIfNotThing } from "./thing.internal";
import { ValidPropertyUrlExpectedError } from "./thing";

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
  const namedNodeMatcher = getNamedNodeMatcher(property);

  const matchingQuad = findOne(thing, namedNodeMatcher);

  if (matchingQuad === null) {
    return null;
  }

  return matchingQuad.object.value;
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
  const iriMatcher = getNamedNodeMatcher(property);

  const matchingQuads = findAll(thing, iriMatcher);

  return matchingQuads.map((quad) => quad.object.value);
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
  const localeStringMatcher = getLocaleStringMatcher(property, locale);

  const matchingQuad = findOne(thing, localeStringMatcher);

  if (matchingQuad === null) {
    return null;
  }

  return matchingQuad.object.value;
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
  const localeStringMatcher = getLocaleStringMatcher(property, locale);

  const matchingQuads = findAll(thing, localeStringMatcher);

  return matchingQuads.map((quad) => quad.object.value);
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
  const literalMatcher = getLiteralMatcher(property);

  const matchingQuads = findAll(thing, literalMatcher);

  const result = new Map<string, string[]>();
  matchingQuads.map((quad) => {
    if (quad.object.datatype.value === xmlSchemaTypes.langString) {
      const languageTag = quad.object.language;
      const current: string[] | undefined = result.get(languageTag);
      current
        ? result.set(languageTag, [...current, quad.object.value])
        : result.set(languageTag, [quad.object.value]);
    }
  });

  return result;
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
  internal_throwIfNotThing(thing);
  const namedNodeMatcher = getNamedNodeMatcher(property);

  const matchingQuad = findOne(thing, namedNodeMatcher);

  if (matchingQuad === null) {
    return null;
  }

  return matchingQuad.object;
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
  internal_throwIfNotThing(thing);
  const namedNodeMatcher = getNamedNodeMatcher(property);

  const matchingQuads = findAll(thing, namedNodeMatcher);

  return matchingQuads.map((quad) => quad.object);
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
  const literalMatcher = getLiteralMatcher(property);

  const matchingQuad = findOne(thing, literalMatcher);

  if (matchingQuad === null) {
    return null;
  }

  return matchingQuad.object;
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
  const literalMatcher = getLiteralMatcher(property);

  const matchingQuads = findAll(thing, literalMatcher);

  return matchingQuads.map((quad) => quad.object);
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
  const termMatcher = getTermMatcher(property);

  const matchingQuad = findOne(thing, termMatcher);

  if (matchingQuad === null) {
    return null;
  }

  return matchingQuad.object;
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
  const namedNodeMatcher = getTermMatcher(property);

  const matchingQuads = findAll(thing, namedNodeMatcher);

  return matchingQuads.map((quad) => quad.object);
}

type QuadWithObject<Object extends Quad_Object> = Quad & { object: Object };
type Matcher<Object extends Quad_Object> = (
  quad: Quad
) => quad is QuadWithObject<Object>;

/**
 * @param thing The [[Thing]] to extract a Quad from.
 * @param matcher Callback function that returns a boolean indicating whether a given Quad should be included.
 * @returns First Quad in `thing` for which `matcher` returned true.
 */
function findOne<Object extends Quad_Object>(
  thing: Thing,
  matcher: Matcher<Object>
): QuadWithObject<Object> | null {
  for (const quad of thing) {
    if (matcher(quad)) {
      return quad;
    }
  }
  return null;
}

/**
 * @param thing The [[Thing]] to extract Quads from.
 * @param matcher Callback function that returns a boolean indicating whether a given Quad should be included.
 * @returns All Quads in `thing` for which `matcher` returned true.
 */
function findAll<Object extends Quad_Object>(
  thing: Thing,
  matcher: Matcher<Object>
): QuadWithObject<Object>[] {
  const matched: QuadWithObject<Object>[] = [];
  for (const quad of thing) {
    if (matcher(quad)) {
      matched.push(quad);
    }
  }
  return matched;
}

function getNamedNodeMatcher(property: Url | UrlString): Matcher<NamedNode> {
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const predicateNode = asNamedNode(property);

  const matcher = function matcher(
    quad: Quad
  ): quad is QuadWithObject<NamedNode> {
    return predicateNode.equals(quad.predicate) && isNamedNode(quad.object);
  };
  return matcher;
}

function getLiteralMatcher(property: Url | UrlString): Matcher<Literal> {
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const predicateNode = asNamedNode(property);

  const matcher = function matcher(
    quad: Quad
  ): quad is QuadWithObject<Literal> {
    return predicateNode.equals(quad.predicate) && isLiteral(quad.object);
  };
  return matcher;
}

function getTermMatcher(property: Url | UrlString): Matcher<Quad_Object> {
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const predicateNode = asNamedNode(property);

  const matcher = function matcher(
    quad: Quad
  ): quad is QuadWithObject<NamedNode> {
    return predicateNode.equals(quad.predicate) && isTerm(quad.object);
  };
  return matcher;
}

type LiteralOfType<Type extends XmlSchemaTypeIri> = Literal & {
  datatype: { value: Type };
};
function getLiteralOfTypeMatcher<Datatype extends XmlSchemaTypeIri>(
  property: Url | UrlString,
  datatype: Datatype
): Matcher<LiteralOfType<Datatype>> {
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const predicateNode = asNamedNode(property);

  const matcher = function matcher(
    quad: Quad
  ): quad is QuadWithObject<LiteralOfType<Datatype>> {
    return (
      predicateNode.equals(quad.predicate) &&
      isLiteral(quad.object) &&
      quad.object.datatype.value === datatype
    );
  };
  return matcher;
}

type LiteralLocaleString = Literal & {
  datatype: { value: typeof xmlSchemaTypes.langString };
  language: string;
};
function getLocaleStringMatcher(
  property: Url | UrlString,
  locale: string
): Matcher<LiteralLocaleString> {
  if (!internal_isValidUrl(property)) {
    throw new ValidPropertyUrlExpectedError(property);
  }
  const predicateNode = asNamedNode(property);

  const matcher = function matcher(
    quad: Quad
  ): quad is QuadWithObject<LiteralLocaleString> {
    return (
      predicateNode.equals(quad.predicate) &&
      isLiteral(quad.object) &&
      quad.object.datatype.value === xmlSchemaTypes.langString &&
      quad.object.language.toLowerCase() === locale.toLowerCase()
    );
  };
  return matcher;
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
  const literalOfTypeMatcher = getLiteralOfTypeMatcher(property, literalType);

  const matchingQuad = findOne(thing, literalOfTypeMatcher);

  if (matchingQuad === null) {
    return null;
  }

  return matchingQuad.object.value;
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
  const literalOfTypeMatcher = getLiteralOfTypeMatcher(property, literalType);

  const matchingQuads = findAll(thing, literalOfTypeMatcher);

  return matchingQuads.map((quad) => quad.object.value);
}
