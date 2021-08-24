/**
 * Copyright 2021 Inrupt Inc.
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

import { JsonLdParser } from "jsonld-streaming-parser";
import { IriString } from "../interfaces";
import { DataFactory } from "../rdfjs.internal";
import { getSourceUrl } from "../resource/resource";
import { Parser } from "../resource/solidDataset";

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
      const parser = await getParser(getSourceUrl(resourceInfo));
      const parserPromise = new Promise<void>((resolve) => {
        parser.on("data", (quad) => {
          onQuadCallbacks.every((callback) => callback(quad));
        });
        parser.on("error", (error) => {
          onErrorCallbacks.forEach((callback) => callback(error));
        });
        parser.on("end", () => {
          onCompleteCallbacks.every((callback) => callback());
          resolve();
        });
        parser.write(source);
        parser.end();
      });
      await parserPromise;
    },
  };
};

async function getParser(baseIri: IriString) {
  return new JsonLdParser({
    baseIRI: baseIri,
    processingMode: "1.1",
    dataFactory: DataFactory,
  });
}
