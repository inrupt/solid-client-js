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

// BEGIN-EXAMPLE-WRITE-ACL-RESOURCE

import {
  unstable_fetchLitDatasetWithAcl,
  unstable_hasResourceAcl,
  unstable_hasFallbackAcl,
  unstable_hasAccessibleAcl,
  unstable_createAcl,
  unstable_createAclFromFallbackAcl,
  unstable_getResourceAcl,
  unstable_setAgentResourceAccess,
  unstable_saveAclFor,
} from "@inrupt/solid-client";

// Fetch the LitDataset and its associated ACLs, if available:
const litDatasetWithAcl = await unstable_fetchLitDatasetWithAcl(
  "https://example.com"
);

// Obtain the LitDataset's own ACL, if available,
// or initialise a new one, if possible:
let resourceAcl;
if (!unstable_hasResourceAcl(litDatasetWithAcl)) {
  if (!unstable_hasAccessibleAcl(litDatasetWithAcl)) {
    throw new Error(
      "The current user does not have permission to change access rights to this Resource."
    );
  }
  if (!unstable_hasFallbackAcl(litDatasetWithAcl)) {
    throw new Error(
      "The current user does not have permission to see who currently has access to this Resource."
    );
    // Alternatively, initialise a new empty ACL as follows,
    // but be aware that if you do not give someone Control access,
    // **nobody will ever be able to change Access permissions in the future**:
    // resourceAcl = unstable_createAcl(litDatasetWithAcl);
  }
  resourceAcl = unstable_createAclFromFallbackAcl(litDatasetWithAcl);
} else {
  resourceAcl = unstable_getResourceAcl(litDatasetWithAcl);
}

// Give someone Control access to the given Resource:
const updatedAcl = unstable_setAgentResourceAccess(
  resourceAcl,
  "https://some.pod/profile#webId",
  { read: false, append: false, write: false, control: true }
);

// Now save the ACL:
await unstable_saveAclFor(litDatasetWithAcl, updatedAcl);

// END-EXAMPLE-WRITE-ACL-RESOURCE
