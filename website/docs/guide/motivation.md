---
id: motivation
title: Motivation
sidebar_label: Motivation
---

[Solid](https://solidproject.org) is a wonderful project, but the technology it's built on —[RDF](https://en.wikipedia.org/wiki/Resource_Description_Framework)— is unfamiliar to many developers and has a relatively high barrier to entry.

The main goal of solid-client is to make it as easy as possible for engineers to get started writing apps both for the browser and for Node that store data on Solid Pods by providing an abstraction layer on top of both Solid and RDF principles, without hampering the ability to leverage the more advanced capabilities of RDF if so desired.

## Goals

To achieve this, solid-client has the following major focus areas.

### Documentation

Clear and extensive documentation is crucial when learning how to work with a new library. If any documentation is missing or is unclear, please [file a bug](https://github.com/inrupt/solid-client/issues/new?labels=documentation&template=docs_request.md).

### Testing

There's almost nothing as confusing as being unsure whether a bug is in your own code, or in the library you use. To ensure maximum reliability, solid-client is exposed to an extensive suite of automated tests, achieving 100% branch coverage with its unit tests.

### Interoperability

Whereas solid-client makes it easy to get started with Solid, it should not lock you in when you are ready to move on to more advanced use cases. That's why solid-client is compatible with the [RDF/JS specification](https://rdf.js.org), allowing you to seamlessly switch between solid-client and libraries that support more advanced use cases for RDF.

## Non-goals

To ensure we achieve those goals, it is important to have a clear focus. Therefore, the following areas are out of scope for the foreseeable future.

### Reasoning

While RDF is explicitly designed to support reasoning over data, it is not entirely clear yet how that would work in practice, especially in the context of Solid. Therefore, solid-client requires you to explicitly indicate what data you are reading/writing, and only data explicitly stated in the target Pod will be considered.

### Implicit data fetching

Analogous to the previous point, solid-client will not try to determine where data might live and attempt to transparently fetch it for you. That means that it is up to the developer to determine when to follow a link.
