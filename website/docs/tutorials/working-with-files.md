---
id: working-with-files
title: Working with Files
sidebar_label: Working with Files
---

Even if the core Solid data model is **structured** data (see [Working with data](./working-with-data)), a Solid Pod
can also act as a regular general-purpose data store. Besides your profile document, your friend list and the likes, your
Pod can also store your photos, PDFs and any other type of file. Note that the [access restrictions](./managing-access)
apply to files the same way they apply to any other [Resource](../glossary#resource).

Like anything else in your Pod, each file is a resource with a distinct URL, which may or may not contain a hint
such as a `.jpg` extension for a photo. You'll find that the functions available to read and write files to/from
your Pod are very close to the browser's `fetch`: files are represented as typed [`Blob`s](https://developer.mozilla.org/docs/Web/API/Blob), and the result of the functions is returned as a [`Response`](https://developer.mozilla.org/docs/Web/API/Response).

:::caution

The functions described in this documentation are still early stage, and subject to breaking changes.

:::

## Reading a file

Reading a file is just a matter of fetching the content available at a certain URL. You get a `Response` in return, which contains
the fetched file as a blob. It is then up to you to decode it appropriately.

```typescript
import { unstable_fetchFile } from "lit-solid";

const response = await unstable_fetchFile(
  "https://example.com/some/interesting/file"
);
if (response.ok) {
  const myFile = await response.blob();
}
```

## Deleting a file

Deleting a file is also a simple operation: you just erase the content available at a certain URL.

```typescript
import { unstable_fetchFile } from "lit-solid";

const response = await unstable_deleteFile(
  "https://example.com/some/boring/file"
);
if (response.ok) {
  console.log("File deleted !");
}
```

## Writing a file

There are two approaches to writing files:

1. you know exactly at which IRI your file should be saved (potentially overwriting any data that sat there previously)
2. you know what [Container](../glossary#container) should be the parent of your file, like saving it into a folder.

### Writing a file directly at a URL

With this approach, if the request succeeds, you know exactly what the URL of your file is.

```typescript
import { unstable_overwriteFile } from "lit-solid";

const response = await unstable_overwriteFile(
  "https://example.com/some/new/file",
  new Blob(["This is a plain piece of text"], { type: "plain/text" })
  // Or in Node:
  // Buffer.from("This is a plain piece of text", "utf8"), { type: "plain/text" })
);
if (response.ok) {
  console.log("File saved !");
}
```

### Saving a file into a parent resource

With this approach, you kindly ask the server to come up with a name for your file, potentially using a `slug` if you
provide one. Note that there is no guarantee about how the server will use the slug, if at all. In any case, if the slug
you provide matches a file that already exists under the same target resource, the server will create a new name for your
file so that no content is overwritten.

This means that you don't control the final name of your file though. To keep track of the name the server gave to your
file, you'll have to look up the `Location` header in the response, as shown in the code snippet below:

```typescript
import { unstable_saveFileInContainer } from "lit-solid";

const response = await unstable_saveFileInContainer(
  "https://example.com/some/folder",
  new Blob(["This is a plain piece of text"], { type: "plain/text" }),
  { slug: "new-file" }
);
if (response.ok) {
  const headers = await response.headers;
  console.log(`File saved at ${headers.get("Location")}`);
}
```

Note that the returned `Location` will be relative to the server's origin, so in the previous example `Location` might
be `/some/folder/new-file-3869a250`, which means the file is saved at the URL `https://example.com/some/folder/new-file-3869a250`.

## Customizing the requests

If you need to customize the request eventually sent to the server, you can do so by using the optional `init` parameter.
`init` conforms to the [`init` parameter](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Parameters) of the `fetch` API. For instance, the following code snippet sets a custom
header.

```typescript
import { unstable_fetchFile } from "lit-solid";

const response = await unstable_deleteFile(
  "https://example.com/some/boring/file",
  {
    init: {
      headers: {
        "My-Custom-Header": "Some fancy value",
      },
    },
  }
);
```

Note that some headers are used by the library, and should not be set manually:

- `Content-Type`
- `Slug`
- `If-None-Match`.

Likewise, the `method` field is reserved for the library, and should not be set in the optional `init` parameter.
