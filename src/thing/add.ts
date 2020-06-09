import { Literal, NamedNode } from "rdf-js";
import {
  Thing,
  IriString,
  ThingLocal,
  ThingPersisted,
  Iri,
} from "../interfaces";
import { cloneThing, toNode } from "../thing";
import {
  asNamedNode,
  serializeBoolean,
  serializeDatetime,
  serializeDecimal,
  serializeInteger,
  normalizeLocale,
  XmlSchemaTypeIri,
  xmlSchemaTypes,
} from "../datatypes";
import { DataFactory } from "../rdfjs";

/**
 * Create a new Thing with an IRI added for a Predicate.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setIri]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to add an IRI value to.
 * @param predicate Predicate for which to add the given IRI value.
 * @param value IRI to add to `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value added for the given Predicate.
 */
export const addIri: AddOfType<Iri | IriString | Thing> = (
  thing,
  predicate,
  iri
) => {
  const predicateNode = asNamedNode(predicate);
  const newThing = cloneThing(thing);

  newThing.add(DataFactory.quad(toNode(newThing), predicateNode, toNode(iri)));
  return newThing;
};

/**
 * Create a new Thing with a boolean added for a Predicate.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setBoolean]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to add a boolean value to.
 * @param predicate Predicate for which to add the given boolean value.
 * @param value Boolean to add to `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value added for the given Predicate.
 */
export const addBoolean: AddOfType<boolean> = (thing, predicate, value) => {
  return addLiteralOfType(
    thing,
    predicate,
    serializeBoolean(value),
    xmlSchemaTypes.boolean
  );
};

/**
 * Create a new Thing with a datetime added for a Predicate.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setDatetime]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to add a datetime value to.
 * @param predicate Predicate for which to add the given datetime value.
 * @param value Datetime to add to `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value added for the given Predicate.
 */
export const addDatetime: AddOfType<Date> = (thing, predicate, value) => {
  return addLiteralOfType(
    thing,
    predicate,
    serializeDatetime(value),
    xmlSchemaTypes.dateTime
  );
};

/**
 * Create a new Thing with a decimal added for a Predicate.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setDecimal]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to add a decimal value to.
 * @param predicate Predicate for which to add the given decimal value.
 * @param value Decimal to add to `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value added for the given Predicate.
 */
export const addDecimal: AddOfType<number> = (thing, predicate, value) => {
  return addLiteralOfType(
    thing,
    predicate,
    serializeDecimal(value),
    xmlSchemaTypes.decimal
  );
};

/**
 * Create a new Thing with an integer added for a Predicate.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setInteger]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to add an integer value to.
 * @param predicate Predicate for which to add the given integer value.
 * @param value Integer to add to `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value added for the given Predicate.
 */
export const addInteger: AddOfType<number> = (thing, predicate, value) => {
  return addLiteralOfType(
    thing,
    predicate,
    serializeInteger(value),
    xmlSchemaTypes.integer
  );
};

/**
 * Create a new Thing with a localised string added for a Predicate.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setStringInLocale]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to add a localised string value to.
 * @param predicate Predicate for which to add the given string value.
 * @param value String to add to `thing` for the given `predicate`.
 * @param locale Locale of the added string.
 * @returns A new Thing equal to the input Thing with the given value added for the given Predicate.
 */
export function addStringInLocale<T extends Thing>(
  thing: T,
  predicate: Iri | IriString,
  value: string,
  locale: string
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function addStringInLocale(
  thing: Thing,
  predicate: Iri | IriString,
  value: string,
  locale: string
): Thing {
  const literal = DataFactory.literal(value, normalizeLocale(locale));
  return addLiteral(thing, predicate, literal);
}

/**
 * Create a new Thing with an unlocalised string added for a Predicate.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setStringUnlocalized]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @param thing Thing to add an unlocalised string value to.
 * @param predicate Predicate for which to add the given string value.
 * @param value String to add to `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value added for the given Predicate.
 */
export const addStringUnlocalized: AddOfType<string> = (
  thing,
  predicate,
  value
) => {
  return addLiteralOfType(thing, predicate, value, xmlSchemaTypes.string);
};

/**
 * Create a new Thing with a Named Node added for a Predicate.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setNamedNode]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @ignore This should not be needed due to the other add*One() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @param thing The [[Thing]] to add a Named Node to.
 * @param predicate Predicate for which to add a value.
 * @param value The Named Node to add.
 * @returns A new Thing equal to the input Thing with the given value added for the given Predicate.
 */
export function addNamedNode<T extends Thing>(
  thing: T,
  predicate: Iri | IriString,
  value: NamedNode
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function addNamedNode(
  thing: Thing,
  predicate: Iri | IriString,
  value: NamedNode
): Thing {
  const predicateNode = asNamedNode(predicate);
  const newThing = cloneThing(thing);

  newThing.add(DataFactory.quad(toNode(newThing), predicateNode, value));
  return newThing;
}

/**
 * Create a new Thing with a Literal added for a Predicate.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setLiteral]].
 *
 * The original `thing` is not modified; this function returns a cloned Thing with updated values.
 *
 * @ignore This should not be needed due to the other add*One() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @param thing The [[Thing]] to add a Literal to.
 * @param predicate Predicate for which to add a value.
 * @param value The Literal to add.
 * @returns A new Thing equal to the input Thing with the given value added for the given Predicate.
 */
export function addLiteral<T extends Thing>(
  thing: T,
  predicate: Iri | IriString,
  value: Literal
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function addLiteral(
  thing: Thing,
  predicate: Iri | IriString,
  value: Literal
): Thing {
  const predicateNode = asNamedNode(predicate);
  const newThing = cloneThing(thing);

  newThing.add(DataFactory.quad(toNode(newThing), predicateNode, value));
  return newThing;
}

function addLiteralOfType<T extends Thing>(
  thing: T,
  predicate: Iri | IriString,
  value: string,
  type: XmlSchemaTypeIri
): T extends ThingLocal ? ThingLocal : ThingPersisted;
function addLiteralOfType(
  thing: Thing,
  predicate: Iri | IriString,
  value: string,
  type: IriString
): Thing {
  const literal = DataFactory.literal(value, type);
  return addLiteral(thing, predicate, literal);
}

/**
 * @param thing Thing to add a value to.
 * @param predicate Predicate on which to add the given value.
 * @param value Value to add to `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with the given value removed for the given Predicate.
 */
type AddOfType<Type> = <T extends Thing>(
  thing: T,
  predicate: Iri | IriString,
  value: Type
) => T extends ThingLocal ? ThingLocal : ThingPersisted;
