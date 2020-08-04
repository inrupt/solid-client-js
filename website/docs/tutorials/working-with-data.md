---
id: working-with-data
title: Working with Data
sidebar_label: Working with Data
---

The two most important data structures when working with data in solid-client are the `Thing` and the `SolidDataset`:

- A [**`Thing`**](../api/modules/_interfaces_.md#thing) is the most basic store of data about a particular subject.
  Each Thing has its own URL to identify it. For example, the URL of the Thing about yours truly is:

  `https://vincentt.inrupt.net/profile/card#me`.

- A [**`SolidDataset`**](../api/modules/_interfaces_.md#soliddataset) is a set of Things.
  It is primarily useful to be able to store multiple Things at the same location.

Typically, all the Things in a SolidDataset will have URLs relative to the location of that SolidDataset.
For example, I could store Things for notes I've taken at `https://vincent-test.inrupt.net/notes`, using URLs like:

- `https://vincent-test.inrupt.net/notes#note1`
- `https://vincent-test.inrupt.net/notes#note2`
- `https://vincent-test.inrupt.net/notes#note3`

I could even add a Thing with the URL of the SolidDataset itself, e.g. to keep a list of the notes at that location.

:::note A note about interoperability

You might be wondering why we're not working with plain Javascript objects, storing them as JSON.
And while [you _can_ do that](./working-with-files.md), there is one primary advantage of our approach:
**interoperability**.

By giving every Thing its own URL, it can be combined with other data by linking to it. For example,
instead of users having to manually enter the names of all their contacts, a pointer to the Thing
representing that contact allows you to re-use the name defined in that Thing.

:::

## Reading data

Reading data in Solid therefore usually consists of the following steps:

1. Fetch the SolidDataset that contains the Thing(s) you are interested in.
2. Obtain the Thing from the resulting SolidDataset.
3. Read the applicable data from that Thing.

Let's go over those steps one by one.

### 1. Fetch a SolidDataset

To fetch a SolidDataset, pass its URL to
[`getSolidDataset`](../api/modules/_resource_soliddataset_.md#getsoliddataset). Usually, the first SolidDataset to
fetch will be the one at the authenticated user's [WebID](../glossary.mdx#webid), which will contain
links to other potentially relevant SolidDatasets.

```typescript
import { getSolidDataset } from "@inrupt/solid-client";

const solidDataset = await getSolidDataset(
  "https://example.com/some/interesting/resource"
);
```

### 2. Obtain a Thing

Given a SolidDataset, you can either extract a single Thing for which you know its URL (e.g. because
you found that URL on another Thing) using
[`getThingOne`](../api/modules/_thing_thing_.md#getthingone), or simply take all the
Things inside the SolidDataset using [`getThingAll`](../api/modules/_thing_thing_.md#getthingall)

```typescript
import { getThingOne } from "@inrupt/solid-client";

const thing = getThingOne(
  solidDataset,
  "https://example.com/some/interesting/resource#thing"
);
```

### 3. Read data

There are three things to know about data in Solid:

1. Data is attached to a Thing via a URL that uniquely identifies what of the Thing's characteristics it describes.
2. Data is typed, e.g. as a string, an integer or a URL (e.g. pointing to other Things).
3. There can be zero, one or more values for each characteristic.

As an example, in my profile, an app can look for my name using the URL `http://xmlns.com/foaf/0.1/name`.
This [property](../glossary.mdx#property) is explicitly understood to be a name, and not just a family
name or a given name. Additionally, it is understood that the name is a string, and that something
can have more than one names.

:::note Who decides on these URLs?

The URL is decided on by whomever writes the data, and can be any arbitrary URL.
However, agreeing on a specific URL for specific types of data can make different apps interoperable.
To encourage interoperability, people have come together to agree on specific URLs for specific types of data for common use cases — so-called _Vocabularies_.

In the above example, the URL is part of the "Friend of a Friend" [(FOAF) Vocabulary](http://xmlns.com/foaf/spec).
In this case, you can even follow the link to see a description of how they intended `name` to be used
(with a string, possibly multiple ones).

:::

To access data, you use the appropriate function depending on what type of data you expect,
how much of it, and pass it the URL that identifies which of the Thing's characteristics you're looking for.
For example:

```typescript
import {
  getStringNoLocaleAll,
  getStringNoLocaleOne,
  getUrlAll,
} from "@inrupt/solid-client";

// We're looking for data…
// …stating the Thing's name (`http://xmlns.com/foaf/0.1/name`)
// …of type string
// …and we expect multiple values:
const names = getStringNoLocaleAll(thing, "http://xmlns.com/foaf/0.1/name");
// => an array of strings representing the `http://xmlns.com/foaf/0.1/name`.

// We're looking for data…
// …stating the Thing's Skype ID (`http://xmlns.com/foaf/0.1/skypeId`)
// …of type string
// …and we want just one value, assuming it to be the only one:
const skypeId = getStringNoLocaleOne(
  thing,
  "http://xmlns.com/foaf/0.1/skypeId"
);
// => one of the strings representing the `http://xmlns.com/foaf/0.1/skypeId`,
//    or null if there were none.

// We're looking for data…
// …stating the Thing's acquaintances (`http://xmlns.com/foaf/0.1/knows`)
// …of type URL
// …and we expect multiple values:
const acquaintances = getUrlAll(thing, "http://xmlns.com/foaf/0.1/knows");
// => an array of URLs, presumably pointing to the Things describing acquaintances.
```

For an overview of all data access functions, see [`thing/get`](../api/modules/_thing_get_.md).

### Reading data - full example

Putting it all together, here's an example of fetching the nickname of someone with a known
[WebID](../glossary.mdx#webid) (`https://vincentt.inrupt.net/profile/card#me`):

```typescript
import {
  getSolidDataset,
  getThingOne,
  getStringNoLocaleOne,
} from "@inrupt/solid-client";

const profileResource = await getSolidDataset(
  "https://vincentt.inrupt.net/profile/card"
);

const profile = getThingOne(
  profileResource,
  "https://vincentt.inrupt.net/profile/card#me"
);

const nickName = getStringNoLocaleOne(
  profile,
  "http://xmlns.com/foaf/0.1/nick"
);
```

## Writing data

The process of writing data is roughly the inverse of the process of [reading data](#reading-data).
That is to say:

1. Create a Thing with the data you want to write.
2. Insert the Thing into a SolidDataset.
3. Send the SolidDataset to a Pod.

Again, let's cover them one by one.

### 1. Add data to a Thing

We can start with [a Thing we obtained earlier](#2-obtain-a-thing), or create an empty one:

```typescript
import { createThing } from "@inrupt/solid-client";

const thing = createThing();
```

As [when reading data](#3-read-data), we need to know three things about our data:

1. What URL identifies the characteristic described by this data.
2. What type it has.
3. Whether it's the only value of its kind, or one of many.

Let's say we're trying to add a nickname, a characteristic identified by `http://xmlns.com/foaf/0.1/nick`.
It will be a string (`"timbl"`), and will be in addition to any existing nicknames already listed in `thing`:

```typescript
import { addStringNoLocale } from "@inrupt/solid-client";

let updatedThing = addStringNoLocale(
  thing,
  `http://xmlns.com/foaf/0.1/nick`,
  "timbl"
);
```

Alternatively, if we want to replace existing values, we use the `set*` functions.
Likewise, for removing data there are `remove*` functions.
See which are available for which data type at
[`thing/add`](../api/modules/_thing_add_.md), [`thing/set`](../api/modules/_thing_set_.md) and
[`thing/remove`](../api/modules/_thing_remove_.md).

:::tip A heads-up about immutability

Note that solid-client never modifies the objects you provide to it.
Instead, it will create a new object based on the one it is given,
with the requested changes applied.

In other words, if you were to read the nickname from `thing` in the code snippet above,
you would not get the value we just added. Instead, you'll have to read it from `updatedThing`.

This makes it easier to write unit tests and gives you more control over state changes,
but it _is_ something to keep in mind.

:::

### 2. Insert the Thing into a SolidDataset

After creating a Thing with updated data, we can update a SolidDataset with the new Thing.
If the updated Thing was based on an existing Thing obtained from that SolidDataset,
the updated Thing will replace the previous one.

```typescript
import { setThing } from "@inrupt/solid-client";

const updatedDataset = setThing(solidDataset, updatedThing);
```

### 3. Send the SolidDataset to a Pod

To save the updated SolidDataset to a Pod, use
[`saveSolidDatasetAt`](../api/modules/_resource_soliddataset_.md#savesoliddatasetat).
If the given location already contains data, that will be updated to match the given SolidDataset.

```typescript
import { saveSolidDatasetAt } from "@inrupt/solid-client";

const savedSolidDataset = await saveSolidDatasetAt(
  "https://example.com/some/interesting/resource",
  updatedDataset
);
```

### Saving data - full example

Putting it all together, here's an example of fetching someone's profile, changing their nickname,
and saving it back:

```typescript
import {
  getSolidDataset,
  getThingOne,
  setStringNoLocaleOne,
  setThing,
  saveSolidDatasetAt,
} from "@inrupt/solid-client";

const profileResource = await getSolidDataset(
  "https://vincentt.inrupt.net/profile/card"
);

const profile = getThingOne(
  profileResource,
  "https://vincentt.inrupt.net/profile/card#me"
);

const updatedProfile = setStringNoLocaleOne(
  profile,
  "http://xmlns.com/foaf/0.1/nick",
  "Your humble tutorial writer"
);

const updatedProfileResource = setThing(profileResource, updatedProfile);

const updatedProfileResource = await saveSolidDatasetAt(
  "https://vincentt.inrupt.net/profile/card",
  updatedProfileResource
);
```

:::note

Writing to a Pod is subject to access restriction:
if you try to run this _exact_ example it will fail,
because not everyone can write data into `https://vincentt.inrupt.net/profile/card`.
It is, after all, my personal profile!
For more details about access management, see [Managing Access](./managing-access.md).

:::
