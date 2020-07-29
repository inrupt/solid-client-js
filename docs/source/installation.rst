============
Installation
============

Inrupt |product| is a client library for accessing data stored in
`Solid <https://solidproject.org/>`_ Pods.

You can install |product| using `npm <https://www.npmjs.com/>`_:

.. code-block:: sh

   npm install @solid/solid-client

By default, |product| only enables access to public data on Solid Pods.
To access data that has been restricted to specific users, you can use
|product| in conjunction with the `solid-auth-client
<https://www.npmjs.com/package/solid-auth-client>`_ library. When used
with `solid-auth-client`_ to authenticate, |product| automatically
picks up the authenticated session and includes the user's credentials
with each request.

To install `solid-auth-client`_, see https://www.npmjs.com/package/solid-auth-client.
