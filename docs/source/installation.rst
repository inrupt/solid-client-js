============
Installation
============

The instruction on this page installs the following Inrupt libraries:

.. list-table::
   :header-rows: 1
   :widths: 35 65
   
   * - Libary
     - Description

   * - |product|
   
     - Inrupt |product| is a client library for accessing data stored
       in `Solid <https://solidproject.org/>`_ :term:`Pods <Pod>`.
 
       By default, |product| only enables access to public data on
       Solid :term:`Pods <Pod>`.

   * - `solid-client-authn
       <https://www.npmjs.com/package/@inrupt/solid-client-authn>`_
  
     - Inrupt `solid-client-authn`_ is a set of libraries used to
       authenticate with Solid identity servers. After authenticating
       with `solid-client-authn`_, |product| picks up the authenticated
       session and includes the user's credentials with each request.

   * - ``vocab-common-rdf``
   
     - Certain agreed-upon *Vocabularies* exist to identify common data
       (e.g., ``name``, ``title``, ``address``, ``url``). You can use
       these common vocabularies to identify the data you want to
       access. Inrupt's ``vocab-common-rdf`` library bundles some
       common vocabularies for use in your application.

You can use `npm <https://www.npmjs.com/>`_ to install |product|,
``solid-client-authn``, and ``vocab-common-rdf``:

.. code-block:: sh

   npm install @inrupt/solid-client @inrupt/solid-client-authn-browser @inrupt/vocab-common-rdf
