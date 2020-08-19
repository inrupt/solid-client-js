========
Glossary
========

For questions around the concepts and terminology specific to Solid,
refer to `<https://solidproject.org/faqs>`_.

.. glossary::


   ACL
      An **Access Control List**. ACL entry specifies the access
      granted to an agent to a resource.  See also :term:`Access Modes`.

   Agent
      A user. :term:`Agent` typically refers to a person but could also
      refer to other users, e.g., applications, bots.

   Access Modes
      The types of access that have been granted by an :term:`ACL`:
      :term:`Read Access`, :term:`Append Access`, :term:`Write Access`
      and/or :term:`Control Access`.

   Append Access
      When an :term:`ACL` grants Append access, the grantee is allowed
      to add data to the applicable :term:`Resource`, but it does not
      grant them access to remove any.

   Control Access
      When an :term:`ACL` grants Control access, the grantee is allowed
      to see and change who has access to the applicable
      :term:`Resource`.

   Container
      A special type of :term:`Resource` that can contain other
      Resources or Containers, much like folders on your file
      system.

      For example, given a Resource at
      ``https://cleopatra.solid.community/profile/card``, both
      ``https://cleopatra.solid.community/profile/`` and
      ``https://cleopatra.solid.community/`` are Containers.

   Default access
      Rules defining :term:`Access Modes` that apply not to the :term:`Container`
      Resource directly, but are inherited by its children, their children if
      applicable, and so forth.

   Fallback ACL
      If a :term:`Resource` does not have a :term:`Resource ACL`:, the Fallback
      ACL is the :term:`ACL` of the :term:`Container` closest to that Resource
      that has its own Resource ACL. Only the :term:`Default access` rules in
      the Fallback ACL apply.

   Pod
      Storage location for your data. You manage the
      access to data stored in your Pod.

   Resource
      The thing sent to you when you type a URL into a web browser.

   Resource ACL
      The :term:`ACL` that applies to a given :term:`Resource`. If none exists,
      the :term:`Fallback ACL` applies.

   Read Access
      When an :term:`ACL` grants Read access, the grantee is allowed to
      view the contents of the applicable :term:`Resource`.

   SolidDataset
      Set of :term:`Things <Thing>` that are stored in a
      specific :term:`Resource`.

   Thing
      A data entity, e.g., a person. A ``Thing`` is associated with a a
      set of data or properties about the Thing, e.g., ``name``.

   WebID
      A URL that identifies a user or other :term:`Agent`. The
      :term:`Resource` found at the :term:`WebID` can provide more
      information about this Agent, such as the location of their data.

   Write Access
      When an :term:`ACL` grants Write access, the grantee is allowed
      to change the contents of the applicable :term:`Resource`.
      Granting Write access automatically also grants :term:`Append
      Access`.
