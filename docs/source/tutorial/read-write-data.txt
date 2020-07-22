===============
Read/Write Data
===============

This page provides information on reading and writing structured data
stored in `Solid <https://solidproject.org/>`_ Pods. For information on
reading and writing files (e.g., ``.jpg`` or ``.json``) stored in
`Solid`_ Pods, see :doc:`/tutorial/read-write-files`.

When accessing data with |product|,

- A :apimodule:`Thing <_interfaces_#thing>` refers to a data entity;
  e.g., a person. Each :apimodule:`Thing <_interfaces_#thing>`'s URL
  acts as its identifier.
 
  The use of the :apimodule:`Thing <_interfaces_#thing>`'s URL
  facilitates interoperability. That is, to combine data, you can use a
  :apimodule:`Thing <_interfaces_#thing>`'s URL to link to other data.

- A :apimodule:`LitDataset <_interfaces_#litdataset>` is a set of
  :apimodule:`Thing <_interfaces_#thing>`\ s. Each
  :apimodule:`LitDataset <_interfaces_#litdataset>`'s URL acts as its
  identifier.

  Typically, all :apimodule:`Thing <_interfaces_#thing>`\ s in a
  :apimodule:`LitDataset <_interfaces_#litdataset>` have URLs relative
  to their :apimodule:`LitDataset <_interfaces_#litdataset>` URL.
 
From a :apimodule:`Thing <_interfaces_#thing>`, you can access specific
data about the Thing. For example, if a Thing represents a person's
contact information, specific data for a person may include the
person's name, email addresses, etc. Each attribute's URL acts as its
identifier.

To encourage interoperability, certain agreed-upon *Vocabularies* exist
to identify common data (e.g., ``name``, ``skypeId``, ``knows``). For
example, ``http://xmlns.com/foaf/0.1/name`` is part of the `Friend of a
Friend (FOAF) Vocabulary <http://xmlns.com/foaf/spec>`_.

Read Data
=========

.. literalinclude:: /examples/read-data.js
   :language: typescript
   :start-after: BEGIN-EXAMPLE-READ-DATA
   :end-before: END-EXAMPLE-READ-DATA

To read data with |product|,

#. You first use :apimodule:`fetchLitDataset
   <_resource_litdataset_#fetchlitdataset>` to fetch the dataset from
   which you want to read your data.

#. Then, use either:

   - :apimodule:`getThingOne <_thing_thing_#getthingone>` to get a
     single data entity from the dataset, or

   - :apimodule:`getThingAll<_thing_thing_#getthingall>` to get all
     data entities from the dataset.

#. Then, from the data entity, you can :apimodule:`get
   </_thing_get_>` specific data. For a list of the ``get``
   functions, see :apimodule:`get </_thing_get_>`.

1. Fetch the Dataset
--------------------

To access data, first fetch the dataset (``LitDataset``) that contains
the data. To fetch a ``LitDataset``, pass its URL to
:apimodule:`fetchLitDataset <_resource_litdataset_#fetchlitdataset>` as
in the following example:

.. literalinclude:: /examples/read-data-fetch-dataset.js
   :language: typescript
   :start-after: BEGIN-EXAMPLE-FETCH-DATASET
   :end-before: END-EXAMPLE-FETCH-DATASET

2. Get the Data Entity ``Thing``
--------------------------------

From the fetched dataset, you can use either:

- :apimodule:`getThingOne <_thing_thing_#getthingone>` with the Thing's
  URL to get a single data entity, or

- :apimodule:`getThingAll<_thing_thing_#getthingall>` to get all data
  entities from the dataset.

The following passes in a example entity's URL to
:apimodule:`getThingOne <_thing_thing_#getthingone>` to retrieve the
entity from the previously fetched dataset.

.. literalinclude:: /examples/read-data-get-thing.js
   :language: typescript
   :start-after: BEGIN-EXAMPLE-GET-THING
   :end-before: END-EXAMPLE-GET-THING

3. Read Data Attribute of a Thing
---------------------------------

A data attribute of a Thing is identified by a URL. An attribute can
have zero, one or more values, and the value is typed; e.g., a string,
an integer, or an URL if pointing to other Things.

