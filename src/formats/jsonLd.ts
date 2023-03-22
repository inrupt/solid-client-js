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
import { JsonLdParser } from "jsonld-streaming-parser";
import { FetchDocumentLoader } from "jsonld-context-parser";
import { getSourceUrl } from "../resource/resource";
import { Parser } from "../resource/solidDataset";
import { fetch } from "../fetcher";

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
    parse: async (source, resourceInfo) =>
      new Promise((res) => {
        const parser = new JsonLdParser({
          baseIRI: getSourceUrl(resourceInfo),
          documentLoader: new FetchDocumentLoader(fetch),
        });

        let endCalled = false;
        function end() {
          if (!endCalled) {
            endCalled = true;
            onCompleteCallbacks.forEach((callback) => callback());
            res();
          }
        }

        parser.on("end", end);
        parser.on("error", (err) => {
          onErrorCallbacks.forEach((callback) => callback(err));
          end();
        });
        onQuadCallbacks.forEach((callback) => parser.on("data", callback));

        parser.write(source);
        parser.end();
      }),
  };
};
