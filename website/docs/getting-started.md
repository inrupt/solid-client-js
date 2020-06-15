---
id: getting-started
title: Getting Started with lit-solid
sidebar_label: Getting Started
---

:::caution

The documentation is still being written; here be dragons!

:::

## Installation

lit-solid is available as a package on npm, and can be used in the browser with a module bundler like Webpack, or in Node.js.

```bash
npm install lit-solid
```

If [solid-auth-client](https://www.npmjs.com/package/solid-auth-client) is installed,
lit-solid will automatically use it to make authenticated requests.
If no such authenticated fetcher is provided, only public [Resources](./glossary#resource) can be accessed.

## Quick start

### Fetching data

```typescript
import { fetchLitDataset } from "lit-solid";

const profileResource = await fetchLitDataset(
  "https://vincentt.inrupt.net/profile/card"
);
```

### Reading data

```typescript
import { getThingOne, getStringUnlocalisedOne } from "lit-solid";
import { foaf } from "rdf-namespaces";

const profile = getThingOne(
  profileResource,
  "https://vincentt.inrupt.net/profile/card#me"
);
const name = getStringUnlocalisedOne(profileResource, foaf.name);
```

For more details, see [Working with Data](./tutorials/working-with-data#reading-data).

### Writing data

```typescript
import { setStringUnlocalised, setThing, saveLitDatasetAt } from "lit-solid";
import { foaf } from "rdf-namespaces";

const updatedProfile = setStringUnlocalised(profile, foaf.name, "Vincent");
const updatedProfileResource = setThing(profileDoc, updatedProfile);

await saveLitDatasetAt(
  "https://vincentt.inrupt.net/profile/card",
  updatedProfileResource
);
```

For more details, see [Working with Data](./tutorials/working-with-data#writing-data).
