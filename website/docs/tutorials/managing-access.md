---
id: managing-access
title: Managing Access to Data
sidebar_label: Managing Access
---

:::warning

The Solid specification has not settled yet, and access management specifically is expected to
change in the future.

As a result, the API's described here are expected to change as well.
Hence, all functions are marked as `unstable_` and may break in future non-major releases.

:::

## Access Control in Solid

In Solid, who has what access to a [Resource](../glossary.mdx#resource) is defined in an Access Control
List ([ACL](../glossary.mdx#acl)). These may be defined in separate Resources, so if you want to be able
to access the ACLs for a Resource in addition to the Resource itself, you'll have to explicitly
fetch them using
[`unstable_fetchLitDatasetWithAcl`](../api/modules/_resource_litdataset_.md#unstable_fetchlitdatasetwithacl) —
but be aware that this may result in several extra HTTP requests being sent.

The possible [Access Modes](../glossary.mdx#access-modes) that can be granted are
[Read](../glossary.mdx#read-access), [Append](../glossary.mdx#append-access),
[Write](../glossary.mdx#write-access) and [Control](../glossary.mdx#control-access),

:::note A note about access to ACLs

A Resource's or Container's ACL is only accessible to your app if the following are true:

1. The authenticated user must have authorised your app to manage access on their behalf. At the
   time of writing, the most common Solid server has that permission unchecked by default, i.e.
   users will need to have actively given your app this permission.
2. The authenticated user should have [Control access](../glossary.mdx#control-access) to the
   applicable Resource or Container.

:::

## Finding out who has access

Access can be granted to individual [agents](../glossary.mdx#agent), to groups, or even to everyone.
We currently only support reading what access has been granted to individual agents specifically.

### Fetching access information

Getting access information when fetching a resource may result in an additional request to the server. To avoid
unecessary requests, the API makes it explicit when you get access information along your resource: `unstable_fetchLitDatasetWithAcl`. The returned value includes both the Resource data (e.g. your profile or friend list), the `ResourceInfo`,
and the ACL containing the associated access information.

### Reading public access

Given a [LitDataset](../glossary.mdx#litdataset) that has an ACL attached, you can check what access
everyone has, regardless of whether they are authenticated or not. You can do so using
[`unstable_getPublicAccess`](../api/modules/_acl_agentclass_.md#unstable_getpublicaccess):

```typescript
import {
  unstable_fetchLitDatasetWithAcl,
  unstable_getPublicAccess,
} from "@solid/lit-pod";

const webId = "https://example.com/profile#webid";
const litDatasetWithAcl = await unstable_fetchLitDatasetWithAcl(
  "https://example.com"
);
const publicAccess = unstable_getPublicAccess(litDatasetWithAcl);

// => an object like
//    { read: true, append: false, write: false, control: true }
//    or null if the ACL is not accessible to the current user.
```

### Reading agent access

Given a [LitDataset](../glossary.mdx#litdataset) that has an ACL attached, you can check what access a
specific agent has been granted, or get all agents for which access has been explicitly granted.

To do the former, use
[`unstable_getAgentAccessOne`](../api/modules/_acl_agent_.md#unstable_getagentaccessone):

```typescript
import {
  unstable_fetchLitDatasetWithAcl,
  unstable_getAgentAccessOne,
} from "@solid/lit-pod";

const webId = "https://example.com/profile#webid";
const litDatasetWithAcl = await unstable_fetchLitDatasetWithAcl(
  "https://example.com"
);
const agentAccess = unstable_getAgentAccessOne(litDatasetWithAcl, webId);

// => an object like
//    { read: true, append: false, write: false, control: true }
//    or null if the ACL is not accessible to the current user.
```

To get all agents to whom access was granted, use
[`unstable_getAgentAccessAll`](../api/modules/_acl_agent_.md#unstable_getagentaccessall):

```typescript
import {
  unstable_fetchLitDatasetWithAcl,
  unstable_getAgentAccessAll,
} from "@solid/lit-pod";

const litDatasetWithAcl = await unstable_fetchLitDatasetWithAcl(
  "https://example.com"
);
const accessByAgent = unstable_getAgentAccessAll(litDatasetWithAcl);

// => an object like
//    {
//      "https://example.com/profile#webid":
//        { read: true, append: false, write: false, control: true },
//      "https://example.com/other-profile#webid":
//        { read: true, append: false, write: false, control: false },
//    }
```

## Changing who has access

:::caution

This section is still being written.

:::

### Two types of ACL

A Resource _can_ have an ACL that applies to just that Resource. However, if no such ACL exists, the
Pod server will fall back to the ACL of its [Container](../glossary.mdx#container) — or its Container's
Container's, or its Container's Container's Container's, etc.

Thus, an ACL can control both access to a specific Resource or Container directly, and provide
_default_ access rules: those that apply to the _children_ of the applicable Container when it
serves as their fallback ACL. Note that the Container's _Resource_ access rules will _not_ apply to
its children.