To encourage interoperability, certain agreed-upon *Vocabularies* exist
to identify common data attributes. For example,
``http://xmlns.com/foaf/0.1/name`` is part of the `Friend of a Friend
(FOAF) Vocabulary <http://xmlns.com/foaf/spec>`_. A
``http://xmlns.com/foaf/0.1/name`` attribute is explicitly understood
to be a name, and not just a family name or a given name. Additionally,
it is understood that the name is a string, and that data entities can
have more than one name.

To access data, you use the appropriate function depending on the data
type, the number of values, and pass it the URL that identifies which
of the Thing's characteristics you're looking for.

.. literalinclude:: /examples/read-data-get-data.js
   :language: typescript
   :start-after: BEGIN-EXAMPLE-GET-DATA
   :end-before: END-EXAMPLE-GET-DATA

For a list of the ``get`` functions, see :apimodule:`thing/get
</_thing_get_>`.

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

   - Use :apimodule:`getThingOne <_thing_thing_#getthingone>` to start
     with an existing data entity, or

   - Use :apimodule:`createThing <_thing_thing_#creatething>` to create
     a new data entity.

   With this Thing as a starting point, use the following functions to
   create a **new** Thing with the modifications:

   - :apimodule:`thing/add <_thing_add_>` functions to add new data,

   - :apimodule:`thing/set <_thing_set_>` functions to replace existing
     data, and

   - :apimodule:`thing/remove <_thing_remove_>` functions to remove
     existing data.

#. Use :apimodule:`setThing <_thing_thing_#setthing>` to return a 
   **new** dataset with the updated Thing.

#. Use :apimodule:`saveLitDataSetAt
   <_resource_litdataset_#savelitdatasetat>` to save the dataset to the    Pod.

.. topic:: Immutability
 
   |product| does not modify the objects provided to its functions.
   Instead, it creates a new object based on the provided object.
   
   As such, the various add/set/remove functions do not modify the
   passed-in object. Instead, these functions return a new object
   with the requested changes, and the passed-in object remain
   **unchanged**.

1. Create Thing with Updated Data
---------------------------------

To start, you need a data entity (a Thing) entity from which to create
the updated Thing:

- Use :apimodule:`getThingOne <_thing_thing_#getthingone>` to start
  with an existing data entity, or

- Use :apimodule:`createThing <_thing_thing_#creatething>` to create
  a new data entity.

The following example uses :apimodule:`createThing
<_thing_thing_#creatething>`.

.. literalinclude:: /examples/write-data-create-thing.js
   :language: typescript
   :start-after: BEGIN-EXAMPLE-WRITE-DATA-CREATE-THING
   :end-before: END-EXAMPLE-WRITE-DATA-CREATE-THING

With this Thing as a starting point, use the following functions to
create a **new** Thing with the modifications:

- :apimodule:`thing/add <_thing_add_>` functions to add new data,

- :apimodule:`thing/set <_thing_set_>` functions to replace existing
  data, and

- :apimodule:`thing/remove <_thing_remove_>` functions to remove
  data.

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

2. Insert the Thing into a LitDataset
-------------------------------------

After creating a new Thing with updated data, update a LitDataset with
the new Thing.

If the updated Thing was based on an existing Thing obtained from that
LitDataset, the updated Thing replaces the existing one.

.. literalinclude:: /examples/write-data-set-thing.js
   :language: typescript
   :start-after: BEGIN-EXAMPLE-WRITE-DATA-SET-THING
   :end-before: END-EXAMPLE-WRITE-DATA-SET-THING

3. Save the LitDataset to a Pod
-------------------------------

.. note::

   To write to a Pod, you must have the required access to write the
   data. For more information regarding access control, see
   :doc:`/tutorial/manage-access-control-list`.

To save the updated dataset to a Pod, use
:apimodule:`saveLitDatasetAt<_litdataset_#savelitdatasetat>`, passing
in its URL as well as the updated dataset.

.. literalinclude:: /examples/write-data-save-dataset.js
   :language: typescript
   :start-after: BEGIN-EXAMPLE-WRITE-DATA-SAVE-DATASET
   :end-before: END-EXAMPLE-WRITE-DATA-SAVE-DATASET

If the given URL already contains a dataset, the dataset is replaced
with the updated dataset.

.. toctree::
   :titlesonly:
   :hidden:

   /tutorial/read-write-files
