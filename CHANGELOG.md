# Changelog

This project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

### New features

- A new function `hasResourceInfo` is available. It can verify whether its parameter (e.g. a file or a SolidDataset) was fetched from somewhere, or was initialised in-memory.
- New experimental method `getFileWithAcl` is now exported - like `getSolidDatasetWithAcl`, this function lets you fetch a file along with its ACLs, if available.

### Bugs fixed

- `getSourceUrl` used to throw an error when called on a Resource that was not fetched from somewhere (and hence had no source URL). It now returns `null` in that case.

## [0.1.0] - 2020-08-06

### New features

First release! What's possible with this first release:

- Fetch data from Solid Pods or other public sources that publish Turtle data.
- Store data back to Solid Pods.
- Read data from datasets.
- Manipulate data in datasets.
- Inspect a user's, group's and public permissions w.r.t. a given Resource or child Resources of a Container. (Experimental.)
- Retrieve, delete and/or write any file (including non-RDF) from/to a Pod. (Experimental.)
