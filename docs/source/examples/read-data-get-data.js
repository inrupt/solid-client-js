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
  getStringNoLocale,
  getUrlAll,
} from "@inrupt/solid-client";

import { FOAF } from "@inrupt/vocab-common-rdf";

// Get data from a retrieved Thing.
// - Specifically, get the name (FOAF.name).
// - Name is of type string.
// - Use getStringNoLocale if expecting a single value.
// - Use getStringNoLocaleAll if expecting multiple values.

const names = getStringNoLocaleAll(thing, FOAF.name);
// => an array of strings representing FOAF.name ("http://xmlns.com/foaf/0.1/name").

// Get data from a retrieved Thing.
// - Specifically, get the Skype ID (FOAF.skypeId).
// - Skype ID is of type string.
// - Use getStringNoLocale if expecting a single value.
// - Use getStringNoLocaleAll if expecting multiple values.

const skypeId = getStringNoLocale(thing, FOAF.skypeId);
// => one of the strings representing the FOAF.skypeId ("http://xmlns.com/foaf/0.1/skypeId"),
//    or null if there are none.

// Get data from a retrieved Thing.
// - Specifically, get the acquaintances (FOAF.knows).
// - Acquaintances is of type URL.
// - Use getStringNoLocale expecting a single value.
// - Use getStringNoLocaleAll if expecting multiple values.

const acquaintances = getUrlAll(thing, FOAF.knows);
// => an array of URLs, pointing to the Things representing FOAF.knows ("http://xmlns.com/foaf/0.1/knows")

// END-EXAMPLE-GET-DATA-FROM-THING
