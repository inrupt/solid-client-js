import { NamedNode, Literal, Quad } from "rdf-js";
import { DataFactory } from "./rdfjs";
import { IriString, LocalNode, Iri } from "./interfaces";

/**
 * IRIs of the XML Schema data types we support
 * @internal
 */
export const xmlSchemaTypes = {
  boolean: "http://www.w3.org/2001/XMLSchema#boolean",
  dateTime: "http://www.w3.org/2001/XMLSchema#dateTime",
  decimal: "http://www.w3.org/2001/XMLSchema#decimal",
  integer: "http://www.w3.org/2001/XMLSchema#integer",
  string: "http://www.w3.org/2001/XMLSchema#string",
  langString: "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
} as const;
/** @internal */
export type XmlSchemaTypeIri = typeof xmlSchemaTypes[keyof typeof xmlSchemaTypes];

/**
 * @internal
 * @param value Value to serialise.
 * @returns String representation of `value`.
 */
export function serializeBoolean(value: boolean): string {
  return value ? "1" : "0";
}
/**
 * @internal
 * @param value Value to deserialise.
 * @returns Deserialized boolean, or null if the given value is not a valid serialised boolean.
 */
export function deserializeBoolean(value: string): boolean | null {
  if (value === "1") {
    return true;
  } else if (value === "0") {
    return false;
  } else {
    return null;
  }
}

/**
 * @internal
 * @param value Value to serialise.
 * @returns String representation of `value`.
 */
export function serializeDatetime(value: Date): string {
  // To align with rdflib, we ignore miliseconds:
  // https://github.com/linkeddata/rdflib.js/blob/d84af88f367b8b5f617c753d8241c5a2035458e8/src/literal.js#L74
  const roundedDate = new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
      value.getUTCHours(),
      value.getUTCMinutes(),
      value.getUTCSeconds(),
      0
    )
  );
  // Truncate the `.000Z` at the end (i.e. the miliseconds), to plain `Z`:
  const rdflibStyleString = roundedDate.toISOString().replace(/\.000Z$/, "Z");
  return rdflibStyleString;
}
/**
 * @internal
 * @param value Value to deserialise.
 * @returns Deserialized datetime, or null if the given value is not a valid serialised datetime.
 */
