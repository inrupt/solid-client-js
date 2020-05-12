import { Quad_Object, Quad, NamedNode, Literal } from "rdf-js";
import { Thing, Iri, IriString } from "../index";
import { asNamedNode, isNamedNode, isLiteral } from "../datatypes";

/**
 * @param thing The [[Thing]] to read an IRI value from.
 * @param predicate The given Predicate for which you want the IRI value.
 * @returns An IRI value for the given Predicate, if present, or null otherwise.
 */
export function getIriOne(
  thing: Thing,
  predicate: Iri | IriString
): IriString | null {
  const namedNodeMatcher = getNamedNodeMatcher(predicate);

  const matchingQuad = findOne(thing, namedNodeMatcher);

  if (matchingQuad === null) {
    return null;
  }

  return matchingQuad.object.value;
}

/**
 * @param thing The [[Thing]] to read the IRI values from.
 * @param predicate The given Predicate for which you want the IRI values.
 * @returns The IRI values for the given Predicate.
 */
export function getIriAll(
  thing: Thing,
  predicate: Iri | IriString
): IriString[] {
  const iriMatcher = getNamedNodeMatcher(predicate);

  const matchingQuads = findAll(thing, iriMatcher);

  return matchingQuads.map((quad) => quad.object.value);
}

/**
 * @param thing The [[Thing]] to read a boolean value from.
 * @param predicate The given Predicate for which you want the boolean value.
 * @returns A boolean value for the given Predicate, if present, or null otherwise.
 */
export function getBooleanOne(
  thing: Thing,
  predicate: Iri | IriString
): boolean | null {
  const literalString = getLiteralOneOfType(
    thing,
    predicate,
    "http://www.w3.org/2001/XMLSchema#boolean"
  );

  if (literalString === null) {
    return null;
  }

  if (literalString === "1") {
    return true;
  } else if (literalString === "0") {
    return false;
  } else {
    return null;
  }
}

/**
 * @param thing The [[Thing]] to read the boolean values from.
 * @param predicate The given Predicate for which you want the boolean values.
 * @returns The boolean values for the given Predicate.
 */
export function getBooleanAll(
  thing: Thing,
  predicate: Iri | IriString
): boolean[] {
  const literalStrings = getLiteralAllOfType(
    thing,
    predicate,
    "http://www.w3.org/2001/XMLSchema#boolean"
  );

  return literalStrings
    .map((literalString) => {
      if (literalString === "1") {
        return true;
      } else if (literalString === "0") {
        return false;
      } else {
        return null;
      }
    })
    .filter((possibleBoolean) => possibleBoolean !== null) as boolean[];
}

function parseDatetimeFromLiteralString(literalString: string): Date | null {
  if (
    literalString === null ||
    literalString.length <= 17 ||
    literalString.indexOf("Z") === -1
  ) {
    return null;
  }

  // See https://github.com/linkeddata/rdflib.js/blob/d84af88f367b8b5f617c753d8241c5a2035458e8/src/literal.js#L87
  const utcFullYear = parseInt(literalString.substring(0, 4), 10);
  const utcMonth = parseInt(literalString.substring(5, 7), 10) - 1;
  const utcDate = parseInt(literalString.substring(8, 10), 10);
  const utcHours = parseInt(literalString.substring(11, 13), 10);
  const utcMinutes = parseInt(literalString.substring(14, 16), 10);
  const utcSeconds = parseInt(
    literalString.substring(17, literalString.indexOf("Z")),
    10
  );
  const date = new Date(0);
  date.setUTCFullYear(utcFullYear);
  date.setUTCMonth(utcMonth);
  date.setUTCDate(utcDate);
  date.setUTCHours(utcHours);
  date.setUTCMinutes(utcMinutes);
  date.setUTCSeconds(utcSeconds);
  return date;
}

/**
 * @param thing The [[Thing]] to read a datetime value from.
 * @param predicate The given Predicate for which you want the datetime value.
 * @returns A datetime value for the given Predicate, if present, or null otherwise.
 */
export function getDatetimeOne(
  thing: Thing,
  predicate: Iri | IriString
): Date | null {
  const literalString = getLiteralOneOfType(
    thing,
    predicate,
    "http://www.w3.org/2001/XMLSchema#dateTime"
  );

  if (literalString === null) {
    return null;
  }

  return parseDatetimeFromLiteralString(literalString);
}

/**
 * @param thing The [[Thing]] to read the datetime values from.
 * @param predicate The given Predicate for which you want the datetime values.
 * @returns The datetime values for the given Predicate.
 */
export function getDatetimeAll(
  thing: Thing,
  predicate: Iri | IriString
): Date[] {
  const literalStrings = getLiteralAllOfType(
    thing,
    predicate,
    "http://www.w3.org/2001/XMLSchema#dateTime"
  );

  return literalStrings
    .map(parseDatetimeFromLiteralString)
    .filter((potentialDatetime) => potentialDatetime !== null) as Date[];
}

