# Changelog

This project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Deprecation notice]

The following changes are pending, and will be applied on the next major release:

- the parser returned by `getJsonLdParser` will no longer return a promise when
  the `parse` method is called. This function's signature already specifies it
  returns `void`, so no code should rely on a returned value, but we wanted to
  give a heads-up to any developers currently relying on this undocumented behavior
  before making a potentially breaking change.

## [Unreleased]

### [Patch]

The following changes have been implemented but not released yet:

- `getProfileAll` now also follows `rdfs:seeAlso` when discovering extended profiles.

## [1.29.0] - 2023-05-18

### New feature

- Support `File` type from `@types/node` in `overwriteFile` and `saveFileInContainer`.

## [1.28.1] - 2023-05-10

### Bugfixes

- `Buffer` type: As discussed in microsoft/TypeScript#53668 the
  @types/node definition of a buffer is looser than the DOM one (the latter being TS' default), and hence we now
  use that in order to be compatible with web buffer types and node
  buffer types.

## [1.28.0] - 2023-05-09

### New feature

- Node 20 support

## [1.27.1] - 2023-04-17

### Bugfixes

- `universal`: Ignore errors when ACL is not found, so that it can be handled properly for WAC.

## [1.27.0] - 2023-04-14

### Documentation

- Buffer API marked as deprecated.

### New feature

- Node 18 support

## [1.26.0] - 2023-03-24

### New feature

- `saveSolidDatasetAt` has a new `options` field, `prefixes`. It allows a prefix
  map to be passed in to customize the serialization if the target format supports
  it.

### Documentation

- File APIs marked as stable.

### Bugfixes

- Add the response body along the status code and text in the error messages thrown
  on unsuccessful response from the server. The response body may contain additional
  data useful for the user to have in order to fix the issue the server describes.
- Export the `AccessModes` type from the `interfaces` module.

## [1.25.2] - 2023-02-09

- Moved `@types/rdfjs__dataset` back to dependencies from devDependencies to fix
  the issues with TypeScript and related tooling complaining about missing
  types. This is a temporary fix whilst we work on a more long term solution.
  We'd initially only thought this issue affected Typedoc, not all TypeScript
  projects.

## [1.25.1] - 2023-02-01

- Fixed the changelog data structure creation to avoid potential prototype pollution attacks.
- Fixed the generation of unique identifiers to use UUIDs instead of
  `Math.random()`. We're also changing generated ACP IRIs to no longer contain
  identifying information, instead these will just be UUIDs going forwards (some
  identifying information may still remain, as the ACP algorithm uses suffixes
  of existing IRIs when making modifications, we've a ticket to address this in
  the future).

## [1.25.0] - 2023-01-24

### New features

- Set recursive VC access: the `setVcAccess` function (from the `acp/acp` module)
  now has an `options` object, which includes an `inherit` flag. If set to `true`,
  the newly set VC access applies not only to the target resource, but to its
  contained resources too.

## [1.24.1] - 2023-01-23

- Change targeted environment to ES2018
- Dependency updates

## [1.24.0] - 2022-12-20

- Added `getWebIdDataset` method to fetch the WebId Profile document as a
  Solid Dataset. This method is part of the `profile/webid` module.

## [1.23.3] - 2022-08-31

- Export the `WithAcp` and `WithAccessibleAcr` types.

## [1.23.2] - 2022-08-19

### Bugfixes

- Modify the internal `getWellKnownSolid` method used by
  `@inrupt/solid-client-notifications` to always use the provided fetch
  implementation when requesting the solid dataset that is the
  `/.well-known/solid` resource. This fixes a bug where in some environments
  cross-fetch failed to load at this point in the code.

### Other Changes

- Remove workaround for creating containers with POST instead of PUT.
  This was needed for [Node Solid Server (version < 5.3)](https://github.com/solid/node-solid-server/issues/1465)
- Migrate project to our common eslint configuration, this resulted in a fairly
  large amount of code changes, though everything should appear the same to
  consumers.

## [1.23.1] - 2022-06-01

### Bugfixes

- `saveSolidDatasetInContainer` and `createContainerInContainer` adequately take
  into account the Location header to determine the location of newly created
  resources.

### Breaking Changes

- Support for Node.js v12.x has been dropped as that version has reached end-of-life.

## [1.23.0] - 2022-05-18

### Bugfixes

- `getWellKnownSolid` fetches well known solid from the server's root by default.

## [1.22.0] - 2022-04-26

### New features

- `acp_ess_1` & `acp_ess_2` export all low level ACP functions available for
  interacting with Inrupt's ESS ACP implementations.

### Documentation

- Removed `getWellKnownSolid` from public documentation, as this method is too
  unstable for end-users of the SDK to be using right now.

## [1.21.0] - 2022-03-22

### New features

- `getAgentAccessAll` has been added to the new `universal` access module. This
  function provides an overview of access modes granted to all agents.

### Bugfixes

- `getProfileAll` and `getPodUrlAll` no longer make an authenticated request to the
  WebID profile, which should be a public resource in the first place.

## [1.20.2] - 2022-03-18

### Bugfixes

- Export the `Actor` type in the `universal_v1` module.

## [1.20.1] - 2022-03-08

### Bugfixes

- `getPodUrlAll` no longer throws if the WebID only appears as the object in an
  alternative profile (and not as a subject), which is a valid case.

## [1.20.0] - 2022-02-23

### New features

- `getAltProfileUrlAllFrom`: A function available in the `profile/webid` module
  which returns the alternative profiles URLs (if any) from a given WebID profile
  resource.

- `solidDatasetAsTurtle`: A function available in the `formats` module which
  provides turtle serialisation of a solid dataset or part of it.

### Bugfixes

- `getProfileAll` no longer throws if fetching one of the alternative profiles fails.
  Instead, the successfully fetched alternative profiles are returned, and the thrown
  errors are catched. To use in conjunction with `getAltProfileUrlAllFrom` to figure
  out if fetching one or more alternative profiles failed. Note that this also resolves
  this bug in other functions based on this one, such as `getPodUrlAll`.

## [1.19.0] - 2022-02-09

### New features

- `universalAccess`/`universal`: functions available in the `universal` module or
  in the library via importing `universalAccess` work with the latest version of
  the ACP specification and supersede the `access/universal` module.

### Deprecations

- The universal access API group functions `getAccessFor`, `getAccessForAll` and
  `setAccessFor` have been deprecated. In order for it to be a non-breaking change,
  the universal API is now exposed through the `universal` module.

- The low-level ACP API (V4) will no longer support custom Markdown serialization.
  That is, the `acrAsMarkdown`, `matcherAsMarkdown`, `policyAsMarkdown` functions.
  The API is still experimental and settling it takes priority. Helping users in
  understanding the structure of any RDF might be improved through better turtle
  serialisation for example and if we come to natural language, the feature might
  be given more attention as a generic markdown serialisation framework.

# [1.18.0] - 2022-01-13

### New features

- `getPodUrlAll`/`getPodUrlAllFrom`: functions available in the `profile/webid`
  module to discover an agent's Pods based on their profiles.

### Bugfixes

- The ACP v4 low-level API is amended so that new policies use the default access controls.
  Implemented `setResourcePolicy` and removed obsolete `setResourceAcrPolicy`.

# [1.17.0] - 2021-11-29

### New features

- `getVcAccess`/`setVcAccess`: functions available in the `acp/acp` module to get and
  set Access Modes for a resource applicable when an Access Grant for the given resource
  is issued.

# [1.16.1] - 2021-11-20

- The ACP low-level API is amended to align with the latest specification draft.

## [1.16.0] - 2021-11-16

### New features

- `getProfileAll`: function to discover the WebID Profile Document and its associated
  FOAF Profile Document resources from the WebID URI. Note that Profile documents
  may or not be Solid Resources

- Allow `createContainerAt` to take an optional SolidDataset parameter to
  use as the body of the HTTP request to the server. This is really useful
  when we wish to include meta-data for a new container, things like a textual
  label or comment.

## [1.15.0] - 2021-11-02

### New features

- `getLinkedAcrUrl` returns the URL of an Access Control Resource from the
  server-managed metadata associated to a given resource.
- `getJsonLdParser` and `getTurtleParser` are experimental functions to explicitly
  control the RDF serialization of the target of `getSolidDataset`.

### Bugfixes

- In some cases, the ACP functions failed to find the Access Control node within
  an Access Control Resource, leading to policies being unapplied.

## [1.14.0] - 2021-10-15

### Bugfixes

- The discovery of the `.well-known/solid` document now supports Pod servers where
  it is directly available at the domain root, rather than being specific to individual
  Pod roots.

### New feature

- `isAcpControlled` is a function verifying whether a given resource is controlled
  using ACP. This is useful for apps not yet migrated to the universal API.

## [1.13.3] - 2021-10-11

### Bugfixes

- The discovery of the `.well-known/solid` document failed if the Pod server
  returned a Link to the Pod root missing the trailing slash.

## [1.13.2] - 2021-10-07

### Bugfixes

- Getting an authentication failure when looking up metadata necessarily threw an
  error, which prevented some legitimate use cases, e.g. the Pod root discovery from
  a given resource.

## [1.13.1] - 2021-10-04

### Bugfix

- The change on `getThingAll` introduced in 1.13.0 was actually breaking for some
  users, so this makes it opt-in rather than default.

## [1.13.0] - 2021-09-30

### New features

- Added convenience functions 'add/get/set/removeStringEnglish()' and
  'add/get/set/removeStringEnglishAll()'.
  We're still gently expressing the impossible-to-ignore relevance of locales in the underlying RDF
  (and 'cos trying to 'hide' that critical RDF-ness (e.g., via an implicitly-acting function like
  addString()) would lead to all sorts of confusion later (i.e., would it add an English language
  tag, or a NoLocale string literal?)).

### Bugfixes

- `getThingAll` used to only return Things that had an IRI, and to ignore Things
  with a blank node as a subject. This prevents some legitimate use cases, such as
  parsing the `.well-known/solid` document (which only contains one blank node).

## [1.12.0] - 2021-09-08

### New features

- Manage public keys attached to your profile with the functions `addJwkToJwks`,
  `addPublicKeyToProfileJwks`, `getProfileJwksIri` and `setProfileJwks`, from the
  `@inrupt/solid-client/profile/jwks` module.
- Add `getWellKnownSolid`, to return the contents of the `.well-known/solid`
  endpoint for a given resource url.

## [1.11.1] - 2021-09-02

### Bugs fixed

- In some cases, Thing.getDate() would return null while Thing.setDate() had been
  called prior. Thanks to a contribution from @AJamesPhillips, this is now fixed.
- The submodule export for `./access/universal` was broken.

## [1.11.0] - 2021-08-12

### New features

- The builder returned by `buildThing()` is now stateful. This means you can now
  do something like this:

  ```javascript
  const bookmarkBuilder = buildThing()
    .addUrl(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
      "http://www.w3.org/2002/01/bookmark#Bookmark"
    )
    .addUrl("http://www.w3.org/2002/01/bookmark#recalls", form.url);

  if (typeof form.title !== "undefined") {
    // In earlier versions, this would be discarded:
    bookmarkBuilder.addStringNoLocale(
      "http://purl.org/dc/terms/title",
      form.title
    );
  }

  const bookmark = bookmarkBuilder.build();
  ```

## [1.10.1] - 2021-08-03

### Deprecations

- Access Control Policies will no longer support adding a `vcard:Group` to a
  Rule. Therefore, the low-level ACPs APIs as well as the Universal Access APIs
  no longer support defining access for a `vcard:Group`. To define access for
  multiple agents at the same time, use the mechanism-specific APIs.

### Bugs fixed

- In some cases where the Universal Access APIs would previously bail out, they
  can now correctly read and change access (at the cost of potentially making
  more HTTP requests). It will now also work on instances of Inrupt's
  Enterprise Solid Server not located on inrupt.com, and can now also return the
  Pod Owner's access on inrupt.com.
  It will still be unable to report access settings that the current user is not
  allowed to see.

## [1.10.0] - 2021-07-01

### New features

- We now offer support for the `Date` data type and `Time` data type.
  This includes all `set`, `get`, `add` and `remove` methods to modify the Time
  or Date of a Thing.
  `Time` is a custom data type following the format:

```typescript
type Time = {
  hour: number;
  minute: number;
  second: number;
  timezoneHourOffset?: number;
  timezoneMinuteOffset?: number;
};
```

The added methods are: `setDate`, `setTime`, `getDate`, `getDateAll`,
`getTime`, `getTimeAll`, `addDate`, `addTime`, `removeDate`, `removeTime`.

### Bugs fixed

- An update to one of our transitive dependencies (`@rdfjs/data-model`) caused
  the functions to get data from a Thing (`getInteger`, `getUrl`, etc.) to
  break when used in Node.

## [1.9.0] - 2021-06-15

### New features

- To ease interoperability with generic RDF libraries, it is now possibile to
  export SolidDatasets into RDF/JS Datasets using `toRdfJsDataset`, and to
  import existing RDF/JS Dataset for storing on a Solid Pod using
  `fromRdfJsDataset`.
- A new function `buildThing()` makes it easier to set multiple properties on a
  Thing in one go. So instead of:

```javascript
let newThing = createThing();
newThing = addUrl(newThing, rdf.type, schema.Person);
newThing = addStringNoLocale(newThing, schema.givenName, "Vincent");
```

you can now avoid having to repeat `newThing`:

```javascript
const newThing = buildThing()
  .addUrl(rdf.type, schema.Person)
  .addStringNoLocale(schema.givenName, "Vincent")
  .build();
```

### Bugs fixed

- Since version 1.8.0, TypeScript would no longer warn you if you omitted the
  second argument to `asUrl` in cases where it's required, thereby risking
  runtime errors. In most of these cases, TypeScript should now warn you again.

## [1.8.1] - 2021-05-25

### Bugs fixed

- The Universal access API's would sometimes attempt to create Access Policies
  and Rules with invalid URLs, which could be rejected by some Solid servers.

## [1.8.0] - 2021-05-18

### Changed

- `getUrl` now returns local URLs (e.g. #my-thing)
- `getThing` now returns empty Things if they were added, rather than `null`.
- The internal structure of SolidDatasets has been reworked. This shouldn't
  affect you if you relied on just our public API's, but if you were
  manipulating the data directly, you might need to update to use our public
  API's. If something's not covered that you need, please [file an
  issue](https://github.com/inrupt/solid-client-js/issues/new/choose).

### New features

- `getSolidDataset` now returns atomic objects, making it easier to integrate
  with other tools in the JavaScript ecosystem, easier to debug, and easier to
  serialise.

## [1.7.0] - 2021-05-06

### Deprecated

- With Node.js version 10 [reaching end-of-life on
  2021-04-30](https://github.com/nodejs/Release), @inrupt/solid-client no longer
  actively supports it. It will not stop working right away, but it will no
  longer be actively tested and no special effort will be made to keep it from
  breaking.

### New features

- Node.js version 16 is now supported.
- The function `getLinkedResourceUrlAll` that gives you all Resources linked to
  a given Resource, indexed by their relation to the given Resource.
- The function `getEffectiveAccess`, which tells you what access the current
  user has and, if supported by the server, what access unauthenticated users
  have to the given Resource.

### Bugs fixed

- While the API documentation mentioned an `isThingLocal` function, it could not
  actually be imported from `@inrupt/solid-client`.

## [1.6.1] - 2021-04-01

### Bugs fixed

- Saving a dataset to an IRI with a hash fragment (e.g. the WebID) is processed
  as an update, and not anymore as an overwrite.
- An update in one of our dependencies caused writes to a Pod to fail. This
  dependency has now been pinned to an older, working version while we
  investigate further. For more info, see
  https://github.com/inrupt/solid-client-js/issues/957.

## [1.6.0] - 2021-03-22

### New features

- A number of new `acp/*` modules are now available that support working
  directly with Access Control Policies on Pod servers that implement this
  experimental proposal.

## [1.5.0] - 2021-03-08

### New features

- `@inrupt/solid-client/access/universal`: an early preview of a set of APIs to
  manage Access which are agnostic to the Access Control mechanism actually
  implemented (from the user's point of view). Currently, these modules
  support the two known access controls for Solid, i.e. Web Access Control and
  Access Control Policies.

## [1.4.0] - 2021-02-19

### Bugs fixed

- Saving a SolidDataset with a Thing obtained from a different SolidDataset would fail if that Thing
  contained an RDF Blank Node.
- Saving back a SolidDataset you just fetched used to result in a "412: Conflict" error.

### New features

- `setGroupDefaultAccess`: A function to set a Group's access modes for all the child Resources of a Container, in the
  case this Container is controlled using WAC.
- `setGroupResourceAccess`: A function to set a Group's access modes for a given Resource, in the case this Resource is
  controlled using WAC.

## [1.3.0] - 2021-01-07

### New features

- If you know the content type of a file to upload via `overwriteFile` or `saveFileInContainer`,
  you can now manually set it using the `contentType` property in their `options` parameters.
- `getContainedResourceUrlAll`: a function that returns the URLs for each resource contained in
  the given Container.
- FetchError now contains the server response (`error.response`).

### Bugs fixed

- Files sent to a Pod via `overwriteFile` or `saveFileInContainer` without a known content type
  were rejected by Inrupt's Enterprise Solid Server with a 400 Bad Request, as
  the Solid specification says it should do. To avoid this, solid-client now sets the content type
  to `application/octet-stream` by default if no content type is known for the given file.

## [1.2.0] - 2020-12-02

### New features

- It is now possible to import solid-client as an ES module in Node.
- A number of error messages have been improved that should make it easier for you to identify what
  went wrong. If you encounter more unhelpful error messages, please
  [let us know](https://github.com/inrupt/solid-client-js/issues/new?assignees=&labels=bug&template=bug_report.md&title=).

### Bugs fixed

- While the documentation mentioned `hasAcl()`, solid-client did not actually export that function.
- Dates in between the years 0 and 100 AD were not parsed properly.

## [1.1.0] - 2020-11-16

### New features

- When a function that makes an HTTP request, such as `getSolidDataset`, receives an error response
  from the server, the error's status code and status text are now exposed via the `.statusCode`
  and `.statusText` properties, respectively, on the thrown (/returned in the rejected Promise)
  Error object.
- Additionally, to help you mock the above errors in your unit tests, we now export
  `mockFetchError()`. Pass it the URL the fake fetch targeted, and optionally the status code
  that caused the error.

### Bugs fixed

- Our property-based tests discovered a new edge case in which reading a Datetime from the Pod used
  to fail. That edge case is now handled properly.
- Using solid-client with TypeScript would result in the following error:
  `error TS2305: Module '"../constants"' has no exported member 'acp'.` This is now fixed, and we
  are working on preventing such errors in the future.

## [1.0.0] - 2020-11-04

The big v1! There are no major changes in this release, but from now on, when we intend to change
our publicly-documented non-experimental API's, we will bump up the major version to help you plan
the impact of the upgrade.

### Deprecations

- solid-client will no longer attempt to automatically load solid-auth-client, because it comes with
  security risks. It is recommended to use
  [solid-client-authn-browser](https://www.npmjs.com/package/@inrupt/solid-client-authn-browser)
  instead. It will remain possible to pass a `fetch` function generated by solid-auth-client to the
  data fetching functions in solid-client.

## [0.6.4] - 2020-11-03

### Bugs fixed

- The compiled code of solid-client was not sent to the correct location, causing imports to fail.
  This bug was introduced in version 0.6.2.

## [0.6.3] - 2020-11-03

This release contains no public changes.

## [0.6.2] - 2020-10-30

### Bugs fixed

- When writing non-RDF data, the request headers were incorrectly set.

## [0.6.1] - 2020-10-15

### Bugs fixed

- All `get*WithAcl()` functions would always fetch _both_ the Resource's own ACL and its fallback
  ACL, causing issues when the Resource is the Pod's root, but not at the root of the domain,
  resulting in an attempt to find a fallback ACL for a Resource outside of the Pod. These functions
  will now only attempt to fetch the Fallback ACL if the Resource's own ACL is not available. Hence,
  only at most one of the two will be available at any time.

## [0.6.0] - 2020-10-14

### New features

- `deleteSolidDataset` and `deleteContainer`: two functions that allow you to delete a SolidDataset
  and a Container from the user's Pod, respectively.
- `hasServerResourceInfo`: a function that determines whether server-provided information about the
  Resource is present, such as which server-managed Resources are linked to it.
- `getPodOwner` and `isPodOwner` allow you to check who owns the Pod that contains a given Resource,
  if supported by the Pod server and exposed to the current user.

## [0.5.1] - 2020-10-13

### Bugs fixed

- The type definition of `asUrl` caused the compiler to complain when passing it a Thing of which
  the final URL was either known or not known yet, when using TypeScript.

## [0.5.0] - 2020-09-24

### Breaking changes

- All previously deprecated functions have been removed (their replacements are still available).
- Previously, if no data with the given URL could be found, `getThing` would return a new, empty
  Thing. From now on, it will return `null` in those situations.

### Bugs fixed

- `createAclFromFallbackAcl` did not correctly initialise the new ACL: rules that applied to the
  applicable Resource's children _before_ the new ACL was created (i.e. defined in the fallback ACL)
  no longer applied after saving the new one. This is now fixed.

## [0.4.0] - 2020-09-15

### Deprecations

- The experimental function `fetchResourceInfoWithAcl` has been deprecated. It is replaced by the
  otherwise identical (but still experimental) `getResourceInfoWithAcl`.

### New features

- `getResourceInfo`: Function fetching metadata for a resource, without fetching the resource itself. This enables
  having lightwheight interaction with a Pod before fetching a large file.
- When fetching data from or storing data to a Pod results in an error, those error messages now
  contain more information about what data was being sent, and where it was sent to.

### Bugs fixed

- When creating a new Container on Node Solid Server using `createContainerAt`, no error would be
  thrown when the Container already exists. Now, as with other Solid servers, an error will be
  thrown if the Container you are trying to create already exists.
- The second, optional parameter to functions like `getSolidDataset`, which allows you to pass e.g.
  your own `fetch` function, was not included in our type definitions. This prevented editors from
  autocompleting them, and could cause compilation errors for developers using TypeScript.

## [0.3.0] - 2020-09-03

### New features

- `thingAsMarkdown()`, `solidDatasetAsMarkdown()` and `changeLogAsMarkdown`: functions that take a
  Thing and SolidDataset (with local changes), respectively, and returns a string representation of
  it that can assist in debugging issues.

## [0.2.0] - 2020-08-27

### New features

- `hasResourceInfo`: a function that can verify whether its parameter (e.g. a file or a
  SolidDataset) was fetched from somewhere, or was initialised in-memory.
- `createContainerAt` and `createContainerInContainer`: two functions that can help you create an
  empty Container at a given location or in another Container on the Pod, respectively.
- `isThing`: a function that can verify whether its parameter is a Thing.
- `mockSolidDatasetFrom`, `mockContainerFrom`, `mockFileFrom`, `mockThingFrom`,
  `addMockResourceAclTo` and `addMockFallbackAclTo`: functions that allow you to mock the
  solid-client data structures in your unit tests.
- `getFileWithAcl`: like `getSolidDatasetWithAcl`, this function lets you fetch a file along with
  its ACLs, if available.
- The legacy predicate `acl:defaultForNew` is now supported by our library. If you interact with a
  server where it is used to stipulate default access, `@inrupt/solid-client` will behave as expected.

### Bugs fixed

- `getSourceUrl` used to throw an error when called on a Resource that was not fetched from
  somewhere (and hence had no source URL). It now returns `null` in that case.
- Giving more rights to an Agent or Group could lead to privilege escalation for an app identified
  by an `acl:origin` predicate in the ACL.
- While we allow reading data of different types, they are stored as plain strings. While multiple
  serialisations of data are often possible, we only supported one per data type. What this means
  is that, whereas we would correctly return `true` for a boolean stored as `"1"`, we would not do
  so for `"true"`, even though both are valid serialisations of the value `true` according to the
  XML Schema Datatypes specification: https://www.w3.org/TR/xmlschema-2. solid-client now recognises
  all valid serialisations of all supported data types as defined by that specification.

## [0.1.0] - 2020-08-06

### New features

First release! What's possible with this first release:

- Fetch data from Solid Pods or other public sources that publish Turtle data.
- Store data back to Solid Pods.
- Read data from datasets.
- Manipulate data in datasets.
- Inspect a user's, group's and public permissions w.r.t. a given Resource or child Resources of a
  Container. (Experimental.)
- Retrieve, delete and/or write any file (including non-RDF) from/to a Pod. (Experimental.)
