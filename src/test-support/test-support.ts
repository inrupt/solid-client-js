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
import { DataFactory } from "../rdfjs";
import { SolidDataset } from "../interfaces";

/**
 * Expects the specified dataset to have the specified number of matching
 * quads. If successful, and only one match, then return that quad - otherwise
 * we return 'null' (meaning 'there were multiple different matching quads for
 * this pattern).
 *
 * Note: we only put the 'graph' component as the last param 'cos we don't yet
 * assert much on quads in this codebase...
 *
 * @param dataset the RDF dataset to match against
 * @param subject the subject to match (or null to represent a 'wildcard')
 * @param predicate the predicate to match (or null to represent a 'wildcard')
 * @param object the object to match (or null to represent a 'wildcard')
 * @param expected the number of matches expected
 * @param graph the graph to match (or null to represent a 'wildcard')
 * @return if only one matching quad found return that quad, else null
 */
export function expectMatch(
  dataset: SolidDataset,
  subject: string | NamedNode | BlankNode | null,
  predicate: string | NamedNode | null,
  object: string | NamedNode | BlankNode | Literal | null = null,
  expected: number = 1,
  graph: NamedNode | null = null
): Quad | null {
  const rdfSubject = handleSubject(subject);
  const rdfPredicate = handlePredicate(predicate);
  const rdfObject = handleObject(object);
  const rdfGraph = graph === null ? null : graph;

  const matches = dataset.match(rdfSubject, rdfPredicate, rdfObject, rdfGraph);

  if (matches.size !== expected) {
    throw new Error(
      `Expected dataset to have [${expected}] match${
        expected === 1 ? "" : "es"
      } against quad pattern, but found [${
        matches.size
      }]. Match pattern: \n - Subject:   [${nullOrRdfValue(
        rdfSubject
      )}]\n - Predicate: [${nullOrRdfValue(
        rdfPredicate
      )}]\n - Object:    [${nullOrRdfValue(
        rdfObject
      )}]\n - Graph:     [${nullOrRdfValue(rdfGraph)}]`
    );
  }

  // If one match, and one match one, then return that...
  if (matches.size === 1) {
    // I don't know how to 'elegantly' get the first entry from an Iterator, but
    // this works...
    for (const quad of matches) {
      return quad;
    }
  }

  return null;
}

function nullOrRdfValue(term: Term | null) {
  return term === null ? "null" : term.value;
}

/**
 * - If our subject is null, just return null.
 * - Else, if our subject is not an RDF Term, then it must be a string, so
 * convert that to a NamedNode (we don't support strings-to-Blank-Nodes).
 * - Else, our subject must already be either a NamedNode or a Blank Node, so
 * just return that as is.
 *
 * @param subject the RDF subject to handle
 * @return the subject as a NamedNode, BlankNode (or null)
 */
function handleSubject(
  subject: string | NamedNode | BlankNode | null
): NamedNode | BlankNode | null {
  const result =
    subject === null
      ? null
      : (subject as Term).termType === undefined
      ? DataFactory.namedNode(subject as string)
      : (subject as NamedNode | BlankNode);

  return result;
}

/**
 * - If our object is null, just return null.
 * - Else, if our object is not an RDF Term, then it must be a string, so
 * convert that to a NamedNode (we don't support strings-to-Blank-Nodes).
 * - Else, our subject must already be either a NamedNode, Blank Node, or
 * Literal, so just return that as is.
 *
 * @param predicate the RDF predicate to handle
 * @return the predicate as a NamedNode (or null)
 */
function handlePredicate(
  predicate: string | NamedNode | null
): NamedNode | null {
  const result =
    predicate === null
      ? null
      : (predicate as Term).termType === undefined
      ? DataFactory.namedNode(predicate as string)
      : (predicate as NamedNode);

  return result;
}

/**
 * - If our object is null, just return null.
 * - Else, if our object is not an RDF Term, then it must be a string, so
 * convert that to a NamedNode (we don't support strings-to-Blank-Nodes).
 * - Else, our object must already be either a NamedNode, Blank Node, or
 * Literal, so just return that as is.
 *
 * @param object the RDF object to handle
 * @return the object as NamedNode, BlankNode, Literal (or null)
 */
function handleObject(
  object: string | NamedNode | BlankNode | Literal | null
): NamedNode | BlankNode | Literal | null {
  const result =
    object === null
      ? null
      : (object as Term).termType === undefined
      ? DataFactory.namedNode(object as string)
      : (object as NamedNode | BlankNode | Literal);

  return result;
}
