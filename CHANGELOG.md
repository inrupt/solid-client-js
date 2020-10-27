# Changelog

This project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

The following changes have been implemented but not released yet:

### Bugs fixed

- When writing non-RDF data, the request headers were incorrectly set.

The following sections document changes that have been released already:

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
