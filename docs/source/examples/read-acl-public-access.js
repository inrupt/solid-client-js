import {
  unstable_fetchSolidDatasetWithAcl,
  unstable_getPublicAccess,
} from "@inrupt/solid-client";

const webId = "https://example.com/profile#webid";
const myDatasetWithAcl = await unstable_fetchSolidDatasetWithAcl(
  "https://example.com"
);
const publicAccess = unstable_getPublicAccess(myDatasetWithAcl);

// => an object like
//    { read: true, append: false, write: false, control: true }
//    or null if the ACL is not accessible to the current user.
