# Solid JavaScript Client - solid-client

[![Contributor
Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE-OF-CONDUCT.md)

This project adheres to the Contributor Covenant [code of
conduct](CODE-OF-CONDUCT.md). By participating, you are expected to uphold this
code. Please report unacceptable behavior to
[engineering@inrupt.com](mailto:engineering@inrupt.com).

@inrupt/solid-client is a JavaScript library for accessing data and managing
permissions on data stored in Solid Pods. It provides an abstraction layer on
top of both Solid and Resource Description Framework (RDF) principles and is
compatible with the RDF/JS specification. You can use solid-client in Node.js
using either CommonJS or ES modules, and in the browser with a bundler like
Webpack, Rollup, or Parcel.

@inrupt/solid-client is part of a family open source JavaScript libraries
designed to support developers building Solid applications.

# Inrupt Solid JavaScript Client Libraries

## Data access and permissions management - solid-client

[@inrupt/solid-client](https://docs.inrupt.com/developer-tools/javascript/client-libraries/)
allows developers to access data and manage permissions on data stored in Solid
Pods.

[@inrupt/solid-client-authn-browser](https://www.npmjs.com/package/@inrupt/solid-client-authn-browser)
allows apps running in a browser to authenticate against a Solid server. This is
only necessary if you wish to access private resources in a Pod (to access
public resources you could simply use standard `window.fetch()`).

## Vocabularies and interoperability

A fundamental requirement for any two systems to interoperate at all is that
they have a shared understanding of the concepts and ideas relevant to those
systems. That shared understanding is expressed as a common 'language', and the
individual terms from that language are typically described and explained in
dictionaries.

The Solid eco-system uses RDF vocabularies (or slightly more formally,
'ontologies') to describe concepts and ideas in a machine-readable, W3C
standardized format (effectively, these RDF vocabularies act as dictionaries for
systems to share concepts and ideas).

There are already many common vocabularies published on the web, such as the
[vCard vocabulary](https://www.w3.org/TR/vcard-rdf/) for describing the concepts
and ideas associated with People and Organizations, or
[Schema.org](https://schema.org/) for describing the things search engines are
typically interested in, intended to be used by webmasters to mark up their
pages in ways that those search engines can then understand.

As a convenience for JavaScript developers, Inrupt publishes various npm modules
that provide JavaScript classes containing constants representing the individual
terms described in many of these vocabularies today, including modules
specifically for Solid-related vocabularies, and for Inrupt-specific
vocabularies.

By simply importing one of these NPM modules, developers have immediate access
to all the terms described in all the RDF vocabularies referenced by that
module.

### Common RDF vocabularies

This module bundles together JavaScript classes representing many of the most
common RDF vocabularies published on the web today (e.g. FOAF, Schema.org,
vCard, SKOS, etc.):
[@inrupt/vocab-common-rdf](https://www.npmjs.com/package/@inrupt/vocab-common-rdf)

### Solid-specific RDF vocabularies

This module bundles together JavaScript classes representing all the RDF
vocabularies related to Solid (e.g. Solid terms, WebACL, ACP, etc.):
[@inrupt/vocab-solid-common](https://www.npmjs.com/package/@inrupt/vocab-solid-common)

### Inrupt-specific RDF vocabularies

This module bundles together JavaScript classes representing all the RDF
vocabularies created and maintained by Inrupt (e.g. an Inrupt test vocabulary,
Inrupt glossaries, Inrupt product vocabularies, etc.):
[@inrupt/vocab-inrupt-common](https://www.npmjs.com/package/@inrupt/vocab-inrupt-common)

# Supported environments

Our JavaScript Client Libraries use relatively modern JavaScript, aligned with
the [ES2018](https://262.ecma-international.org/9.0/) Specification features, we
ship both [ESM](https://nodejs.org/docs/latest-v16.x/api/esm.html) and
[CommonJS](https://nodejs.org/docs/latest-v16.x/api/modules.html), with type
definitions for TypeScript alongside.

This means that out of the box, we only support environments (browsers or
runtimes) that were released after mid-2018, if you wish to target other (older)
environments, then you will need to cross-compile our SDKs via the use of
[Babel](https://babeljs.io), [webpack](https://webpack.js.org/),
[SWC](https://swc.rs/), or similar.

If you need support for Internet Explorer, it is recommended to pass them
through a tool like [Babel](https://babeljs.io), and to add polyfills for e.g.
`Map`, `Set`, `Promise`, `Headers`, `Array.prototype.includes`, `Object.entries`
and `String.prototype.endsWith`.

Additionally, when using this package in an environment other than Node.js, you
will need [a polyfill for Node's `buffer`
module](https://www.npmjs.com/package/buffer).

## Node.js Support

Our JavaScript Client Libraries track Node.js [LTS
releases](https://nodejs.org/en/about/releases/), and support 14.x, and 16.x.

# Installation

For the latest stable version of solid-client:

```bash
npm install @inrupt/solid-client
```

For the latest stable version of all Inrupt Solid JavaScript libraries:

```bash
npm install @inrupt/solid-client @inrupt/solid-client-authn-browser @inrupt/vocab-common-rdf
```

# Issues & Help

## Solid Community Forum

If you have questions about working with Solid or just want to share what you’re
working on, visit the [Solid forum](https://forum.solidproject.org/). The Solid
forum is a good place to meet the rest of the community.

## Bugs and Feature Requests

- For public feedback, bug reports, and feature requests please file an issue
  via [Github](https://github.com/inrupt/solid-client-js/issues/).
- For non-public feedback or support inquiries please use the [Inrupt Service
  Desk](https://inrupt.atlassian.net/servicedesk).

## Documentation

- [Inrupt Solid Javascript Client
  Libraries](https://docs.inrupt.com/developer-tools/javascript/client-libraries/)
- [Homepage](https://docs.inrupt.com/)

# Changelog

See [the release
notes](https://github.com/inrupt/solid-client-js/blob/main/CHANGELOG.md).

# License

MIT © [Inrupt](https://inrupt.com)
