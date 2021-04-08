/* eslint-disable license-header/header */
/**
 * This is just a strawman proposal;
 * the actual new interfaces will not be implemented through this file.
 *
 * They're also not set in stone. Actual implementation experience might result in further tweaks.
 * Names can still be changed if we propose it as an actual specification, of course.
 *
 * The design goals of these interfaces are:
 * - JSON.parse(JSON.stringify(data)) is lossless
 * - Optimised for reading and copying in an expected shape in stateful (Solid) applications
 * - fromRdfJsDataset(toRdfJsDataset(data)) is lossless
 *
 * Non-goals:
 * - Optimising for streaming data
 * - Optimising for unknown use cases
 * - Be perfect from the get-go
 * - Be immediately useful outside of solid-client
 * @module
 */

import { dataset as rdfJsDataset } from "@rdfjs/dataset";
import RdfJsDataFactory from "@rdfjs/data-model";
import * as RdfJs from "rdf-js";
import { IriString } from "./interfaces";
import { XmlSchemaTypeIri, xmlSchemaTypes } from "./datatypes";

const localNodeSkolemPrefix = "https://inrupt.com/.well-known/sdk-local-node/" as const;
type LocalNodeIri = `${typeof localNodeSkolemPrefix}${string}`;
export type LocalNodeName = string;
type DataTypeIriString = XmlSchemaTypeIri | IriString;
type LocaleString = string;
type DanglingBlankNode = `_:${string}`;
export type Objects = Readonly<
  Partial<{
    literals: Readonly<Record<DataTypeIriString, readonly string[]>>;
    langStrings: Readonly<Record<LocaleString, readonly string[]>>;
    namedNodes: ReadonlyArray<LocalNodeIri | IriString>;
    // By abstracting over the specific blank nodes, we can neatly skip over the
    // issue of fetching the same data twice and then not being able to reconcile
    // different instances of the same blank nodes.
    blankNodes: readonly Predicates[];
    // TODO: Do we need RDF/JS Variables as well, or are they just for SPARQL?
  }>
>;

export type Predicates = Readonly<Record<IriString, Objects>>;

export type Subject = Readonly<{
  type: "Subject";
  url: DanglingBlankNode | LocalNodeIri | IriString;
  predicates: Predicates;
}>;

export type Graph = Readonly<
  Record<DanglingBlankNode | LocalNodeIri | IriString, Subject>
>;

export type ImmutableDataset = Readonly<{
  type: "Dataset";
  graphs: Readonly<Record<"default" | IriString, Graph>>;
}>;

/**
 * Runtime freezing might be too much overhead;
 * if so, this function allows us to replace it by a function
 * that merely marks its input as Readonly<> for static analysis.
 */
const freeze: typeof Object.freeze = Object.freeze;

export function fromRdfJsDataset(
  rdfJsDataset: RdfJs.DatasetCore
): ImmutableDataset {
  const dataset: ImmutableDataset = {
    graphs: {},
    type: "Dataset",
  };

  const quads = Array.from(rdfJsDataset);
  // Quads with Blank Nodes as their Subject will be parsed when those Subject
  // are referred to in an Object. See `addRdfJsQuadToObjects`.
  const quadsWithoutBlankNodeSubjects = quads.filter(
    (quad) => !isBlankNode(quad.subject)
  );
  // Get Quads with a Blank Node as the Subject that does not appear as the
  // Object in any other Quads:
  const quadsWithDanglingBlankNodeSubjects = quads.filter(
    (quad) =>
      isBlankNode(quad.subject) &&
      rdfJsDataset.match(null, null, quad.subject, quad.graph).size === 0
  );

  return quadsWithoutBlankNodeSubjects
    .concat(quadsWithDanglingBlankNodeSubjects)
    .reduce(
      (datasetAcc, quad) =>
        addRdfJsQuadToDataset(datasetAcc, quad, { otherQuads: quads }),
      dataset
    );
}

type QuadParseOptions = Partial<{
  otherQuads: RdfJs.Quad[];
}>;

function addRdfJsQuadToDataset(
  dataset: ImmutableDataset,
  quad: RdfJs.Quad,
  quadParseOptions: QuadParseOptions = {}
): ImmutableDataset {
  const supportedGraphTypes: Array<typeof quad.graph.termType> = [
    "NamedNode",
    "DefaultGraph",
  ];
  if (!supportedGraphTypes.includes(quad.graph.termType)) {
    throw new Error(
      `Cannot parse Quads with nodes of type [${quad.graph.termType}] as their Graph node.`
    );
  }
  const graphId =
    quad.graph.termType === "DefaultGraph" ? "default" : quad.graph.value;

  const graph: Graph = dataset.graphs[graphId] ?? {};
  return freeze({
    ...dataset,
    graphs: freeze({
      ...dataset.graphs,
      [graphId]: addRdfJsQuadToGraph(graph, quad, quadParseOptions),
    }),
  });
}

