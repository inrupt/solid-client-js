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
