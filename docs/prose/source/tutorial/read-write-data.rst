===============
Read/Write Data
===============

This page provides information on reading and writing structured data
stored in `Solid <https://solidproject.org/>`_ Pods. For information on
reading and writing files (e.g., ``.jpg`` or ``.json``) stored in
Solid Pods, see :doc:`/tutorial/read-write-files`.

When accessing data with |product|,

- A :term:`Thing` refers to a data entity;
  e.g., a person. Each :term:`Thing`'s URL
  acts as its identifier.

  The use of the ``Thing``'s URL facilitates interoperability. That is,
  to combine data, you can use a ``Thing``'s URL to link to other data.

- A :term:`SolidDataset` is a set of :term:`Thing`\ s. Each
  :term:`SolidDataset`'s URL acts as its identifier.

  Typically, all ``Thing``\ s in a ``SolidDataset`` have URLs relative
  to the ``SolidDataset``'s URL.

From a :term:`Thing`, you can access specific properties (i.e., data)
about the Thing. For example, if a Thing represents a person's contact
information, specific properties for a person may include the person's
name, email addresses, etc. Each property's URL acts as its identifier.

.. topic:: Vocabulary

   To encourage interoperability, certain agreed-upon *Vocabularies*
   exist to identify common data (e.g., ``name``, ``title``,
   ``address``, ``url``). For example,
   ``http://xmlns.com/foaf/0.1/name`` is part of the `Friend of a
   Friend (FOAF) Vocabulary <http://xmlns.com/foaf/spec>`_. Inrupt's
   ``vocab-common-rdf`` library bundles some common vocabularies for
   use in your application when accessing data.

   For more information on shared vocabulary, see `Schema.org
   <https://schema.org/>`_.

Prerequisite
============

By default, |product| only enables access to public data on Solid
:term:`Pods <Pod>`. To access other data, you must authenticate as a
user who has been :doc:`granted appropriate access
</tutorial/manage-access-control-list>` to that data. For example, to
write to a resource, the user must have :term:`Write Access` on the
Resource.

To authenticate, you can use the Inrupt `solid-client-authn
<https://www.npmjs.com/package/@inrupt/solid-client-authn>`_ library.
After authentication, the ``Session`` object obtained from
``solid-client-authn`` provides a `fetch` function. You can pass this function
as an option to |product| to include the user's credentials with a request.

.. literalinclude:: /examples/login.js
   :language: typescript
   :start-after: BEGIN-EXAMPLE-LOGIN
   :end-before: END-EXAMPLE-LOGIN

For more examples, see `the solid-client-authn repository
<https://github.com/inrupt/solid-client-authn/tree/master/examples/single/bundle>`_.

Read Data
=========

.. literalinclude:: /examples/read-data.js
   :language: typescript
   :start-after: BEGIN-EXAMPLE-READ-DATA
   :end-before: END-EXAMPLE-READ-DATA

To read data with |product|,

#. You first use :apisolidclient:`getSolidDataset
   </modules/_resource_soliddataset_.html#getsoliddataset>` to fetch the
   dataset from which you want to read your data.

#. Then, use either:

   - :apisolidclient:`getThing </modules/_thing_thing_.html#getthing>` to
     get a single data entity from the dataset, or

   - :apisolidclient:`getThingAll</modules/_thing_thing_.html#getthingall>`
     to get all data entities from the dataset.

#. Then, from the data entity, you can :apisolidclient:`get
   </modules/_thing_get_.html>` specific data. For a list of the ``get``
   functions, see :apisolidclient:`apisolidclient
   </modules/_thing_get_.html>`.

1. Fetch the Dataset
--------------------

To access data, first fetch the dataset (``SolidDataset``) that
contains the data. To fetch a ``SolidDataset``, pass its URL to
:apisolidclient:`getSolidDataset
</modules/_resource_soliddataset_.html#getsoliddataset>` as in the following
example:

.. literalinclude:: /examples/read-data-get-dataset.js
   :language: typescript
   :start-after: BEGIN-EXAMPLE-GET-DATASET
   :end-before: END-EXAMPLE-GET-DATASET

2. Get the Data Entity ``Thing``
--------------------------------

From the fetched dataset, you can use either:

- :apisolidclient:`getThing </modules/_thing_thing_.html#getthing>` with the
  Thing's URL to get a single data entity, or

- :apisolidclient:`getThingAll </modules/_thing_thing_.html#getthingall>` to
  get all data entities from the dataset.

The following passes in a example entity's URL to
:apisolidclient:`getThing </modules/_thing_thing_.html#getthing>` to
retrieve the entity from the previously fetched dataset.

.. literalinclude:: /examples/read-data-get-thing.js
   :language: typescript
   :start-after: BEGIN-EXAMPLE-GET-THING
   :end-before: END-EXAMPLE-GET-THING

3. Read Data Attribute of a Thing
---------------------------------

A property (i.e. data) about a Thing is identified by a URL. A property
can have zero, one or more values, and the value is typed; e.g., a
string, an integer, or an URL if pointing to other Things.

To encourage interoperability, certain agreed-upon *Vocabularies* exist
to identify common data. For example,
``http://xmlns.com/foaf/0.1/name`` is part of the `Friend of a Friend
(FOAF) Vocabulary <http://xmlns.com/foaf/spec>`_.
``http://xmlns.com/foaf/0.1/name`` is explicitly understood to be
separate from family name or a given name. Additionally, it is
understood that the name is a string, and that data entities can have
more than one name.

