import {
  getSolidDatasetWithAcl,
  getPublicAccess,
} from "@inrupt/solid-client";

const myDatasetWithAcl = await getSolidDatasetWithAcl("https://example.com");
const publicAccess = getPublicAccess(myDatasetWithAcl);

// => an object like
//    { read: true, append: false, write: false, control: true }
//    or null if the ACL is not accessible to the current user.
