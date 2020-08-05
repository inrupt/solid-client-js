# @inrupt/solid-client

# Installation

```bash
npm install @inrupt/solid-client solid-auth-client
```

# Usage

See https://inrupt.github.io/solid-client-js/docs/

# Related libraries

## Authentication

To send authenticated requests to your Pod and retrieve private data, you can use [solid-client-authn-browser](https://www.npmjs.com/package/@inrupt/solid-client-authn-browser).

## Vocabularies and interoperability

To reuse well-known vocabularies, and make your app produce/consume data in a more [interoperable](https://inrupt.github.io/solid-client-js/docs/faq/#how-can--my-app-work-with-data-from-other-apps) way, we provide vocabularies available as constants that you just have to import: [solid-common-vocab-rdf](https://github.com/inrupt/solid-common-vocab-rdf).

# Browser support

solid-client uses relatively modern JavaScript features that will work in all commonly-used browsers, except Internet Explorer. If you need support for Internet Explorer, it is recommended to pass it through a tool like [Babel](https://babeljs.io), and to add polyfills for e.g. `Set`, `Promise`, `Headers`, `Array.prototype.includes` and `String.prototype.endsWith`.

# Changelog

See the [release notes](./CHANGELOG.md).

# License

MIT © [Inrupt](https://inrupt.com)
