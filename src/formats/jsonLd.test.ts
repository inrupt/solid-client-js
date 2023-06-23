//
// Copyright Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import { jest, describe, it, expect } from "@jest/globals";
import { Response } from "@inrupt/universal-fetch";
import { foaf, rdf } from "rdf-namespaces";
import { DataFactory } from "n3";
import { isomorphic } from "rdf-isomorphic";
import type * as RDF from "@rdfjs/types";
import { getJsonLdParser } from "./jsonLd";

jest.mock("../fetcher.ts", () => ({
  fetch: jest
    .fn()
    .mockImplementation(() => Promise.resolve(new Response(undefined, {}))),
}));

async function stringToArray(str: string) {
  const parser = getJsonLdParser();

  const quadArr: RDF.Quad[] = [];

  await new Promise<void>((res, rej) => {
    parser.onQuad((quad) => quadArr.push(quad));
    parser.onError(rej);
    parser.onComplete(res);
    parser.parse(str, {
      internal_resourceInfo: {
        sourceIri: "https://some.pod/resource",
        isRawData: false,
        linkedResources: {},
      },
    });
  });

  return quadArr;
}

const jsonLdUsername = `
{
  "@context":"https://pod.inrupt.com/solid/v1",
  "storage":"https://pod.inrupt.com/username/"
}`;

const jsonLdInvalidLiteral = `
{
  "@id":"https://example.com/some-path#someSubject",
  "@type":"http://xmlns.com/foaf/0.1/Person",
  "http://xmlns.com/foaf/0.1/name":“A literal with invalid quotes”
}`;

const jsonLdPersonData = `
{
  "@id":"https://example.com/some-path#someSubject",
  "@type":"http://xmlns.com/foaf/0.1/Person",
  "http://xmlns.com/foaf/0.1/name":"Some name"
}`;

const personQuads = [
  DataFactory.quad(
    DataFactory.namedNode("https://example.com/some-path#someSubject"),
    DataFactory.namedNode(rdf.type),
    DataFactory.namedNode(foaf.Person),
    undefined
  ),
  DataFactory.quad(
    DataFactory.namedNode("https://example.com/some-path#someSubject"),
    DataFactory.namedNode(foaf.name),
    DataFactory.literal("Some name"),
    undefined
  ),
];

describe("The Parser", () => {
  it("should correctly find all triples in raw JSON-LD", async () => {
    const parser = getJsonLdParser();
    const onQuadCallback = jest.fn<Parameters<typeof parser.onQuad>[0]>();
    const onCompleteCallback = jest.fn();

    parser.onQuad(onQuadCallback);
    parser.onComplete(onCompleteCallback);

    // FIXME: Despite the type signature, parser.parse does return a Promise,
    // so we await on it until we fix this behavior.
    await parser.parse(jsonLdPersonData, {
      internal_resourceInfo: {
        sourceIri: "https://example.com/some-path",
        isRawData: false,
        linkedResources: {},
      },
    });

    // Our RDF parser will use a very specific implementation, which may use a
    // different RDF/JS implementation than our main code. This is no problem,
    // but we just need to make sure we use the RDF/JS 'quad equals' method
    // instead of the generic Jest `.toEqual()`, since it's RDF-quad-equality
    // we're checking, and not quad-implementation-equality.
    expect(onQuadCallback).toHaveBeenCalledTimes(2);
    expect(
      isomorphic(
        onQuadCallback.mock.calls.map(([quad]) => quad),
        personQuads
      )
    ).toBe(true);
    expect(onCompleteCallback).toHaveBeenCalledTimes(1);
  });

  it("should reject if the JSON-LD is invalid", async () => {
    const parser = getJsonLdParser();
    const onErrorCallback = jest.fn();
    const onCompleteCallback = jest.fn();

    parser.onError(onErrorCallback);
    parser.onComplete(onCompleteCallback);
    // FIXME: Despite the type signature, parser.parse does return a Promise,
    // so we await on it until we fix this behavior.
    await parser.parse(jsonLdInvalidLiteral, {
      internal_resourceInfo: {
        sourceIri: "https://example.com/some-path",
        isRawData: false,
        linkedResources: {},
      },
    });

    expect(onErrorCallback).toHaveBeenCalledTimes(1);
    expect(onErrorCallback.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  describe("using custom fetcher for resolving contexts", () => {
    it("should resolve successfully", async () => {
      const parser = getJsonLdParser();
      const onErrorCallback = jest.fn();
      const onCompleteCallback = jest.fn();

      parser.onError(onErrorCallback);
      parser.onComplete(onCompleteCallback);
      parser.onQuad(() => {});

      const mockedFetcher = jest.requireMock("../fetcher.ts") as {
        fetch: jest.Mocked<typeof fetch>;
      };
      mockedFetcher.fetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            "@context": {
              pim: "http://www.w3.org/ns/pim/space#",
              "@version": 1.1,
              "@protected": true,
              id: "@id",
              type: "@type",
              storage: { "@id": "pim:storage", "@type": "@id" },
            },
          }),
          { headers: { "Content-Type": "application/ld+json" } }
        )
      );

      // FIXME: Despite the type signature, parser.parse does return a Promise,
      // so we await on it until we fix this behavior.
      await parser.parse(jsonLdUsername, {
        internal_resourceInfo: {
          sourceIri: "https://some.pod/resource",
          isRawData: false,
          linkedResources: {},
        },
      });

      expect(onErrorCallback).toHaveBeenCalledTimes(0);
      expect(onCompleteCallback).toHaveBeenCalledTimes(1);
      expect(mockedFetcher.fetch).toHaveBeenCalledTimes(1);
    });

    it("should handle errors gracefully", async () => {
      const parser = getJsonLdParser();
      const onErrorCallback = jest.fn();
      const onCompleteCallback = jest.fn();

      parser.onError(onErrorCallback);
      parser.onComplete(onCompleteCallback);

      const mockedFetcher = jest.requireMock("../fetcher.ts") as {
        fetch: jest.Mocked<typeof fetch>;
      };
      mockedFetcher.fetch.mockRejectedValue("Some error");

      // FIXME: Despite the type signature, parser.parse does return a Promise,
      // so we await on it until we fix this behavior.
      await parser.parse(jsonLdUsername, {
        internal_resourceInfo: {
          sourceIri: "https://some.pod/resource",
          isRawData: false,
          linkedResources: {},
        },
      });

      expect(onErrorCallback).toHaveBeenCalledTimes(1);
      expect(onCompleteCallback).toHaveBeenCalledTimes(1);
      expect(mockedFetcher.fetch).toHaveBeenCalledTimes(1);
    });

    it("Should parse valid JSON-LD to correct quads", async () => {
      expect(
        isomorphic(await stringToArray(jsonLdPersonData), personQuads)
      ).toBe(true);
    });

    it("Should throw error before complete on invalid JSON-LD", () => {
      return expect(stringToArray(jsonLdInvalidLiteral)).rejects.toThrow();
    });
  });
});
