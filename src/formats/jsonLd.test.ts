/**
 * Copyright 2021 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { jest, describe, it, expect } from "@jest/globals";
import { foaf, rdf } from "rdf-namespaces";
import { DataFactory } from "n3";
import jsonld from "jsonld";
import { getJsonLdParser } from "./jsonLd";

describe("The Parser", () => {
  it("should correctly find all triples in raw JSON-LD", async () => {
    const parser = getJsonLdParser();
    type OnQuadReturnType = ReturnType<Parameters<typeof parser.onQuad>[0]>;
    type OnQuadParameters = Parameters<Parameters<typeof parser.onQuad>[0]>;
    const onQuadCallback = jest.fn<OnQuadReturnType, OnQuadParameters>();
    const onCompleteCallback = jest.fn();

    parser.onQuad(onQuadCallback);
    parser.onComplete(onCompleteCallback);
    const jsonLd = `
    {
      "@id":"https://example.com/some-path#someSubject",
      "@type":"http://xmlns.com/foaf/0.1/Person",
      "http://xmlns.com/foaf/0.1/name":"Some name"
    }
  `;

    await parser.parse(jsonLd, {
      internal_resourceInfo: {
        sourceIri: "https://example.com/some-path",
        isRawData: false,
        linkedResources: {},
      },
    });

    const expectedTriple1 = DataFactory.quad(
      DataFactory.namedNode("https://example.com/some-path#someSubject"),
      DataFactory.namedNode(rdf.type),
      DataFactory.namedNode(foaf.Person),
      undefined
    );
    const expectedTriple2 = DataFactory.quad(
      DataFactory.namedNode("https://example.com/some-path#someSubject"),
      DataFactory.namedNode(foaf.name),
      DataFactory.literal("Some name"),
      undefined
    );

    // Our RDF parser will use a very specific implementation, which may use a
    // different RDF/JS implementation than our main code. This is no problem,
    // but we just need to make sure we use the RDF/JS 'quad equals' method
    // instead of the generic Jest `.toEqual()`, since it's RDF-quad-equality
    // we're checking, and not quad-implementation-equality.
    expect(onQuadCallback).toHaveBeenCalledTimes(2);
    expect(onQuadCallback.mock.calls[0][0].equals(expectedTriple1)).toBe(true);
    expect(onQuadCallback.mock.calls[1][0].equals(expectedTriple2)).toBe(true);
    expect(onCompleteCallback).toHaveBeenCalledTimes(1);
  });

  it("should reject if the JSON-LD is invalid", async () => {
    const parser = getJsonLdParser();
    const onErrorCallback = jest.fn();
    const onCompleteCallback = jest.fn();

    parser.onError(onErrorCallback);
    parser.onComplete(onCompleteCallback);
    const jsonLd = `
    {
      "@id":"https://example.com/some-path#someSubject",
      "@type":"http://xmlns.com/foaf/0.1/Person",
      "http://xmlns.com/foaf/0.1/name":“A literal with invalid quotes”
    }
  `;
    await parser.parse(jsonLd, {
      internal_resourceInfo: {
        sourceIri: "https://example.com/some-path",
        isRawData: false,
        linkedResources: {},
      },
    });

    expect(onErrorCallback).toHaveBeenCalledTimes(1);
    expect(onErrorCallback.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it("should throw an error if jsonld returns unknown termType", async () => {
    const parser = getJsonLdParser();
    const onErrorCallback = jest.fn();
    const onCompleteCallback = jest.fn();

    parser.onError(onErrorCallback);
    parser.onComplete(onCompleteCallback);
    const jsonLd = `
    {
      "@id":"https://example.com/some-path#someSubject",
      "@type":"http://xmlns.com/foaf/0.1/Person",
      "http://xmlns.com/foaf/0.1/name":"Some name"
    }
  `;

    jest.spyOn(jsonld, "toRDF").mockResolvedValueOnce([
      {
        subject: {
          termType: "FakeTermType",
          value: "https://example.com/some-path#someSubject",
        },
        predicate: {
          termType: "NamedNode",
          value: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        },
        object: {
          termType: "NamedNode",
          value: "http://xmlns.com/foaf/0.1/Person",
        },
        graph: { termType: "DefaultGraph", value: "" },
      },
    ]);
    await parser.parse(jsonLd, {
      internal_resourceInfo: {
        sourceIri: "https://example.com/some-path",
        isRawData: false,
        linkedResources: {},
      },
    });

    expect(onErrorCallback).toHaveBeenCalledTimes(1);
    expect(onErrorCallback.mock.calls[0][0]).toBeInstanceOf(Error);
  });
});
