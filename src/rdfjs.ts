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

//
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

import { DatasetCore, Quad } from "rdf-js";

import rdfjsDataset from "@rdfjs/dataset";
export const dataset = rdfjsDataset.dataset;
const { quad, literal, namedNode, blankNode } = rdfjsDataset;

// TODO: Our code should be able to deal with switching the DataFactory
//  implementation to that provided by '@rdfjs/dataset' (which is currently
//  @rdfjs/data-model) - but currently it seems that implementation:
//    - Doesn't treat capitalization of language tags correctly (i.e., according
//      to the RDF specs, they should be case-insensitive).
//    - Doesn't treat a string literal with an empty language tag of "" as an
//      xsd:langString, instead treating it as a xsd:string.
//      A fix for this would be here:
//      https://github.com/rdfjs-base/data-model/blob/ed59e75132ee4d8a3a2f58443ff6a4f792a97033/lib/literal.js#L8
//      ...changing this line to be:
//          if (language || language == "") {
//      But according to (https://w3c.github.io/rdf-dir-literal/langString.html)
//      it seems the language tag should be non-empty.
//  Our tests include specific checks for these behaviours (which is great), so
//  until '@rdfjs/dataset' (or our tests!) are fixed, we need to avoid it's
//  DataFactory.
//  Currently (Feb 2021), only 4 tests fail now for the reasons above.

/**
 * @internal
 */
export const DataFactory = { quad, literal, namedNode, blankNode };

/**
 * Clone a Dataset.
 *
 * Note that the Quads are not cloned, i.e. if you modify the Quads in the output Dataset, the Quads
 * in the input Dataset will also be changed.
 *
 * @internal
 * @param input Dataset to clone.
 * @returns A new Dataset with the same Quads as `input`.
 */
export function clone(input: DatasetCore): DatasetCore {
  const output = dataset();

  for (const quad of input) {
    output.add(quad);
  }

  return output;
}

/**
 * @internal
 * @param input Dataset to clone.
 * @param callback Function that takes a Quad, and returns a boolean indicating whether that Quad should be included in the cloned Dataset.
 * @returns A new Dataset with the same Quads as `input`, excluding the ones for which `callback` returned `false`.
 */
export function filter(
  input: DatasetCore,
  callback: (quad: Quad) => boolean
): DatasetCore {
  const output = dataset();

  for (const quad of input) {
    if (callback(quad)) {
      output.add(quad);
    }
  }

  return output;
}
