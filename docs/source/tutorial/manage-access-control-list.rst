===========================
Manage Access to Data (ACL)
===========================

Access Control List
===================

A :term:`Resource`'s Access Control Lists (ACLs) determine the access
to that Resource. An ACL entry can specify following :term:`Access
Modes` :

- :term:`Read Access`,

- :term:`Append Access`,

- :term:`Write Access`, and

- :term:`Control Access`.

Access (i.e. an ACL entry) can be granted to individual :term:`agents
<Agent>`, to groups, or even to everyone.

For a Resource, you can define:

- a Resource-specific ACL that applies only to that Resource, and

- an inheritable ACL that applies to the Resource's children as a
  default/fallback ACL if they don't specify their own
  Resource-specific ACL.

That is, if a Resource has a Resource-specific ACL, that ACL applies to
that Resource and only to that Resource. However, if the
Resource-specific ACL does not exist, the Resource's
:term:`Container`'s inheritable ACL (or if that is unset, then that of
its Container's Container, etc.) acts as the Resource's fallback ACL.
As such, the ACL for a Resource may be defined in separate Resource,
and retrieving a Resource with its ACL may result in extra HTTP
requests being sent.

.. topic:: Trusted Applications

   An application can access a Resource's or Container's ACL only if an
   Authenticated User with :term:`Control Access` to
   the applicable Resource or Container has authorized the application
   to manage access on their behalf.

Read Access Information for a Resource
======================================

To retrieve the ACL for a resource in addition to the Resource itself,
use the :apimodule:`unstable_fetchLitDatasetWithAcl
<_resource_litdataset_#unstable_fetchlitdatasetwithacl>` function.
The returned value includes the Resource data, the ``ResourceInfo``
(i.e., metadata), and the ACL.

.. note::

   The :apimodule:`unstable_fetchLitDatasetWithAcl
   <_resource_litdataset_.md#unstable_fetchlitdatasetwithacl>` function
   may result in extra HTTP requests being sent.

Read Public Access
------------------

From a :term:`LitDataset` that has an ACL attached, you can use
:apimodule:`unstable_getPublicAccess
<_acl_class_#unstable_getpublicaccess>` to retrieve the access granted
to the public in general, regardless of whether they are authenticated
or not.

.. literalinclude:: /examples/read-acl-public-access.js
   :language: typescript

Reading Agent Access
--------------------

From a :term:`LitDataset` that has an ACL attached, you can use:

- :apimodule:`unstable_getAgentAccessOne
  <_acl_agent_#unstable_getagentaccessone>` to retrieve the access
  granted to a specific agent:

  .. literalinclude:: /examples/read-acl-agent-access-one.js
     :language: typescript
     :start-after: BEGIN-EXAMPLE-READ-ACL-AGENT-ACCESS-ONE
     :end-before: END-EXAMPLE-READ-ACL-AGENT-ACCESS-ONE


- :apimodule:`unstable_getAgentAccessAll
  <_acl_agent_#unstable_getagentaccessall>` to retrieve access
  information for all agents that have access:

  .. literalinclude:: /examples/read-acl-agent-access-all.js
     :language: typescript
     :start-after: BEGIN-EXAMPLE-READ-ACL-AGENT-ACCESS-ALL
     :end-before: END-EXAMPLE-READ-ACL-AGENT-ACCESS-ALL

.. _manage-acl-change-access-to-resource:

Change Access to a Resource
===========================

The following outlines the steps for modifying a Resource-specific ACL.
If the Resource does not currently does not have a Resource-specific
ACL (i.e., the Resource uses its fallback ACL inherited from its
Container), the outline includes creating a Resource-specific ACL,
overriding the fallback ACL.

.. important::

   You must have :term:`Control Access` on the Resource to modify its
   ACL.

To modify access to a Resource:

#. Use :apimodule:`unstable_fetchLitDatasetWithAcl
   <_resource_litdataset_#unstable_fetchlitdatasetwithacl>` to retrieve
   the Resource and its ACL.

#. From the retrieved Resource, call :apimodule:`unstable_getResourceACL
   <_acl_acl_#unstable_getresourceacl>` to obtain its Resource-specific
   ACL. The function returns ``null`` if the Resource-specific ACL does
   not exists.

#. If the Resource-specific ACL exists,

   a. You can create a modified ACL from the existing Resource-specific
      ACL.

   #. Ensure that the modified ACL includes at least one entry with
      :term:`Control Access`.

   #. Save the modified ACL to the Pod.

#. Otherwise, you can create a new Resource-specific ACL and save. Once
   you save the new Resource-specific ACL, this ACL overrides the
   inherited fallback ACL.

   a. To create a new ACL, you can use :apimodule:`unstable_createAcl
      <_acl_acl_#unstable_createacl>` to create a new empty ACL.

   #. If you have access to the Resource's fallback ACL, you can
      copy the currently applicable rules to a newly-initialised ACL.

   #. Ensure that the modified ACL includes at least one entry with
      :term:`Control Access`.

   #. Save the modified ACL to the Pod.

The general process of changing access to a Resource is as follows:

.. literalinclude:: /examples/write-acl-resource.js
   :language: typescript
   :start-after: BEGIN-EXAMPLE-WRITE-ACL-RESOURCE
   :end-before: END-EXAMPLE-WRITE-ACL-RESOURCE

Set Public Access
-----------------

.. note::

   |product| currently does not support setting public access.

Set Agent Access
----------------

Given a Resource's ACL obtained as specified in
:ref:`manage-acl-change-access-to-resource`, you can:

- Use :apimodule:`unstable_setAgentResourceAccess
  <_acl_agent_#unstable_setagentresourceaccess>` to grant Access Modes
  to an Agent for the Resource itself:

  .. literalinclude:: /examples/write-acl-resource-agent.js
     :language: typescript
     :start-after: BEGIN-EXAMPLE-WRITE-ACL-RESOURCE-AGENT
     :end-before: END-EXAMPLE-WRITE-ACL-RESOURCE-AGENT

- Use :apimodule:`unstable_setAgentDefaultAccess
  <_acl_agent_#unstable_setagentdefaultaccess>` to grant Access Modes
  to an Agent for the Resource's children if the Resource is a
  Container:

  .. literalinclude:: /examples/write-acl-default-agent.js
     :language: typescript
     :start-after: BEGIN-EXAMPLE-WRITE-ACL-DEFAULT-AGENT
     :end-before: END-EXAMPLE-WRITE-ACL-DEFAULT-AGENT
