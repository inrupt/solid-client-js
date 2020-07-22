import {
  getSolidDatasetWithAcl,
  getPublicAccess,
} from "@inrupt/solid-client";

const webId = "https://example.com/profile#webid";
const myDatasetWithAcl = await getSolidDatasetWithAcl("https://example.com");
const publicAccess = getPublicAccess(myDatasetWithAcl);

// => an object like
//    { read: true, append: false, write: false, control: true }
//    or null if the ACL is not accessible to the current user.
