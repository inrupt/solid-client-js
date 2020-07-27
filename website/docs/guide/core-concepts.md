---
id: core-concepts
title: Core Concepts
sidebar_label: Core Concepts
---

## Fetching data

In general, working with data using lit-pod involves two steps: making a request to some web address (URL) to fetch an object containing all data at that address (a [`LitDataset`](../glossary.md#litdataset)), and then passing that object to functions to extract and manipulate sets of data from it that are relevant to you (which we call [`Thing`s](../glossary.md#thing)).

<!--

TODO:
If the spec gets updated to support atomic fetching and updates of multiple Named Graphs at the same Resource,
this section should be updated to clarify that; the slicing-and-dicing idea might make more sense with that context.

-->

For example, to read my name, you would first fetch a LitDataset from `https://vincentt.inrupt.net/profile/card`, the URL at which my personal information is stored. Then, from that LitDataset, you could extract the Thing that represents my profile. From that, you can then read my name.

For a more extensive overview of fetching and manipulating data, see the tutorial [Working with Data](../tutorials/working-with-data.md).

## Immutability

The functions exposed in lit-pod are designed to take data as input, apply some transformation, and return the transformed data as output **without changing the input data**. That makes it easier for you to write unit tests, and enables frameworks that want to be notified of changes to data (like most modern front-end frameworks) to apply performance optimizations like memoisation, checking for updates by references rather than doing deep comparisons. However, it is good to be aware of this fact; when you're seeing stale data, that is likely the result of a variable pointing to an input value, rather than to the returned result.

<!--

TODO:
Once we add a Fluent API, we should add a section here about gradually exposing advanced interfaces,
add an "Advanced Usage" section to the documentation, and refer to that.

-->
