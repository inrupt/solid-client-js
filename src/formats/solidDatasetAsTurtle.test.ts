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

import { describe, it, expect } from "@jest/globals";
import { Response } from "cross-fetch";
import { solidDatasetAsTurtle } from "./solidDatasetAsTurtle";
import { responseToSolidDataset } from "../resource/solidDataset";
import type { SolidDataset } from "../interfaces";

async function getDataset(ttl: string): Promise<SolidDataset> {
  return responseToSolidDataset(
    new Response(ttl, {
      headers: { "Content-Type": "text/turtle" },
    })
  );
}

const ttl = `
  prefix : <#>
  prefix ex: <https://example.org/>
  prefix foaf: <http://xmlns.com/foaf/0.1/>
  prefix vcard: <http://www.w3.org/2006/vcard/ns#>

  <>
    a foaf:PersonalProfileDocument ;
    foaf:maker ex:joe ;
    foaf:primaryTopic ex:joe .

  ex:joe
    a foaf:Person ;
    vcard:fn "Peter Gordon Brown", "aka Joe"@en ;
    foaf:knows [
      vcard:fn "Latifa Gobadji" ;
      :predicate <https://example.org/blank_node_object>
    ] .
`;

describe("solidDatasetAsTurtle", () => {
  it("should correctly serialize all triples in a Dataset", async () => {
    const datasetAsTurtle = solidDatasetAsTurtle(await getDataset(ttl));
    await expect(datasetAsTurtle).resolves.toContain("a foaf:Person");
    await expect(datasetAsTurtle).resolves.toContain(' Joe"@en');
    await expect(datasetAsTurtle).resolves.toContain(
      ":predicate <https://example.org/blank_node_object>"
    );
  });

  it("should correctly serialize only triples related to a thing in a Dataset", async () => {
    const datasetAsTurtle = solidDatasetAsTurtle(await getDataset(ttl), {
      thing: "https://example.org/joe",
    });
    await expect(datasetAsTurtle).resolves.toContain("a foaf:Person");
    await expect(datasetAsTurtle).resolves.toContain(' Joe"@en');
    await expect(datasetAsTurtle).resolves.not.toContain(
      ":predicate <https://example.org/blank_node_object>"
    );
  });

  // N3 is very permissive, so skip this
  it.skip("should throw", async () => {
    const x: SolidDataset = {
      type: "Dataset",
      graphs: {
        default: {
          "https://example.org/a": {
            type: "Subject",
            url: "https://example.org/a",
            predicates: {
              "!!!!bla": {
                namedNodes: ["very wrong"],
              },
            },
          },
        },
      },
    };
    await expect(solidDatasetAsTurtle(x)).rejects.toThrow();
  });
});
