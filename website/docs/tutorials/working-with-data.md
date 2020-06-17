---
id: working-with-data
title: Working with Data
sidebar_label: Working with Data
---

The two most important data structures when working with data in lit-pod are the `Thing` and the `LitDataset`:

- A [**`Thing`**](../api/modules/_interfaces_#thing) is the most basic store of data about a particular subject.
  Each Thing has its own URL to identify it. For example, the URL of the Thing about yours truly is:

  `https://vincentt.inrupt.net/profile/card#me`.

- A [**`LitDataset`**](../api/modules/_interfaces_#litdataset) is a set of Things.
  It is primarily useful to be able to store multiple Things at the same location.

Typically, all the Things in a LitDataset will have URLs relative to the location of that LitDataset.
For example, I could store Things for notes I've taken at `https://vincent-test.inrupt.net/notes`, using URLs like:

- `https://vincent-test.inrupt.net/notes#note1`
- `https://vincent-test.inrupt.net/notes#note2`
- `https://vincent-test.inrupt.net/notes#note3`

I could even add a Thing with the URL of the LitDataset itself, e.g. to keep a list of the notes at that location.

:::note A note about interoperability

You might be wondering why we're not working with plain Javascript objects, storing them as JSON.
And while [you _can_ do that](./working-with-files), there is one primary advantage of our approach:
**interoperability**.

By giving every Thing its own URL, it can be combined with other data by linking to it. For example,
instead of users having to manually enter the names of all their contacts, a pointer to the Thing
representing that contact allows you to re-use the name defined in that Thing.

:::

## Reading data

Reading data in Solid therefore usually consists of the following steps:

1. Fetch the LitDataset that contains the Thing(s) you are interested in.
2. Obtain the Thing from the resulting LitDataset.
3. Read the applicable data from that Thing.

Let's go over those steps one by one.

### 1. Fetch a LitDataset

To fetch a LitDataset, pass its URL to
[`fetchLitDataset`](../api/modules/_litdataset_#fetchlitdataset). Usually, the first LitDataset to
fetch will be the one at the authenticated user's [WebID](../glossary#webid), which will contain
links to other potentially relevant LitDatasets.

```typescript
import { fetchLitDataset } from "@solid/lit-pod";

const litDataset = await fetchLitDataset(
  "https://example.com/some/interesting/resource"
);
```

### 2. Obtain a Thing

Given a LitDataset, you can either extract a single Thing for which you know its URL (e.g. because
you found that URL on another Thing) using
[`getThingOne`](../api/modules/_thing_#getthingone), or simply take all the
Things inside the LitDataset using [`getThingAll`](../api/modules/_thing_#getthingall)

```typescript
import { getThingOne } from "@solid/lit-pod";

const thing = getThingOne(
  litDataset,
  "https://example.com/some/interesting/resource#thing"
);
```

### 3. Read data

There are three things to know about data in Solid:

1. Data is attached to a Thing via a URL that uniquely identifies what of the Thing's characteristics it describes.
2. Data is typed, e.g. as a string, an integer or a URL (e.g. pointing to other Things).
3. There can be zero, one or more values for each characteristic.

As an example, in my profile, an app can look for my name using the URL `http://xmlns.com/foaf/0.1/name`.
This is explicitly understood to be a name, and not just a family name or a given name.
Additionally, it is understood that the name is a string, and that something can have more than one
names.

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
} from "@solid/lit-pod";

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

For an overview of all data access functions, see [`thing/get`](../api/modules/_thing_get_).

### Reading data - full example

Putting it all together, here's an example of fetching the nickname of someone with a known
[WebID](../glossary#webid) (`https://vincentt.inrupt.net/profile/card#me`):

```typescript
import {
  fetchLitDataset,
  getThingOne,
  getStringNoLocaleOne,
} from "@solid/lit-pod";

const profileResource = await fetchLitDataset(
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
2. Insert the Thing into a LitDataset.
3. Send the LitDataset to a Pod.

Again, let's cover them one by one.

### 1. Add data to a Thing

We can start with [a Thing we obtained earlier](#2-obtain-a-thing), or create an empty one:

```typescript
import { createThing } from "@solid/lit-pod";

const thing = createThing();
```

As [when reading data](#3-read-data), we need to know three things about our data:

1. What URL identifies the characteristic described by this data.
2. What type it has.
3. Whether it's the only value of its kind, or one of many.

Let's say we're trying to add a nickname, a characteristic identified by `http://xmlns.com/foaf/0.1/nick`.
It will be a string (`"timbl"`), and will be in addition to any existing nicknames already listed in `thing`:

```typescript
import { addStringNoLocale } from "@solid/lit-pod";

let updatedThing = addStringNoLocale(
  thing,
  `http://xmlns.com/foaf/0.1/nick`,
  "timbl"
);
```

Alternatively, if we want to replace existing values, we use the `set*` functions.
Likewise, for removing data there are `remove*` functions.
See which are available for which data type at
[`thing/add`](../api/modules/_thing_add_), [`thing/set`](../api/modules/_thing_set_) and
[`thing/remove`](../api/modules/_thing_remove_).

:::tip A heads-up about immutability

Note that lit-pod never modifies the objects you provide to it.
Instead, it will create a new object based on the one it is given,
with the requested changes applied.

In other words, if you were to read the nickname from `thing` in the code snippet above,
you would not get the value we just added. Instead, you'll have to read it from `updatedThing`.

This makes it easier to write unit tests and gives you more control over state changes,
but it _is_ something to keep in mind.

:::

### 2. Insert the Thing into a LitDataset

After creating a Thing with updated data, we can update a LitDataset with the new Thing.
If the updated Thing was based on an existing Thing obtained from that LitDataset,
the updated Thing will replace the previous one.

```typescript
import { setThing } from "@solid/lit-pod";

const updatedDataset = setThing(litDataset, updatedThing);
```

### 3. Send the LitDataset to a Pod

To save the updated LitDataset to a Pod, use
[`saveLitDatasetAt`](../api/modules/_litdataset_#savelitdatasetat).
If the given location already contains data, that will be updated to match the given LitDataset.

```typescript
import { saveLitDatasetAt } from "@solid/lit-pod";

const savedLitDataset = await saveLitDatasetAt(
  "https://example.com/some/interesting/resource",
  updatedDataset
);
```

### Saving data - full example

Putting it all together, here's an example of fetching someone's profile, changing their nickname,
and saving it back:

```typescript
import {
  fetchLitDataset,
  getThingOne,
  setStringNoLocaleOne,
  setThing,
  saveLitDatasetAt,
} from "@solid/lit-pod";

const profileResource = await fetchLitDataset(
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

const updatedProfileResource = await saveLitDatasetAt(
  "https://vincentt.inrupt.net/profile/card",
  updatedProfileResource
);
```

:::note

Writing to a Pod is subject to access restriction:
if you try to run this _exact_ example it will fail,
because not everyone can write data into `https://vincentt.inrupt.net/profile/card`.
It is, after all, my personal profile!
For more details about access management, see [Managing Access](./managing-access).

:::
