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

import { describe, it, expect } from "@jest/globals";
import { dataset } from "@rdfjs/dataset";
import * as fc from "fast-check";
import { DataFactory } from "n3";
import {
  serializeBoolean,
  serializeDatetime,
  serializeDecimal,
  serializeInteger,
  xmlSchemaTypes,
} from "./datatypes";
import {
  fromRdfJsDataset,
  ImmutableDataset,
  toRdfJsDataset,
} from "./pojo-interfaces";

describe("fromRdfJsDataset", () => {
  const fcNamedNode = fc
    .webUrl({ withFragments: true, withQueryParameters: true })
    .map((url) => DataFactory.namedNode(url));
  const fcString = fc.string().map((value) => DataFactory.literal(value));
  const fcInteger = fc
    .integer()
    .map((value) =>
      DataFactory.literal(
        serializeInteger(value),
        DataFactory.namedNode(xmlSchemaTypes.integer)
      )
    );
  const fcDecimal = fc
    .float()
    .map((value) =>
      DataFactory.literal(
        serializeDecimal(value),
        DataFactory.namedNode(xmlSchemaTypes.decimal)
      )
    );
  const fcDatetime = fc
    .date()
    .map((value) =>
      DataFactory.literal(
        serializeDatetime(value),
        DataFactory.namedNode(xmlSchemaTypes.dateTime)
      )
    );
  const fcBoolean = fc
    .boolean()
    .map((value) =>
      DataFactory.literal(
        serializeBoolean(value),
        DataFactory.namedNode(xmlSchemaTypes.boolean)
      )
    );
  const fcLangString = fc
    .tuple(
      fc.string(),
      fc.oneof(fc.constant("nl-NL"), fc.constant("en-GB"), fc.constant("fr"))
    )
    .map(([value, lang]) => DataFactory.literal(value, lang));
  const fcArbitraryLiteral = fc
    .tuple(fc.string(), fc.webUrl({ withFragments: true }))
    .map(([value, dataType]) =>
      DataFactory.literal(value, DataFactory.namedNode(dataType))
    );
  const fcLiteral = fc.oneof(
    fcString,
    fcInteger,
    fcDecimal,
    fcDatetime,
    fcBoolean,
    fcLangString,
    fcArbitraryLiteral
  );
  // To check: not sure whether this generates new blank nodes every time.
  const fcBlankNode = fc.constant(null).map(() => DataFactory.blankNode());
  const fcDefaultGraph = fc.constant(DataFactory.defaultGraph());
  const fcGraph = fc.oneof(fcDefaultGraph, fcNamedNode);
  const fcQuadSubject = fc.oneof(fcNamedNode, fcBlankNode);
  const fcQuadPredicate = fcNamedNode;
  const fcQuadObject = fc.oneof(fcNamedNode, fcLiteral, fcBlankNode);
  const fcQuad = fc
    .tuple(fcQuadSubject, fcQuadPredicate, fcQuadObject, fcGraph)
    .map(([subject, predicate, object, graph]) =>
      DataFactory.quad(subject, predicate, object, graph)
    );
  const fcTerm = fc.oneof(fcNamedNode, fcLiteral, fcBlankNode, fcQuad);
  const fcDataset = fc.set(fcQuad).map((quads) => dataset(quads));

  it("can represent all Quads", () => {
    const blankNode1 = DataFactory.blankNode();
    const blankNode2 = DataFactory.blankNode();
    const subject1IriString = "https://some.pod/resource#subject1";
    const subject1 = DataFactory.namedNode(subject1IriString);
    const subject2IriString = "https://some.pod/resource#subject2";
    const subject2 = DataFactory.namedNode(subject2IriString);
    const predicate1IriString = "https://some.vocab/predicate1";
    const predicate1 = DataFactory.namedNode(predicate1IriString);
    const predicate2IriString = "https://some.vocab/predicate2";
    const predicate2 = DataFactory.namedNode(predicate2IriString);
    const literalStringValue = "Some string";
    const literalString = DataFactory.literal(
      literalStringValue,
      DataFactory.namedNode(xmlSchemaTypes.string)
    );
    const literalLangStringValue = "Some lang string";
    const literalLangStringLocale = "en-gb";
    const literalLangString = DataFactory.literal(
      literalLangStringValue,
      literalLangStringLocale
    );
    const literalIntegerValue = "42";
    const literalInteger = DataFactory.literal(
      literalIntegerValue,
      DataFactory.namedNode(xmlSchemaTypes.integer)
    );
    const defaultGraph = DataFactory.defaultGraph();
    const acrGraphIriString = "https://some.pod/resource?ext=acr";
    const acrGraph = DataFactory.namedNode(acrGraphIriString);

    const quads = [
      DataFactory.quad(subject1, predicate1, literalString, defaultGraph),
      DataFactory.quad(subject1, predicate1, literalLangString, defaultGraph),
      DataFactory.quad(subject1, predicate1, literalInteger, defaultGraph),
      DataFactory.quad(subject1, predicate2, subject2, defaultGraph),
      DataFactory.quad(subject2, predicate1, blankNode1, acrGraph),
      DataFactory.quad(subject2, predicate1, blankNode2, acrGraph),
      DataFactory.quad(blankNode1, predicate1, literalString, acrGraph),
      DataFactory.quad(blankNode2, predicate1, literalString, acrGraph),
      DataFactory.quad(blankNode2, predicate1, literalInteger, acrGraph),
      DataFactory.quad(blankNode2, predicate2, literalInteger, acrGraph),
    ];
    const rdfJsDataset = dataset(quads);

    expect(fromRdfJsDataset(rdfJsDataset)).toStrictEqual({
      type: "Dataset",
      graphs: {
        default: {
          [subject1IriString]: {
            url: subject1IriString,
            type: "Subject",
            predicates: {
              [predicate1IriString]: {
                literals: {
                  [xmlSchemaTypes.string]: [literalStringValue],
                  [xmlSchemaTypes.integer]: [literalIntegerValue],
                },
                langStrings: {
                  [literalLangStringLocale]: [literalLangStringValue],
                },
              },
              [predicate2IriString]: {
                namedNodes: [subject2IriString],
              },
            },
          },
        },
        [acrGraphIriString]: {
          [subject2IriString]: {
            url: subject2IriString,
            type: "Subject",
            predicates: {
              [predicate1IriString]: {
                blankNodes: [
                  {
                    [predicate1IriString]: {
                      literals: {
                        [xmlSchemaTypes.string]: [literalStringValue],
                      },
                    },
                  },
                  {
                    [predicate1IriString]: {
                      literals: {
                        [xmlSchemaTypes.string]: [literalStringValue],
                        [xmlSchemaTypes.integer]: [literalIntegerValue],
                      },
                    },
                    [predicate2IriString]: {
                      literals: {
                        [xmlSchemaTypes.integer]: [literalIntegerValue],
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    });
  });

  it("can represent lists", () => {
    const first = DataFactory.namedNode(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#first"
    );
    const rest = DataFactory.namedNode(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest"
    );
    const nil = DataFactory.namedNode(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil"
    );
    const item1Node = DataFactory.blankNode();
    const item2Node = DataFactory.blankNode();
    const quad1 = DataFactory.quad(
      item1Node,
      first,
      DataFactory.literal("First item in a list")
    );
    const quad2 = DataFactory.quad(item1Node, rest, item2Node);
    const quad3 = DataFactory.quad(
      item2Node,
      first,
      DataFactory.literal("Second item in a list")
    );
    const quad4 = DataFactory.quad(item2Node, rest, nil);

    const rdfJsDataset = dataset([quad1, quad2, quad3, quad4]);
    const thereAndBackAgain = toRdfJsDataset(fromRdfJsDataset(rdfJsDataset));
    expect(thereAndBackAgain.size).toBe(4);
    expect(
      thereAndBackAgain.match(
        null,
        null,
        DataFactory.literal("First item in a list")
      ).size
    ).toBe(1);
    expect(
      thereAndBackAgain.match(
        null,
        null,
        DataFactory.literal("Second item in a list")
      ).size
    ).toBe(1);
  });

  it("does not lose any predicates", () => {
    const blankNode1 = DataFactory.blankNode();
    const blankNode2 = DataFactory.blankNode();
    const blankNode3 = DataFactory.blankNode();
    const blankNode4 = DataFactory.blankNode();
    const predicate1 = DataFactory.namedNode("https://example.com/predicate1");
    const predicate2 = DataFactory.namedNode("https://example.com/predicate2");
    const predicate3 = DataFactory.namedNode("https://example.com/predicate3");
    const acrGraph = DataFactory.namedNode("https://example.com/acrGraph");
    const literalString = DataFactory.literal("Arbitrary literal string");
    const quads = [
      DataFactory.quad(blankNode1, predicate1, blankNode2, acrGraph),
      DataFactory.quad(blankNode2, predicate2, blankNode3, acrGraph),
      DataFactory.quad(blankNode3, predicate3, blankNode4, acrGraph),
      DataFactory.quad(blankNode4, predicate2, literalString, acrGraph),
    ];
    const rdfJsDataset = dataset(quads);
    const thereAndBackAgain = toRdfJsDataset(fromRdfJsDataset(rdfJsDataset));
    expect(thereAndBackAgain.size).toBe(rdfJsDataset.size);
  });
});

describe("toRdfJsDataset", () => {
  const isNotEmpty = (value: object) => {
    if (typeof value !== "object") {
      return false;
    }
    if (value === null) {
      return false;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return Object.keys(value).length > 0;
  };
  const fcLiterals = fc
    .dictionary(
      fc.webUrl({ withFragments: true }),
      fc.set(fc.string(), { minLength: 1 })
    )
    .filter(isNotEmpty);
  const fcLangStrings = fc
    .dictionary(
      fc.hexaString({ minLength: 1 }).map((str) => str.toLowerCase()),
      fc.set(fc.string(), { minLength: 1 })
    )
    .filter(isNotEmpty);
  const fcLocalNodeIri = fc.webUrl({ withFragments: true }).map((url) => {
    const originalUrl = new URL(url);
    return `https://inrupt.com/.well-known/sdk-local-node/${originalUrl.hash}`;
  });
  const fcNamedNodes = fc.set(
    fc.oneof(
      fcLocalNodeIri,
      fc.webUrl({ withFragments: true, withQueryParameters: true })
    ),
    {
      minLength: 1,
    }
  );
  const fcObjects = fc
    .record(
      {
        literals: fcLiterals,
        langStrings: fcLangStrings,
        namedNodes: fcNamedNodes,
        // blankNodes: fcBlankNodes,
      },
      { withDeletedKeys: true }
    )
    .filter(isNotEmpty);
  const fcPredicates = fc
    .dictionary(fc.webUrl({ withFragments: true }), fcObjects)
    .filter(isNotEmpty);
  // Unfortunately I haven't figured out how to generate the recursive blank node
  // structures with fast-check yet:
  // const fcPredicates = fc.letrec(tie => ({
  //   predicates: fc.dictionary(fc.webUrl({ withFragments: true }), tie("objects")).filter(isNotEmpty),
  //   objects: fc.record(
  //     {
  //       literals: fcLiterals,
  //       langStrings: fcLangStrings,
  //       namedNodes: fcNamedNodes,
  //       blankNodes: tie("blankNodes").filter(value => isNotEmpty(value as object)),
  //     }
  //   ),
  //   blankNodes: fc.option(tie("predicates"), { maxDepth: 2, depthIdentifier: "blankNode" }),
  //   // blankNodes: fc.oneof({ maxDepth: 1 }, tie("leaf"), tie("nodes")),
  //   // leaf: fc.constant({}),
  //   // nodes: tie("predicates"),
  // })).predicates;
  const fcSubject = fc.record({
    type: fc.constant("Subject"),
    url: fc.webUrl({ withFragments: true, withQueryParameters: true }),
    predicates: fcPredicates,
  });
  const fcGraph = fc
    .dictionary(
      fc.oneof(
        fcLocalNodeIri,
        fc.webUrl({ withFragments: true, withQueryParameters: true })
      ),
      fc.record({
        type: fc.constant("Subject"),
        url: fc.webUrl({ withFragments: true, withQueryParameters: true }),
        predicates: fcPredicates,
      })
    )
    .filter(isNotEmpty)
    .map((graph) => {
      Object.keys(graph).forEach((subjectIri) => {
        graph[subjectIri].url = subjectIri;
      });
      return graph;
    });
  const fcDataset = fc.record({
    type: fc.constant("Dataset"),
    graphs: fc.dictionary(
      fc.oneof(
        fc.constant("default"),
        fc.webUrl({ withQueryParameters: true })
      ),
      fcGraph
    ),
  });

  it("loses no data when serialising and deserialising to RDF/JS Datasets", () => {
    const runs = process.env.CI ? 100 : 1;
    expect.assertions(runs + 2);

    const fcResult = fc.check(
      fc.property(fcDataset, (dataset) => {
        expect(
          sortObject(fromRdfJsDataset(toRdfJsDataset(dataset as any)))
        ).toStrictEqual(sortObject(dataset));
      }),
      { numRuns: runs }
    );

    expect(fcResult.counterexample).toBeNull();
    expect(fcResult.failed).toBe(false);
  });

  it("can represent dangling Blank Nodes", () => {
    const datasetWithDanglingBlankNodes: ImmutableDataset = {
      type: "Dataset",
      graphs: {
        default: {
          "_:danglingSubjectBlankNode": {
            type: "Subject",
            url: "_:danglingSubjectBlankNode",
            predicates: {
              "http://www.w3.org/ns/auth/acl#origin": {
                blankNodes: [{}],
              },
            },
          },
        },
      },
    };

    const rdfJsDataset = toRdfJsDataset(datasetWithDanglingBlankNodes);
    expect(rdfJsDataset.size).toBe(1);
    const quad = Array.from(rdfJsDataset)[0];
    expect(quad.subject.termType).toBe("BlankNode");
    expect(quad.predicate.value).toBe("http://www.w3.org/ns/auth/acl#origin");
    expect(quad.object.termType).toBe("BlankNode");
  });
});

function sortObject(value: Record<string, any>): Record<string, any> {
  if (typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return [...value].sort();
  }
  if (value === null) {
    return value;
  }
  const keys = Object.keys(value);
  keys.sort();

  return keys.reduce(
    (newObject, key) => ({ ...newObject, [key]: sortObject(value[key]) }),
    {}
  );
}
