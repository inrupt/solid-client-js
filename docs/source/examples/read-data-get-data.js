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

// BEGIN-EXAMPLE-GET-DATA-FROM-THING

import {
  getStringNoLocaleAll,
  getStringNoLocaleOne,
  getUrlAll,
} from "@inrupt/solid-client";

// Get data from a retrieved Thing.
// - Specifically, get the name (http://xmlns.com/foaf/0.1/name).
// - Name is of type string.
// - Use getStringNoLocaleOne if expecting a single value.
// - Use getStringNoLocaleAll if expecting multiple values.

const names = getStringNoLocaleAll(thing, "http://xmlns.com/foaf/0.1/name");
// => an array of strings representing the `http://xmlns.com/foaf/0.1/name`.

// Get data from a retrieved Thing.
// - Specifically, get the Skype ID (http://xmlns.com/foaf/0.1/skypeId).
// - Skype ID is of type string.
// - Use getStringNoLocaleOne if expecting a single value.
// - Use getStringNoLocaleAll if expecting multiple values.

const skypeId = getStringNoLocaleOne(
  thing,
  "http://xmlns.com/foaf/0.1/skypeId"
);
// => one of the strings representing the `http://xmlns.com/foaf/0.1/skypeId`,
//    or null if there are none.

// Get data from a retrieved Thing.
// - Specifically, get the acquaintances (http://xmlns.com/foaf/0.1/knows).
// - Acquaintances is of type URL.
// - Use getStringNoLocaleOne if expecting a single value.
// - Use getStringNoLocaleAll if expecting multiple values.

const acquaintances = getUrlAll(thing, "http://xmlns.com/foaf/0.1/knows");
// => an array of URLs, presumably pointing to the Things describing acquaintances.

// END-EXAMPLE-GET-DATA-FROM-THING
