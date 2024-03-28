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

import { DataFactory } from "n3";
import type * as RdfJs from "@rdfjs/types";
import type {
  Graph,
  ImmutableDataset,
  Objects,
  Predicates,
  Subject,
} from "./rdf.internal";
import {
  freeze,
  getBlankNodeId,
  getBlankNodeValue,
  isBlankNodeId,
} from "./rdf.internal";
import type { ToRdfJsOptions } from "./rdfjs";
import type { IriString } from "./interfaces";
import { xmlSchemaTypes } from "./datatypes";

export { DataFactory };

export function addRdfJsQuadToDataset(
  dataset: ImmutableDataset,
  quad: RdfJs.Quad,
): ImmutableDataset {
  const supportedGraphTypes: Array<typeof quad.graph.termType> = [
    "NamedNode",
    "DefaultGraph",
  ];
  if (!supportedGraphTypes.includes(quad.graph.termType)) {
    throw new Error(
      `Cannot parse Quads with nodes of type [${quad.graph.termType}] as their Graph node.`,
    );
  }
  const graphId =
    quad.graph.termType === "DefaultGraph" ? "default" : quad.graph.value;

  const graph: Graph = dataset.graphs[graphId] ?? {};
  return freeze({
    ...dataset,
    graphs: freeze({
      ...dataset.graphs,
      [graphId]: addRdfJsQuadToGraph(graph, quad),
    }),
  });
}

function addRdfJsQuadToGraph(graph: Graph, quad: RdfJs.Quad): Graph {
  const supportedSubjectTypes: Array<typeof quad.subject.termType> = [
    "NamedNode",
    "BlankNode",
  ];
  if (!supportedSubjectTypes.includes(quad.subject.termType)) {
    throw new Error(
      `Cannot parse Quads with nodes of type [${quad.subject.termType}] as their Subject node.`,
    );
  }

  const subjectIri =
    quad.subject.termType === "BlankNode"
      ? `_:${quad.subject.value}`
      : quad.subject.value;

  const subject: Subject = graph[subjectIri] ?? {
    type: "Subject",
    url: subjectIri,
    predicates: {},
  };
  return freeze({
    ...graph,
    [subjectIri]: addRdfJsQuadToSubject(subject, quad),
  });
}

function addRdfJsQuadToSubject(subject: Subject, quad: RdfJs.Quad): Subject {
  return freeze({
    ...subject,
    predicates: addRdfJsQuadToPredicates(subject.predicates, quad),
  });
}

function addRdfJsQuadToPredicates(
  predicates: Predicates,
  quad: RdfJs.Quad,
): Predicates {
  const supportedPredicateTypes: Array<typeof quad.predicate.termType> = [
    "NamedNode",
  ];
  if (!supportedPredicateTypes.includes(quad.predicate.termType)) {
    throw new Error(
      `Cannot parse Quads with nodes of type [${quad.predicate.termType}] as their Predicate node.`,
    );
  }
  const predicateIri = quad.predicate.value;
  const objects = predicates[predicateIri] ?? {};
  return freeze({
    ...predicates,
    [predicateIri]: addRdfJsQuadToObjects(objects, quad),
  });
}

function addRdfJsQuadToObjects(objects: Objects, quad: RdfJs.Quad): Objects {
  if (quad.object.termType === "NamedNode") {
    const namedNodes = freeze([
      ...(objects.namedNodes ?? []),
      quad.object.value,
    ]);
    return freeze({
      ...objects,
      namedNodes,
    });
  }

  if (quad.object.termType === "Literal") {
    if (quad.object.datatype.value === xmlSchemaTypes.langString) {
      const locale = quad.object.language.toLowerCase();
      const thisLocaleStrings = freeze([
        ...(objects.langStrings?.[locale] ?? []),
        quad.object.value,
      ]);
      const langStrings = freeze({
        ...(objects.langStrings ?? {}),
        [locale]: thisLocaleStrings,
      });
      return freeze({
        ...objects,
        langStrings,
      });
    }

    // If the Object is a non-langString Literal
    const thisTypeValues = freeze([
      ...(objects.literals?.[quad.object.datatype.value] ?? []),
      quad.object.value,
    ]);
    const literals = freeze({
      ...(objects.literals ?? {}),
      [quad.object.datatype.value]: thisTypeValues,
    });
    return freeze({
      ...objects,
      literals,
    });
  }

  if (quad.object.termType === "BlankNode") {
    const blankNodes = freeze([
      ...(objects.blankNodes ?? []),
      getBlankNodeId(quad.object),
    ]);
    return freeze({
      ...objects,
      blankNodes,
    });
  }

  throw new Error(
    `Objects of type [${quad.object.termType}] are not supported.`,
  );
}

