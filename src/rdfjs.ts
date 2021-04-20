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

// Note: Different RDF/JS implementations can, of course, behave differently.
// Some important differences identified so far:
//   1. RDF String Literals:
//      The DataFactory signature for creating an RDF literal is:
//         literal(value: string | number, languageOrDatatype?: string | RDF.NamedNode): Literal
//
//       The @rdfjs/data-model implementation checks if the 2nd param is a
//      string, and if so it looks for a ':' character in that string. If
//      present it considers the value a Datatype IRI, and so wraps the string
//      in a call to DataFactory.namedNode().
//
//       The N3 implementation checks if the 2nd param is a string, and if so
//      considers the value a language tag. If and only if the 2nd param is
//      explicitly passed in as a NamedNode will it be treated as a Datatype
//      IRI.
//       Therefore, for consistency across RDF/JS Implementations, our library
//      needs to be explicit, and to always call 'DataFactory.literal()' with
//      NamedNode instances for the 2nd param when we know we want a Datatype.

import rdfjsDataset from "@rdfjs/dataset";
export const dataset = rdfjsDataset.dataset;
const { quad, literal, namedNode, blankNode, defaultGraph } = rdfjsDataset;

/**
 * @internal
 */
export const DataFactory = {
  quad,
  literal,
  namedNode,
  blankNode,
  defaultGraph,
};