/**
 * @param thing The [[Thing]] to read a decimal value from.
 * @param predicate The given Predicate for which you want the decimal value.
 * @returns A decimal value for the given Predicate, if present, or null otherwise.
 */
export function getDecimalOne(
  thing: Thing,
  predicate: Iri | IriString
): number | null {
  const literalString = getLiteralOneOfType(
    thing,
    predicate,
    "http://www.w3.org/2001/XMLSchema#decimal"
  );

  if (literalString === null) {
    return null;
  }

  return Number.parseFloat(literalString);
}

/**
 * @param thing The [[Thing]] to read the decimal values from.
 * @param predicate The given Predicate for which you want the decimal values.
 * @returns The decimal values for the given Predicate.
 */
export function getDecimalAll(
  thing: Thing,
  predicate: Iri | IriString
): number[] {
  const literalStrings = getLiteralAllOfType(
    thing,
    predicate,
    "http://www.w3.org/2001/XMLSchema#decimal"
  );

  return literalStrings.map((literalString) =>
    Number.parseFloat(literalString)
  );
}

/**
 * @param thing The [[Thing]] to read an integer value from.
 * @param predicate The given Predicate for which you want the integer value.
 * @returns An integer value for the given Predicate, if present, or null otherwise.
 */
export function getIntegerOne(
  thing: Thing,
  predicate: Iri | IriString
): number | null {
  const literalString = getLiteralOneOfType(
    thing,
    predicate,
    "http://www.w3.org/2001/XMLSchema#integer"
  );

  if (literalString === null) {
    return null;
  }

  return Number.parseInt(literalString, 10);
}

/**
 * @param thing The [[Thing]] to read the integer values from.
 * @param predicate The given Predicate for which you want the integer values.
 * @returns The integer values for the given Predicate.
 */
export function getIntegerAll(
  thing: Thing,
  predicate: Iri | IriString
): number[] {
  const literalStrings = getLiteralAllOfType(
    thing,
    predicate,
    "http://www.w3.org/2001/XMLSchema#integer"
  );

  return literalStrings.map((literalString) =>
    Number.parseInt(literalString, 10)
  );
}

/**
 * @param thing The [[Thing]] to read a localised string value from.
 * @param predicate The given Predicate for which you want the localised string value.
 * @param locale The desired locale for the string value.
 * @returns A localised string value for the given Predicate, if present in `locale`, or null otherwise.
 */
export function getStringInLocaleOne(
  thing: Thing,
  predicate: Iri | IriString,
  locale: string
): string | null {
  const localeStringMatcher = getLocaleStringMatcher(predicate, locale);

  const matchingQuad = findOne(thing, localeStringMatcher);

  if (matchingQuad === null) {
    return null;
  }

  return matchingQuad.object.value;
}

/**
 * @param thing The [[Thing]] to read the localised string values from.
 * @param predicate The given Predicate for which you want the localised string values.
 * @param locale The desired locale for the string values.
 * @returns The localised string values for the given Predicate.
 */
export function getStringInLocaleAll(
  thing: Thing,
  predicate: Iri | IriString,
  locale: string
): string[] {
  const localeStringMatcher = getLocaleStringMatcher(predicate, locale);

  const matchingQuads = findAll(thing, localeStringMatcher);

  return matchingQuads.map((quad) => quad.object.value);
}

/**
 * @param thing The [[Thing]] to read a string value from.
 * @param predicate The given Predicate for which you want the string value.
 * @returns A string value for the given Predicate, if present, or null otherwise.
 */
export function getStringUnlocalizedOne(
  thing: Thing,
  predicate: Iri | IriString
): string | null {
  const literalString = getLiteralOneOfType(
    thing,
    predicate,
    "http://www.w3.org/2001/XMLSchema#string"
  );

  return literalString;
}

/**
 * @param thing The [[Thing]] to read the string values from.
 * @param predicate The given Predicate for which you want the string values.
 * @returns The string values for the given Predicate.
 */
export function getStringUnlocalizedAll(
  thing: Thing,
  predicate: Iri | IriString
): string[] {
  const literalStrings = getLiteralAllOfType(
    thing,
    predicate,
    "http://www.w3.org/2001/XMLSchema#string"
  );

  return literalStrings;
}

/**
 * @param thing The [[Thing]] to read a NamedNode value from.
 * @param predicate The given Predicate for which you want the NamedNode value.
 * @returns A NamedNode value for the given Predicate, if present, or null otherwise.
 * @ignore This should not be needed due to the other get*One() functions. If you do find yourself needing it, please file a feature request for your use case.
 */
export function getNamedNodeOne(
  thing: Thing,
  predicate: Iri | IriString
): NamedNode | null {
  const namedNodeMatcher = getNamedNodeMatcher(predicate);

  const matchingQuad = findOne(thing, namedNodeMatcher);

  if (matchingQuad === null) {
    return null;
  }

  return matchingQuad.object;
}

/**
 * @param thing The [[Thing]] to read the NamedNode values from.
 * @param predicate The given Predicate for which you want the NamedNode values.
 * @returns The NamedNode values for the given Predicate.
 * @ignore This should not be needed due to the other get*One() functions. If you do find yourself needing it, please file a feature request for your use case.
 */