To access data, you use the appropriate function depending on the data
type, the number of values, and pass it the URL that identifies which
of the Thing's property you want.

.. literalinclude:: /examples/read-data-get-data.js
   :language: typescript
   :start-after: BEGIN-EXAMPLE-GET-DATA
   :end-before: END-EXAMPLE-GET-DATA

For a list of the ``get`` functions, see :apisolidclient:`thing/get
</modules/_thing_get_.html>`.

Write Data
==========

.. admonition:: Write Access
   :class: important

   To write data to a Pod requires that the user have appropriate
   access. For more information on access management, see
   :doc:`/tutorial/manage-access-control-list`.

.. literalinclude:: /examples/write-data.js
   :language: typescript
   :start-after: BEGIN-EXAMPLE-WRITE-DATA
   :end-before: END-EXAMPLE-WRITE-DATA

To write data with |product|,

#. Create a new data entity with the data you wish to write.

   To start, you need a data entity (a Thing) entity from which to
   create the updated Thing:

   - Use :apisolidclient:`getThing </modules/_thing_thing_.html#getthing>`
     to start with an existing data entity, or

   - Use :apisolidclient:`createThing
     </modules/_thing_thing_.html#creatething>` to create a new data entity.

   With this Thing as a starting point, use the following functions to
   create a **new** Thing with the modifications:

   - :apisolidclient:`thing/add </modules/_thing_add_.html>` functions to
     add new data,

   - :apisolidclient:`thing/set </modules/_thing_set_.html>` functions to
     replace existing data, and

   - :apisolidclient:`thing/remove </modules/_thing_remove_.html>` functions
     to remove existing data.

#. Use :apisolidclient:`setThing </modules/_thing_thing_.html#setthing>` to
   return a **new** dataset with the updated Thing.

#. Use :apisolidclient:`saveSolidDataSetAt
   </modules/_resource_soliddataset_.html#savesoliddatasetat>` to save the
   dataset to the Pod.

.. topic:: Immutability

   |product| does not modify the objects provided to its functions.
   Instead, it creates a new object based on the provided object.

   As such, the various add/set/remove functions do not modify the
   passed-in object. Instead, these functions return a new object
   with the requested changes, and the passed-in object remains
   **unchanged**.

1. Create Thing with Updated Data
---------------------------------

To start, you need a data entity (a Thing) entity from which to create
the updated Thing:

- Use :apisolidclient:`getThing </modules/_thing_thing_.html#getthing>` to
  start with an existing data entity, or

- Use :apisolidclient:`createThing </module/_thing_thing_.html#creatething>`
  to create a new data entity.

The following example uses :apisolidclient:`createThing
</modules/_thing_thing_.html#creatething>`.

.. literalinclude:: /examples/write-data-create-thing.js
   :language: typescript
   :start-after: BEGIN-EXAMPLE-WRITE-DATA-CREATE-THING
   :end-before: END-EXAMPLE-WRITE-DATA-CREATE-THING

With this Thing as a starting point, use the following functions to
create a **new** Thing with the modifications:

- :apisolidclient:`thing/add </modules/_thing_add_.html>` functions to
  add new data,

- :apisolidclient:`thing/set </modules/_thing_set_.html>` functions to
  replace existing data, and

- :apisolidclient:`thing/remove </modules/_thing_remove_.html>`
  functions to remove data.

For example, the following example creates a new Thing ``updatedThing``
that has an added nickname value of ``"timbl"``. To identify the
nickname, the example uses the common Vocabulary url
``http://xmlns.com/foaf/0.1/nick``.

.. literalinclude:: /examples/write-data-update-data.js
   :language: typescript
   :start-after: BEGIN-EXAMPLE-WRITE-DATA-UPDATE-DATA
   :end-before: END-EXAMPLE-WRITE-DATA-UPDATE-DATA

Only the ``updatedThing`` includes the added ``nickname`` value
``"timbl"``. The original ``thing`` remains unchanged.

.. topic:: Immutability

   |product| does not modify the objects provided to its functions.
   Instead, it creates a new object based on the provided object.

   As such, the various add/set/remove functions do not modify the
   passed-in object. Instead, these functions return a new object
   with the requested changes, and the passed-in object remain
   **unchanged**.

2. Insert the Thing into a SolidDataset
---------------------------------------

After creating a new Thing with updated data, update a SolidDataset with
the new Thing.

If the updated Thing was based on an existing Thing obtained from that
SolidDataset, the updated Thing replaces the existing one.

.. literalinclude:: /examples/write-data-set-thing.js
   :language: typescript
   :start-after: BEGIN-EXAMPLE-WRITE-DATA-SET-THING
   :end-before: END-EXAMPLE-WRITE-DATA-SET-THING

3. Save the SolidDataset to a Pod
---------------------------------

.. note::

   To write to a Pod, you must have the required access to write the
   data. For more information regarding access control, see
   :doc:`/tutorial/manage-access-control-list`.

To save the updated dataset to a Pod, use
:apisolidclient:`saveSolidDatasetAt
</modules/_resource_soliddataset_.html#savesoliddatasetat>`, passing in its
URL as well as the updated dataset.

.. literalinclude:: /examples/write-data-save-dataset.js
   :language: typescript
   :start-after: BEGIN-EXAMPLE-WRITE-DATA-SAVE-DATASET
   :end-before: END-EXAMPLE-WRITE-DATA-SAVE-DATASET

If the given URL already contains a dataset, that dataset is replaced
with the updated dataset.