function addRdfJsQuadToGraph(
  graph: Graph,
  quad: RdfJs.Quad,
  quadParseOptions: QuadParseOptions = {}
): Graph {
  const supportedSubjectTypes: Array<typeof quad.subject.termType> = [
    "NamedNode",
    "BlankNode",
  ];
  if (!supportedSubjectTypes.includes(quad.subject.termType)) {
    throw new Error(
      `Cannot parse Quads with nodes of type [${quad.subject.termType}] as their Subject node.`
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
    [subjectIri]: addRdfJsQuadToSubject(subject, quad, quadParseOptions),
  });
}

function addRdfJsQuadToSubject(
  subject: Subject,
  quad: RdfJs.Quad,
  quadParseOptions: QuadParseOptions = {}
): Subject {
  return freeze({
    ...subject,
    predicates: addRdfJsQuadToPredicates(
      subject.predicates,
      quad,
      quadParseOptions
    ),
  });
}

function addRdfJsQuadToPredicates(
  predicates: Predicates,
  quad: RdfJs.Quad,
  quadParseOptions: QuadParseOptions = {}
): Predicates {
  const supportedPredicateTypes: Array<typeof quad.predicate.termType> = [
    "NamedNode",
  ];
  if (!supportedPredicateTypes.includes(quad.predicate.termType)) {
    throw new Error(
      `Cannot parse Quads with nodes of type [${quad.predicate.termType}] as their Predicate node.`
    );
  }
  const predicateIri = quad.predicate.value;
  const objects = predicates[predicateIri] ?? {};
  return freeze({
    ...predicates,
    [predicateIri]: addRdfJsQuadToObjects(objects, quad, quadParseOptions),
  });
}

function addRdfJsQuadToObjects(
  objects: Objects,
  quad: RdfJs.Quad,
  quadParseOptions: QuadParseOptions = {}
): Objects {
  if (quad.object.termType === "NamedNode") {
    const namedNodes = freeze([
      ...(objects.namedNodes ?? []),
      quad.object.value,
    ]);
    return freeze({
      ...objects,
      namedNodes: namedNodes,
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
        langStrings: langStrings,
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
      literals: literals,
    });
  }

  if (quad.object.termType === "BlankNode") {
    const blankNodePredicates = getPredicatesForBlankNode(
      quadParseOptions.otherQuads ?? [],
      quad.object
    );
    const blankNodes = freeze([
      ...(objects.blankNodes ?? []),
      blankNodePredicates,
    ]);
    return freeze({
      ...objects,
      blankNodes: blankNodes,
    });
  }

  throw new Error(
    `Objects of type [${quad.object.termType}] are not supported.`
  );
}

function addRdfJsBlankNodeObjectsToPredicates(
  objects: Objects,
  subject: RdfJs.Quad_Subject,
  quads: RdfJs.Quad[]
): Objects {
  const quadsWithBlankNodeObjects = quads.filter((quad) => {
    // Quads with a Blank Node as their Subject will be parsed
    // when that Blank Node is encountered in the Object position.
    return quad.subject.equals(subject) && isBlankNode(quad.object);
  });

  const blankNodePredicates: readonly Predicates[] = quadsWithBlankNodeObjects.map(
    (quad) => {
      // The assertion is valid because we filtered on Blank Nodes above:
      return getPredicatesForBlankNode(quads, quad.object as RdfJs.BlankNode);
    }
  );

  return freeze({
    ...objects,
    blankNodes: blankNodePredicates,
  });
}

