# `@inrupt/solid-client` architectural overview

This document describes the general design principles and modules of solid-client,
to help contributors make sure their and others' work is coherent with what's
there. It assumes that you are already familiar with the external API and
general concepts in solid-client; documentation about those can be found at the
following Resources:

- General documentation:
  https://docs.inrupt.com/sdk/javascript-sdkusing-libraries/
- Glossary:
  https://docs.inrupt.com/sdk/javascript-sdkreference/glossary/

It can also be insightful to use `git blame` liberally. We've generally kept
fairly good Git hygiene, so reading the commit that introduced some code can be
helpful in understanding how it relates to the rest of the codebase.

## Design principles

### Avoidance of side effects

Generally, our API's tend to avoid side effects whenever possible. That means
that we have a number of functions that only perform the side effects we cannot
avoid (fetching data, storing data, ...), and all the rest just take some data
as input and return modified copies of that data as output.

The reason for this is that the front-end world has mostly converged to
a model in which the relevant parts of the view are updated in response to
changes in the data, and to verify whether that data has changed using
referential equality (in other words, not comparing the content of the data,
but whether it is a new instance) to avoid costly comparisons — e.g. Virtual
DOM. Since Solid is all about the data, we avoid modifying the data in place to
support this common use case. (SolidDatasets used to be built on top of
[RDF/JS Datasets](https://rdf.js.org/dataset-spec/), but we moved away from that
to avoid its mutability and lack of serialisability because of the above.)

### Lumping ACLs and Resources together

Linked Resources, such as an Access Control Lists, are currently attached to the
same object that represents the Resource they are linked to. The reason for this
is to anticipate a possible future in which a Resource and its Linked Resources
might be updateable in a single, atomic HTTP request.

The reason for that would be to avoid issues with inconsistent data, where data
in a Resource and in one or more of its Linked Resources need to be updated
together: if this happens in separate HTTP requests, one of those might fail
while the other might succeed, e.g. because a network connection dropped in
between.

Although there has been no movement in this direction in the year and a half
that solid-client has now existed, it could be that the Solid specifications
at some point get updated to support fetching and updating both a Resource and
its linked Resources in a single request, e.g. by making the linked Resource
available in a different RDF Graph (i.e. using the fourth element of an RDF
Quad). solid-client anticipates such a future so that, at some point, a
function like `saveSolidDatasetAt` might update not just the data in the
Resource itself, but also that in one or more linked Resources.

This concern was mainly brought up by @pmcb55, so further questions regarding
this can be directed to him.

## Concepts

### Resources, Files and SolidDatasets

`solid-client` refers to everything that can be fetched from a URL as a Resource.
There are two types of Resources: those containing RDF in a serialisation that
the server understands ("SolidDatasets"), and those that do not ("Files").

The main difference between RDF and non-RDF resources is that, by virtue of the
server understanding the structure of the former, we can do partial updates (i.e.
PATCH requests) and retrieve the data in different formats (currently, the
Solid Protocol specification mandates that RDF data must be content negotiable
[as Turtle and JSON-LD](https://solidproject.org/TR/protocol#resource-representations)).

A SolidDataset is `solid-client`'s abstraction/data structure for RDF resources; other
types of resources are just treated as regular Files: while it might be possible to
parse and manipulate them using other libraries, `solid-client` just allows downloads
and uploads, and not more specific operations like reading values for a given property.
This applies to binary file types like JPEG, WebM and `.txt`.

When it comes to files containing structured data in a non-RDF format (such as JSON,
XML or OpenDocument) or files containing structured data in an RDF format not required
by the Solid Protocol (for example RDF/XML) it is up to the server to accept that
payload and treat it as a binary resource, interpret it as RDF, or reject it.

### `With*` types

Although SolidDatasets and Files (see previous section) are different types of
Resources, there is certain data that is common to all Resources. This data is
set on properties for either type of Resource, which is specified in a `With*`
type.

For example, there is some metadata determining where a particular Resource is
fetched from; this is set on the property `internal_resourceInfo` for both
SolidDatasets and Files, as specified by the `WithResourceInfo` type. Whether
a SolidDataset or a File has that metadata available is then available using a
Union Type, e.g. `SolidDataset & WithResourceInfo`.

This means that we can define a function like `getContentType` that doesn't
really care whether its argument is a SolidDataset or a File, as long as its
parameter has that metadata available:

function getContentType(resource: WithResourceInfo)

Note that in our API documentation, we explicitly reserve the right to change
the implementation of these data structures. If developers want to access the
data contained in them, they should use the functions we provide for them, such
as `getContentType`. We can, of course, use those internally as well.

## Module map

### `src/resource/*`

Everything related to fetching and storing data. `file.ts` has everything
related to fetching Files, which is mostly a thin wrapper around a regular
`fetch`, adding some metadata. `solidDataset.ts` is similar, but attempts to
parse the fetched data as RDF in order to turn it into a SolidDataset (see also
`/src/formats/*` below). And finally `resource.ts` has functions that apply
regardless of whether a Resource can be parsed as RDF or is a File, e.g. to
fetch metadata without the contents (in a `HEAD` request).

There is also `mock.ts`, a couple of functions that help developers simulate
SolidDatasets with the appropriate meta data in their unit tests. This helps
avoiding developers from attempting to recreate our metadata data structures,
and then breaking in a non-major version.

### `src/thing/*`

Everything related to reading and manipulating data in a SolidDataset.

### `src/formats/*`

We currently just support parsing Turtle natively (though developers can pass in
their own parsers), since the spec mandates that all servers should be able to
serialise RDF to that, and since we already have a Turtle library to produce
serialisations for PATCH requests.

### `universalAccess`, `src/acl/*` and `acp_ess_`

At first, there was one [authorization mechanism in Solid](https://solidproject.org/TR/protocol#authorization):
Web Access Control ([WAC](https://solidproject.org/TR/wac)). WAC uses the Access
Control List (ACL) model to set authorization.

A second model for expressing permission now exists: Access Control Policies
([ACP](https://github.com/solid/authorization-panel/blob/main/proposals/acp/index.md)).

`solid-client` includes code to achieve some simple, yet common, use cases
for setting permissions without having to understand the differences between or
details of the ACL and ACP domain models by providing a high level access control
module also called the "Universal Access API": `universalAccess`.

`solid-client` also includes lower level functions to interact directly with either
authorization systems (ACL: `src/acl/*` and ACP: `acp_ess_`). Those lower level
functions are for the time being still experimental and we don't advise using
them in production code.

### `e2e/browser` and `e2e/node`

`solid-client` can run in both Node and in the browser. To ensure that everything
works as intended, we have a suite of tests that attempts to use its APIs to
manipulate data on a real server.

However, because controlling tests running inside a browser is rather
cumbersome, and more importantly, because tests firing up a full browser
are generally flakier
(https://testing.googleblog.com/2017/04/where-do-our-flaky-tests-come-from.html),
the browser tests are mostly smoke tests: is it possible to import code from the
library and successfully send requests to a Pod server?

The Node-based end-to-end test suite is the more extensive one. It verifies not
just that the library works in Node, but also that e.g. manipulating access
correctly prevents or allows the right people access _in practice_.

## Opportunities for improvement

Given that the code base has existed for more than a day, some parts of the code
have evolved in a certain way that would have been done differently if they had
been implemented from scratch. These aren't major issues and so it hasn't been
worth it to go back and rework it, but they're good to know about if you come
across them and start wondering whether there's a good reason for things to be
that way. In the spirit of [Chesterton's Fence](https://en.wikipedia.org/wiki/Wikipedia:Chesterton%27s_fence),
if I tell you why they are the way they are, you can feel safe to change them!

### Using the solid-client-authn-browser default session

Currently, developers wanting to make authenticated requests will have to make
sure they pass in an authenticated `fetch` function. However, in the browser,
by default there's just a single session active.
`@inrupt/solid-client-authn-browser` now supports a "default" session; it would
be nice if we could autodetect if that package is present in the developer's
dependency tree and, if so, default to that session's fetch if none is provided
by the developer. There is some code already in `src/fetcher.ts` to support that
use case, but since the "default" session did not exist back then, it was not
implemented yet.

The interaction with bundlers here can be pretty tricky so, when implementing
this, be sure to test it well.

### The entire low-level Access Control Policies API

(i.e. `acp_ess_1` and `acp_ess_2`)

The low level ACP API was put together in a short timeframe and there are bound to be
idiosyncracies there. _Especially_ given that the ACP model is still a proposal.

One thing that might jump out to you in particular is the various module exports
(`v1.ts`, `v2.ts`, `v3.ts`, `v4.ts`, `acp_v1`, `acp_ess_1`, `acp_ess_2` etc...).
Back when there was no talk of there being alternative access mechanisms other
than Web Access Control and JavaScript did not have a way to expose submodules
to consumers, the WAC APIs were exported from the top level directly. However,
some of the ACP APIs have the same names as WAC APIs. For that reason, and to
avoid having to introduce breaking changes while iterating on the ACP APIs, we
chose to add all those APIs as properties on a top level export (forgoing tree-shaking).
That way, we could keep old versions available (but deprecated) while iterating
on the new ones.

Likewise, we initially thought there would be more Access Control
Policies-related data we would store for a given Resource, hence the
`WithAcp` type adding an `internal_acp` property. However, in the end it turned
out that that object would only contain a single `acr` property. Thus, it could
be either flattened some more, of even removed altogether if adding a standard
mechanism to attach linked Resources in general. (Keep in mind that that will
not work for Web Access Control, since that might require fetching a Resource
linked to a Resource higher up in the Container hierarchy.)

### `WithServerResourceInfo["aclUrl"]`

When the `aclUrl` property was added to the `WithServerResourceInfo` interface,
it was not clear to us that linked resources (i.e. those linked in the HTTP
Link header) would be a commonly-used mechanism to expose related data.
We later added the `WithServerResourceInfo["linkedResources"]` property, which
_also_ exposes the ACL URL, but didn't bother to update the old code to make
use of that instead.

### `src/interfaces.ts`

The interfaces defined here would probably make more sense defined in the
relevant modules. It might not even be necessary to add aliases from the old
module to the new one, as long as TypeScript does not support exports maps
yet. (Though adding them just to be sure probably isn't a bad idea.)

### ChangeLog

The ChangeLog currently consists of two arrays of RDF/JS Quads. This can be
problematic since those are instantiated classes, conflicting with e.g. [Vue's
desire to keep data plain](https://vuex.vuejs.org/guide/state.html#single-state-tree)
or [SWR only considering own properties](https://swr.vercel.app/advanced/performance#deep-comparison).
In practice this is probably not much of a problem, since the ChangeLog is only
updated when the SolidDataset itself is as well. However, if it turns out
problematic after all, it could be considered transforming them into plain
objects.

Or alternatively...

### PATCH and 412 conflicts

...it could be considered to remove the ChangeLog functionality altogether. One
of the most recurring problems people run into is not using the return value
from `saveSolidDatasetAt` to make further changes, but to keep building on top
of the SolidDataset passed to it as an argument. This eventually results in a
412 error as the ChangeLog is not reset, and thus a new call to
`saveSolidDataset` will try to delete data that has been deleted before.

Instead of attempting to do a `PATCH` with _just_ the requested changes, we
could simply `PUT` the entire SolidDataset just like we do for Files when
calling `overwriteFile`. This might more often do what the developer expects,
at the cost of sending bigger payloads and bigger risk of overwriting data that
was inserted in parallel on a different device or by a different user.

### `File`

`File` is a bit awkward now for two reasons:

1. it's not a plain object. It might be easier to transform it into something
   like `type File = { blob: Blob | Buffer }` for functions like `isRawData`.
   This will probably break for people expecting to be able to just pass it to
   third-party API's that accept `Blob`s though.
2. there's already a `File` type, used for `<input type="file">`:
   https://github.com/microsoft/TypeScript/blob/afe9cf5307e3e34c86c3bc6d3a5be5f9033be528/lib/lib.dom.d.ts#L5211-L5216
   This means that developers using TypeScript with the `dom` typings on will
   not get auto-imports from solid-client.
   This too, is hard to change without being breaking, although of course an
   alias could be added.

### ThingBuilder

`ThingBuilder` was created after the observation that this was a common pattern:

```typescript
let someThing = createThing();
someThing = addStringNoLocale(someThing, foaf.name, "Vincent");
someThing = addStringNoLocale(someThing, foaf.gender, "male");
```

The ThingBuilder allows doing that in a single statement without reassignment:

```typescript
const someThing = buildThing()
  .addStringNoLocale(foaf.name, "Vincent")
  .addStringNoLocale(foaf.gender, "male")
  .build();
```

This is nice, but it doesn't yet quite make it easy to conditionally set
properties without reassignment:

```typescript
const userBuilder = buildThing().addStringNoLocale(foaf.name, nameFromForm);

if (typeof genderFromForm !== "undefined") {
  // Does not currently modify `userBuilder`:
  userBuilder.addStringNoLocale(foaf.gender, genderFromForm);
}

const user = userBuilder.build();
```

Given that ThingBuilders are usually limited to a local scope, making it
stateful could be a nice quality of life improvement, and can be implemented
without breaking anything.

### `*StringNoLocale`

It might seem weird that there are `*StringNoLocale` and `*StringWithLocale`
functions, rather than just `*String` functions with an optional `locale`
parameter. This was a lengthy internal discussion where the decision was to nudge
developers to make a conscious choice whether or not to set a locale.

Note that the two are not interchangeable: RDF has different types for strings
with and without locales, and strings in different locales or without locales
are considered completely separate things. This means that when a developer
looks for a string with the locale `en`, they will not get strings with locales
of `nl`, or even `en-GB`, nor will they get strings without a locale. Likewise,
if they look for a string without a locale, they will not automatically get a
string that _does_ have a locale defined.
