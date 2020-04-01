import { foaf, rdf } from "rdf-namespaces";
import { DataFactory } from "n3";
import { triplesToTurtle, turtleToTriples } from "./turtle";

describe("turtleToTriples", () => {
  it("should correctly find all triples in raw Turtle", async () => {
    const parsed = await turtleToTriples(
      `
      @prefix : <#>.
      @prefix foaf: <http://xmlns.com/foaf/0.1/>.

      :someSubject a foaf:Person; foaf:name "Some name".
    `,
      "https://example.com/some-path"
    );

    const expectedTriple1 = DataFactory.triple(
      DataFactory.namedNode("https://example.com/some-path#someSubject"),
      DataFactory.namedNode(rdf.type),
      DataFactory.namedNode(foaf.Person)
    );
    const expectedTriple2 = DataFactory.triple(
      DataFactory.namedNode("https://example.com/some-path#someSubject"),
      DataFactory.namedNode(foaf.name),
      DataFactory.literal("Some name")
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
      turtleToTriples(turtle, "https://example.com/some-path")
    ).rejects.toThrow();
  });
});

describe("triplesToTurtle", () => {
  it("should convert quads to a turtle string", async () => {
    const triples = [
      DataFactory.triple(
        DataFactory.namedNode("https://vincentt.inrupt.net/profile/card#me"),
        DataFactory.namedNode(foaf.name),
        DataFactory.literal("Vincent")
      ),
    ];

    const turtle = await triplesToTurtle(triples);

    expect(turtle.trim()).toBe(
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

    expect(turtle.trim()).toBe(
      '<https://vincentt.inrupt.net/profile/card#me> <http://xmlns.com/foaf/0.1/name> "Vincent".'
    );
  });
});
