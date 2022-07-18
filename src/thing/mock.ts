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

import { Url, UrlString, ThingPersisted } from "../interfaces";
import { internal_toIriString } from "../interfaces.internal";

/**
 * Function for use in unit tests to mock a [[Thing]] with a given URL.
 *
 * Warning: do not use this function in actual production code.
 * This function initialises a new empty Thing and sets its URL to a given URL.
 * This is useful to mock a Thing in tests of code that call e.g.
 * [[asUrl]].
 *
 * @param url The URL that the mocked Thing pretends identifies it.
 * @returns A new Thing, pretending to be identified by the given URL.
 * @since 0.2.0
 */
export function mockThingFrom(url: Url | UrlString): ThingPersisted {
  const iri = internal_toIriString(url);
  const thing: ThingPersisted = {
    type: "Subject",
    predicates: {},
    url: iri,
  };

  return thing;
}
