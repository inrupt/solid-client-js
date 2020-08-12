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

import { DatasetCore, Quad } from "rdf-js";
import { quad, literal, namedNode, blankNode, dataset } from "@rdfjs/dataset";

export { dataset } from "@rdfjs/dataset";

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

/**
 * Verify whether a given value has the required DatasetCore properties.
 *
 * @param input Value that might or might not be a DatasetCore
 * @returns Whether `input` provides the properties prescribed by the RDF/JS Dataset spec 1.0.
 * @hidden This is an internal convenience function.
 */
export function internal_isDatasetCore<X>(
  input: X | DatasetCore
): input is DatasetCore {
  return (
    typeof input === "object" &&
    typeof (input as DatasetCore).size === "number" &&
    typeof (input as DatasetCore).add === "function" &&
    typeof (input as DatasetCore).delete === "function" &&
    typeof (input as DatasetCore).has === "function" &&
    typeof (input as DatasetCore).match === "function" &&
    Array.from(input as DatasetCore).length === (input as DatasetCore).size
  );
}
