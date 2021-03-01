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

import { BlankNode, Literal, NamedNode, Quad, Term } from "rdf-js";
import { DataFactory } from "./rdfjs";
import { SolidDataset } from "./interfaces";

describe("DataFactory", () => {
  it("exports the expected factories", () => {
    expect(DataFactory.literal("Test").termType).toBe("Literal");
    expect(DataFactory.namedNode("https://example.com").termType).toBe(
      "NamedNode"
    );
    expect(DataFactory.blankNode().termType).toBe("BlankNode");
  });
});

/**
 * Get Quads matching the given Subject, Predicate, Object and/or Graph.
 *
 * Note: we only put the 'graph' component as the last param 'cos we don't yet
 * assert much on quads in this codebase...
 *
 * @param dataset the RDF dataset to match against
 * @param subject the subject to match (or null to represent a 'wildcard')
 * @param predicate the predicate to match (or null to represent a 'wildcard')
 * @param object the object to match (or null to represent a 'wildcard')
 * @param graph the graph to match (or null to represent a 'wildcard')
 * @return if only one matching quad found return that quad, else null
 */
// Export helper useful for working with RDF/JS in every test
// eslint-disable-next-line jest/no-export
export function getMatchingQuads(
  dataset: SolidDataset,
  pattern: {
    subject?: string | NamedNode | BlankNode;
    predicate?: string | NamedNode;
    object?: string | NamedNode | BlankNode | Literal;
    graph?: null;
  } = {}
): Quad[] {
  const rdfSubject = toRdfSubject(pattern.subject);
  const rdfPredicate = toRdfPredicate(pattern.predicate);
  const rdfObject = toRdfObject(pattern.object);
  const rdfGraph = pattern.graph;

  const matches = dataset.match(rdfSubject, rdfPredicate, rdfObject, rdfGraph);

  return Array.from(matches);
}

/**
 * - If our subject is null, just return undefined.
 * - Else, if our subject is not an RDF Term, then it must be a string, so
 * convert that to a NamedNode (we don't support strings-to-Blank-Nodes).
 * - Else, our subject must already be either a NamedNode or a Blank Node, so
 * just return that as is.
 *
 * @param subject the RDF subject to handle
 * @returns the subject as a NamedNode, BlankNode (or null)
 */
function toRdfSubject(
  subject?: string | NamedNode | BlankNode
): NamedNode | BlankNode | null {
  if (typeof subject === "undefined") {
    return null;
  }

  if ((subject as Term).termType === undefined) {
    return DataFactory.namedNode(subject as string);
  }

  return subject as NamedNode | BlankNode;
}

/**
 * - If our predicate is undefined, just return null.
 * - Else, if our object is not an RDF Term, then it must be a string, so
 * convert that to a NamedNode (we don't support strings-to-Blank-Nodes).
 * - Else, our subject must already be either a NamedNode, Blank Node, or
 * Literal, so just return that as is.
 *
 * @param predicate the RDF predicate to handle
 * @returns the predicate as a NamedNode (or null)
 */
function toRdfPredicate(predicate?: string | NamedNode): NamedNode | null {
  if (typeof predicate === "undefined") {
    return null;
  }

  if ((predicate as Term).termType === undefined) {
    return DataFactory.namedNode(predicate as string);
  }

  return predicate as NamedNode;
}

/**
 * - If our object is undefined, just return null.
 * - Else, if our object is not an RDF Term, then it must be a string, so
 * convert that to a NamedNode (we don't support strings-to-Blank-Nodes).
 * - Else, our object must already be either a NamedNode, Blank Node, or
 * Literal, so just return that as is.
 *
 * @param object the RDF object to handle
 * @returns the object as NamedNode, BlankNode, Literal (or null)
 */
function toRdfObject(
  object?: string | NamedNode | BlankNode | Literal
): NamedNode | BlankNode | Literal | null {
  if (typeof object === "undefined") {
    return null;
  }

  if ((object as Term).termType === undefined) {
    return DataFactory.namedNode(object as string);
  }

  return object as NamedNode | BlankNode | Literal;
}
