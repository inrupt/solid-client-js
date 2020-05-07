import { NamedNode, Literal, Quad } from "rdf-js";
import { DataFactory } from "./rdfjs";
import { IriString, LocalNode, Iri } from "./index";

/**
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
