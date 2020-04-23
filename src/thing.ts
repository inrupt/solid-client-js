import { NamedNode, Quad, Literal } from "rdf-js";
import {
  LitDataset,
  IriString,
  Thing,
  Iri,
  ThingLocal,
  LocalNode,
  ThingPersisted,
} from "./index";
import { DataFactory } from "n3";
import { dataset } from "@rdfjs/dataset";
import { resolveLocalIri } from "./litDataset";

export interface GetThingOptions {
  /**
   * Which Named Graph to extract the Thing from.
   *
   * If not specified, the Thing will include Statements from all Named Graphs in the given
   * [[LitDataset]].
   **/
  scope?: Iri | IriString;
}
/**
 * Extract Statements with a given Subject from a [[LitDataset]] into a [[Thing]].
 *
 * @param litDataset The [[LitDataset]] to extract the [[Thing]] from.
 * @param thingIri The IRI of the desired [[Thing]].
 * @param options See [[GetThingOptions]].
 */
export function getOneThing(
  litDataset: LitDataset,
  thingIri: IriString | Iri | LocalNode,
  options: GetThingOptions = {}
): Thing {
  const subject = isLocalNode(thingIri) ? thingIri : asNamedNode(thingIri);
  const scope: NamedNode | null = options.scope
    ? asNamedNode(options.scope)
    : null;

  const thingDataset = litDataset.match(subject, null, null, scope);

  if (isLocalNode(subject)) {
    const thing: ThingLocal = Object.assign(thingDataset, {
      name: subject.name,
    });

    return thing;
  } else {
    const thing: Thing = Object.assign(thingDataset, {
      iri: subject.value,
    });

    return thing;
  }
}

/**
 * Get all [[Thing]]s about which a [[LitDataset]] contains Statements.
 *
 * @param litDataset The [[LitDataset]] to extract the [[Thing]]s from.
 * @param options See [[GetThingOptions]].
 */
export function getAllThings(
  litDataset: LitDataset,
  options: GetThingOptions = {}
): Thing[] {
  const subjectIris = new Set<Iri | LocalNode>();
  for (let statement of litDataset) {
    if (isNamedNode(statement.subject)) {
      subjectIris.add(statement.subject);
    }
    if (isLocalNode(statement.subject)) {
      subjectIris.add(statement.subject);
    }
  }

  const things: Thing[] = Array.from(subjectIris).map((thingIri) =>
    getOneThing(litDataset, thingIri, options)
  );

  return things;
}

interface CreateThingLocalOptions {
  /**
   * The name that should be used for this [[Thing]] when constructing its IRI.
   *
   * If not provided, a random one will be generated.
   */
  name?: string;
}
interface CreateThingPersistedOptions {
  /**
   * The IRI of the newly created [[Thing]].
   */
  iri: IriString;
}
export type CreateThingOptions =
  | CreateThingLocalOptions
  | CreateThingPersistedOptions;
/**
 * Initialise a new [[Thing]] in memory.
 *
 * @param options See [[CreateThingOptions]].
 */
export function createThing(
  options: CreateThingPersistedOptions
): ThingPersisted;
export function createThing(options?: CreateThingLocalOptions): ThingLocal;
export function createThing(options: CreateThingOptions = {}): Thing {
  if (typeof (options as CreateThingPersistedOptions).iri !== "undefined") {
    const iri = (options as CreateThingPersistedOptions).iri;
    /* istanbul ignore else [URL is defined is the testing environment, so we cannot test this] */
    if (typeof URL !== "undefined") {
      // Throws an error if the IRI is invalid:
      new URL(iri);
    }
    const thing: ThingPersisted = Object.assign(dataset(), { iri: iri });
    return thing;
  }
  const name = (options as CreateThingLocalOptions).name ?? generateName();
  const thing: ThingLocal = Object.assign(dataset(), { name: name });
  return thing;
}

/**
 * Get the IRI to a given [[Thing]].
 *
 * @param thing The [[Thing]] you want to obtain the IRI from.
 * @param baseIri If `thing` is not persisted yet, the base IRI that should be used to construct this [[Thing]]'s IRI.
 */
