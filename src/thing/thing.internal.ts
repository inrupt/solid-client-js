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

import type { Quad, Quad_Object } from "@rdfjs/types";
import {
  isNamedNode,
  isLiteral,
  xmlSchemaTypes,
  deserializeBoolean,
  deserializeDatetime,
  deserializeDecimal,
  deserializeInteger,
} from "../datatypes";
import {
  Thing,
  SolidDataset,
  hasChangelog,
  WithChangeLog,
} from "../interfaces";
import { ThingExpectedError, isThing } from "./thing";
import { freeze } from "../rdf.internal";

/** @hidden For internal use only. */
export function internal_getReadableValue(value: Quad_Object): string {
  if (isNamedNode(value)) {
    return `<${value.value}> (URL)`;
  }
  if (isLiteral(value)) {
    /* istanbul ignore if: thingAsMarkdown always instantiates a NamedNode, so we can't hit this code path in tests. */
    if (!isNamedNode(value.datatype)) {
      return `[${value.value}] (RDF/JS Literal of unknown type)`;
    }
    let val;
    switch (value.datatype.value) {
      case xmlSchemaTypes.boolean:
        val =
          deserializeBoolean(value.value)?.valueOf() ??
          `Invalid data: \`${value.value}\``;
        return `${val} (boolean)`;
      case xmlSchemaTypes.dateTime:
        val =
          deserializeDatetime(value.value)?.toUTCString() ??
          `Invalid data: \`${value.value}\``;
        return `${val} (datetime)`;
      case xmlSchemaTypes.decimal:
        val =
          deserializeDecimal(value.value)?.toString() ??
          `Invalid data: \`${value.value}\``;
        return `${val} (decimal)`;
      case xmlSchemaTypes.integer:
        val =
          deserializeInteger(value.value)?.toString() ??
          `Invalid data: \`${value.value}\``;
        return `${val} (integer)`;
      case xmlSchemaTypes.langString:
        return `"${value.value}" (${value.language} string)`;
      case xmlSchemaTypes.string:
        return `"${value.value}" (string)`;
      default:
        return `[${value.value}] (RDF/JS Literal of type: \`${value.datatype.value}\`)`;
    }
  }
  /* istanbul ignore else: thingAsMarkdown doesn't generate other Nodes, so we can't hit this path in tests. */
  if (value.termType === "BlankNode") {
    return `[${value.value}] (RDF/JS BlankNode)`;
  }
  /* istanbul ignore next: thingAsMarkdown doesn't generate Quad Nodes, so we can't hit this path in tests. */
  if (value.termType === "Quad") {
    return `??? (nested RDF* Quad)`;
  }
  /* istanbul ignore else: The if statements are exhaustive; if not, TypeScript will complain. */
  /* istanbul ignore next: thingAsMarkdown doesn't generate Variable Nodes, so we can't hit this path in tests. */
  if (value.termType === "Variable") {
    return `?${value.value} (RDF/JS Variable)`;
  }
  /* istanbul ignore next: The if statements are exhaustive; if not, TypeScript will complain. */
  return value;
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
 * @hidden
 * @param solidDataset
 */
export function internal_addAdditionsToChangeLog<Dataset extends SolidDataset>(
  solidDataset: Dataset,
  additions: Quad[]
): Dataset & WithChangeLog {
  const changeLog = hasChangelog(solidDataset)
    ? solidDataset.internal_changeLog
    : /* istanbul ignore next: This function always gets called after addDeletionsToChangeLog, so the ChangeLog always already exists in tests: */
      { additions: [], deletions: [] };

  const [newAdditions, newDeletions] = additions
    .filter((addition) => !containsBlankNode(addition))
    .reduce(
      ([additionsAcc, deletionsAcc], addition) => {
        const existingDeletion = deletionsAcc.find((deletion) =>
          deletion.equals(addition)
        );
        if (typeof existingDeletion !== "undefined") {
          return [
            additionsAcc,
            deletionsAcc.filter((deletion) => !deletion.equals(addition)),
          ];
        }
        return [additionsAcc.concat(addition), deletionsAcc];
      },
      [changeLog.additions, changeLog.deletions]
    );

  return freeze({
    ...solidDataset,
    internal_changeLog: {
      additions: newAdditions,
      deletions: newDeletions,
    },
  });
}

/**
 * @hidden
 * @param solidDataset
 */
export function internal_addDeletionsToChangeLog<Dataset extends SolidDataset>(
  solidDataset: Dataset,
  deletions: Quad[]
): Dataset & WithChangeLog {
  const changeLog = hasChangelog(solidDataset)
    ? solidDataset.internal_changeLog
    : { additions: [], deletions: [] };

  const [newAdditions, newDeletions] = deletions
    .filter((deletion) => !containsBlankNode(deletion))
    .reduce(
      ([additionsAcc, deletionsAcc], deletion) => {
        const existingAddition = additionsAcc.find((addition) =>
          addition.equals(deletion)
        );
        if (typeof existingAddition !== "undefined") {
          return [
            additionsAcc.filter((addition) => !addition.equals(deletion)),
            deletionsAcc,
          ];
        }
        return [additionsAcc, deletionsAcc.concat(deletion)];
      },
      [changeLog.additions, changeLog.deletions]
    );

  return freeze({
    ...solidDataset,
    internal_changeLog: {
      additions: newAdditions,
      deletions: newDeletions,
    },
  });
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
    : freeze({
        ...solidDataset,
        internal_changeLog: { additions: [], deletions: [] },
      });
  return newSolidDataset;
}

/**
 * We don't currently support reading and writing Blank Nodes, so this function can be used to skip those Quads.
 *
 * This is needed because we cannot reconcile Blank Nodes in additions and
 * deletions. Down the road, we should do a diff before saving a SolidDataset
 * against a saved copy of the originally-fetched one, based on our own data
 * structures, which should make it easier to reconcile.
 */
function containsBlankNode(quad: Quad): boolean {
  return (
    quad.subject.termType === "BlankNode" ||
    quad.object.termType === "BlankNode"
  );
}
