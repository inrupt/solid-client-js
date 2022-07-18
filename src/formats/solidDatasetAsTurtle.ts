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

import { NamedNode, Writer } from "n3";
import type { SolidDataset } from "../interfaces";
import { prefixes as defaultPrefixes } from "./prefixes";
import { toRdfJsDataset } from "../rdfjs";

/**
 * A function to serialise a Solid Dataset as Turtle
 *
 * @param dataset The Dataset to serialize as Turtle
 * @param options.prefixes The Prefixes to use for Turtle serialisation (defaulting to a set of well known prefixes)
 * @param options.thing Restricts serialisation to the part of a dataset related to the thing
 * @returns RDF serialised as Turtle
 * @since 1.20.0
 */
export async function solidDatasetAsTurtle(
  dataset: SolidDataset,
  options?: {
    prefixes?: Record<string, string>;
    thing?: string;
  }
): Promise<string> {
  const { prefixes = defaultPrefixes, thing } = { ...options };
  const writer = new Writer({ format: "application/turtle", prefixes });
  const subject = thing ? new NamedNode(thing) : undefined;

  // If the subject is undefined, all the triples match.
  for (const quad of toRdfJsDataset(dataset).match(subject)) {
    writer.addQuad(quad);
  }

  return new Promise<string>((resolve, reject) => {
    writer.end((error, result) => {
      /* istanbul ignore next */
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}
