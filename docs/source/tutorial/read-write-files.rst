================
Read/Write Files
================

Even if the core Solid data model is **structured** data (see
:doc:`/tutorial/read-write-data`), a Solid Pod can also act as a regular
general-purpose data store. Besides your profile document, your friend
list and the likes, your Pod can also store your photos, PDFs and any
other type of file. Note that the :doc:`access restrictions
</tutorial/manage-access-control-list>` apply to files the same way
they apply to any other :term:`Resource`.

Like anything else in your Pod, each file is a resource with a distinct
URL, which may or may not contain a hint such as a ``.jpg`` extension
for a photo. You'll find that the functions available to read and write
files to/from your Pod are very close to the browser's ``fetch``: files
are represented as typed `Blobs
<https://developer.mozilla.org/docs/Web/API/Blob>`_, and the result of
the functions is returned as a `Response
<https://developer.mozilla.org/docs/Web/API/Response>`_.

Read a File
===========

Reading a file is just a matter of fetching the content available at a certain URL. You get a `Response` in return, which contains
the fetched file as a blob. It is then up to you to decode it appropriately.

.. literalinclude:: /examples/read-file.js
   :language: typescript
   :start-after: BEGIN-EXAMPLE-READ-FILE
   :end-before: END-EXAMPLE-READ-FILE

Write a File
============

There are two approaches to writing files:

1. you know exactly at which URL your file should be saved (potentially overwriting any data that sat there previously).
2. you know what [Container](../glossary#container) should be the parent of your file, like saving it into a folder.

Write a file directly at a URL
------------------------------

With this approach, if the request succeeds, you know exactly what the URL of your file is.

.. literalinclude:: /examples/write-file.js
   :language: typescript
   :start-after: BEGIN-EXAMPLE-WRITE-FILE
   :end-before: END-EXAMPLE-WRITE-FILE

Save a file into a parent resource
----------------------------------

With this approach, you kindly ask the server to come up with a name for your file, potentially using a `slug` if you
provide one. Note that there is no guarantee about how the server will use the slug, if at all. In any case, if the slug
you provide matches a file that already exists under the same target resource, the server will create a new name for your
file so that no content is overwritten.

This means that you don't control the final name of your file though. To keep track of the name the server gave to your
file, you'll have to look up the `Location` header in the response, as shown in the code snippet below:

.. literalinclude:: /examples/save-file.js
   :language: typescript
   :start-after: BEGIN-EXAMPLE-SAVE-FILE
   :end-before: END-EXAMPLE-SAVE-FILE

Note that the returned `Location` will be relative to the server's origin, so in the previous example `Location` might
be `/some/folder/new-file-3869a250`, which means the file is saved at the URL `https://example.com/some/folder/new-file-3869a250`.

Delete a File
=============

Deleting a file is also a simple operation: you just erase the content available at a certain URL.

.. literalinclude:: /examples/delete-file.js
   :language: typescript
   :start-after: BEGIN-EXAMPLE-DELETE-FILE
   :end-before: END-EXAMPLE-DELETE-FILE


Customize Requests
==================

If you need to customize the request eventually sent to the server, you
can do so by using the optional ``init`` parameter. ``init`` conforms
to the `init parameter
<https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Parameters>`_ of the ``fetch`` API.

For instance, the following example sets a custom header:

.. literalinclude:: /examples/custom-write-file.js
   :language: typescript
   :start-after: BEGIN-EXAMPLE-CUSTOM-WRITE-FILE
   :end-before: END-EXAMPLE-CUSTOM-WRITE-FILE

Restrictions
------------

The following settings are reserved for the |product| library and
should not be set manually in the ``init``:

- ``method`` request method
- ``Content-Type`` request header
- ``Slug`` request header 
- ``If-None-Match`` request header
