========
Glossary
========

For questions around the concepts and terminology specific to Solid,
refer to `<https://solidproject.org/faqs>`_.

.. glossary::


   ACL
      An **Access Control List**.

   Agent
      A user. :term:`Agent` typically refers to a person but could also
      refer to other users, e.g., applications, bots.

   Access Modes
      The types of access that have been granted by an :term:`ACL`,
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

   LitDataset
      All the :term:`Things <Thing>` that are (to be) stored in a
      specific :term:`Resource`.

   Resource
      The thing sent to you when you type a URL into a web browser.

   Read Access
      When an :term:`ACL` grants Read access, the grantee is allowed to
      view the contents of the applicable :term:`Resource`.

   Thing
      A set of data about a single entity. For example, a :term:`Thing`
      about a person could include data about the person's name.

   WebID
      A URL that identifies a user or other :term:`Agent`. The
      :term:`Resource` found at this URL can provide more information
      about this Agent, such as the location of their data.

   Write Access
      When an :term:`ACL` grants Write access, the grantee is allowed
      to change the contents of the applicable :term:`Resource`.
      Granting Write access automatically also grants :term:`Append
      Access` access.

