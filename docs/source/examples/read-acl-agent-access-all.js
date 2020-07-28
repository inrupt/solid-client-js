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

// BEGIN-EXAMPLE-READ-ACL-AGENT-ACCESS-ALL

import {
  unstable_fetchLitDatasetWithAcl,
  unstable_getAgentAccessAll,
} from "@inrupt/solid-client";

const litDatasetWithAcl = await unstable_fetchLitDatasetWithAcl(
  "https://example.com"
);
const accessByAgent = unstable_getAgentAccessAll(litDatasetWithAcl);

// => an object like
//    {
//      "https://example.com/profile#webid":
//        { read: true, append: false, write: false, control: true },
//      "https://example.com/other-profile#webid":
//        { read: true, append: false, write: false, control: false },
//    }

// END-EXAMPLE-READ-ACL-AGENT-ACCESS-ALL
