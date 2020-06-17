---
id: introduction
title: Introduction
sidebar_label: Introduction
---

lit-pod is intended to make it as easy as possible to work with
data managed in Solid Pods.

## LitDataset

The LitDataset is the fundamental concept we use. It's simply a self-contained
unit of data (i.e. a "_set of facts_"). For example:

- All the data from a HTTP GET request (perhaps also including the HTTP response
 headers, and perhaps all the request data too (with it’s headers)).

- All the data from a local file (including meta-data like the filename, date
last modified, POSIX permissions, etc.).

- All the data from a SQL database query (perhaps also including the query
itself, the date/time it was executed.

To allow distinguishing between the potentially many ‘parts’ of a single
Dataset, we support Scopes.


### Scope

As with any messaging-passing paradigm, the notion of segmenting, grouping or
scoping data can be extremely useful. Examples of Scopes within a Dataset might
be:

The body of the data (e.g. the JPEG binary data of a photo).
 (current terminology)
 
- Headers associated with the data (e.g. the HTTP Accept header, or FTP file
transfer settings).

- Permissions associated with the data (e.g. POSIX permissions, WebACL
permissions, LDAP permissions, etc.).

- Client-provided meta-data (e.g. for a photo image, perhaps the ‘body’ is JPEG
data, but the camera-aperture settings, and the GPS location would be scoped to
client-metadata).

- Data validation meta-data (e.g. the ShEx or SHACL shape that the data conforms
to).


### Facts
Within any scope, data is held as ‘Facts’, which are the most atomic ‘units’ of
data in our model - i.e. no data can exist outside of a fact. All facts have 4
simple components: the Thing the fact relates to, a Property of the Thing, a
Value for the Property of the Thing and the Scope for the fact. For example, the
following Document contains 9 facts, in two scopes about 3 Things:

| Thing         | Property      | Value       | Scope     |
| ------------- |:-------------:| ------------:|----------:|
| <Pat\>        | <Type\>      | <Person\>  | <Body\>    |
| <Tommy\>      | <Type\>      | <Person\>  | <Body\>    |
| <Pat\>        | <knows\>      | <Tommy\>  | <Body\>    |
| <Tommy\>      | <gender\>      | male  | <Body\>    |
| <Tommy\>      | <age\>      | 5  | <Body\>    |
| <Tommy\>      | <eye_colour\>      | green  | <Body\>    |
| <Tommy\>      | <knows\>      | <Ellie\>  | <Body\>    |
| <Tommy\>      | <knows\>      | <Pat\>  | <Body\>    |
| <Permission\> | <allow_access\>      | <everyone\>  | <AccessControlList\> |


**NOTE**: values delimited with ‘<' and ’>' above denote IRIs (just URIs that
can contain a broader range of internalized characers, such as the umlaut 'Ä',
or the Greek letter 'Δ').

Basically that’s it - that’s our complete data model.


### Working with Things

Often it’s convenient to work with just the facts relating to a single Thing,
for example to work with all the facts related to Tommy in the example above.
For this we provide the Thing data structure. For example:

```typescript
const myDoc: LitDataset = await fetchLitDocument("http://my.pod/data");
const tommyFacts: Thing = getThingOne(myDoc, "<Tommy>");
const tommyAge: number = getIntegerOne(tommyFacts, "<age>");
```

## Advanced usage - Fluent DSL (Domain Specific Language)

Just to note, we also propose a fluent DSL that does not rely on the Thing data
structure at all. This DSL can be very convenient for directly accessing facts
without the notion of grouping the fact relating to a Thing first. For example,
to repeat the example of getting Tommy’s age and list of people he knows:

```typescript
const myDoc: LitDataset = await fetchLitDocument("http://my.pod/data");
const tommyAge: number = query(myDoc).thing("<Tommy>").property("<age>").asInteger.one;
```

Since the DSL can easily maintain state across method calls (e.g. for navigating
through the data in our dataset), scoping is also very easy. For example, to get
the date a photo was taken from the meta-data associated with the photo in a
single LitDataset, we could do this:

```typescript
const photoDate: Date = query(myDoc).scope("<ClientMetadata>").property("<dateTaken").value.one;
```
