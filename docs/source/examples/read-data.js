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

// BEGIN-EXAMPLE-READ-DATA

import {
  fetchLitDataset,
  getThingOne,
  getStringNoLocaleOne,
} from "@inrupt/solid-client";
import { foaf } from "rdf-namespaces";

/* 
   1. Fetch the Dataset located at the specified URL. 
*/

const profileResource = await fetchLitDataset(
  "https://docs-example.inrupt.net/profile/card"
);

/*
   2. Get the data entity, specified by the URL, from the Dataset.
*/

const profile = getThingOne(
  profileResource,
  "https://docs-example.inrupt.net/profile/card#me"
);

// 3. Retrieve the specific data item (e.g., name) from the entity.

const name = getStringNoLocaleOne(profileResource, foaf.name);

// END-EXAMPLE-READ-DATA