function getPredicatesForBlankNode(
  quads: RdfJs.Quad[],
  node: RdfJs.BlankNode
): Predicates {
  const quadsWithNodeAsSubject = quads.filter((quad) =>
    quad.subject.equals(node)
  );

  // First add the Quads with regular Objects
  const predicates = quadsWithNodeAsSubject.reduce((predicatesAcc, quad) => {
    const supportedPredicateTypes: Array<typeof quad.graph.termType> = [
      "NamedNode",
    ];
    if (!supportedPredicateTypes.includes(quad.graph.termType)) {
      throw new Error(
        `Cannot parse Quads with nodes of type [${quad.graph.termType}] as their Predicate node.`
      );
    }
    const objects: Objects = predicatesAcc[quad.predicate.value] ?? {};
    return freeze({
      ...predicatesAcc,
      [quad.predicate.value]: addRdfJsQuadToObjects(objects, quad),
    });
  }, {} as Predicates);

  // And then also add the Quads that have another Blank Node as the Object
  // in addition to the Blank Node `node` as the Subject:
  const blankNodeObjectQuads = quadsWithNodeAsSubject.filter((quad) =>
    isBlankNode(quad.object)
  );
  return blankNodeObjectQuads.reduce((predicatesAcc, quad) => {
    const supportedPredicateTypes: Array<typeof quad.predicate.termType> = [
      "NamedNode",
    ];
    if (!supportedPredicateTypes.includes(quad.predicate.termType)) {
      throw new Error(
        `Cannot parse Quads with nodes of type [${quad.predicate.termType}] as their Predicate node.`
      );
    }
    const objects: Objects = predicatesAcc[quad.predicate.value] ?? {};
    return freeze({
      ...predicatesAcc,
      // The cast to a BlankNode is valid because we filtered on BlankNodes above:
      [quad.predicate.value]: addRdfJsBlankNodeObjectsToPredicates(
        objects,
        quad.object as RdfJs.BlankNode,
        quads
      ),
    });
  }, predicates);
}

function isBlankNode(term: RdfJs.Term): term is RdfJs.BlankNode {
  return term.termType === "BlankNode";
}

export function toRdfJsDataset(set: ImmutableDataset): RdfJs.DatasetCore {
  return rdfJsDataset(toRdfJsQuads(set));
}

type ToRdfJsOptions = Partial<{
  dataFactory: RdfJs.DataFactory;
}>;
export function toRdfJsQuads(
  dataset: ImmutableDataset,
  options: ToRdfJsOptions = {}
): RdfJs.Quad[] {
  const quads: RdfJs.Quad[] = [];
  const dataFactory = options.dataFactory ?? RdfJsDataFactory;

  Object.keys(dataset.graphs).forEach((graphIri: IriString) => {
    const graph = dataset.graphs[graphIri];
    const graphNode =
      graphIri === "default"
        ? dataFactory.defaultGraph()
        : dataFactory.namedNode(graphIri);

    Object.keys(graph).forEach((subjectIri) => {
      const predicates = graph[subjectIri].predicates;
      const subjectNode = isDanglingBlankNode(subjectIri)
        ? dataFactory.blankNode(getBlankNodeValue(subjectIri))
        : dataFactory.namedNode(subjectIri);
      quads.push(...subjectToRdfJsQuads(predicates, subjectNode, graphNode));
    });
  });

  return quads;
}

function subjectToRdfJsQuads(
  predicates: Predicates,
  subjectNode: RdfJs.NamedNode | RdfJs.BlankNode,
  graphNode: RdfJs.NamedNode | RdfJs.DefaultGraph,
  options: ToRdfJsOptions = {}
): RdfJs.Quad[] {
  const quads: RdfJs.Quad[] = [];
  const dataFactory = options.dataFactory ?? RdfJsDataFactory;

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
            graphNode
          ) as RdfJs.Quad
        );
      });
    });

    const locales = Object.keys(langStrings);
    locales.forEach((locale) => {
      const localeValues = langStrings[locale];
      localeValues.forEach((value) => {
        // TODO: Make sure `locale` doesn't get interpreted as a URL
        //       (probably by using a different implementation of .literal?)
        const langStringNode = dataFactory.literal(value, locale);
        quads.push(
          dataFactory.quad(
            subjectNode,
            predicateNode,
            langStringNode,
            graphNode
          ) as RdfJs.Quad
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
          graphNode
        ) as RdfJs.Quad
      );
    });

    blankNodes.forEach((blankNodePredicates) => {
      const node = dataFactory.blankNode();
      const blankNodeObjectQuad = dataFactory.quad(
        subjectNode,
        predicateNode,
        node,
        graphNode
      ) as RdfJs.Quad;
      const blankNodeSubjectQuads = subjectToRdfJsQuads(
        blankNodePredicates,
        node,
        graphNode
      );
      quads.push(blankNodeObjectQuad);
      quads.push(...blankNodeSubjectQuads);
    });
  });

  return quads;
}

function isDanglingBlankNode(
  value: IriString | DanglingBlankNode
): value is DanglingBlankNode {
  return value.substring(0, 2) === "_:";
}

function getBlankNodeValue(danglingBlankNode: DanglingBlankNode): string {
  return danglingBlankNode.substring(2);
}
