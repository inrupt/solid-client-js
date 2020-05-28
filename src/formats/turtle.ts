import { Writer, Parser } from "n3";
import { Quad } from "rdf-js";
import { IriString } from "../index";
import { DataFactory } from "../rdfjs";

/**
 * @param quads Triples that should be serialised to Turtle
 * @internal Utility method for internal use; not part of the public API.
 */
export async function triplesToTurtle(quads: Quad[]): Promise<string> {
  const format = "text/turtle";
  const writer = new Writer({ format: format });
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

/**
 * @param raw Turtle that should be parsed into Triples
 * @internal Utility method for internal use; not part of the public API.
 */
export async function turtleToTriples(
  raw: string,
  resourceIri: IriString
): Promise<Quad[]> {
  const format = "text/turtle";
  const parser = new Parser({ format: format, baseIRI: resourceIri });

  const parsingPromise = new Promise<Quad[]>((resolve, reject) => {
    const parsedTriples: Quad[] = [];
    parser.parse(raw, (error, triple, _prefixes) => {
      if (error) {
        return reject(error);
      }
      if (triple) {
        parsedTriples.push(triple);
      } else {
        resolve(parsedTriples);
      }
    });
  });

  return parsingPromise;
}
