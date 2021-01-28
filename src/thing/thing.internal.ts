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

import { NamedNode, Quad, Quad_Object } from "rdf-js";
import { filter, clone } from "../rdfjs";
import {
  isLocalNode,
  isNamedNode,
  asNamedNode,
  isLiteral,
  xmlSchemaTypes,
  deserializeBoolean,
  deserializeDatetime,
  deserializeDecimal,
  deserializeInteger,
} from "../datatypes";
import {
  UrlString,
  Thing,
  Url,
  ThingLocal,
  LocalNode,
  ThingPersisted,
  SolidDataset,
  WithChangeLog,
  hasChangelog,
} from "../interfaces";
import { isThingLocal, asUrl, isThing, ThingExpectedError } from "./thing";
import { internal_cloneResource } from "../resource/resource.internal";

/** @hidden For internal use only. */
export function internal_getReadableValue(value: Quad_Object): string {
  if (isNamedNode(value)) {
    return `<${value.value}> (URL)`;
  }
  if (isLiteral(value)) {
    if (!isNamedNode(value.datatype)) {
      return `[${value.value}] (RDF/JS Literal of unknown type)`;
    }
    let val;
    switch (value.datatype.value) {
      case xmlSchemaTypes.boolean:
        val =
          deserializeBoolean(value.value)?.valueOf() ??
          `Invalid data: \`${value.value}\``;
        return val + " (boolean)";
      case xmlSchemaTypes.dateTime:
        val =
          deserializeDatetime(value.value)?.toUTCString() ??
          `Invalid data: \`${value.value}\``;
        return val + " (datetime)";
      case xmlSchemaTypes.decimal:
        val =
          deserializeDecimal(value.value)?.toString() ??
          `Invalid data: \`${value.value}\``;
        return val + " (decimal)";
      case xmlSchemaTypes.integer:
        val =
          deserializeInteger(value.value)?.toString() ??
          `Invalid data: \`${value.value}\``;
        return val + " (integer)";
      case xmlSchemaTypes.langString:
        return `"${value.value}" (${value.language} string)`;
      case xmlSchemaTypes.string:
        return `"${value.value}" (string)`;
      default:
        return `[${value.value}] (RDF/JS Literal of type: \`${value.datatype.value}\`)`;
    }
  }
  if (isLocalNode(value)) {
    return `<#${value.internal_name}> (URL)`;
  }
  if (value.termType === "BlankNode") {
    return `[${value.value}] (RDF/JS BlankNode)`;
  }
  if (value.termType === "Quad") {
    return `??? (nested RDF* Quad)`;
  }
  /* istanbul ignore else: The if statements are exhaustive; if not, TypeScript will complain. */
  if (value.termType === "Variable") {
    return `?${value.value} (RDF/JS Variable)`;
  }
  /* istanbul ignore next: The if statements are exhaustive; if not, TypeScript will complain. */
  return value;
}

/**
 * @hidden
 * @param thing The Thing whose Subject Node you're interested in.
 * @returns A Node that can be used as the Subject for this Thing's Quads.
 */
export function internal_toNode(
  thing: UrlString | Url | ThingPersisted
): NamedNode;
/** @hidden */
export function internal_toNode(thing: LocalNode | ThingLocal): LocalNode;
/** @hidden */
export function internal_toNode(
  thing: UrlString | Url | LocalNode | Thing
): NamedNode | LocalNode;
/** @hidden */
export function internal_toNode(
  thing: UrlString | Url | LocalNode | Thing
): NamedNode | LocalNode {
  if (isNamedNode(thing) || isLocalNode(thing)) {
    return thing;
  }
  if (typeof thing === "string") {
    return asNamedNode(thing);
  }
  if (isThingLocal(thing)) {
    return thing.internal_localSubject;
  }
  return asNamedNode(asUrl(thing));
}

/**
 * @internal
 * @param thing Thing to clone.
 * @returns A new Thing with the same Quads as `input`.
 */
export function internal_cloneThing<T extends Thing>(thing: T): T {
  const cloned = clone(thing);
  if (isThingLocal(thing)) {
    (cloned as ThingLocal).internal_localSubject = thing.internal_localSubject;
    return cloned as T;
  }
  (cloned as ThingPersisted).internal_url = (thing as ThingPersisted).internal_url;
  return cloned as T;
}

/**
 * @internal
 * @param thing Thing to clone.
 * @param callback Function that takes a Quad, and returns a boolean indicating whether that Quad should be included in the cloned Dataset.
 * @returns A new Thing with the same Quads as `input`, excluding the ones for which `callback` returned `false`.
 */
export function internal_filterThing<T extends Thing>(
  thing: T,
  callback: (quad: Quad) => boolean
): T {
  const filtered = filter(thing, callback);
  if (isThingLocal(thing)) {
    (filtered as ThingLocal).internal_localSubject =
      thing.internal_localSubject;
    return filtered as T;
  }
  (filtered as ThingPersisted).internal_url = (thing as ThingPersisted).internal_url;
  return filtered as T;
}

/**
 * @hidden
 */
export function internal_throwIfNotThing(thing: Thing): void {
  if (!isThing(thing)) {
    throw new ThingExpectedError(thing);
  }
}

/**
 * Enforces the presence of a Changelog for a given dataset. If a changelog is
 * already present, it is unchanged. Otherwise, an empty changelog is created.
 * @hidden
 * @param solidDataset
 */
export function internal_withChangeLog<Dataset extends SolidDataset>(
  solidDataset: Dataset
): Dataset & WithChangeLog {
  const newSolidDataset: Dataset & WithChangeLog = hasChangelog(solidDataset)
    ? solidDataset
    : Object.assign(internal_cloneResource(solidDataset), {
        internal_changeLog: { additions: [], deletions: [] },
      });
  return newSolidDataset;
}
