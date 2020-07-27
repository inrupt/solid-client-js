---
id: installation
title: Installation
sidebar_label: Installation
---

To install the latest stable version of solid-client, run:

```bash
npm install @inrupt/solid-client
```

solid-client will work in Node using CommonJS modules, and in the browser with a bundler like [Webpack](https://webpack.js.org), [Rollup](https://rollupjs.org) or [Parcel](https://parceljs.org).

## To access private data

By default, solid-client will only enables to access public data on Solid Pods. To allow for access to restricted data, you will need to include a library that supports user authentication. If you have [solid-auth-client](https://www.npmjs.com/package/solid-auth-client) installed and have used it to authenticate the user, solid-client will automatically pick up the authenticated session and include the user's credentials with each request.