export function asIri(thing: ThingLocal, baseIri: IriString): IriString;
export function asIri(thing: ThingPersisted): IriString;
export function asIri(thing: Thing, baseIri?: IriString): IriString {
  if (isThingLocal(thing)) {
    if (typeof baseIri === "undefined") {
      throw new Error(
        "The IRI of a Thing that has not been persisted cannot be determined without a base IRI."
      );
    }
    return resolveLocalIri(thing.name, baseIri);
  }

  return thing.iri;
}

/**
 * @param thing The [[Thing]] to read an IRI value from.
 * @param predicate The given Predicate for which you want the IRI value.
 * @returns An IRI value for the given Predicate, if present, or null otherwise.
 */
export function getOneIri(
  thing: Thing,
  predicate: Iri | IriString
): IriString | null {
  const predicateNode = asNamedNode(predicate);

  const matchingStatement = findOne(thing, (statement) => {
    return (
      predicateNode.equals(statement.predicate) && isNamedNode(statement.object)
    );
  });

  if (matchingStatement === null) {
    return null;
  }

  return matchingStatement.object.value;
}

/**
 * @param thing The [[Thing]] to read a string value from.
 * @param predicate The given Predicate for which you want the string value.
 * @returns A string value for the given Predicate, if present, or null otherwise.
 */
export function getOneStringUnlocalised(
  thing: Thing,
  predicate: Iri | IriString
): string | null {
  const literalString = getLiteralOfType(
    thing,
    predicate,
    "http://www.w3.org/2001/XMLSchema#string"
  );

  return literalString;
}

/**
 * @param thing The [[Thing]] to read a localised string value from.
 * @param predicate The given Predicate for which you want the localised string value.
 * @param locale The desired locale for the string value.
 * @returns A localised string value for the given Predicate, if present in `locale`, or null otherwise.
 */
export function getOneStringInLocale(
  thing: Thing,
  predicate: Iri | IriString,
  locale: string
): string | null {
  const predicateNode = asNamedNode(predicate);

  const matchingStatement = findOne(thing, (statement) => {
    return (
      predicateNode.equals(statement.predicate) &&
      isLiteral(statement.object) &&
      statement.object.datatype.value ===
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString" &&
      statement.object.language.toLowerCase() === locale.toLowerCase()
    );
  });

  if (matchingStatement === null) {
    return null;
  }

  return matchingStatement.object.value;
}

/**
 * @param thing The [[Thing]] to read an integer value from.
 * @param predicate The given Predicate for which you want the integer value.
 * @returns An integer value for the given Predicate, if present, or null otherwise.
 */
