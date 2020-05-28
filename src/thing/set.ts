import { Literal, NamedNode } from "rdf-js";
import { Thing, Iri, IriString, ThingLocal, ThingPersisted } from "../index";
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
import { toNode } from "../thing";
import { removeAll } from "./remove";

/**
 * Replace existing values for a Predicate by a given IRI on a Thing.
 *
 * To preserve existing values, see [[addIri]].
 *
 * @param thing Thing to set an IRI value on.
 * @param predicate Predicate for which to set the given IRI value.
 * @param value IRI to set on `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Predicate.
 */
export const setIri: SetOfType<Iri | IriString | Thing> = (
  thing,
  predicate,
  iri
) => {
  const newThing = removeAll(thing, predicate);

  const predicateNode = asNamedNode(predicate);
  newThing.add(DataFactory.quad(toNode(newThing), predicateNode, toNode(iri)));

  return newThing;
};

/**
 * Replace existing values for a Predicate by a given boolean on a Thing.
 *
 * To preserve existing values, see [[addBoolean]].
 *
 * @param thing Thing to set a boolean value on.
 * @param predicate Predicate for which to set the given boolean value.
 * @param value Boolean to set on `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Predicate.
 */
export const setBoolean: SetOfType<boolean> = (thing, predicate, value) => {
  return setLiteralOfType(
    thing,
    predicate,
    serializeBoolean(value),
    xmlSchemaTypes.boolean
  );
};

/**
 * Replace existing values for a Predicate by a given datetime on a Thing.
 *
 * To preserve existing values, see [[addDatetime]].
 *
 * @param thing Thing to set an datetime value on.
 * @param predicate Predicate for which to set the given datetime value.
 * @param value Datetime to set on `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Predicate.
 */
export const setDatetime: SetOfType<Date> = (thing, predicate, value) => {
  return setLiteralOfType(
    thing,
    predicate,
    serializeDatetime(value),
    xmlSchemaTypes.dateTime
  );
};

/**
 * Replace existing values for a Predicate by a given decimal on a Thing.
 *
 * To preserve existing values, see [[addDecimal]].
 *
 * @param thing Thing to set a decimal value on.
 * @param predicate Predicate for which to set the given decimal value.
 * @param value Decimal to set on `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Predicate.
 */
export const setDecimal: SetOfType<number> = (thing, predicate, value) => {
  return setLiteralOfType(
    thing,
    predicate,
    serializeDecimal(value),
    xmlSchemaTypes.decimal
  );
};

/**
 * Replace existing values for a Predicate by a given integer on a Thing.
 *
 * To preserve existing values, see [[addInteger]].
 *
 * @param thing Thing to set an integer value on.
 * @param predicate Predicate for which to set the given integer value.
 * @param value Integer to set on `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Predicate.
 */
export const setInteger: SetOfType<number> = (thing, predicate, value) => {
  return setLiteralOfType(
    thing,
    predicate,
    serializeInteger(value),
    xmlSchemaTypes.integer
  );
};

/**
 * Replace existing values for a Predicate by a given localised string on a Thing.
 *
 * To preserve existing values, see [[addStringInLocale]].
 *
 * @param thing Thing to set a localised string value on.
 * @param predicate Predicate for which to set the given localised string value.
 * @param value Localised string to set on `thing` for the given `predicate`.
 * @param locale Locale of the added string.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Predicate.
 */
export function setStringInLocale<T extends Thing>(
  thing: T,
  predicate: Iri | IriString,
  value: string,
  locale: string
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function setStringInLocale(
  thing: Thing,
  predicate: Iri | IriString,
  value: string,
  locale: string
): Thing {
  const literal = DataFactory.literal(value, normalizeLocale(locale));
  return setLiteral(thing, predicate, literal);
}

/**
 * Replace existing values for a Predicate by a given unlocalised string on a Thing.
 *
 * To preserve existing values, see [[addStringUnlocalized]].
 *
 * @param thing Thing to set an unlocalised string value on.
 * @param predicate Predicate for which to set the given unlocalised string value.
 * @param value Unlocalised string to set on `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Predicate.
 */
export const setStringUnlocalized: SetOfType<string> = (
  thing,
  predicate,
  value
) => {
  return setLiteralOfType(thing, predicate, value, xmlSchemaTypes.string);
};

/**
 * Replace existing values for a Predicate by a given NamedNode on a Thing.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setNamedNode]].
 *
 * @ignore This should not be needed due to the other set*() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @param thing The [[Thing]] to set a NamedNode on.
 * @param predicate Predicate for which to set the value.
 * @param value The NamedNode to set on `tihng` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Predicate.
 */
export function setNamedNode<T extends Thing>(
  thing: T,
  predicate: Iri | IriString,
  value: NamedNode
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function setNamedNode(
  thing: Thing,
  predicate: Iri | IriString,
  value: NamedNode
): Thing {
  const newThing = removeAll(thing, predicate);

  const predicateNode = asNamedNode(predicate);
  newThing.add(DataFactory.quad(toNode(newThing), predicateNode, value));

  return newThing;
}

/**
 * Replace existing values for a Predicate by a given Literal on a Thing.
 *
 * This preserves existing values for the given Predicate. To replace them, see [[setLiteral]].
 *
 * @ignore This should not be needed due to the other set*() functions. If you do find yourself needing it, please file a feature request for your use case.
 * @param thing The [[Thing]] to set a Literal on.
 * @param predicate Predicate for which to set the value.
 * @param value The Literal to set on `tihng` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Predicate.
 */
export function setLiteral<T extends Thing>(
  thing: T,
  predicate: Iri | IriString,
  value: Literal
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function setLiteral(
  thing: Thing,
  predicate: Iri | IriString,
  value: Literal
): Thing {
  const newThing = removeAll(thing, predicate);

  const predicateNode = asNamedNode(predicate);
  newThing.add(DataFactory.quad(toNode(newThing), predicateNode, value));

  return newThing;
}

function setLiteralOfType<T extends Thing>(
  thing: T,
  predicate: Iri | IriString,
  value: string,
  type: XmlSchemaTypeIri
): T extends ThingLocal ? ThingLocal : ThingPersisted;
function setLiteralOfType(
  thing: Thing,
  predicate: Iri | IriString,
  value: string,
  type: XmlSchemaTypeIri
): Thing {
  const literal = DataFactory.literal(value, type);
  return setLiteral(thing, predicate, literal);
}

/**
 * Replace existing values for a Predicate by a given value on a Thing.
 *
 * @param thing Thing to set a value on.
 * @param predicate Predicate for which to set the given value.
 * @param value Value to set on `thing` for the given `predicate`.
 * @returns A new Thing equal to the input Thing with existing values replaced by the given value for the given Predicate.
 */
type SetOfType<Type> = <T extends Thing>(
  thing: T,
  predicate: Iri | IriString,
  value: Type
) => T extends ThingLocal ? ThingLocal : ThingPersisted;
