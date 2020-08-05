# Solid JavaScript Client - solid-client
@inrupt/solid-client is a JavaScript library for accessing data and managing permissions on data stored in Solid Pods. It provides an abstraction layer on top of both Solid and Resource Description Framework (RDF) principles and is compatible with the RDF/JS specification. You can use solid-client in Node.js using CommonJS modules and in the browser with a bundler like Webpack, Rollup, or Parcel.

# Inrupt Solid JavaScript Client Libraries
Inrupt Solid JavaScript Client Libraries are a group of libraries designed to support developers building Solid applications.

## Authentication - solid-client-authn
[@inrupt/solid-client-authn](https://github.com/inrupt/solid-client-authn) allows developers to authenticate against a Solid server. This is necessary when the resources on your Pod are not public.

## Vocabularies and interoperability - solid-common-vocab-rdf
[@inrupt/solid-common-vocab-rdf](https://github.com/inrupt/solid-common-vocab-rdf) allows developers to build interoperable apps by reusing well-known vocabularies. These libraries provide vocabularies available as constants that you just have to import.

# Browser support
Our JavaScript Client Libraries use relatively modern JavaScript features that will work in all commonly-used browsers, except Internet Explorer. If you need support for Internet Explorer, it is recommended to pass it through a tool like [Babel](https://babeljs.io), and to add polyfills for e.g. `Set`, `Promise`, `Headers`, `Array.prototype.includes` and `String.prototype.endsWith`.

# Installation

For the latest stable version of solid-client:
```bash
npm install @inrupt/solid-client
```

For the latest stable version of all Inrupt Solid JS libraries:
```bash
npm install @inrupt/solid-client @inrupt/solid-client-authn @inrupt/solid-common-vocab
```

# Issues & Help

## Solid Community Forum
If you have questions about working with Solid or just want to share what you’re working on, visit the [Solid forum](https://forum.solidproject.org/). The [Solid forum](https://forum.solidproject.org/) is a good place to meet the rest of the community.

## Bugs and Feature Requests
* For public feedback, bug reports, and feature requests please file an issue via [Github](https://github.com/microsoft/TypeScript/issues).
* For non-public feedback or support inquiries please use [Inrupt Service Desk](https://inrupt.atlassian.net/servicedesk).

## Documentation
*  [Inrupt Solid Javascript Client Libraries](https://docs.inrupt.com/client-libraries/solid-client-js)
*  [Homepage](https://docs.inrupt.com/)


# License

MIT © [Inrupt](https://inrupt.com)