export function toRdfJsQuads(
  dataset: ImmutableDataset,
  options: ToRdfJsOptions = {},
): RdfJs.Quad[] {
  const quads: RdfJs.Quad[] = [];
  const dataFactory = options.dataFactory ?? DataFactory;

  Object.keys(dataset.graphs).forEach((graphIri: IriString) => {
    const graph = dataset.graphs[graphIri];
    const graphNode =
      graphIri === "default"
        ? dataFactory.defaultGraph()
        : dataFactory.namedNode(graphIri);

    Object.keys(graph).forEach((subjectIri) => {
      const { predicates } = graph[subjectIri];
      const subjectNode = isBlankNodeId(subjectIri)
        ? dataFactory.blankNode(getBlankNodeValue(subjectIri))
        : dataFactory.namedNode(subjectIri);
      quads.push(
        ...subjectToRdfJsQuads(predicates, subjectNode, graphNode, options),
      );
    });
  });

  return quads;
}

export function subjectToRdfJsQuads(
  predicates: Predicates,
  subjectNode: RdfJs.NamedNode | RdfJs.BlankNode,
  graphNode: RdfJs.NamedNode | RdfJs.DefaultGraph,
  options: ToRdfJsOptions = {},
): RdfJs.Quad[] {
  const quads: RdfJs.Quad[] = [];
  const dataFactory = options.dataFactory ?? DataFactory;

  Object.keys(predicates).forEach((predicateIri) => {
    const predicateNode = dataFactory.namedNode(predicateIri);
    const langStrings = predicates[predicateIri].langStrings ?? {};
    const namedNodes = predicates[predicateIri].namedNodes ?? [];
    const literals = predicates[predicateIri].literals ?? {};
    const blankNodes = predicates[predicateIri].blankNodes ?? [];

    const literalTypes = Object.keys(literals);
    literalTypes.forEach((typeIri) => {
      const typeNode = dataFactory.namedNode(typeIri);
      const literalValues = literals[typeIri];
      literalValues.forEach((value) => {
        const literalNode = dataFactory.literal(value, typeNode);
        quads.push(
          dataFactory.quad(
            subjectNode,
            predicateNode,
            literalNode,
            graphNode,
          ) as RdfJs.Quad,
        );
      });
    });

    const locales = Object.keys(langStrings);
    locales.forEach((locale) => {
      const localeValues = langStrings[locale];
      localeValues.forEach((value) => {
        const langStringNode = dataFactory.literal(value, locale);
        quads.push(
          dataFactory.quad(
            subjectNode,
            predicateNode,
            langStringNode,
            graphNode,
          ) as RdfJs.Quad,
        );
      });
    });

    namedNodes.forEach((namedNodeIri) => {
      const node = dataFactory.namedNode(namedNodeIri);
      quads.push(
        dataFactory.quad(
          subjectNode,
          predicateNode,
          node,
          graphNode,
        ) as RdfJs.Quad,
      );
    });

    blankNodes.forEach((blankNodeIdOrPredicates) => {
      if (isBlankNodeId(blankNodeIdOrPredicates)) {
        const blankNode = dataFactory.blankNode(
          getBlankNodeValue(blankNodeIdOrPredicates),
        );
        quads.push(
          dataFactory.quad(
            subjectNode,
            predicateNode,
            blankNode,
            graphNode,
          ) as RdfJs.Quad,
        );
      } else {
        const node = dataFactory.blankNode();
        const blankNodeObjectQuad = dataFactory.quad(
          subjectNode,
          predicateNode,
          node,
          graphNode,
        ) as RdfJs.Quad;
        const blankNodeSubjectQuads = subjectToRdfJsQuads(
          blankNodeIdOrPredicates,
          node,
          graphNode,
        );
        quads.push(blankNodeObjectQuad);
        quads.push(...blankNodeSubjectQuads);
      }
    });
  });

  return quads;
}
