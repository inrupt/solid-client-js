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

// @rdfjs/dataset is a CommonJS module, so named imports break in Node.
// Thus, import the default export, then obtain the `dataset` property from there.
import rdfJsDatasetModule from "@rdfjs/dataset";
import type * as RdfJs from "@rdfjs/types";
import { IriString } from "./interfaces";
import type { XmlSchemaTypeIri } from "./datatypes";

export const rdfJsDataset = rdfJsDatasetModule.dataset;

export const localNodeSkolemPrefix =
  "https://inrupt.com/.well-known/sdk-local-node/" as const;
export type LocalNodeIri = `${typeof localNodeSkolemPrefix}${string}`;
export type LocalNodeName = string;
type DataTypeIriString = XmlSchemaTypeIri | IriString;
type LocaleString = string;
export type BlankNodeId = `_:${string}`;

export type Objects = Readonly<
  Partial<{
    literals: Readonly<Record<DataTypeIriString, readonly string[]>>;
    langStrings: Readonly<Record<LocaleString, readonly string[]>>;
    namedNodes: ReadonlyArray<LocalNodeIri | IriString>;
    blankNodes: ReadonlyArray<Predicates | BlankNodeId>;
  }>
>;

export type Predicates = Readonly<Record<IriString, Objects>>;

export type Subject = Readonly<{
  type: "Subject";
  url: BlankNodeId | LocalNodeIri | IriString;
  predicates: Predicates;
}>;

export type Graph = Readonly<
  Record<BlankNodeId | LocalNodeIri | IriString, Subject>
>;

export type ImmutableDataset = Readonly<{
  type: "Dataset";
  graphs: Readonly<Record<IriString, Graph> & { default: Graph }>;
}>;

/**
 * Runtime freezing might be too much overhead;
 * if so, this function allows us to replace it by a function
 * that merely marks its input as Readonly<> for static analysis.
 */
export const { freeze } = Object;

export function isLocalNodeIri(
  iri: LocalNodeIri | IriString
): iri is LocalNodeIri {
  return (
    iri.substring(0, localNodeSkolemPrefix.length) === localNodeSkolemPrefix
  );
}
export function getLocalNodeName(localNodeIri: LocalNodeIri): string {
  return localNodeIri.substring(localNodeSkolemPrefix.length);
}
export function getLocalNodeIri(localNodeName: string): LocalNodeIri {
  return `${localNodeSkolemPrefix}${localNodeName}` as LocalNodeIri;
}

export function isBlankNodeId<T>(value: T | BlankNodeId): value is BlankNodeId {
  return typeof value === "string" && value.substring(0, 2) === "_:";
}

export function getBlankNodeValue(blankNodeId: BlankNodeId): string {
  return blankNodeId.substring(2);
}

export function getBlankNodeId(blankNode: RdfJs.BlankNode): BlankNodeId {
  return `_:${blankNode.value}` as const;
}
