//
// Copyright 2022 Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
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

import type * as RdfJs from "@rdfjs/types";
import rdfjsDatasetModule from "@rdfjs/dataset";
import { ImmutableDataset } from "./rdf.internal";
import {
  addRdfJsQuadToDataset,
  getChainBlankNodes,
  toRdfJsQuads,
} from "./rdfjs.internal";

const rdfJsDataset = rdfjsDatasetModule.dataset;

/**
 * Convert an RDF/JS Dataset into a [[SolidDataset]]
 *
 * Parse an RDF/JS
 * {@link https://rdf.js.org/dataset-spec/#datasetcore-interface DatasetCore},
 * into a [[SolidDataset]]. Note that, when saving the returned SolidDataset to
 * a Solid Pod, only Quads in the Default Graph will be stored.
 *
 * @param rdfJsDataset The source RDF/JS Dataset.
 * @returns A [[SolidDataset]] containing the same data as the given RDF/JS Dataset.
 * @since 1.9.0
 */
export function fromRdfJsDataset(
  rdfJsDataset: RdfJs.DatasetCore
): ImmutableDataset {
  const dataset: ImmutableDataset = {
    graphs: { default: {} },
    type: "Dataset",
  };

  const quads = Array.from(rdfJsDataset);

  const chainBlankNodes = getChainBlankNodes(quads);

  // Quads with chain Blank Nodes as their Subject will be parsed when those
  // Blank Nodes are referred to in an Object. See `addRdfJsQuadToObjects`.
  const quadsWithoutChainBlankNodeSubjects = quads.filter((quad) =>
    chainBlankNodes.every(
      (chainBlankNode) => !chainBlankNode.equals(quad.subject)
    )
  );

  return quadsWithoutChainBlankNodeSubjects.reduce(
    (datasetAcc, quad) =>
      addRdfJsQuadToDataset(datasetAcc, quad, {
        otherQuads: quads,
        chainBlankNodes,
      }),
    dataset
  );
}

export type ToRdfJsOptions = Partial<{
  dataFactory: RdfJs.DataFactory;
  // We could consider making this a required parameter,
  // so we can remove our dependency on @rdfjs/dataset:
  datasetFactory: RdfJs.DatasetCoreFactory;
}>;
/**
 * Convert a [[SolidDataset]] into an RDF/JS Dataset
 *
 * Export a [[SolidDataset]] into an RDF/JS
 * {@link https://rdf.js.org/dataset-spec/#datasetcore-interface DatasetCore}.
 *
 * @param set A [[SolidDataset]] to export into an RDF/JS Dataset.
 * @param options Optional parameter that allows you to pass in your own RDF/JS DataFactory or DatasetCoreFactory.
 * @returns An RDF/JS Dataset containing the data from the given SolidDataset.
 * @since 1.9.0
 */
export function toRdfJsDataset(
  set: ImmutableDataset,
  options: ToRdfJsOptions = {}
): RdfJs.DatasetCore {
  const datasetFactory = options.datasetFactory?.dataset ?? rdfJsDataset;
  return datasetFactory(toRdfJsQuads(set, options));
}
