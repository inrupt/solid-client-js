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
} from "../datatypes";
import any = jasmine.any;

/**
 * @param thing The [[Thing]] to read a URL value from.
 * @param property The given Property for which you want the URL value.
 * @returns A URL value for the given Property, if present, or null otherwise.
 */
export function getUrl(
  thing: Thing,
  property: Url | UrlString
): UrlString | null {
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
 * @param thing The [[Thing]] to read the URL values from.
 * @param property The given Property for which you want the URL values.
 * @returns The URL values for the given Property.
 */
export function getUrlAll(
  thing: Thing,
  property: Url | UrlString
): UrlString[] {
  const iriMatcher = getNamedNodeMatcher(property);

  const matchingQuads = findAll(thing, iriMatcher);

  return matchingQuads.map((quad) => quad.object.value);
}
/** @hidden Alias of [[getUrlAll]] for those who prefer IRI terminology. */
export const getIriAll = getUrlAll;

/**
 * @param thing The [[Thing]] to read a boolean value from.
 * @param property The given Property for which you want the boolean value.
 * @returns A boolean value for the given Property, if present, or null otherwise.
 */
export function getBoolean(
  thing: Thing,
  property: Url | UrlString
): boolean | null {
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
 * @param thing The [[Thing]] to read the boolean values from.
 * @param property The given Property for which you want the boolean values.
 * @returns The boolean values for the given Property.
 */
export function getBooleanAll(
  thing: Thing,
  property: Url | UrlString
): boolean[] {
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
 * @param thing The [[Thing]] to read a datetime value from.
 * @param property The given Property for which you want the datetime value.
 * @returns A datetime value for the given Property, if present, or null otherwise.
 */
export function getDatetime(
  thing: Thing,
  property: Url | UrlString
): Date | null {
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
 * @param thing The [[Thing]] to read the datetime values from.
 * @param property The given Property for which you want the datetime values.
 * @returns The datetime values for the given Property.
 */
export function getDatetimeAll(
  thing: Thing,
  property: Url | UrlString
): Date[] {
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
 * @param thing The [[Thing]] to read a decimal value from.
 * @param property The given Property for which you want the decimal value.
 * @returns A decimal value for the given Property, if present, or null otherwise.
 */
export function getDecimal(
  thing: Thing,
  property: Url | UrlString
): number | null {
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
 * @param thing The [[Thing]] to read the decimal values from.
 * @param property The given Property for which you want the decimal values.
 * @returns The decimal values for the given Property.
 */
export function getDecimalAll(
  thing: Thing,
  property: Url | UrlString
): number[] {
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
 * @param thing The [[Thing]] to read an integer value from.
 * @param property The given Property for which you want the integer value.
 * @returns An integer value for the given Property, if present, or null otherwise.
 */
export function getInteger(
  thing: Thing,
  property: Url | UrlString
): number | null {
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
 * @param thing The [[Thing]] to read the integer values from.
 * @param property The given Property for which you want the integer values.
 * @returns The integer values for the given Property.
 */
export function getIntegerAll(
  thing: Thing,
  property: Url | UrlString
): number[] {
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
 * @param thing The [[Thing]] to read a localised string value from.
 * @param property The given Property for which you want the localised string value.
 * @param locale The desired locale for the string value.
 * @returns A localised string value for the given Property, if present in `locale`, or null otherwise.
 */
export function getStringWithLocale(
  thing: Thing,
  property: Url | UrlString,
  locale: string
): string | null {
  const localeStringMatcher = getLocaleStringMatcher(property, locale);

  const matchingQuad = findOne(thing, localeStringMatcher);

  if (matchingQuad === null) {
    return null;
  }

  return matchingQuad.object.value;
}

/**
 * @param thing The [[Thing]] to read the localised string values from.
 * @param property The given Property for which you want the localised string values.
 * @param locale The desired locale for the string values.
 * @returns The localised string values for the given Property.
 */
export function getStringWithLocaleAll(
  thing: Thing,
  property: Url | UrlString,
  locale: string
): string[] {
  const localeStringMatcher = getLocaleStringMatcher(property, locale);

  const matchingQuads = findAll(thing, localeStringMatcher);

  return matchingQuads.map((quad) => quad.object.value);
}

/**
 * Retrieves all string literals for the specified property from the specified
 * Thing.
 *
 * NOTE: Assumes you also want non-locale string literals too (i.e. literals
 * with the xsd:string datatype). These values will be returned in a map entry
 * with a key of the empty string.
 *
 * @param thing The [[Thing]] to read the localised string values from.
 * @param property The given Property for which you want the localised string values.
 * @returns A Map of objects, keyed on locale with the value an array of string values (for that locale).
 */
export function getStringByLocaleAll(
  thing: Thing,
  property: Url | UrlString
): Map<string, string[]> {
  const literalMatcher = getLiteralMatcher(property);

  const matchingQuads = findAll(thing, literalMatcher);

  const byLocale = new Map<string, string[]>();
  matchingQuads.map((quad) => {
    if (
      quad.object.datatype.value === xmlSchemaTypes.langString ||
      quad.object.datatype.value === xmlSchemaTypes.string
    ) {
      const current: string[] | undefined = byLocale.get(quad.object.language);
      current
        ? byLocale.set(quad.object.language, [...current, quad.object.value])
        : byLocale.set(quad.object.language, [quad.object.value]);
    }
  });

  return byLocale;
}

/**
 * @param thing The [[Thing]] to read a string value from.
 * @param property The given Property for which you want the string value.
 * @returns A string value for the given Property, if present, or null otherwise.
 */
export function getStringNoLocale(
  thing: Thing,
  property: Url | UrlString
): string | null {
  const literalString = getLiteralOfType(
    thing,
    property,
    xmlSchemaTypes.string
  );

  return literalString;
}

/**
 * @param thing The [[Thing]] to read the string values from.
 * @param property The given Property for which you want the string values.
 * @returns The string values for the given Property.
 */
export function getStringNoLocaleAll(
  thing: Thing,
  property: Url | UrlString
): string[] {
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
  const predicateNode = asNamedNode(property);

  const matcher = function matcher(
    quad: Quad
  ): quad is QuadWithObject<NamedNode> {
    return predicateNode.equals(quad.predicate) && isNamedNode(quad.object);
  };
  return matcher;
}

function getLiteralMatcher(property: Url | UrlString): Matcher<Literal> {
  const predicateNode = asNamedNode(property);

  const matcher = function matcher(
    quad: Quad
  ): quad is QuadWithObject<Literal> {
    return predicateNode.equals(quad.predicate) && isLiteral(quad.object);
  };
  return matcher;
}

function getTermMatcher(property: Url | UrlString): Matcher<Quad_Object> {
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
