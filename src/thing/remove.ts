import { Quad, Literal, NamedNode } from "rdf-js";
import {
  Thing,
  Iri,
  IriString,
  ThingPersisted,
  ThingLocal,
  asIri,
} from "../index";
import { asNamedNode, isNamedNode, isLiteral } from "../datatypes";
import { filter, DataFactory } from "../rdfjs";
import { isThingLocal } from "../thing";

/**
 * @param thing Thing to remove an IRI value from.
 * @param predicate Predicate for which to remove the given IRI value.
 * @param value IRI to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export function removeOneIri<T extends Thing>(
  thing: T,
  predicate: Iri | IriString,
  value: Iri | IriString | ThingPersisted
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function removeOneIri(
  thing: Thing,
  predicate: Iri | IriString,
  value: Iri | IriString | ThingPersisted
): Thing {
  const predicateNode = asNamedNode(predicate);
  const iriNode = isNamedNode(value)
    ? value
    : typeof value === "string"
    ? asNamedNode(value)
    : asNamedNode(asIri(value));

  const updatedThing = filterThing(thing, (quad) => {
    return (
      !quad.predicate.equals(predicateNode) ||
      !isNamedNode(quad.object) ||
      !quad.object.equals(iriNode)
    );
  });
  return updatedThing;
}

/**
 * @param thing Thing to remove an unlocalised string value from.
 * @param predicate Predicate for which to remove the given string value.
 * @param value String to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export const removeOneStringUnlocalized: RemoveOneOfType<string> = (
  thing,
  predicate,
  value
) => {
  return removeOneLiteralOfType(
    thing,
    predicate,
    value,
    "http://www.w3.org/2001/XMLSchema#string"
  );
};

/**
 * @param thing Thing to remove a localised string value from.
 * @param predicate Predicate for which to remove the given localised string value.
 * @param value String to remove from `thing` for the given `predicate`.
 * @param locale Locale of the string to remove.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export function removeOneStringInLocale<T extends Thing>(
  thing: T,
  predicate: Iri | IriString,
  value: string,
  locale: string
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function removeOneStringInLocale(
  thing: Thing,
  predicate: Iri | IriString,
  value: string,
  locale: string
): Thing {
  // Note: Due to how the `DataFactory.literal` constructor behaves, this function
  // must call directly `removeOneLiteral` directly, with the locale as the data
  // type of the Literal (which is not a valid NamedNode).
  return removeOneLiteral(
    thing,
    predicate,
    DataFactory.literal(value, locale.toLowerCase())
  );
}

/**
 * @param thing Thing to remove an integer value from.
 * @param predicate Predicate for which to remove the given integer value.
 * @param value Integer to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export const removeOneInteger: RemoveOneOfType<number> = (
  thing,
  predicate,
  value
) => {
  return removeOneLiteralOfType(
    thing,
    predicate,
    value.toString(),
    "http://www.w3.org/2001/XMLSchema#integer"
  );
};

/**
 * @param thing Thing to remove a decimal value from.
 * @param predicate Predicate for which to remove the given decimal value.
 * @param value Decimal to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export const removeOneDecimal: RemoveOneOfType<number> = (
  thing,
  predicate,
  value
) => {
  return removeOneLiteralOfType(
    thing,
    predicate,
    value.toString(),
    "http://www.w3.org/2001/XMLSchema#decimal"
  );
};

/**
 * @param thing Thing to remove a boolean value from.
 * @param predicate Predicate for which to remove the given boolean value.
 * @param value Boolean to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export const removeOneBoolean: RemoveOneOfType<boolean> = (
  thing,
  predicate,
  value
) => {
  return removeOneLiteralOfType(
    thing,
    predicate,
    value ? "1" : "0",
    "http://www.w3.org/2001/XMLSchema#boolean"
  );
};

function serialiseDatetime(datetime: Date): string {
  // To align with rdflib, we ignore miliseconds:
  // https://github.com/linkeddata/rdflib.js/blob/d84af88f367b8b5f617c753d8241c5a2035458e8/src/literal.js#L74
  const roundedDate = new Date(
    Date.UTC(
      datetime.getUTCFullYear(),
      datetime.getUTCMonth(),
      datetime.getUTCDate(),
      datetime.getUTCHours(),
      datetime.getUTCMinutes(),
      datetime.getUTCSeconds(),
      0
    )
  );
  // Truncate the `.000Z` at the end (i.e. the miliseconds), to plain `Z`:
  const rdflibStyleString = roundedDate.toISOString().replace(/\.000Z$/, "Z");
  return rdflibStyleString;
}

/**
 * @param thing Thing to remove a datetime value from.
 * @param predicate Predicate for which to remove the given datetime value.
 * @param value Datetime to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export const removeOneDatetime: RemoveOneOfType<Date> = (
  thing,
  predicate,
  value
) => {
  return removeOneLiteralOfType(
    thing,
    predicate,
    serialiseDatetime(value),
    "http://www.w3.org/2001/XMLSchema#dateTime"
  );
};

/**
 * @ignore This should not be needed due to the other removeOne*() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @param thing Thing to remove a NamedNode value from.
 * @param predicate Predicate for which to remove the given NamedNode value.
 * @param value NamedNode to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export function removeOneNamedNode<T extends Thing>(
  thing: T,
  predicate: Iri | IriString,
  value: NamedNode
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function removeOneNamedNode(
  thing: Thing,
  predicate: Iri | IriString,
  value: NamedNode
): Thing {
  const predicateNode = asNamedNode(predicate);
  const updatedThing = filterThing(thing, (quad) => {
    return (
      !quad.predicate.equals(predicateNode) ||
      !isNamedNode(quad.object) ||
      !quad.object.equals(value)
    );
  });
  return updatedThing;
}

/**
 * @ignore This should not be needed due to the other removeOne*() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @param thing Thing to remove a Literal value from.
 * @param predicate Predicate for which to remove the given Literal value.
 * @param value Literal to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export function removeOneLiteral<T extends Thing>(
  thing: T,
  predicate: Iri | IriString,
  value: Literal
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function removeOneLiteral(
  thing: Thing,
  predicate: Iri | IriString,
  value: Literal
): Thing {
  const predicateNode = asNamedNode(predicate);
  const updatedThing = filterThing(thing, (quad) => {
    return (
      !quad.predicate.equals(predicateNode) ||
      !isLiteral(quad.object) ||
      !quad.object.equals(value)
    );
  });
  return updatedThing;
}

function filterThing<T extends Thing>(
  thing: T,
  callback: (quad: Quad) => boolean
): T extends ThingLocal ? ThingLocal : ThingPersisted;
function filterThing(thing: Thing, callback: (quad: Quad) => boolean): Thing {
  const filtered = filter(thing, callback);
  if (isThingLocal(thing)) {
    (filtered as ThingLocal).name = thing.name;
    return filtered as ThingLocal;
  }
  (filtered as ThingPersisted).iri = thing.iri;
  return filtered as ThingPersisted;
}

function removeOneLiteralOfType<T extends Thing>(
  thing: T,
  predicate: Iri | IriString,
  value: string,
  type: IriString
): T extends ThingLocal ? ThingLocal : ThingPersisted;
function removeOneLiteralOfType(
  thing: Thing,
  predicate: Iri | IriString,
  value: string,
  type: IriString
): Thing {
  const updatedThing = removeOneLiteral(
    thing,
    predicate,
    DataFactory.literal(value, DataFactory.namedNode(type))
  );
  return updatedThing;
}

/**
 * @param thing Thing to remove a value from.
 * @param predicate Predicate for which to remove the given value.
 * @param value Value to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
type RemoveOneOfType<Type> = <T extends Thing>(
  thing: T,
  predicate: Iri | IriString,
  value: Type
) => T extends ThingLocal ? ThingLocal : ThingPersisted;
