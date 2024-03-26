//
// Copyright Inrupt Inc.
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

import { jest, describe, it, expect } from "@jest/globals";
import { dataset } from "@rdfjs/dataset";
import * as fc from "fast-check";
import { DataFactory as DF, Store } from "n3";
import type {
  BlankNode,
  DatasetCore,
  Quad,
  Term,
  DatasetCoreFactory,
  DataFactory,
} from "@rdfjs/types";
import {
  serializeBoolean,
  serializeDatetime,
  serializeDecimal,
  serializeInteger,
  xmlSchemaTypes,
} from "./datatypes";
import type { ImmutableDataset } from "./rdf.internal";
import { addRdfJsQuadToDataset } from "./rdfjs.internal";
import { fromRdfJsDataset, toRdfJsDataset } from "./rdfjs";
import { getThingAll } from "./thing/thing";

describe("fromRdfJsDataset", () => {
  const fcNamedNode = fc
    .webUrl({ withFragments: true, withQueryParameters: true })
    .map((url) => DF.namedNode(url));
  const fcString = fc.string().map((value) => DF.literal(value));
  const fcInteger = fc
    .integer()
    .map((value) =>
      DF.literal(serializeInteger(value), DF.namedNode(xmlSchemaTypes.integer)),
    );
  const fcDecimal = fc
    .float()
    .map((value) =>
      DF.literal(serializeDecimal(value), DF.namedNode(xmlSchemaTypes.decimal)),
    );
  const fcDatetime = fc
    .date()
    .map((value) =>
      DF.literal(
        serializeDatetime(value),
        DF.namedNode(xmlSchemaTypes.dateTime),
      ),
    );
  const fcBoolean = fc
    .boolean()
    .map((value) =>
      DF.literal(serializeBoolean(value), DF.namedNode(xmlSchemaTypes.boolean)),
    );
  const fcLangString = fc
    .tuple(
      fc.string(),
      fc.oneof(fc.constant("nl-NL"), fc.constant("en-GB"), fc.constant("fr")),
    )
    .map(([value, lang]) => DF.literal(value, lang));
  const fcArbitraryLiteral = fc
    .tuple(fc.string(), fc.webUrl({ withFragments: true }))
    .map(([value, dataType]) => DF.literal(value, DF.namedNode(dataType)));
  const fcLiteral = fc.oneof(
    fcString,
    fcInteger,
    fcDecimal,
    fcDatetime,
    fcBoolean,
    fcLangString,
    fcArbitraryLiteral,
  );
  const fcBlankNode = fc
    .asciiString()
    .map((asciiString) => DF.blankNode(asciiString));
  const fcDefaultGraph = fc.constant(DF.defaultGraph());
  const fcGraph = fc.oneof(fcDefaultGraph, fcNamedNode);
  const fcQuadSubject = fc.oneof(fcNamedNode, fcBlankNode);
  const fcQuadPredicate = fcNamedNode;
  const fcQuadObject = fc.oneof(fcNamedNode, fcLiteral, fcBlankNode);
  const fcQuad = fc
    .tuple(fcQuadSubject, fcQuadPredicate, fcQuadObject, fcGraph)
    .map(([subject, predicate, object, graph]) =>
      DF.quad(subject, predicate, object, graph),
    );
  const fcDatasetWithReusedBlankNodes = fc.uniqueArray(fcQuad).map((quads) => {
    const reusedBlankNode = DF.blankNode();
    function maybeReplaceBlankNode(node: BlankNode): BlankNode {
      return Math.random() < 0.5 ? node : reusedBlankNode;
    }
    function maybeReplaceBlankNodesInQuad(quad: Quad): Quad {
      const subject =
        quad.subject.termType === "BlankNode"
          ? maybeReplaceBlankNode(quad.subject)
          : quad.subject;
      const object =
        quad.object.termType === "BlankNode"
          ? maybeReplaceBlankNode(quad.object)
          : quad.object;
      return DF.quad(subject, quad.predicate, object, quad.graph);
    }
    return dataset(quads.map(maybeReplaceBlankNodesInQuad));
  });

  it("loses no data", () => {
    const runs = process.env.CI ? 1000 : 100;
    expect.assertions(runs * 2 + 2);

    function hasMatchingQuads(a: DatasetCore, b: DatasetCore): boolean {
      function blankNodeToNull(term: Term): Term | null {
        return term.termType === "BlankNode" ? null : term;
      }

      const aQuads = Array.from(a);
      const bQuads = Array.from(b);
      return (
        aQuads.every((quad) =>
          b.match(
            blankNodeToNull(quad.subject),
            quad.predicate,
            blankNodeToNull(quad.object),
            quad.graph,
          ),
        ) &&
        bQuads.every((quad) =>
          a.match(
            blankNodeToNull(quad.subject),
            quad.predicate,
            blankNodeToNull(quad.object),
            quad.graph,
          ),
        )
      );
    }

    const fcResult = fc.check(
      fc.property(fcDatasetWithReusedBlankNodes, (dataset) => {
        const thereAndBackAgain = toRdfJsDataset(fromRdfJsDataset(dataset));
        expect(thereAndBackAgain.size).toBe(dataset.size);
        expect(hasMatchingQuads(thereAndBackAgain, dataset)).toBe(true);
      }),
      { numRuns: runs },
    );

    expect(fcResult.counterexample).toBeNull();
    expect(fcResult.failed).toBe(false);
  });

  it("can represent all Quads", () => {
    const blankNode1 = DF.blankNode();
    const blankNode2 = DF.blankNode();
    const subject1IriString = "https://some.pod/resource#subject1";
    const subject1 = DF.namedNode(subject1IriString);
    const subject2IriString = "https://some.pod/resource#subject2";
    const subject2 = DF.namedNode(subject2IriString);
    const predicate1IriString = "https://some.vocab/predicate1";
    const predicate1 = DF.namedNode(predicate1IriString);
    const predicate2IriString = "https://some.vocab/predicate2";
    const predicate2 = DF.namedNode(predicate2IriString);
    const literalStringValue = "Some string";
    const literalString = DF.literal(
      literalStringValue,
      DF.namedNode(xmlSchemaTypes.string),
    );
    const literalLangStringValue = "Some lang string";
    const literalLangStringLocale = "en-gb";
    const literalLangString = DF.literal(
      literalLangStringValue,
      literalLangStringLocale,
    );
    const literalIntegerValue = "42";
    const literalInteger = DF.literal(
      literalIntegerValue,
      DF.namedNode(xmlSchemaTypes.integer),
    );
    const defaultGraph = DF.defaultGraph();
    const acrGraphIriString = "https://some.pod/resource?ext=acr";
    const acrGraph = DF.namedNode(acrGraphIriString);

    const quads = [
      DF.quad(subject1, predicate1, literalString, defaultGraph),
      DF.quad(subject1, predicate1, literalLangString, defaultGraph),
      DF.quad(subject1, predicate1, literalInteger, defaultGraph),
      DF.quad(subject1, predicate2, subject2, defaultGraph),
      DF.quad(subject2, predicate1, blankNode1, acrGraph),
      DF.quad(subject2, predicate1, blankNode2, acrGraph),
      DF.quad(blankNode1, predicate1, literalString, acrGraph),
      DF.quad(blankNode2, predicate1, literalString, acrGraph),
      DF.quad(blankNode2, predicate1, literalInteger, acrGraph),
      DF.quad(blankNode2, predicate2, literalInteger, acrGraph),
    ];
    const rdfJsDataset = dataset(quads);

    expect(fromRdfJsDataset(rdfJsDataset)).toStrictEqual({
      type: "Dataset",
      graphs: {
        default: expect.objectContaining({
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
        }),
        [acrGraphIriString]: expect.objectContaining({
          [subject2IriString]: {
            url: subject2IriString,
            type: "Subject",
            predicates: {
              [predicate1IriString]: {
                blankNodes: [
                  expect.stringMatching(/_:/),
                  expect.stringMatching(/_:/),
                ],
              },
            },
          },
        }),
      },
    });
    const subjectsExcludingBlankNodes = getThingAll(
      fromRdfJsDataset(rdfJsDataset),
      { scope: acrGraphIriString },
    );
    const subjectsIncludingBlankNodes = getThingAll(
      fromRdfJsDataset(rdfJsDataset),
      { scope: acrGraphIriString, acceptBlankNodes: true },
    );
    // There should be two blank nodes in the resulting dataset.
    expect(
      subjectsIncludingBlankNodes.length - subjectsExcludingBlankNodes.length,
    ).toBe(2);
  });

  it("can represent lists", () => {
    const first = DF.namedNode(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
    );
    const rest = DF.namedNode(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
    );
    const nil = DF.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#nil");
    const item1Node = DF.blankNode();
    const item2Node = DF.blankNode();
    const quad1 = DF.quad(item1Node, first, DF.literal("First item in a list"));
    const quad2 = DF.quad(item1Node, rest, item2Node);
    const quad3 = DF.quad(
      item2Node,
      first,
      DF.literal("Second item in a list"),
    );
    const quad4 = DF.quad(item2Node, rest, nil);

    const rdfJsDataset = dataset([quad1, quad2, quad3, quad4]);
    const thereAndBackAgain = toRdfJsDataset(fromRdfJsDataset(rdfJsDataset));
    expect(thereAndBackAgain.size).toBe(4);
    expect(
      thereAndBackAgain.match(null, null, DF.literal("First item in a list"))
        .size,
    ).toBe(1);
    expect(
      thereAndBackAgain.match(null, null, DF.literal("Second item in a list"))
        .size,
    ).toBe(1);
  });

  it("does not lose any predicates", () => {
    const blankNode1 = DF.blankNode();
    const blankNode2 = DF.blankNode();
    const blankNode3 = DF.blankNode();
    const blankNode4 = DF.blankNode();
    const predicate1 = DF.namedNode("https://example.com/predicate1");
    const predicate2 = DF.namedNode("https://example.com/predicate2");
    const predicate3 = DF.namedNode("https://example.com/predicate3");
    const acrGraph = DF.namedNode("https://example.com/acrGraph");
    const literalString = DF.literal("Arbitrary literal string");
    const quads = [
      DF.quad(blankNode1, predicate1, blankNode2, acrGraph),
      DF.quad(blankNode2, predicate2, blankNode3, acrGraph),
      DF.quad(blankNode3, predicate3, blankNode4, acrGraph),
      DF.quad(blankNode4, predicate2, literalString, acrGraph),
    ];
    const rdfJsDataset = dataset(quads);
    const thereAndBackAgain = toRdfJsDataset(fromRdfJsDataset(rdfJsDataset));
    expect(thereAndBackAgain.size).toBe(rdfJsDataset.size);
  });

  it("does not trip over circular blank nodes", () => {
    const namedNode = DF.namedNode("https://example.com/namedNode");
    const blankNode1 = DF.blankNode();
    const blankNode2 = DF.blankNode();
    const blankNode3 = DF.blankNode();
    const predicate = DF.namedNode("https://example.com/predicate");
    const literalString = DF.literal("Arbitrary literal string");
    const quads = [
      DF.quad(namedNode, predicate, blankNode2),
      DF.quad(blankNode1, predicate, blankNode2),
      DF.quad(blankNode2, predicate, blankNode3),
      DF.quad(blankNode3, predicate, blankNode1),
      DF.quad(blankNode2, predicate, literalString),
    ];
    const rdfJsDataset = dataset(quads);
    const thereAndBackAgain = toRdfJsDataset(fromRdfJsDataset(rdfJsDataset));
    expect(thereAndBackAgain.size).toBe(rdfJsDataset.size);
  });

  it("does not trip over blank nodes that appear as the object for different subjects", () => {
    const blankNode1 = DF.blankNode();
    const blankNode2 = DF.blankNode();
    const blankNode3 = DF.blankNode();
    const predicate = DF.namedNode("https://example.com/predicate");
    const literalString = DF.literal("Arbitrary literal string");
    const quads = [
      DF.quad(blankNode1, predicate, blankNode2),
      DF.quad(blankNode2, predicate, literalString),
      DF.quad(blankNode3, predicate, blankNode2),
    ];
    const rdfJsDataset = dataset(quads);
    const thereAndBackAgain = toRdfJsDataset(fromRdfJsDataset(rdfJsDataset));
    expect(thereAndBackAgain.size).toBe(rdfJsDataset.size);
  });

  it("does not trip over Datasets that only contain Blank Node Subjects", () => {
    const blankNode1 = DF.blankNode();
    const blankNode2 = DF.blankNode();
    const blankNode3 = DF.blankNode();
    const predicate = DF.namedNode("https://example.com/predicate");
    const literalString = DF.literal("Arbitrary literal string");
    const quads = [
      DF.quad(blankNode1, predicate, blankNode2),
      DF.quad(blankNode2, predicate, blankNode3),
      DF.quad(blankNode3, predicate, blankNode1),
      DF.quad(blankNode2, predicate, literalString),
    ];
    const rdfJsDataset = dataset(quads);
    const thereAndBackAgain = toRdfJsDataset(fromRdfJsDataset(rdfJsDataset));
    expect(thereAndBackAgain.size).toBe(rdfJsDataset.size);
  });

  describe("addRdfJsQuadToDataset", () => {
    it("can parse a simple Quad with a Blank Node Object", () => {
      const mockDataset: ImmutableDataset = {
        type: "Dataset",
        graphs: { default: {} },
      };
      const mockQuad = DF.quad(
        DF.namedNode("https://some.subject"),
        DF.namedNode("https://some.predicate"),
        DF.blankNode("some-blank-node"),
        DF.defaultGraph(),
      );
      const dataset = addRdfJsQuadToDataset(mockDataset, mockQuad);

      expect(dataset).toStrictEqual({
        type: "Dataset",
        graphs: {
          default: {
            "https://some.subject": {
              type: "Subject",
              url: "https://some.subject",
              predicates: {
                "https://some.predicate": {
                  blankNodes: ["_:some-blank-node"],
                },
              },
            },
          },
        },
      });
    });

    it("throws an error when passed unknown Graph types", () => {
      const mockDataset: ImmutableDataset = {
        type: "Dataset",
        graphs: { default: {} },
      };
      const mockQuad = DF.quad(
        DF.namedNode("https://arbitrary.subject"),
        DF.namedNode("https://arbitrary.predicate"),
        DF.namedNode("https://arbitrary.object"),
        { termType: "Unknown term type" } as any,
      );
      expect(() => addRdfJsQuadToDataset(mockDataset, mockQuad)).toThrow(
        "Cannot parse Quads with nodes of type [Unknown term type] as their Graph node.",
      );
    });

    it("throws an error when passed unknown Subject types", () => {
      const mockDataset: ImmutableDataset = {
        type: "Dataset",
        graphs: { default: {} },
      };
      const mockQuad = DF.quad(
        { termType: "Unknown term type" } as any,
        DF.namedNode("https://arbitrary.predicate"),
        DF.namedNode("https://arbitrary.object"),
        DF.defaultGraph(),
      );
      expect(() => addRdfJsQuadToDataset(mockDataset, mockQuad)).toThrow(
        "Cannot parse Quads with nodes of type [Unknown term type] as their Subject node.",
      );
    });

    it("throws an error when passed unknown Predicate types", () => {
      const mockDataset: ImmutableDataset = {
        type: "Dataset",
        graphs: { default: {} },
      };
      const mockQuad = DF.quad(
        DF.namedNode("https://arbitrary.subject"),
        { termType: "Unknown term type" } as any,
        DF.namedNode("https://arbitrary.object"),
        DF.defaultGraph(),
      );
      expect(() => addRdfJsQuadToDataset(mockDataset, mockQuad)).toThrow(
        "Cannot parse Quads with nodes of type [Unknown term type] as their Predicate node.",
      );
    });

    it("throws an error when passed unknown Predicate types with chain Blank Node Subjects", () => {
      const mockDataset: ImmutableDataset = {
        type: "Dataset",
        graphs: { default: {} },
      };
      const chainBlankNode = DF.blankNode();
      const otherQuad = DF.quad(
        DF.namedNode("https://arbitrary.subject"),
        DF.namedNode("https://arbitrary.predicate"),
        chainBlankNode,
        DF.defaultGraph(),
      );
      const mockQuad = DF.quad(
        chainBlankNode,
        { termType: "Unknown term type" } as any,
        DF.namedNode("https://arbitrary.object"),
        DF.defaultGraph(),
      );
      expect(() =>
        addRdfJsQuadToDataset(mockDataset, otherQuad, {
          chainBlankNodes: [chainBlankNode],
          otherQuads: [mockQuad],
        }),
      ).toThrow(
        "Cannot parse Quads with nodes of type [Unknown term type] as their Predicate node.",
      );
    });

    it("throws an error when passed unknown Predicate types in connecting Quads for chain Blank Node Objects", () => {
      const mockDataset: ImmutableDataset = {
        type: "Dataset",
        graphs: { default: {} },
      };
      const chainBlankNode1 = DF.blankNode();
      const chainBlankNode2 = DF.blankNode();
      const otherQuad = DF.quad(
        DF.namedNode("https://arbitrary.subject"),
        DF.namedNode("https://arbitrary.predicate"),
        chainBlankNode1,
        DF.defaultGraph(),
      );
      const inBetweenQuad = DF.quad(
        chainBlankNode1,
        { termType: "Unknown term type" } as any,
        chainBlankNode2,
        DF.defaultGraph(),
      );
      const mockQuad = DF.quad(
        chainBlankNode2,
        DF.namedNode("https://arbitrary.predicate"),
        DF.namedNode("https://arbitrary.object"),
        DF.defaultGraph(),
      );
      expect(() =>
        addRdfJsQuadToDataset(mockDataset, otherQuad, {
          chainBlankNodes: [chainBlankNode1, chainBlankNode2],
          otherQuads: [mockQuad, inBetweenQuad],
        }),
      ).toThrow(
        "Cannot parse Quads with nodes of type [Unknown term type] as their Predicate node.",
      );
    });

    it("throws an error when passed unknown Predicate types in the terminating Quads for chain Blank Node Objects", () => {
      const mockDataset: ImmutableDataset = {
        type: "Dataset",
        graphs: { default: {} },
      };
      const chainBlankNode1 = DF.blankNode();
      const chainBlankNode2 = DF.blankNode();
      const otherQuad = DF.quad(
        DF.namedNode("https://arbitrary.subject"),
        DF.namedNode("https://arbitrary.predicate"),
        chainBlankNode1,
        DF.defaultGraph(),
      );
      const inBetweenQuad = DF.quad(
        chainBlankNode1,
        DF.namedNode("https://arbitrary.predicate"),
        chainBlankNode2,
        DF.defaultGraph(),
      );
      const mockQuad = DF.quad(
        chainBlankNode2,
        { termType: "Unknown term type" } as any,
        DF.namedNode("https://arbitrary.object"),
        DF.defaultGraph(),
      );
      expect(() =>
        addRdfJsQuadToDataset(mockDataset, otherQuad, {
          chainBlankNodes: [chainBlankNode1, chainBlankNode2],
          otherQuads: [mockQuad, inBetweenQuad],
        }),
      ).toThrow(
        "Cannot parse Quads with nodes of type [Unknown term type] as their Predicate node.",
      );
    });

    it("throws an error when passed unknown Object types", () => {
      const mockDataset: ImmutableDataset = {
        type: "Dataset",
        graphs: { default: {} },
      };
      const mockQuad = DF.quad(
        DF.namedNode("https://arbitrary.subject"),
        DF.namedNode("https://arbitrary.predicate"),
        { termType: "Unknown term type" } as any,
        DF.defaultGraph(),
      );
      expect(() => addRdfJsQuadToDataset(mockDataset, mockQuad)).toThrow(
        "Objects of type [Unknown term type] are not supported.",
      );
    });

    it("can parse chained Blank Nodes with a single link that end in a dangling Blank Node", () => {
      const mockDataset: ImmutableDataset = {
        type: "Dataset",
        graphs: { default: {} },
      };
      const chainBlankNode1 = DF.blankNode();
      const otherQuad = DF.quad(
        DF.namedNode("https://some.subject"),
        DF.namedNode("https://some.predicate/1"),
        chainBlankNode1,
        DF.defaultGraph(),
      );
      const mockQuad = DF.quad(
        chainBlankNode1,
        DF.namedNode("https://some.predicate/2"),
        DF.blankNode("some-blank-node"),
        DF.defaultGraph(),
      );

      const updatedDataset = addRdfJsQuadToDataset(mockDataset, otherQuad, {
        chainBlankNodes: [chainBlankNode1],
        otherQuads: [mockQuad],
      });

      expect(updatedDataset).toStrictEqual({
        graphs: {
          default: {
            "https://some.subject": {
              predicates: {
                "https://some.predicate/1": {
                  blankNodes: [
                    {
                      "https://some.predicate/2": {
                        blankNodes: ["_:some-blank-node"],
                      },
                    },
                  ],
                },
              },
              type: "Subject",
              url: "https://some.subject",
            },
          },
        },
        type: "Dataset",
      });
    });

    it("can parse chained Blank Nodes that end in a dangling Blank Node", () => {
      const mockDataset: ImmutableDataset = {
        type: "Dataset",
        graphs: { default: {} },
      };
      const chainBlankNode1 = DF.blankNode();
      const chainBlankNode2 = DF.blankNode();
      const otherQuad = DF.quad(
        DF.namedNode("https://some.subject"),
        DF.namedNode("https://some.predicate/1"),
        chainBlankNode1,
        DF.defaultGraph(),
      );
      const inBetweenQuad = DF.quad(
        chainBlankNode1,
        DF.namedNode("https://some.predicate/2"),
        chainBlankNode2,
        DF.defaultGraph(),
      );
      const mockQuad = DF.quad(
        chainBlankNode2,
        DF.namedNode("https://some.predicate/3"),
        DF.blankNode("some-blank-node"),
        DF.defaultGraph(),
      );

      const updatedDataset = addRdfJsQuadToDataset(mockDataset, otherQuad, {
        chainBlankNodes: [chainBlankNode1, chainBlankNode2],
        otherQuads: [mockQuad, inBetweenQuad],
      });

      expect(updatedDataset).toStrictEqual({
        graphs: {
          default: {
            "https://some.subject": {
              predicates: {
                "https://some.predicate/1": {
                  blankNodes: [
                    {
                      "https://some.predicate/2": {
                        blankNodes: [
                          {
                            "https://some.predicate/3": {
                              blankNodes: ["_:some-blank-node"],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              type: "Subject",
              url: "https://some.subject",
            },
          },
        },
        type: "Dataset",
      });
    });
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
      fc.uniqueArray(fc.string(), { minLength: 1 }),
    )
    .filter(isNotEmpty);
  const fcLangStrings = fc
    .dictionary(
      fc.hexaString({ minLength: 1 }).map((str) => str.toLowerCase()),
      fc.uniqueArray(fc.string(), { minLength: 1 }),
    )
    .filter(isNotEmpty);
  const fcLocalNodeIri = fc.webUrl({ withFragments: true }).map((url) => {
    const originalUrl = new URL(url);
    return `https://inrupt.com/.well-known/sdk-local-node/${originalUrl.hash}`;
  });
  const fcNamedNodes = fc.uniqueArray(
    fc.oneof(
      fcLocalNodeIri,
      fc.webUrl({ withFragments: true, withQueryParameters: true }),
    ),
    {
      minLength: 1,
    },
  );
  const fcObjects = fc
    .record(
      {
        literals: fcLiterals,
        langStrings: fcLangStrings,
        namedNodes: fcNamedNodes,
        // blankNodes: fcBlankNodes,
      },
      { withDeletedKeys: true },
    )
    .filter(isNotEmpty);
  // Unfortunately I haven't figured out how to generate the nested blank node
  // structures with fast-check yet, so this does not generate those:
  const fcPredicates = fc
    .dictionary(fc.webUrl({ withFragments: true }), fcObjects)
    .filter(isNotEmpty);
  const fcGraph = fc
    .dictionary(
      fc.oneof(
        fcLocalNodeIri,
        fc.webUrl({ withFragments: true, withQueryParameters: true }),
      ),
      fc.record({
        type: fc.constant("Subject"),
        url: fc.webUrl({ withFragments: true, withQueryParameters: true }),
        predicates: fcPredicates,
      }),
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
    graphs: fc
      .tuple(
        fc.dictionary(fc.webUrl({ withQueryParameters: true }), fcGraph),
        fcGraph,
      )
      .map(([otherGraphs, defaultGraph]) => ({
        ...otherGraphs,
        default: defaultGraph,
      })),
  });

  it("loses no data when serialising and deserialising to RDF/JS Datasets", () => {
    const runs = process.env.CI ? 100 : 1;
    expect.assertions(runs + 2);

    const fcResult = fc.check(
      fc.property(fcDataset, (dataset) => {
        expect(
          sortObject(fromRdfJsDataset(toRdfJsDataset(dataset as any))),
        ).toStrictEqual(sortObject(dataset));
      }),
      { numRuns: runs },
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

  it("can take a custom DataFactory", () => {
    const customDataFactory = {
      quad: jest.fn(DF.quad),
      namedNode: jest.fn(DF.namedNode),
      literal: jest.fn(DF.literal),
      blankNode: jest.fn(DF.blankNode),
      defaultGraph: jest.fn(DF.defaultGraph),
    } as DataFactory;
    const customDatasetFactory = {
      dataset: jest.fn((quads: Quad[]) => new Store(quads)),
    } as DatasetCoreFactory;
    const sourceDataset: ImmutableDataset = {
      type: "Dataset",
      graphs: {
        default: {
          "https://arbitrary.pod/resource#thing": {
            type: "Subject",
            url: "https://arbitrary.pod/resource#thing",
            predicates: {
              "https://arbitrary.vocab/predicate": {
                namedNodes: ["https://arbitrary.pod/other-resource#thing"],
                literals: {
                  "https://arbitrary.vocab/literal-type": ["Arbitrary value"],
                },
                blankNodes: ["_:arbitrary-blank-node"],
              },
            },
          },
        },
      },
    };

    toRdfJsDataset(sourceDataset, {
      dataFactory: customDataFactory,
      datasetFactory: customDatasetFactory,
    });
    expect(customDataFactory.quad).toHaveBeenCalled();
    expect(customDataFactory.namedNode).toHaveBeenCalled();
    expect(customDataFactory.literal).toHaveBeenCalled();
    expect(customDataFactory.blankNode).toHaveBeenCalled();
    expect(customDataFactory.defaultGraph).toHaveBeenCalled();
    expect(customDatasetFactory.dataset).toHaveBeenCalled();
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
    {},
  );
}