export function getNamedNodeAll(
  thing: Thing,
  predicate: Iri | IriString
): NamedNode[] {
  const namedNodeMatcher = getNamedNodeMatcher(predicate);

  const matchingQuads = findAll(thing, namedNodeMatcher);

  return matchingQuads.map((quad) => quad.object);
}

/**
 * @param thing The [[Thing]] to read a Literal value from.
 * @param predicate The given Predicate for which you want the Literal value.
 * @returns A Literal value for the given Predicate, if present, or null otherwise.
 * @ignore This should not be needed due to the other get*One() functions. If you do find yourself needing it, please file a feature request for your use case.
 */
export function getLiteralOne(
  thing: Thing,
  predicate: Iri | IriString
): Literal | null {
  const literalMatcher = getLiteralMatcher(predicate);

  const matchingQuad = findOne(thing, literalMatcher);

  if (matchingQuad === null) {
    return null;
  }

  return matchingQuad.object;
}

/**
 * @param thing The [[Thing]] to read the Literal values from.
 * @param predicate The given Predicate for which you want the Literal values.
 * @returns The Literal values for the given Predicate.
 * @ignore This should not be needed due to the other get*All() functions. If you do find yourself needing it, please file a feature request for your use case.
 */
export function getLiteralAll(
  thing: Thing,
  predicate: Iri | IriString
): Literal[] {
  const literalMatcher = getLiteralMatcher(predicate);

  const matchingQuads = findAll(thing, literalMatcher);

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
  for (let quad of thing) {
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
  for (let quad of thing) {
    if (matcher(quad)) {
      matched.push(quad);
    }
  }
  return matched;
}

const getNamedNodeMatcher = function (
  predicate: Iri | IriString
): Matcher<NamedNode> {
  const predicateNode = asNamedNode(predicate);

  const matcher = function (quad: Quad): quad is QuadWithObject<NamedNode> {
    return predicateNode.equals(quad.predicate) && isNamedNode(quad.object);
  };
  return matcher;
};

const getLiteralMatcher = function (
  predicate: Iri | IriString
): Matcher<Literal> {
  const predicateNode = asNamedNode(predicate);

  const matcher = function (quad: Quad): quad is QuadWithObject<Literal> {
    return predicateNode.equals(quad.predicate) && isLiteral(quad.object);
  };
  return matcher;
};

type LiteralOfType<Type extends IriString> = Literal & {
  datatype: { value: Type };
};
const getLiteralOfTypeMatcher = function <Datatype extends IriString>(
  predicate: Iri | IriString,
  datatype: Datatype
): Matcher<LiteralOfType<Datatype>> {
  const predicateNode = asNamedNode(predicate);

  const matcher = function (
    quad: Quad
  ): quad is QuadWithObject<LiteralOfType<Datatype>> {
    return (
      predicateNode.equals(quad.predicate) &&
      isLiteral(quad.object) &&
      quad.object.datatype.value === datatype
    );
  };
  return matcher;
};

type LiteralLocaleString = Literal & {
  datatype: { value: "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString" };
  language: string;
};
const getLocaleStringMatcher = function (
  predicate: Iri | IriString,
  locale: string
): Matcher<LiteralLocaleString> {
  const predicateNode = asNamedNode(predicate);

  const matcher = function (
    quad: Quad
  ): quad is QuadWithObject<LiteralLocaleString> {
    return (
      predicateNode.equals(quad.predicate) &&
      isLiteral(quad.object) &&
      quad.object.datatype.value ===
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString" &&
      quad.object.language.toLowerCase() === locale.toLowerCase()
    );
  };
  return matcher;
};

/**
 * @param thing The [Thing]] to read a Literal of the given type from.
 * @param predicate The given Predicate for which you want the Literal value.
 * @param literalType Set type of the Literal data.
 * @returns The stringified value for the given Predicate and type, if present, or null otherwise.
 */
function getLiteralOneOfType<Datatype extends IriString>(
  thing: Thing,
  predicate: Iri | IriString,
  literalType: Datatype
): string | null {
  const literalOfTypeMatcher = getLiteralOfTypeMatcher(predicate, literalType);

  const matchingQuad = findOne(thing, literalOfTypeMatcher);

  if (matchingQuad === null) {
    return null;
  }

  return matchingQuad.object.value;
}

/**
 * @param thing The [Thing]] to read the Literals of the given type from.
 * @param predicate The given Predicate for which you want the Literal values.
 * @param literalType Set type of the Literal data.
 * @returns The stringified values for the given Predicate and type.
 */
function getLiteralAllOfType<Datatype extends IriString>(
  thing: Thing,
  predicate: Iri | IriString,
  literalType: Datatype
): string[] {
  const literalOfTypeMatcher = getLiteralOfTypeMatcher(predicate, literalType);

  const matchingQuads = findAll(thing, literalOfTypeMatcher);

  return matchingQuads.map((quad) => quad.object.value);
}
