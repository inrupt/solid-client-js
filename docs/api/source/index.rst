:orphan:

@inrupt/solid-client API Documentation
======================================

`@inrupt/solid-client <https://npmjs.com/package/@inrupt/solid-client>`__
is a JavaScript library for accessing data and managing permissions on
data stored in Solid Pods. It provides an abstraction layer on top of
both Solid and Resource Description Framework (RDF) principles and is
compatible with the RDF/JS specification. You can use solid-client in
Node.js using either CommonJS or ESM modules, and in the browser with a
bundler like Webpack, Rollup, or Parcel.

It is part of a `family open source JavaScript
libraries <https://docs.inrupt.com/developer-tools/javascript/client-libraries/>`__
designed to support developers building Solid applications.

Installation
------------

For the latest stable version of solid-client:

.. code:: bash

   npm install @inrupt/solid-client

Changelog
~~~~~~~~~

See `the release
notes <https://github.com/inrupt/solid-client-js/blob/main/CHANGELOG.md>`__.

Supported environments
~~~~~~~~~~~~~~~~~~~~~~

Our JavaScript Client Libraries use relatively modern JavaScript, aligned with
the `ES2018 <https://262.ecma-international.org/9.0/>`__ Specification features, we
ship both `ESM <https://nodejs.org/docs/latest-v16.x/api/esm.html>`__ and
`CommonJS <https://nodejs.org/docs/latest-v16.x/api/modules.html>`__, with type
definitions for TypeScript alongside.

This means that out of the box, we only support environments (browsers or
runtimes) that were released after mid-2018, if you wish to target other (older)
environments, then you will need to cross-compile our SDKs via the use of `Babel
<https://babeljs.io>`__, `webpack <https://webpack.js.org/>`__, `SWC
<https://swc.rs/>`__, or similar.

If you need support for Internet Explorer, it is recommended to pass them
through a tool like `Babel <https://babeljs.io>`__, and to add polyfills for
e.g. ``Map``, ``Set``, ``Promise``, ``Headers``, ``Array.prototype.includes``,
``Object.entries`` and ``String.prototype.endsWith``.

Node.js Support
^^^^^^^^^^^^^^^

Our JavaScript Client Libraries track Node.js `LTS releases
<https://nodejs.org/en/about/releases/>`__, and support 16.x, 18.x and 20.x.

.. _issues--help:

Issues & Help
-------------

Solid Community Forum
~~~~~~~~~~~~~~~~~~~~~

If you have questions about working with Solid or just want to share
what you're working on, visit the `Solid
forum <https://forum.solidproject.org/>`__. The Solid forum is a good
place to meet the rest of the community.

Bugs and Feature Requests
~~~~~~~~~~~~~~~~~~~~~~~~~

-  For public feedback, bug reports, and feature requests please file an
   issue via
   `Github <https://github.com/inrupt/solid-client-js/issues/>`__.
-  For non-public feedback or support inquiries please use the `Inrupt
   Service Desk <https://inrupt.atlassian.net/servicedesk>`__.

------------

API
===

Modules
-------

.. toctree::
   :glob:
   :titlesonly:

   /modules/**

Classes
-------

.. toctree::
   :glob:
   :titlesonly:

   /classes/**