export function getOneInteger(
  thing: Thing,
  predicate: Iri | IriString
): number | null {
  const literalString = getLiteralOfType(
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
 * @param thing The [[Thing]] to read a decimal value from.
 * @param predicate The given Predicate for which you want the decimal value.
 * @returns A decimal value for the given Predicate, if present, or null otherwise.
 */
export function getOneDecimal(
  thing: Thing,
  predicate: Iri | IriString
): number | null {
  const literalString = getLiteralOfType(
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
 * @param thing The [[Thing]] to read a boolean value from.
 * @param predicate The given Predicate for which you want the boolean value.
 * @returns A boolean value for the given Predicate, if present, or null otherwise.
 */
export function getOneBoolean(
  thing: Thing,
  predicate: Iri | IriString
): boolean | null {
  const literalString = getLiteralOfType(
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
 * @param thing The [[Thing]] to read a datetime value from.
 * @param predicate The given Predicate for which you want the datetime value.
 * @returns A datetime value for the given Predicate, if present, or null otherwise.
 */
export function getOneDatetime(
  thing: Thing,
  predicate: Iri | IriString
): Date | null {
  const literalString = getLiteralOfType(
    thing,
    predicate,
    "http://www.w3.org/2001/XMLSchema#dateTime"
  );

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
 * @param thing The [Thing]] to read a Literal of the given type from.
 * @param predicate The given Predicate for which you want the Literal value.
 * @param literalType Set type of the Literal data.
 * @returns The stringified value for the given Predicate and type, if present, or null otherwise.
 */
function getLiteralOfType(
  thing: Thing,
  predicate: Iri | IriString,
  literalType: IriString
): string | null {
  const predicateNode = asNamedNode(predicate);

  const matchingStatement = findOne(thing, (statement) => {
    return (
      predicateNode.equals(statement.predicate) &&
      isLiteral(statement.object) &&
      statement.object.datatype.value === literalType
    );
  });

  if (matchingStatement === null) {
    return null;
  }

  return matchingStatement.object.value;
}

/**
 * @param thing The [[Thing]] to extract Statements from.
 * @param matcher Callback function that returns a boolean indicating whether a given Statement should be included.
 * @returns First statement in `thing` for which `matcher` returned true.
 */
function findOne(
  thing: Thing,
  matcher: (statement: Quad) => boolean
): Quad | null {
  for (let statement of thing) {
    if (matcher(statement)) {
      return statement;
    }
  }
  return null;
}

/**
 * Ensure that a given value is a Named Node.
 *
 * If the given parameter is a Named Node already, it will be returned as-is. If it is a string, it
 * will check whether it is a valid IRI. If not, it will throw an error; otherwise a Named Node
 * representing the given IRI will be returned.
 *
 * @param iri The IRI that should be converted into a Named Node, if it isn't one yet.
 */
function asNamedNode(iri: Iri | IriString): NamedNode {
  if (isNamedNode(iri)) {
    return iri;
  }

  // If the runtime environment supports URL, instantiate one.
  // If thte given IRI is not a valid URL, it will throw an error.
  // See: https://developer.mozilla.org/en-US/docs/Web/API/URL
  /* istanbul ignore else [URL is available in our testing environment, so we cannot test the alternative] */
  if (typeof URL !== "undefined") {
    new URL(iri);
  }

  return DataFactory.namedNode(iri);
}

/**
 * @param value The value that might or might not be a Named Node.
 * @returns Whether `value` is a Named Node.
 */
function isNamedNode<T>(value: T | NamedNode): value is NamedNode {
  return (
    typeof value === "object" &&
    typeof (value as NamedNode).termType === "string" &&
    (value as NamedNode).termType === "NamedNode"
  );
}

/**
 * @param value The value that might or might not be a Literal.
 * @returns Whether `value` is a Literal.
 */
function isLiteral<T>(value: T | Literal): value is Literal {
  return (
    typeof value === "object" &&
    typeof (value as Literal).termType === "string" &&
    (value as Literal).termType === "Literal"
  );
}

/**
 * @param thing The [[Thing]] of which an IRI might or might not be known.
 * @return Whether `thing` has no known IRI yet.
 */
export function isThingLocal(
  thing: ThingPersisted | ThingLocal
): thing is ThingLocal {
  return (
    typeof (thing as ThingLocal).name === "string" &&
    typeof (thing as ThingPersisted).iri === "undefined"
  );
}
/**
 * @param value The value that might or might not be a Node with no known IRI yet.
 * @returns Whether `value` is a Node with no known IRI yet.
 */
export function isLocalNode<T>(value: T | LocalNode): value is LocalNode {
  return (
    typeof value === "object" &&
    typeof (value as LocalNode).termType === "string" &&
    (value as LocalNode).termType === "BlankNode" &&
    typeof (value as LocalNode).name === "string"
  );
}

/**
 * Generate a string that can be used as the unique identifier for a Thing
 *
 * This function works by starting with a date string (so that Things can be
 * sorted chronologically), followed by a random number generated by taking a
 * random number between 0 and 1, and cutting off the `0.`.
 *
 * @internal
 * @returns An string that's likely to be unique
 */
const generateName = () => {
  return (
    Date.now().toString() + Math.random().toString().substring("0.".length)
  );
};
