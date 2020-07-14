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

import { foaf, rdf } from "rdf-namespaces";
import { DataFactory } from "n3";
import { triplesToTurtle, turtleToTriples } from "./turtle";
import { stringAsIri } from "../interfaces";

describe("turtleToTriples", () => {
  it("should correctly find all triples in raw Turtle", async () => {
    const parsed = await turtleToTriples(
      `
      @prefix : <#>.
      @prefix foaf: <http://xmlns.com/foaf/0.1/>.

      :someSubject a foaf:Person; foaf:name "Some name".
    `,
      stringAsIri("https://example.com/some-path")
    );

    const expectedTriple1 = DataFactory.quad(
      DataFactory.namedNode("https://example.com/some-path#someSubject"),
      DataFactory.namedNode(rdf.type),
      DataFactory.namedNode(foaf.Person),
      undefined
    );
    const expectedTriple2 = DataFactory.quad(
      DataFactory.namedNode("https://example.com/some-path#someSubject"),
      DataFactory.namedNode(foaf.name),
      DataFactory.literal("Some name"),
      undefined
    );
    expect(parsed).toEqual([expectedTriple1, expectedTriple2]);
  });

  it("should reject if the Turtle is invalid", async () => {
    const turtle = `
      @prefix : <#>.
      @prefix foaf: <http://xmlns.com/foaf/0.1/>.

      :arbitrarySubject a foaf:Person; foaf:name “A literal with invalid quotes”.
    `;

    await expect(
      turtleToTriples(turtle, stringAsIri("https://example.com/some-path"))
    ).rejects.toThrow();
  });
});

describe("triplesToTurtle", () => {
  it("should convert quads to a turtle string", async () => {
    const triples = [
      DataFactory.quad(
        DataFactory.namedNode("https://vincentt.inrupt.net/profile/card#me"),
        DataFactory.namedNode(foaf.name),
        DataFactory.literal("Vincent"),
        undefined
      ),
    ];

    const turtle = await triplesToTurtle(triples);

    expect(turtle.trim()).toEqual(
      '<https://vincentt.inrupt.net/profile/card#me> <http://xmlns.com/foaf/0.1/name> "Vincent".'
    );
  });

  it("should ignore the Graph part of the Quad", async () => {
    const triples = [
      DataFactory.quad(
        DataFactory.namedNode("https://vincentt.inrupt.net/profile/card#me"),
        DataFactory.namedNode(foaf.name),
        DataFactory.literal("Vincent"),
        DataFactory.namedNode("https://vincentt.inrupt.net/profile/card")
      ),
    ];

    const turtle = await triplesToTurtle(triples);

    expect(turtle.trim()).toEqual(
      '<https://vincentt.inrupt.net/profile/card#me> <http://xmlns.com/foaf/0.1/name> "Vincent".'
    );
  });
});
