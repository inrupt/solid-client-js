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

Browser support
~~~~~~~~~~~~~~~

Our JavaScript Client Libraries use relatively modern JavaScript
features that will work in all commonly-used browsers, except Internet
Explorer. If you need support for Internet Explorer, it is recommended
to pass them through a tool like `Babel <https://babeljs.io>`__, and to
add polyfills for e.g. ``Map``, ``Set``, ``Promise``, ``Headers``,
``Array.prototype.includes``, ``Object.entries`` and
``String.prototype.endsWith``.

Additionally, when using this package in an environment other than Node.js, you
will need `a polyfill for Node's buffer module
<https://www.npmjs.com/package/buffer>`__.

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
