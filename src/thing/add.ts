import { Literal, NamedNode } from "rdf-js";
import { Thing, IriString, ThingLocal, ThingPersisted, Iri } from "../index";
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
 * Add an IRI to a Predicate on a Thing.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setIri]].
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
 * Add a boolean to a Predicate on a Thing.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setBoolean]].
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
 * Add a datetime to a Predicate on a Thing.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setDatetime]].
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
 * Add a decimal to a Predicate on a Thing.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setDecimal]].
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
 * Add an integer to a Predicate on a Thing.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setInteger]].
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
 * Add a localised string to a Predicate on a Thing.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setStringInLocale]].
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
 * Add an unlocalised string to a Predicate on a Thing.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setStringUnlocalized]].
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
 * Add a NamedNode to a Predicate on a Thing.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setNamedNode]].
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
 * Add a Literal to a Predicate on a Thing.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setLiteral]].
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
