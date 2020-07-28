import {
  unstable_fetchLitDatasetWithAcl,
  unstable_getPublicAccess,
} from "@inrupt/solid-client";

const webId = "https://example.com/profile#webid";
const litDatasetWithAcl = await unstable_fetchLitDatasetWithAcl(
  "https://example.com"
);
const publicAccess = unstable_getPublicAccess(litDatasetWithAcl);

// => an object like
//    { read: true, append: false, write: false, control: true }
//    or null if the ACL is not accessible to the current user.
