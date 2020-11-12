# Solid JavaScript Client - solid-client

@inrupt/solid-client is a JavaScript library for accessing data and managing
permissions on data stored in Solid Pods. It provides an abstraction layer on
top of both Solid and Resource Description Framework (RDF) principles and is
compatible with the RDF/JS specification. You can use solid-client in Node.js
using CommonJS modules and in the browser with a bundler like Webpack, Rollup,
or Parcel.

@inrupt/solid-client is part of a family open source JavaScript libraries designed to support developers building Solid applications.

# Inrupt Solid JavaScript Client Libraries

## Data access and permissions management - solid-client

[@inrupt/solid-client](https://docs.inrupt.com/developer-tools/javascript/client-libraries/) allows developers to access data and manage permissions on data stored in Solid Pods.

[@inrupt/solid-client-authn-browser](https://www.npmjs.com/package/@inrupt/solid-client-authn-browser) allows apps running in a browser to authenticate against a Solid server. This is only necessary if you wish to access private resources in a Pod (to access public resources you could simply use standard `window.fetch()`).

## Vocabularies and interoperability - solid-common-vocab-rdf

[@inrupt/solid-common-vocab-rdf](https://www.npmjs.com/package/@inrupt/vocab-common-rdf) allows developers to build interoperable apps by reusing well-known vocabularies. These libraries provide vocabularies available as constants that you just have to import.

# Browser support

Our JavaScript Client Libraries use relatively modern JavaScript features that will work in all commonly-used browsers, except Internet Explorer. If you need support for Internet Explorer, it is recommended to pass them through a tool like [Babel](https://babeljs.io), and to add polyfills for e.g. `Set`, `Promise`, `Headers`, `Array.prototype.includes`, `Array.prototype.from` and `String.prototype.endsWith`.
=======
[@inrupt/solid-client-authn](https://github.com/inrupt/solid-client-authn)
allows developers to authenticate against a Solid server. This is necessary when
the resources on your Pod are not public.

## Vocabularies and interoperability - solid-common-vocab-rdf

[@inrupt/solid-common-vocab-rdf](https://github.com/inrupt/solid-common-vocab-rdf)
allows developers to build interoperable apps by reusing well-known
vocabularies. These libraries provide vocabularies available as constants that
you just have to import.

# Browser support

Our JavaScript Client Libraries use relatively modern JavaScript features that
will work in all commonly-used browsers, except Internet Explorer. If you need
support for Internet Explorer, it is recommended to pass them through a tool
like [Babel](https://babeljs.io), and to add polyfills for e.g. `Map`, `Set`,
`Promise`, `Headers`, `Array.prototype.includes` and
`String.prototype.endsWith`.
>>>>>>> removed special handling for empty locale strings

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

<<<<<<< HEAD
- For public feedback, bug reports, and feature requests please file an issue via [GitHub](https://github.com/inrupt/solid-client-js/issues/).
- For non-public feedback or support inquiries please use the [Inrupt Service Desk](https://inrupt.atlassian.net/servicedesk).
=======
- For public feedback, bug reports, and feature requests please file an issue
  via [Github](https://github.com/inrupt/solid-client-js/issues/).
- For non-public feedback or support inquiries please use the
  [Inrupt Service Desk](https://inrupt.atlassian.net/servicedesk).
>>>>>>> removed special handling for empty locale strings

## Documentation

- [Inrupt Solid Javascript Client Libraries](https://docs.inrupt.com/developer-tools/javascript/client-libraries/)
- [Homepage](https://docs.inrupt.com/)

# Changelog

See [the release notes](https://github.com/inrupt/solid-client-js/blob/master/CHANGELOG.md).

# License

MIT © [Inrupt](https://inrupt.com)
