import { Literal, NamedNode } from "rdf-js";
import {
  Thing,
  Iri,
  IriString,
  ThingPersisted,
  ThingLocal,
  asIri,
} from "../index";
import {
  asNamedNode,
  isNamedNode,
  isLiteral,
  serializeBoolean,
  serializeDatetime,
  serializeDecimal,
  serializeInteger,
  normalizeLocale,
} from "../datatypes";
import { DataFactory } from "../rdfjs";
import { filterThing } from "../thing";

export function removeAll<T extends Thing>(
  thing: T,
  predicate: Iri | IriString
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function removeAll(thing: Thing, predicate: Iri | IriString): Thing {
  const predicateNode = asNamedNode(predicate);

  const updatedThing = filterThing(
    thing,
    (quad) => !quad.predicate.equals(predicateNode)
  );
  return updatedThing;
}

/**
 * @param thing Thing to remove an IRI value from.
 * @param predicate Predicate for which to remove the given IRI value.
 * @param value IRI to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export const removeIriOne: RemoveOneOfType<Iri | IriString | ThingPersisted> = (
  thing,
  predicate,
  value
) => {
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
};

/**
 * @param thing Thing to remove a boolean value from.
 * @param predicate Predicate for which to remove the given boolean value.
 * @param value Boolean to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export const removeBooleanOne: RemoveOneOfType<boolean> = (
  thing,
  predicate,
  value
) => {
  return removeLiteralOneOfType(
    thing,
    predicate,
    serializeBoolean(value),
    "http://www.w3.org/2001/XMLSchema#boolean"
  );
};

/**
 * @param thing Thing to remove a datetime value from.
 * @param predicate Predicate for which to remove the given datetime value.
 * @param value Datetime to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export const removeDatetimeOne: RemoveOneOfType<Date> = (
  thing,
  predicate,
  value
) => {
  return removeLiteralOneOfType(
    thing,
    predicate,
    serializeDatetime(value),
    "http://www.w3.org/2001/XMLSchema#dateTime"
  );
};

/**
 * @param thing Thing to remove a decimal value from.
 * @param predicate Predicate for which to remove the given decimal value.
 * @param value Decimal to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export const removeDecimalOne: RemoveOneOfType<number> = (
  thing,
  predicate,
  value
) => {
  return removeLiteralOneOfType(
    thing,
    predicate,
    serializeDecimal(value),
    "http://www.w3.org/2001/XMLSchema#decimal"
  );
};

/**
 * @param thing Thing to remove an integer value from.
 * @param predicate Predicate for which to remove the given integer value.
 * @param value Integer to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export const removeIntegerOne: RemoveOneOfType<number> = (
  thing,
  predicate,
  value
) => {
  return removeLiteralOneOfType(
    thing,
    predicate,
    serializeInteger(value),
    "http://www.w3.org/2001/XMLSchema#integer"
  );
};

/**
 * @param thing Thing to remove a localised string value from.
 * @param predicate Predicate for which to remove the given localised string value.
 * @param value String to remove from `thing` for the given `predicate`.
 * @param locale Locale of the string to remove.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export function removeStringInLocaleOne<T extends Thing>(
  thing: T,
  predicate: Iri | IriString,
  value: string,
  locale: string
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function removeStringInLocaleOne(
  thing: Thing,
  predicate: Iri | IriString,
  value: string,
  locale: string
): Thing {
  // Note: Due to how the `DataFactory.literal` constructor behaves, this function
  // must call directly `removeLiteralOne` directly, with the locale as the data
  // type of the Literal (which is not a valid NamedNode).
  return removeLiteralOne(
    thing,
    predicate,
    DataFactory.literal(value, normalizeLocale(locale))
  );
}

/**
 * @param thing Thing to remove an unlocalised string value from.
 * @param predicate Predicate for which to remove the given string value.
 * @param value String to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export const removeStringUnlocalizedOne: RemoveOneOfType<string> = (
  thing,
  predicate,
  value
) => {
  return removeLiteralOneOfType(
    thing,
    predicate,
    value,
    "http://www.w3.org/2001/XMLSchema#string"
  );
};

/**
 * @ignore This should not be needed due to the other remove*One() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @param thing Thing to remove a NamedNode value from.
 * @param predicate Predicate for which to remove the given NamedNode value.
 * @param value NamedNode to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export function removeNamedNodeOne<T extends Thing>(
  thing: T,
  predicate: Iri | IriString,
  value: NamedNode
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function removeNamedNodeOne(
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
 * @ignore This should not be needed due to the other remove*One() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @param thing Thing to remove a Literal value from.
 * @param predicate Predicate for which to remove the given Literal value.
 * @param value Literal to remove from `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
export function removeLiteralOne<T extends Thing>(
  thing: T,
  predicate: Iri | IriString,
  value: Literal
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function removeLiteralOne(
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

function removeLiteralOneOfType<T extends Thing>(
  thing: T,
  predicate: Iri | IriString,
  value: string,
  type: IriString
): T extends ThingLocal ? ThingLocal : ThingPersisted;
function removeLiteralOneOfType(
  thing: Thing,
  predicate: Iri | IriString,
  value: string,
  type: IriString
): Thing {
  const updatedThing = removeLiteralOne(
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
