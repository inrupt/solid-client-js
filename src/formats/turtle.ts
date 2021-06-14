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

import { Quad } from "@rdfjs/types";
import { IriString } from "../interfaces";
import { DataFactory } from "../rdfjs.internal";
import { getSourceUrl } from "../resource/resource";
import { Parser } from "../resource/solidDataset";

export const getTurtleParser = (): Parser => {
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
      parser.parse(source, (error, quad, _prefixes) => {
        if (error) {
          onErrorCallbacks.forEach((callback) => callback(error));
        } else if (quad) {
          onQuadCallbacks.every((callback) => callback(quad));
        } else {
          onCompleteCallbacks.every((callback) => callback());
        }
      });
    },
  };
};

async function getParser(baseIri: IriString) {
  const n3 = await loadN3();
  return new n3.Parser({ format: "text/turtle", baseIRI: baseIri });
}

/**
 * @param quads Triples that should be serialised to Turtle
 * @internal Utility method for internal use; not part of the public API.
 */
export async function triplesToTurtle(quads: Quad[]): Promise<string> {
  const n3 = await loadN3();
  const format = "text/turtle";
  const writer = new n3.Writer({ format: format });
  // Remove any potentially lingering references to Named Graphs in Quads;
  // they'll be determined by the URL the Turtle will be sent to:
  const triples = quads.map((quad) =>
    DataFactory.quad(quad.subject, quad.predicate, quad.object, undefined)
  );
  writer.addQuads(triples);
  const writePromise = new Promise<string>((resolve, reject) => {
    writer.end((error, result) => {
      /* istanbul ignore if [n3.js doesn't actually pass an error nor a result, apparently: https://github.com/rdfjs/N3.js/blob/62682e48c02d8965b4d728cb5f2cbec6b5d1b1b8/src/N3Writer.js#L290] */
      if (error) {
        return reject(error);
      }
      resolve(result);
    });
  });

  const rawTurtle = await writePromise;
  return rawTurtle;
}

async function loadN3() {
  // When loaded via Webpack or another bundler that looks at the `modules` field in package.json,
  // N3 serves up ES modules with named exports.
  // However, when it is loaded in Node, it serves up a CommonJS module, which, when imported from
  // a Node ES module, is in the shape of a default export that is an object with all the named
  // exports as its properties.
  // This means that if we were to import the default module, our code would fail in Webpack,
  // whereas if we imported the named exports, our code would fail in Node.
  // As a workaround, we use a dynamic import. This way, we can use the same syntax in every
  // environment, where the differences between the environments are in whether the returned object
  // includes a `default` property that contains all exported functions, or whether those functions
  // are available on the returned object directly. We can then respond to those different
  // situations at runtime.
  // Unfortunately, that does mean that tree shaking will not work until N3 also provides ES modules
  // for Node, or adds a default export for Webpack. See
  // https://github.com/rdfjs/N3.js/issues/196
  const n3Module = await import("n3");
  /* istanbul ignore if: the package provides named exports in the unit test environment */
  if (typeof n3Module.default !== "undefined") {
    return n3Module.default;
  }
  return n3Module;
}
