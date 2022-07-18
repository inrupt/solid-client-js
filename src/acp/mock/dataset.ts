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

import type { SolidDataset, ThingPersisted } from "../../interfaces";
import {
  buildThing,
  createSolidDataset,
  createThing,
  getThing,
  setThing,
} from "../..";

/** @hidden */
export type SubjectPredicateObjectTuple = [string, [string, string[]][]];

/** @hidden */
export function addSubject(
  dataset: SolidDataset,
  subject: SubjectPredicateObjectTuple
): SolidDataset {
  let thing = getThing(dataset, subject[0]);
  // istanbul ignore next
  if (thing === null || typeof thing === "undefined") {
    thing = createThing({ url: subject[0] });
  }
  for (const predicate of subject[1]) {
    let thingBuilder = buildThing(thing);
    for (const object of predicate[1]) {
      thingBuilder = thingBuilder.addUrl(predicate[0], object);
    }
    thing = thingBuilder.build() as ThingPersisted;
  }
  return setThing(dataset, thing);
}

/** @hidden */
export function addSubjects(
  dataset: SolidDataset,
  subjects: SubjectPredicateObjectTuple[]
): SolidDataset {
  return subjects.reduce(addSubject, dataset);
}

/** @hidden */
export function createDatasetFromSubjects(
  data: SubjectPredicateObjectTuple[]
): SolidDataset {
  return addSubjects(createSolidDataset(), data);
}
