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

import * as jsonld from "jsonld";
import type {
  DefaultGraph,
  Quad,
  Quad_Graph,
  Quad_Object,
  Quad_Predicate,
  Quad_Subject,
} from "@rdfjs/types";
import type { RemoteDocument } from "jsonld/jsonld-spec";
import { DataFactory } from "../rdfjs.internal";
import { getSourceUrl } from "../resource/resource";
import { Parser } from "../resource/solidDataset";
import { fetch } from "../fetcher";

const fetchDocumentLoader = async (url: string): Promise<RemoteDocument> => {
  const res = await fetch(url);

  return {
    contextUrl: undefined,
    documentUrl: url,
    document: await res.json(),
  };
};

interface JsonLDQuad {
  subject: Quad_Subject;
  predicate: Quad_Predicate;
  object: Quad_Object;
  graph: Quad_Graph;
}

/**
 * ```{note} This function is still experimental and subject to change, even
 * in a non-major release.
 * ```
 * This returns a parser that transforms a JSON-LD string into a set of RDFJS quads.
 *
 * @returns A Parser object.
 * @since 1.15.0
 */
export const getJsonLdParser = (): Parser => {
  const onQuadCallbacks: Array<Parameters<Parser["onQuad"]>[0]> = [];
  const onCompleteCallbacks: Array<Parameters<Parser["onComplete"]>[0]> = [];
  const onErrorCallbacks: Array<Parameters<Parser["onError"]>[0]> = [];

  return {
    onQuad: (callback) => {
      onQuadCallbacks.push(callback);
    },
    onError: (callback) => {
      onErrorCallbacks.push(callback);
    },
    onComplete: (callback) => {
      onCompleteCallbacks.push(callback);
    },
    parse: async (source, resourceInfo) => {
      let quads = [] as Quad[];
      try {
        const plainQuads = (await jsonld.toRDF(JSON.parse(source), {
          base: getSourceUrl(resourceInfo),
          documentLoader: fetchDocumentLoader,
        })) as JsonLDQuad[];
        quads = fixQuads(plainQuads);
      } catch (error) {
        onErrorCallbacks.forEach((callback) => callback(error));
      }
      quads.forEach((quad) => {
        onQuadCallbacks.forEach((callback) => callback(quad));
      });
      onCompleteCallbacks.forEach((callback) => callback());
    },
  };
};

/* Quads returned by jsonld parser are not spec-compliant
 * see https://github.com/digitalbazaar/jsonld.js/issues/243
 * Also, no specific type for these 'quads' is exposed by the library
 */

// change to MaybeQuad
function fixQuads(plainQuads: JsonLDQuad[]): Quad[] {
  const fixedQuads = plainQuads.map((plainQuad) =>
    DataFactory.quad(
      term(plainQuad.subject) as Quad_Subject,
      term(plainQuad.predicate) as Quad_Predicate,
      term(plainQuad.object) as Quad_Object,
      term(plainQuad.graph) as Quad_Graph
    )
  );
  return fixedQuads;
}

function term(term: Quad_Object | DefaultGraph) {
  switch (term.termType) {
    case "NamedNode":
      return DataFactory.namedNode(term.value);
    case "BlankNode":
      return DataFactory.blankNode(term.value.substr(2)); // Remove the '_:' prefix. see https://github.com/digitalbazaar/jsonld.js/issues/244
    case "Literal":
      return DataFactory.literal(term.value, term.language || term.datatype);
    case "DefaultGraph":
      return DataFactory.defaultGraph();
    default:
      throw Error(`unknown termType: ${term.termType}`);
  }
}