export function deserializeDatetime(literalString: string): Date | null {
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
 * @internal
 * @param value Value to serialise.
 * @returns String representation of `value`.
 */
export function serializeDecimal(value: number): string {
  return value.toString();
}
/**
 * @internal
 * @param value Value to deserialise.
 * @returns Deserialized decimal, or null if the given value is not a valid serialised decimal.
 */
export function deserializeDecimal(literalString: string): number | null {
  const deserialized = Number.parseFloat(literalString);
  if (Number.isNaN(deserialized)) {
    return null;
  }
  return deserialized;
}

/**
 * @internal
 * @param value Value to serialise.
 * @returns String representation of `value`.
 */
export function serializeInteger(value: number): string {
  return value.toString();
}
/**
 * @internal
 * @param value Value to deserialise.
 * @returns Deserialized integer, or null if the given value is not a valid serialised integer.
 */
export function deserializeInteger(literalString: string): number | null {
  const deserialized = Number.parseInt(literalString, 10);
  if (Number.isNaN(deserialized)) {
    return null;
  }
  return deserialized;
}

/**
 * @internal
 * @param locale Locale to transform into a consistent format.
 */
export function normalizeLocale(locale: string): string {
  return locale.toLowerCase();
}

/**
 * @internal Library users shouldn't need to be exposed to raw NamedNodes.
 * @param value The value that might or might not be a Named Node.
 * @returns Whether `value` is a Named Node.
 */
export function isNamedNode<T>(value: T | NamedNode): value is NamedNode {
  return (
    typeof value === "object" &&
    typeof (value as NamedNode).termType === "string" &&
    (value as NamedNode).termType === "NamedNode"
  );
}

/**
 * @internal Library users shouldn't need to be exposed to raw Literals.
 * @param value The value that might or might not be a Literal.
 * @returns Whether `value` is a Literal.
 */
export function isLiteral<T>(value: T | Literal): value is Literal {
  return (
    typeof value === "object" &&
    typeof (value as Literal).termType === "string" &&
    (value as Literal).termType === "Literal"
  );
}

/**
 * @internal Library users shouldn't need to be exposed to LocalNodes.
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
 * Construct a new LocalNode.
 *
 * @internal Library users shouldn't need to be exposed to LocalNodes.
 * @param name Name to identify this node by.
 * @returns A LocalNode whose name will be resolved when it is persisted to a Pod.
 */
export function getLocalNode(name: string): LocalNode {
  const localNode: LocalNode = Object.assign(DataFactory.blankNode(), {
    name: name,
  });
  return localNode;
}

/**
 * Ensure that a given value is a Named Node.
 *
 * If the given parameter is a Named Node already, it will be returned as-is. If it is a string, it
 * will check whether it is a valid IRI. If not, it will throw an error; otherwise a Named Node
 * representing the given IRI will be returned.
 *
 * @internal Library users shouldn't need to be exposed to raw NamedNodes.
 * @param iri The IRI that should be converted into a Named Node, if it isn't one yet.
 */
export function asNamedNode(iri: Iri | IriString): NamedNode {
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

interface IsEqualOptions {
  resourceIri?: IriString;
}
/**
 * Check whether two current- or potential NamedNodes are/will be equal.
 *
 * @internal Utility method; library users should not need to interact with LocalNodes directly.
 */
export function isEqual(
  node1: NamedNode | LocalNode,
  node2: NamedNode | LocalNode,
  options: IsEqualOptions = {}
): boolean {
  if (isNamedNode(node1) && isNamedNode(node2)) {
    return node1.equals(node2);
  }
  if (isLocalNode(node1) && isLocalNode(node2)) {
    return node1.name === node2.name;
  }
  if (typeof options.resourceIri === "undefined") {
    // If we don't know what IRI to resolve the LocalNode to,
    // we cannot conclude that it is equal to the NamedNode's full IRI:
    return false;
  }
  const namedNode1 = isNamedNode(node1)
    ? node1
    : resolveIriForLocalNode(node1, options.resourceIri);
  const namedNode2 = isNamedNode(node2)
    ? node2
    : resolveIriForLocalNode(node2, options.resourceIri);
  return namedNode1.equals(namedNode2);
}

/**
 * @internal Utility method; library users should not need to interact with LocalNodes directly.
 * @param quad The Quad to resolve LocalNodes in.
 * @param resourceIri The IRI of the Resource to resolve the LocalNodes against.
 */
export function resolveIriForLocalNodes(
  quad: Quad,
  resourceIri: IriString
): Quad {
  const subject = isLocalNode(quad.subject)
    ? resolveIriForLocalNode(quad.subject, resourceIri)
    : quad.subject;
  const object = isLocalNode(quad.object)
    ? resolveIriForLocalNode(quad.object, resourceIri)
    : quad.object;
  return {
    ...quad,
    subject: subject,
    object: object,
  };
}

/**
 * @internal Utility method; library users should not need to interact with LocalNodes directly.
 * @param localNode The LocalNode to resolve to a NamedNode.
 * @param resourceIri The Resource in which the Node will be saved.
 */
export function resolveIriForLocalNode(
  localNode: LocalNode,
  resourceIri: IriString
): NamedNode {
  return DataFactory.namedNode(resolveLocalIri(localNode.name, resourceIri));
}

/**
 * @internal API for internal use only.
 * @param name The name identifying a Thing.
 * @param resourceIri The Resource in which the Thing can be found.
 */
export function resolveLocalIri(
  name: string,
  resourceIri: IriString
): IriString {
  /* istanbul ignore if [The URL interface is available in the testing environment, so we cannot test this] */
  if (typeof URL === "undefined") {
    throw new Error(
      "The URL interface is not available, so an IRI cannot be determined."
    );
  }
  const thingIri = new URL(resourceIri);
  thingIri.hash = name;
  return thingIri.href;
}
