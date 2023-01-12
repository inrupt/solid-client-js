//
// Copyright 2022 Inrupt Inc.
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

import { beforeAll, jest, describe, it, expect } from "@jest/globals";

import { Response } from "cross-fetch";
import { DataFactory } from "n3";
import {
  getSolidDataset,
  saveSolidDatasetAt,
  saveSolidDatasetInContainer,
  createSolidDataset,
  createContainerAt,
  createContainerInContainer,
  solidDatasetAsMarkdown,
  changeLogAsMarkdown,
  deleteSolidDataset,
  deleteContainer,
  getContainedResourceUrlAll,
  responseToSolidDataset,
  Parser,
  getWellKnownSolid,
} from "./solidDataset";
import {
  WithChangeLog,
  WithResourceInfo,
  IriString,
  SolidDataset,
  LocalNode,
  UrlString,
} from "../interfaces";
import { mockContainerFrom, mockSolidDatasetFrom } from "./mock";
import {
  asIri,
  createThing,
  getThing,
  getThingAll,
  setThing,
} from "../thing/thing";
import { mockThingFrom } from "../thing/mock";
import { addInteger, addStringNoLocale, addUrl } from "../thing/add";
import { removeStringNoLocale } from "../thing/remove";
import { ldp, rdf } from "../constants";
import { getUrl } from "../thing/get";
import { getLocalNodeIri } from "../rdf.internal";

jest.mock("../fetcher.ts", () => ({
  fetch: jest.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(undefined, {
        headers: { Location: "https://arbitrary.pod/resource" },
      })
    )
  ),
}));

jest.mock("jsonld", () => ({
  toRDF: jest.fn().mockImplementation(() =>
    Promise.resolve([
      {
        subject: { termType: "BlankNode", value: "_:b0" },
        predicate: {
          termType: "NamedNode",
          value: "http://inrupt.com/ns/ess#consentIssuer",
        },
        object: {
          termType: "NamedNode",
          value: "https://consent.pod.inrupt.com",
        },
        graph: { termType: "DefaultGraph", value: "" },
      },
      {
        subject: { termType: "BlankNode", value: "_:b0" },
        predicate: {
          termType: "NamedNode",
          value: "http://inrupt.com/ns/ess#notificationGatewayEndpoint",
        },
        object: {
          termType: "NamedNode",
          value: "https://notification.pod.inrupt.com",
        },
        graph: { termType: "DefaultGraph", value: "" },
      },
      {
        subject: { termType: "BlankNode", value: "_:b0" },
        predicate: {
          termType: "NamedNode",
          value: "http://inrupt.com/ns/ess#powerSwitchEndpoint",
        },
        object: {
          termType: "NamedNode",
          value: "https://pod.inrupt.com/powerswitch/username",
        },
        graph: { termType: "DefaultGraph", value: "" },
      },
      {
        subject: { termType: "BlankNode", value: "_:b0" },
        predicate: {
          termType: "NamedNode",
          value: "http://www.w3.org/ns/pim/space#storage",
        },
        object: {
          termType: "NamedNode",
          value: "https://pod.inrupt.com/username/",
        },
        graph: { termType: "DefaultGraph", value: "" },
      },
    ])
  ),
}));

function mockResponse(
  body?: BodyInit | null,
  init?: ResponseInit & { url: string }
): Response {
  return new Response(body, {
    ...init,
    headers: {
      ...init?.headers,
      "Content-Type":
        (init?.headers as Record<string, string>)?.["Content-Type"] ??
        "text/turtle",
    },
  });
}

describe("createSolidDataset", () => {
  it("should initialise a new empty SolidDataset", () => {
    const solidDataset = createSolidDataset();

    expect(solidDataset.graphs.default).toStrictEqual({});
  });
});

describe("responseToSolidDataset", () => {
  it("returns a SolidDataset representing the fetched Turtle", async () => {
    const turtle = `
      @prefix : <#>.
      @prefix foaf: <http://xmlns.com/foaf/0.1/>.
      @prefix vcard: <http://www.w3.org/2006/vcard/ns#>.

      <> a foaf:PersonalProfileDocument; foaf:maker :me; foaf:primaryTopic :me.

      :me
        a foaf:Person;
        vcard:fn "Vincent", [:predicate <for://a.blank/node>].
    `;

    const response = new Response(turtle, {
      headers: {
        "Content-Type": "text/turtle",
      },
    });
    jest
      .spyOn(response, "url", "get")
      .mockReturnValue("https://some.pod/resource");
    const solidDataset = await responseToSolidDataset(response);

    expect(solidDataset).toEqual(
      expect.objectContaining({
        graphs: {
          default: {
            "https://some.pod/resource": {
              predicates: {
                "http://www.w3.org/1999/02/22-rdf-syntax-ns#type": {
                  namedNodes: [
                    "http://xmlns.com/foaf/0.1/PersonalProfileDocument",
                  ],
                },
                "http://xmlns.com/foaf/0.1/maker": {
                  namedNodes: ["https://some.pod/resource#me"],
                },
                "http://xmlns.com/foaf/0.1/primaryTopic": {
                  namedNodes: ["https://some.pod/resource#me"],
                },
              },
              type: "Subject",
              url: "https://some.pod/resource",
            },
            "https://some.pod/resource#me": {
              predicates: {
                "http://www.w3.org/1999/02/22-rdf-syntax-ns#type": {
                  namedNodes: ["http://xmlns.com/foaf/0.1/Person"],
                },
                "http://www.w3.org/2006/vcard/ns#fn": {
                  blankNodes: [
                    {
                      "https://some.pod/resource#predicate": {
                        namedNodes: ["for://a.blank/node"],
                      },
                    },
                  ],
                  literals: {
                    "http://www.w3.org/2001/XMLSchema#string": ["Vincent"],
                  },
                },
              },
              type: "Subject",
              url: "https://some.pod/resource#me",
            },
          },
        },
        internal_resourceInfo: {
          contentType: "text/turtle",
          isRawData: false,
          linkedResources: {},
          sourceIri: "https://some.pod/resource",
        },
        type: "Dataset",
      })
    );
  });

  it("does not include non-deterministic identifiers when it detects non-cyclic chains of Blank Nodes", async () => {
    const turtle = `
      @prefix : <#>.
      @prefix foaf: <http://xmlns.com/foaf/0.1/>.
      @prefix vcard: <http://www.w3.org/2006/vcard/ns#>.
      @prefix acl: <http://www.w3.org/ns/auth/acl#>.

      <> a foaf:PersonalProfileDocument; foaf:maker :me; foaf:primaryTopic :me.

      :me
        a foaf:Person;
        vcard:fn "Vincent";
        acl:trustedApp
          [
            acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
            acl:origin <http://localhost:3000>
          ],
          [
            acl:mode acl:Append, acl:Control, acl:Read, acl:Write;
            acl:origin <https://penny.vincenttunru.com>
          ].
    `;

    const response = new Response(turtle, {
      headers: {
        "Content-Type": "text/turtle",
      },
    });
    jest
      .spyOn(response, "url", "get")
      .mockReturnValue("https://some.pod/resource");
    const solidDataset = await responseToSolidDataset(response);

    expect(solidDataset).toEqual(
      expect.objectContaining({
        graphs: {
          default: {
            "https://some.pod/resource": {
              predicates: {
                "http://www.w3.org/1999/02/22-rdf-syntax-ns#type": {
                  namedNodes: [
                    "http://xmlns.com/foaf/0.1/PersonalProfileDocument",
                  ],
                },
                "http://xmlns.com/foaf/0.1/maker": {
                  namedNodes: ["https://some.pod/resource#me"],
                },
                "http://xmlns.com/foaf/0.1/primaryTopic": {
                  namedNodes: ["https://some.pod/resource#me"],
                },
              },
              type: "Subject",
              url: "https://some.pod/resource",
            },
            "https://some.pod/resource#me": {
              predicates: {
                "http://www.w3.org/1999/02/22-rdf-syntax-ns#type": {
                  namedNodes: ["http://xmlns.com/foaf/0.1/Person"],
                },
                "http://www.w3.org/2006/vcard/ns#fn": {
                  literals: {
                    "http://www.w3.org/2001/XMLSchema#string": ["Vincent"],
                  },
                },
                "http://www.w3.org/ns/auth/acl#trustedApp": {
                  blankNodes: [
                    {
                      "http://www.w3.org/ns/auth/acl#mode": {
                        namedNodes: [
                          "http://www.w3.org/ns/auth/acl#Append",
                          "http://www.w3.org/ns/auth/acl#Control",
                          "http://www.w3.org/ns/auth/acl#Read",
                          "http://www.w3.org/ns/auth/acl#Write",
                        ],
                      },
                      "http://www.w3.org/ns/auth/acl#origin": {
                        namedNodes: ["http://localhost:3000"],
                      },
                    },
                    {
                      "http://www.w3.org/ns/auth/acl#mode": {
                        namedNodes: [
                          "http://www.w3.org/ns/auth/acl#Append",
                          "http://www.w3.org/ns/auth/acl#Control",
                          "http://www.w3.org/ns/auth/acl#Read",
                          "http://www.w3.org/ns/auth/acl#Write",
                        ],
                      },
                      "http://www.w3.org/ns/auth/acl#origin": {
                        namedNodes: ["https://penny.vincenttunru.com"],
                      },
                    },
                  ],
                },
              },
              type: "Subject",
              url: "https://some.pod/resource#me",
            },
          },
        },
        internal_resourceInfo: {
          contentType: "text/turtle",
          isRawData: false,
          linkedResources: {},
          sourceIri: "https://some.pod/resource",
        },
        type: "Dataset",
      })
    );
  });

  it("does not attempt to detect chains when there are many Blank Nodes, to avoid performance bottlenecks", async () => {
    function getChainedBlankNode(iteration: number): string {
      if (iteration === 1000) {
        return `<https://some.predicate/${iteration}> "Base case"`;
      }
      return `<https://some.predicate/${iteration}> [${getChainedBlankNode(
        iteration + 1
      )}]`;
    }
    const turtle = `
      @prefix : <#>.
      @prefix vcard: <http://www.w3.org/2006/vcard/ns#>.

      :me vcard:fn [${getChainedBlankNode(0)}].
    `;

    const response = new Response(turtle, {
      headers: {
        "Content-Type": "text/turtle",
      },
    });
    jest
      .spyOn(response, "url", "get")
      .mockReturnValue("https://some.pod/resource");

    const t0 = performance.now();
    const solidDataset = await responseToSolidDataset(response);
    const t1 = performance.now();

    // Parsing a document with over 1000 statements will always be somewhat slow
    // (hence allowing it to take 1.5 seconds), but if it attempts to detect
    // chains, it will take on the order of >20 seconds.
    expect(t1 - t0).toBeLessThan(1500);
    // Blank Nodes should be listed explicitly, rather than as properties on
    // https://some.pod/resource#me:
    expect(Object.keys(solidDataset.graphs.default)).not.toStrictEqual([
      "https://some.pod/resource#me",
    ]);
  });

  it("throws a meaningful error when the server returned a 403", async () => {
    const response = new Response("Not allowed", { status: 403 });
    jest
      .spyOn(response, "url", "get")
      .mockReturnValue("https://some.pod/resource");

    const parsePromise = responseToSolidDataset(response);

    await expect(parsePromise).rejects.toThrow(
      new Error(
        "Fetching the SolidDataset at [https://some.pod/resource] failed: [403] [Forbidden]."
      )
    );
  });

  it("can match MIME types even if the Content-Type header also specifies a character encoding", async () => {
    const response = new Response("", {
      headers: {
        "Content-Type": "text/turtle;charset=UTF-8",
      },
    });
    jest
      .spyOn(response, "url", "get")
      .mockReturnValue("https://some.pod/resource");

    const parsePromise = responseToSolidDataset(response);

    await expect(parsePromise).resolves.not.toThrow();
  });

  it("throws an error when no parsers for the Resource's content type are available", async () => {
    const response = new Response("", {
      headers: {
        "Content-Type": "some unsupported content type",
      },
    });
    jest
      .spyOn(response, "url", "get")
      .mockReturnValue("https://some.pod/resource");

    const parsePromise = responseToSolidDataset(response);

    await expect(parsePromise).rejects.toThrow(
      new Error(
        "The Resource at [https://some.pod/resource] has a MIME type of [some unsupported content type], but the only parsers available are for the following MIME types: [text/turtle]."
      )
    );
  });

  it("throws an error when the Parser cannot parse the data", async () => {
    const response = new Response("", {
      headers: { "Content-Type": "text/turtle" },
    });
    jest
      .spyOn(response, "url", "get")
      .mockReturnValue("https://some.pod/resource");
    let resolveDataPromise: (value: string) => void = jest.fn();
    const dataPromise = new Promise<string>((resolve) => {
      resolveDataPromise = resolve;
    });
    jest.spyOn(response, "text").mockReturnValueOnce(dataPromise);

    const onErrorHandlers: Array<Parameters<Parser["onError"]>[0]> = [];
    const mockParser: Parser = {
      onComplete: jest.fn(),
      onQuad: jest.fn(),
      parse: jest.fn(),
      onError: (errorHandler) => onErrorHandlers.push(errorHandler),
    };

    const parsePromise = responseToSolidDataset(response, {
      parsers: { "text/turtle": mockParser },
    });
    resolveDataPromise("");
    await dataPromise;
    onErrorHandlers[0](new Error("Some error"));

    await expect(parsePromise).rejects.toThrow(
      new Error(
        "Encountered an error parsing the Resource at [https://some.pod/resource] with content type [text/turtle]: Error: Some error"
      )
    );
  });
});

describe("getSolidDataset", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mocked<typeof fetch>;
    };
    mockedFetcher.fetch.mockResolvedValueOnce(
      new Response(undefined, { headers: { "Content-Type": "text/turtle" } })
    );

    await getSolidDataset("https://some.pod/resource");

    expect(mockedFetcher.fetch.mock.calls[0][0]).toBe(
      "https://some.pod/resource"
    );
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          headers: { "Content-Type": "text/turtle" },
        })
      )
    );

    await getSolidDataset("https://some.pod/resource", { fetch: mockFetch });

    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource");
  });

  it("adds an Accept header accepting turtle by default", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          headers: { "Content-Type": "text/turtle" },
        })
      )
    );

    await getSolidDataset("https://some.pod/resource", { fetch: mockFetch });

    expect(mockFetch.mock.calls[0][1]).toEqual({
      headers: {
        Accept: "text/turtle",
      },
    });
  });

  it("advertises all formats supported by given parsers in the Accept header", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          headers: { "Content-Type": "text/turtle" },
        })
      )
    );

    const mockParser: Parser = {
      onComplete: jest
        .fn()
        .mockImplementationOnce((completionCallback: any) =>
          completionCallback()
        ),
      onQuad: jest.fn(),
      parse: jest.fn(),
      onError: jest.fn(),
    };
    const mockParsers = {
      "text/turtle": mockParser,
      "application/n-triples": mockParser,
    };
    await getSolidDataset("https://some.pod/resource", {
      fetch: mockFetch,
      parsers: mockParsers,
    });

    expect(mockFetch.mock.calls[0][1]).toEqual({
      headers: {
        Accept: "text/turtle, application/n-triples",
      },
    });
  });

  it("can be called with NamedNodes", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          headers: { "Content-Type": "text/turtle" },
        })
      )
    );

    await getSolidDataset(DataFactory.namedNode("https://some.pod/resource"), {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource");
  });

  it("keeps track of where the SolidDataset was fetched from", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          mockResponse(undefined, { url: "https://some.pod/resource" })
        )
      );

    const solidDataset = await getSolidDataset("https://some.pod/resource", {
      fetch: mockFetch,
    });

    expect(solidDataset.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/resource"
    );
  });

  it("provides the IRI of the relevant ACL resource, if provided", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          headers: {
            Link: '<aclresource.acl>; rel="acl"',
          },
          url: "https://some.pod/container/resource",
        })
      )
    );

    const solidDataset = await getSolidDataset(
      "https://some.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(solidDataset.internal_resourceInfo.aclUrl).toBe(
      "https://some.pod/container/aclresource.acl"
    );
  });

  it("does not provide an IRI to an ACL resource if not provided one by the server", async () => {
    const mockResponse = new Response(undefined, {
      headers: {
        Link: '<arbitrary-resource>; rel="not-acl"',
        "Content-Type": "text/turtle",
      },
      url: "https://arbitrary.pod",
      // We need the type assertion because in non-mock situations,
      // you cannot set the URL manually:
    } as ResponseInit);
    const mockFetch = jest.fn(window.fetch).mockResolvedValue(mockResponse);

    const solidDataset = await getSolidDataset(
      "https://some.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(solidDataset.internal_resourceInfo.aclUrl).toBeUndefined();
  });

  it("provides the relevant access permissions to the Resource, if available", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          headers: {
            "wac-aLLOW": 'public="read",user="read write append control"',
            "Content-Type": "text/turtle",
          },
        })
      )
    );

    const solidDataset = await getSolidDataset(
      "https://arbitrary.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(solidDataset.internal_resourceInfo.permissions).toEqual({
      user: {
        read: true,
        append: true,
        write: true,
        control: true,
      },
      public: {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("defaults permissions to false if they are not set, or are set with invalid syntax", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          headers: {
            // Public permissions are missing double quotes, user permissions are absent:
            "WAC-Allow": "public=read",
            "Content-Type": "text/turtle",
          },
        })
      )
    );

    const solidDataset = await getSolidDataset(
      "https://arbitrary.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(solidDataset.internal_resourceInfo.permissions).toEqual({
      user: {
        read: false,
        append: false,
        write: false,
        control: false,
      },
      public: {
        read: false,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("does not provide the resource's access permissions if not provided by the server", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          headers: {
            "Content-Type": "text/turtle",
          },
        })
      )
    );

    const solidDataset = await getSolidDataset(
      "https://arbitrary.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(solidDataset.internal_resourceInfo.permissions).toBeUndefined();
  });

  it("returns a SolidDataset representing the fetched Turtle", async () => {
    const turtle = `
      @prefix : <#>.
      @prefix profile: <./>.
      @prefix foaf: <http://xmlns.com/foaf/0.1/>.
      @prefix vcard: <http://www.w3.org/2006/vcard/ns#>.

      <> a foaf:PersonalProfileDocument; foaf:maker :me; foaf:primaryTopic :me.

      :me
        a foaf:Person;
        vcard:fn "Vincent".
    `;
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          mockResponse(turtle, { url: "https://arbitrary.pod/resource" })
        )
      );

    const solidDataset = await getSolidDataset(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    expect(solidDataset).toMatchSnapshot();
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = getSolidDataset("https://some.pod/resource", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error(
        "Fetching the Resource at [https://some.pod/resource] failed: [403] [Forbidden]."
      )
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = getSolidDataset("https://some.pod/resource", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error(
        "Fetching the Resource at [https://some.pod/resource] failed: [404] [Not Found]."
      )
    );
  });

  it("includes the status code and status message when a request failed", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response("I'm a teapot!", {
          status: 418,
          statusText: "I'm a teapot!",
        })
      )
    );

    const fetchPromise = getSolidDataset("https://arbitrary.pod/resource", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toMatchObject({
      statusCode: 418,
      statusText: "I'm a teapot!",
    });
  });
});

describe("saveSolidDatasetAt", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mocked<typeof fetch>;
    };

    mockedFetcher.fetch.mockResolvedValue(
      mockResponse(null, {
        headers: { Location: "/resource" },
        url: "https://some.pod/resource",
      })
    );

    await saveSolidDatasetAt("https://some.pod/resource", createSolidDataset());

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(1);
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    await saveSolidDatasetAt(
      "https://some.pod/resource",
      createSolidDataset(),
      {
        fetch: mockFetch,
      }
    );

    expect(mockFetch.mock.calls).toHaveLength(1);
  });

  describe("when saving a new resource", () => {
    it("sends the given SolidDataset to the Pod", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));
      const mockThing = addUrl(
        createThing({ url: "https://arbitrary.vocab/subject" }),
        "https://arbitrary.vocab/predicate",
        "https://arbitrary.vocab/object"
      );
      const mockDataset = setThing(createSolidDataset(), mockThing);

      await saveSolidDatasetAt("https://some.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource");
      expect(mockFetch.mock.calls[0][1]?.method).toBe("PUT");
      expect(
        (mockFetch.mock.calls[0][1]?.headers as Record<string, string>)[
          "Content-Type"
        ]
      ).toBe("text/turtle");
      expect(
        (mockFetch.mock.calls[0][1]?.headers as Record<string, string>).Link
      ).toBe('<http://www.w3.org/ns/ldp#Resource>; rel="type"');
      expect((mockFetch.mock.calls[0][1]?.body as string).trim()).toBe(
        "<https://arbitrary.vocab/subject> <https://arbitrary.vocab/predicate> <https://arbitrary.vocab/object>."
      );
    });

    it("uses the response URL to compute the saved resource source IRI", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockResolvedValue(mockResponse(null, { url: "https://saved.at/url" }));
      const mockThing = addUrl(
        createThing({ url: "https://arbitrary.vocab/subject" }),
        "https://arbitrary.vocab/predicate",
        "https://arbitrary.vocab/object"
      );
      const mockDataset = setThing(createSolidDataset(), mockThing);

      const savedDataset = await saveSolidDatasetAt(
        "https://some.pod/resource",
        mockDataset,
        {
          fetch: mockFetch,
        }
      );

      expect(savedDataset.internal_resourceInfo.sourceIri).toBe(
        "https://saved.at/url"
      );
    });

    it("sets relative IRIs for LocalNodes", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockResolvedValue(
          mockResponse(null, { url: "https://some.irrelevant/url" })
        );
      const mockObjectThing = createThing({ name: "some-object-name" });
      const mockThing = addUrl(
        createThing({ name: "some-subject-name" }),
        "https://arbitrary.vocab/predicate",
        mockObjectThing
      );
      const mockDataset = setThing(createSolidDataset(), mockThing);

      await saveSolidDatasetAt("https://some.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][1]?.body).toMatch("#some-subject-name");
      expect(mockFetch.mock.calls[0][1]?.body).toMatch("#some-object-name");
    });

    it("resolves relative IRIs in the returned SolidDataset", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockResolvedValue(mockResponse(null, { url: "https://saved.at/url" }));

      const mockObjectThing = createThing({ name: "some-object-name" });
      let mockThing = addUrl(
        createThing({ name: "some-subject-name" }),
        "https://arbitrary.vocab/predicate",
        mockObjectThing
      );
      mockThing = addUrl(
        mockThing,
        "https://arbitrary.vocab/predicate",
        "https://regular.url"
      );
      mockThing = addUrl(
        mockThing,
        "https://arbitrary-other.vocab/predicate",
        "https://regular.url"
      );
      mockThing = addInteger(mockThing, "https://another.vocab/predicate", 42);
      const mockDataset = setThing(createSolidDataset(), mockThing);

      const storedSolidDataset = await saveSolidDatasetAt(
        "https://some.pod/resource",
        mockDataset,
        {
          fetch: mockFetch,
        }
      );

      const storedThing = getThing(
        storedSolidDataset,
        "https://saved.at/url#some-subject-name"
      );

      expect(storedThing).not.toBeNull();
      expect(getUrl(storedThing!, "https://arbitrary.vocab/predicate")).toBe(
        "https://saved.at/url#some-object-name"
      );
    });

    it("also resolves relative IRIs for Things that have absolute IRIs", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockResolvedValue(mockResponse(null, { url: "https://saved.at/url" }));

      const mockObjectThing = createThing({ name: "some-object-name" });
      let mockThing = addUrl(
        createThing({ url: "https://some.pod/resource#thing" }),
        "https://arbitrary.vocab/predicate",
        mockObjectThing
      );
      mockThing = addUrl(
        mockThing,
        "https://arbitrary.vocab/predicate",
        "https://regular.url"
      );
      mockThing = addUrl(
        mockThing,
        "https://arbitrary-other.vocab/predicate",
        "https://regular.url"
      );
      mockThing = addInteger(mockThing, "https://another.vocab/predicate", 42);
      const mockDataset = setThing(createSolidDataset(), mockThing);

      const storedSolidDataset = await saveSolidDatasetAt(
        "https://some.pod/resource",
        mockDataset,
        {
          fetch: mockFetch,
        }
      );

      const storedThing = getThing(
        storedSolidDataset,
        "https://some.pod/resource#thing"
      );

      expect(storedThing).not.toBeNull();
      expect(getUrl(storedThing!, "https://arbitrary.vocab/predicate")).toBe(
        "https://saved.at/url#some-object-name"
      );
    });

    it("makes sure the returned SolidDataset has an empty change log", async () => {
      const mockDataset = createSolidDataset();

      const storedSolidDataset = await saveSolidDatasetAt(
        "https://arbitrary.pod/resource",
        mockDataset
      );

      expect(storedSolidDataset.internal_changeLog).toEqual({
        additions: [],
        deletions: [],
      });
    });

    it("tells the Pod to only save new data when no data exists yet", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));

      await saveSolidDatasetAt(
        "https://arbitrary.pod/resource",
        createSolidDataset(),
        {
          fetch: mockFetch,
        }
      );

      expect(mockFetch.mock.calls[0][1]?.headers).toMatchObject({
        "If-None-Match": "*",
      });
    });

    it("returns a meaningful error when the server returns a 403", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(
          Promise.resolve(new Response("Not allowed", { status: 403 }))
        );

      const fetchPromise = saveSolidDatasetAt(
        "https://some.pod/resource",
        createSolidDataset(),
        {
          fetch: mockFetch,
        }
      );

      await expect(fetchPromise).rejects.toThrow(
        "Storing the Resource at [https://some.pod/resource] failed: [403] [Forbidden].\n\n" +
          "The SolidDataset that was sent to the Pod is listed below.\n\n"
      );
    });

    it("returns a meaningful error when the server returns a 404", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(
          Promise.resolve(new Response("Not found", { status: 404 }))
        );

      const fetchPromise = saveSolidDatasetAt(
        "https://some.pod/resource",
        createSolidDataset(),
        {
          fetch: mockFetch,
        }
      );

      await expect(fetchPromise).rejects.toThrow(
        "Storing the Resource at [https://some.pod/resource] failed: [404] [Not Found].\n\n" +
          "The SolidDataset that was sent to the Pod is listed below.\n\n"
      );
    });
    it("includes the status code and status message when a request failed", async () => {
      const mockFetch = jest.fn(window.fetch).mockReturnValue(
        Promise.resolve(
          new Response("I'm a teapot!", {
            status: 418,
            statusText: "I'm a teapot!",
          })
        )
      );

      const fetchPromise = saveSolidDatasetAt(
        "https://arbitrary.pod/resource",
        createSolidDataset(),
        {
          fetch: mockFetch,
        }
      );

      await expect(fetchPromise).rejects.toMatchObject({
        statusCode: 418,
        statusText: "I'm a teapot!",
      });
    });

    it("tries to create the given SolidDataset on the Pod, even if it has an empty changelog", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));

      const mockDataset = {
        ...createSolidDataset(),
        internal_changeLog: { additions: [], deletions: [] },
      };

      await saveSolidDatasetAt("https://some.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][1]?.method).toBe("PUT");
    });
  });

  describe("when updating an existing resource", () => {
    function getMockUpdatedDataset(
      changeLog: WithChangeLog["internal_changeLog"],
      fromUrl: IriString
    ): SolidDataset & WithChangeLog & WithResourceInfo {
      const mockThing = addUrl(
        createThing({ url: "https://arbitrary.vocab/subject" }),
        "https://arbitrary.vocab/predicate",
        "https://arbitrary.vocab/object"
      );
      let mockDataset = setThing(createSolidDataset(), mockThing);

      changeLog.additions.forEach((tripleToAdd) => {
        let additionThing =
          getThing(mockDataset, tripleToAdd.subject.value) ??
          createThing({ url: tripleToAdd.subject.value });
        additionThing = addUrl(
          additionThing,
          tripleToAdd.predicate.value,
          tripleToAdd.object.value
        );
        mockDataset = setThing(mockDataset, additionThing);
      });

      const resourceInfo: WithResourceInfo["internal_resourceInfo"] = {
        sourceIri: fromUrl,
        isRawData: false,
      };

      return {
        ...mockDataset,
        internal_changeLog: changeLog,
        internal_resourceInfo: resourceInfo,
      };
    }

    it("sends just the change log to the Pod", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));

      const mockDataset = getMockUpdatedDataset(
        {
          additions: [
            DataFactory.quad(
              DataFactory.namedNode("https://some.vocab/subject"),
              DataFactory.namedNode("https://some.vocab/predicate"),
              DataFactory.namedNode("https://some.vocab/object"),
              undefined
            ),
          ],
          deletions: [
            DataFactory.quad(
              DataFactory.namedNode("https://some-other.vocab/subject"),
              DataFactory.namedNode("https://some-other.vocab/predicate"),
              DataFactory.namedNode("https://some-other.vocab/object"),
              undefined
            ),
          ],
        },
        "https://some.pod/resource"
      );

      await saveSolidDatasetAt("https://some.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource");
      expect(mockFetch.mock.calls[0][1]?.method).toBe("PATCH");
      expect(
        (mockFetch.mock.calls[0][1]?.headers as Record<string, string>)[
          "Content-Type"
        ]
      ).toBe("application/sparql-update");
      expect((mockFetch.mock.calls[0][1]?.body as string).trim()).toBe(
        "DELETE DATA {<https://some-other.vocab/subject> <https://some-other.vocab/predicate> <https://some-other.vocab/object>.}; " +
          "INSERT DATA {<https://some.vocab/subject> <https://some.vocab/predicate> <https://some.vocab/object>.};"
      );
    });

    it("uses the response IRI to compute the saved resource IRI", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockResolvedValue(mockResponse(null, { url: "https://saved.at/url" }));

      const mockDataset = getMockUpdatedDataset(
        {
          additions: [
            DataFactory.quad(
              DataFactory.namedNode("https://some.vocab/subject"),
              DataFactory.namedNode("https://some.vocab/predicate"),
              DataFactory.namedNode("https://some.vocab/object"),
              undefined
            ),
          ],
          deletions: [],
        },
        "https://some.pod/resource"
      );

      const savedDataset = await saveSolidDatasetAt(
        "https://some.pod/resource",
        mockDataset,
        {
          fetch: mockFetch,
        }
      );

      expect(savedDataset.internal_resourceInfo.sourceIri).toBe(
        "https://saved.at/url"
      );
    });

    it("sets relative IRIs for LocalNodes", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockResolvedValue(
          mockResponse(null, { url: "https://some.irrelevant/url" })
        );

      const subjectLocal: LocalNode = DataFactory.namedNode(
        getLocalNodeIri("some-subject-name")
      );
      const objectLocal: LocalNode = DataFactory.namedNode(
        getLocalNodeIri("some-object-name")
      );
      const mockDataset = getMockUpdatedDataset(
        {
          additions: [
            DataFactory.quad(
              subjectLocal,
              DataFactory.namedNode("https://some.vocab/predicate"),
              objectLocal,
              undefined
            ),
          ],
          deletions: [
            DataFactory.quad(
              subjectLocal,
              DataFactory.namedNode("https://some-other.vocab/predicate"),
              objectLocal,
              undefined
            ),
          ],
        },
        "https://some.pod/resource"
      );

      await saveSolidDatasetAt("https://some.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      const [deleteStatement, insertStatement] = (
        mockFetch.mock.calls[0][1]!.body as string
      ).split(";");
      expect(deleteStatement).toMatch("#some-subject-name");
      expect(insertStatement).toMatch("#some-subject-name");
      expect(deleteStatement).toMatch("#some-object-name");
      expect(insertStatement).toMatch("#some-object-name");
    });

    it("resolves relative IRIs in the returned SolidDataset", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockResolvedValue(mockResponse(null, { url: "https://saved.at/url" }));

      const subjectLocal: LocalNode = DataFactory.namedNode(
        getLocalNodeIri("some-subject-name")
      );
      const objectLocal: LocalNode = DataFactory.namedNode(
        getLocalNodeIri("some-object-name")
      );
      const mockDataset = getMockUpdatedDataset(
        {
          additions: [
            DataFactory.quad(
              subjectLocal,
              DataFactory.namedNode("https://some.vocab/predicate"),
              objectLocal,
              undefined
            ),
          ],
          deletions: [],
        },
        "https://some.pod/resource"
      );

      const storedSolidDataset = await saveSolidDatasetAt(
        "https://some.pod/resource",
        mockDataset,
        {
          fetch: mockFetch,
        }
      );

      const storedThing = getThing(
        storedSolidDataset,
        "https://saved.at/url#some-subject-name"
      );
      expect(storedThing).not.toBeNull();
      expect(getUrl(storedThing!, "https://some.vocab/predicate")).toBe(
        "https://saved.at/url#some-object-name"
      );
    });

    it("sends the full SolidDataset if it is saved to a different IRI", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));

      const mockDataset = getMockUpdatedDataset(
        { additions: [], deletions: [] },
        "https://some.pod/resource"
      );

      await saveSolidDatasetAt("https://some-other.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://some-other.pod/resource"
      );
      expect(mockFetch.mock.calls[0][1]?.method).toBe("PUT");
      // Even though the change log is empty there should still be a body,
      // since the Dataset itself is not empty:
      expect(
        (mockFetch.mock.calls[0][1]?.body as string).trim().length
      ).toBeGreaterThan(0);
    });

    it("ignores hash fragments in the target IRI if any when determining if the request is an update or a creation", async () => {
      const mockedResponse = new Response();
      jest
        .spyOn(mockedResponse, "url", "get")
        .mockReturnValue("https://some.url");
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(mockedResponse));

      const mockDataset = getMockUpdatedDataset(
        {
          additions: [
            DataFactory.quad(
              DataFactory.namedNode("https://some.vocab/subject"),
              DataFactory.namedNode("https://some.vocab/predicate"),
              DataFactory.namedNode("https://some.vocab/object"),
              undefined
            ),
          ],
          deletions: [
            DataFactory.quad(
              DataFactory.namedNode("https://some-other.vocab/subject"),
              DataFactory.namedNode("https://some-other.vocab/predicate"),
              DataFactory.namedNode("https://some-other.vocab/object"),
              undefined
            ),
          ],
        },
        "https://some.pod/resource"
      );

      await saveSolidDatasetAt(
        "https://some.pod/resource#something",
        mockDataset,
        {
          fetch: mockFetch,
        }
      );

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][0]).toBe(
        // Note that the hash fragment is still present in the target URL
        "https://some.pod/resource#something"
      );
      // The library detects that the desired operation is a PATCH, and not a PUT
      expect(mockFetch.mock.calls[0][1]?.method).toBe("PATCH");
    });

    it("does not include a DELETE statement if the change log contains no deletions", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockResolvedValue(
          mockResponse(null, { url: "https://some.irrelevant/url" })
        );

      const mockDataset = getMockUpdatedDataset(
        {
          additions: [
            DataFactory.quad(
              DataFactory.namedNode("https://arbitrary.vocab/subject"),
              DataFactory.namedNode("https://arbitrary.vocab/predicate"),
              DataFactory.namedNode("https://arbitrary.vocab/object"),
              undefined
            ),
          ],
          deletions: [],
        },
        "https://arbitrary.pod/resource"
      );

      await saveSolidDatasetAt("https://arbitrary.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][1]?.body as string).not.toMatch("DELETE");
    });

    it("does not include an INSERT statement if the change log contains no additions", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));

      const mockDataset = getMockUpdatedDataset(
        {
          additions: [],
          deletions: [
            DataFactory.quad(
              DataFactory.namedNode("https://arbitrary.vocab/subject"),
              DataFactory.namedNode("https://arbitrary.vocab/predicate"),
              DataFactory.namedNode("https://arbitrary.vocab/object"),
              undefined
            ),
          ],
        },
        "https://arbitrary.pod/resource"
      );

      await saveSolidDatasetAt("https://arbitrary.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][1]?.body as string).not.toMatch("INSERT");
    });

    it("makes sure the returned SolidDataset has an empty change log", async () => {
      const mockDataset = getMockUpdatedDataset(
        {
          additions: [
            DataFactory.quad(
              DataFactory.namedNode("https://arbitrary.vocab/subject"),
              DataFactory.namedNode("https://arbitrary.vocab/predicate"),
              DataFactory.namedNode("https://arbitrary.vocab/object"),
              undefined
            ),
          ],
          deletions: [
            DataFactory.quad(
              DataFactory.namedNode("https://arbitrary-other.vocab/subject"),
              DataFactory.namedNode("https://arbitrary-other.vocab/predicate"),
              DataFactory.namedNode("https://arbitrary-other.vocab/object"),
              undefined
            ),
          ],
        },
        "https://arbitrary.pod/resource"
      );

      const storedSolidDataset = await saveSolidDatasetAt(
        "https://arbitrary.pod/resource",
        mockDataset
      );

      expect(storedSolidDataset.internal_changeLog).toEqual({
        additions: [],
        deletions: [],
      });
    });

    it("does not try to create a new Resource if the change log contains no change", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));

      const resourceInfo: WithResourceInfo["internal_resourceInfo"] = {
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: false,
      };
      // Note that the dataset has been fetched from a given IRI, but has no changelog.
      const mockDataset = {
        ...createSolidDataset(),
        internal_resourceInfo: resourceInfo,
      };

      await saveSolidDatasetAt("https://arbitrary.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][1]?.method as string).toBe("PATCH");
    });

    it("returns a meaningful error when the server returns a 403", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(
          Promise.resolve(new Response("Not allowed", { status: 403 }))
        );

      const mockDataset = getMockUpdatedDataset(
        {
          additions: [
            DataFactory.quad(
              DataFactory.namedNode("https://some.vocab/subject"),
              DataFactory.namedNode("https://some.vocab/predicate"),
              DataFactory.namedNode("https://some.vocab/object"),
              undefined
            ),
          ],
          deletions: [
            DataFactory.quad(
              DataFactory.namedNode("https://some-other.vocab/subject"),
              DataFactory.namedNode("https://some-other.vocab/predicate"),
              DataFactory.namedNode("https://some-other.vocab/object"),
              undefined
            ),
          ],
        },
        "https://some.pod/resource"
      );

      const fetchPromise = saveSolidDatasetAt(
        "https://some.pod/resource",
        mockDataset,
        {
          fetch: mockFetch,
        }
      );

      await expect(fetchPromise).rejects.toThrow(
        "Storing the Resource at [https://some.pod/resource] failed: [403] [Forbidden].\n\n" +
          "The changes that were sent to the Pod are listed below.\n\n"
      );
    });

    it("returns a meaningful error when the server returns a 404", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(
          Promise.resolve(new Response("Not found", { status: 404 }))
        );

      const mockDataset = getMockUpdatedDataset(
        {
          additions: [
            DataFactory.quad(
              DataFactory.namedNode("https://some.vocab/subject"),
              DataFactory.namedNode("https://some.vocab/predicate"),
              DataFactory.namedNode("https://some.vocab/object"),
              undefined
            ),
          ],
          deletions: [
            DataFactory.quad(
              DataFactory.namedNode("https://some-other.vocab/subject"),
              DataFactory.namedNode("https://some-other.vocab/predicate"),
              DataFactory.namedNode("https://some-other.vocab/object"),
              undefined
            ),
          ],
        },
        "https://some.pod/resource"
      );

      const fetchPromise = saveSolidDatasetAt(
        "https://some.pod/resource",
        mockDataset,
        {
          fetch: mockFetch,
        }
      );

      await expect(fetchPromise).rejects.toThrow(
        "Storing the Resource at [https://some.pod/resource] failed: [404] [Not Found].\n\n" +
          "The changes that were sent to the Pod are listed below.\n\n"
      );
    });
    it("includes the status code and status message when a request failed", async () => {
      const mockFetch = jest.fn(window.fetch).mockReturnValue(
        Promise.resolve(
          new Response("I'm a teapot!", {
            status: 418,
            statusText: "I'm a teapot!",
          })
        )
      );

      const mockDataset = getMockUpdatedDataset(
        {
          additions: [],
          deletions: [],
        },
        "https://arbitrary.pod/resource"
      );

      const fetchPromise = saveSolidDatasetAt(
        "https://arbitrary.pod/resource",
        mockDataset,
        {
          fetch: mockFetch,
        }
      );

      await expect(fetchPromise).rejects.toMatchObject({
        statusCode: 418,
        statusText: "I'm a teapot!",
      });
    });
  });
});

describe("deleteSolidDataset", () => {
  it("should DELETE a remote SolidDataset using the included fetcher if no other fetcher is available", async () => {
    const fetcher = jest.requireMock("../fetcher") as {
      fetch: jest.Mocked<typeof fetch>;
    };

    fetcher.fetch.mockResolvedValueOnce(
      new Response(undefined, { status: 200, statusText: "Deleted" })
    );

    const response = await deleteSolidDataset("https://some.url");

    expect(fetcher.fetch.mock.calls).toEqual([
      [
        "https://some.url",
        {
          method: "DELETE",
        },
      ],
    ]);
    expect(response).toBeUndefined();
  });

  it("should DELETE a remote SolidDataset using the provided fetcher", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockResolvedValue(
        new Response(undefined, { status: 200, statusText: "Deleted" })
      );

    const response = await deleteSolidDataset("https://some.url", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toEqual([
      [
        "https://some.url",
        {
          method: "DELETE",
        },
      ],
    ]);
    expect(response).toBeUndefined();
  });

  it("should accept a fetched SolidDataset as target", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockResolvedValue(
        new Response(undefined, { status: 200, statusText: "Deleted" })
      );

    const mockSolidDataset = mockSolidDatasetFrom("https://some.url");

    const response = await deleteSolidDataset(mockSolidDataset, {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toEqual([
      [
        "https://some.url",
        {
          method: "DELETE",
        },
      ],
    ]);
    expect(response).toBeUndefined();
  });

  it("should throw an error on a failed request", async () => {
    const mockFetch = jest.fn(window.fetch).mockResolvedValue(
      new Response(undefined, {
        status: 400,
        statusText: "Bad request",
      })
    );

    const deletionPromise = deleteSolidDataset("https://some.url", {
      fetch: mockFetch,
    });

    await expect(deletionPromise).rejects.toThrow(
      "Deleting the SolidDataset at [https://some.url] failed: [400] [Bad request]"
    );
  });

  it("includes the status code and status message when a request failed", async () => {
    const mockFetch = jest.fn(window.fetch).mockResolvedValue(
      new Response(undefined, {
        status: 418,
        statusText: "I'm a teapot!",
      })
    );

    const deletionPromise = deleteSolidDataset("https://arbitrary.url", {
      fetch: mockFetch,
    });

    await expect(deletionPromise).rejects.toMatchObject({
      statusCode: 418,
      statusText: "I'm a teapot!",
    });
  });
});

describe("createContainerAt", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mocked<typeof fetch>;
    };

    await createContainerAt("https://some.pod/container/");

    expect(mockedFetcher.fetch.mock.calls[0][0]).toBe(
      "https://some.pod/container/"
    );
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    await createContainerAt("https://some.pod/container/", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/container/");
  });

  it("can be called with NamedNodes", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    await createContainerAt(
      DataFactory.namedNode("https://some.pod/container/"),
      {
        fetch: mockFetch,
      }
    );

    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/container/");
  });

  it("appends a trailing slash if not provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    await createContainerAt("https://some.pod/container", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/container/");
  });

  it("sets the right headers to create a Container", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    await createContainerAt("https://some.pod/container/", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/container/");
    expect(mockFetch.mock.calls[0][1]?.method).toBe("PUT");
    expect(mockFetch.mock.calls[0][1]?.headers).toHaveProperty(
      "Link",
      '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"'
    );
    expect(mockFetch.mock.calls[0][1]?.headers).toHaveProperty(
      "Content-Type",
      "text/turtle"
    );
    expect(mockFetch.mock.calls[0][1]?.headers).toHaveProperty(
      "If-None-Match",
      "*"
    );
  });

  it("keeps track of what URL the Container was saved to", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          mockResponse(undefined, { url: "https://some.pod/container/" })
        )
      );

    const solidDataset = await createContainerAt(
      "https://some.pod/container/",
      {
        fetch: mockFetch,
      }
    );

    expect(solidDataset.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/container/"
    );
  });

  it("provides the IRI of the relevant ACL resource, if provided", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          headers: {
            Link: '<aclresource.acl>; rel="acl"',
          },
          url: "https://some.pod/container/",
        })
      )
    );

    const solidDataset = await createContainerAt(
      "https://some.pod/container/",
      { fetch: mockFetch }
    );

    expect(solidDataset.internal_resourceInfo.aclUrl).toBe(
      "https://some.pod/container/aclresource.acl"
    );
  });

  it("does not provide an IRI to an ACL resource if not provided one by the server", async () => {
    const mockResponse = new Response(undefined, {
      headers: {
        Link: '<arbitrary-resource>; rel="not-acl"',
      },
      url: "https://arbitrary.pod",
      // We need the type assertion because in non-mock situations,
      // you cannot set the URL manually:
    } as ResponseInit);
    const mockFetch = jest.fn(window.fetch).mockResolvedValue(mockResponse);

    const solidDataset = await createContainerAt(
      "https://some.pod/container/",
      { fetch: mockFetch }
    );

    expect(solidDataset.internal_resourceInfo.aclUrl).toBeUndefined();
  });

  it("provides the relevant access permissions to the Resource, if available", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          headers: {
            "Wac-Allow": 'public="read",user="read write append control"',
          },
        })
      )
    );

    const solidDataset = await createContainerAt(
      "https://arbitrary.pod/container/",
      { fetch: mockFetch }
    );

    expect(solidDataset.internal_resourceInfo.permissions).toEqual({
      user: {
        read: true,
        append: true,
        write: true,
        control: true,
      },
      public: {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("defaults permissions to false if they are not set, or are set with invalid syntax", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          headers: {
            // Public permissions are missing double quotes, user permissions are absent:
            "WAC-Allow": "public=read",
          },
        })
      )
    );

    const solidDataset = await createContainerAt(
      "https://arbitrary.pod/container/",
      { fetch: mockFetch }
    );

    expect(solidDataset.internal_resourceInfo.permissions).toEqual({
      user: {
        read: false,
        append: false,
        write: false,
        control: false,
      },
      public: {
        read: false,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("does not provide the resource's access permissions if not provided by the server", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          headers: {},
        })
      )
    );

    const solidDataset = await createContainerAt(
      "https://arbitrary.pod/container/",
      { fetch: mockFetch }
    );

    expect(solidDataset.internal_resourceInfo.permissions).toBeUndefined();
  });

  it("returns an empty SolidDataset", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          mockResponse(undefined, { url: "https://arbitrary.pod/container/" })
        )
      );

    const solidDataset = await createContainerAt(
      "https://arbitrary.pod/container/",
      {
        fetch: mockFetch,
      }
    );

    expect(solidDataset.graphs.default).toStrictEqual({});
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = createContainerAt("https://some.pod/container/", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error(
        "Creating the empty Container at [https://some.pod/container/] failed: [403] [Forbidden]."
      )
    );
  });

  it("includes the status code and status message when a request failed", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response("I'm a teapot!", {
          status: 418,
          statusText: "I'm a teapot!",
        })
      )
    );

    const fetchPromise = createContainerAt("https://arbitrary.pod/container/", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toMatchObject({
      statusCode: 418,
      statusText: "I'm a teapot!",
    });
  });

  describe("Creating non-empty container", () => {
    it("returns an non-empty SolidDataset if one is provided", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(
          Promise.resolve(
            mockResponse(undefined, { url: "https://arbitrary.pod/container/" })
          )
        );

      const mockThing = addUrl(
        createThing({ url: "https://arbitrary.vocab/subject" }),
        "https://arbitrary.vocab/predicate",
        "https://arbitrary.vocab/object"
      );
      const mockDataset = setThing(createSolidDataset(), mockThing);

      const returnedContainer = await createContainerAt(
        "https://arbitrary.pod/container/",
        {
          fetch: mockFetch,
          initialContent: mockDataset,
        }
      );
      // All the things in the initial content should be in the returned dataset.
      expect(
        getThingAll(mockDataset).every(
          (thing) => getThing(returnedContainer, asIri(thing)) !== null
        )
      ).toBe(true);
      // The initial content should be sent when creating the container
      expect((mockFetch.mock.calls[0][1]?.body as string).trim()).toBe(
        "<https://arbitrary.vocab/subject> <https://arbitrary.vocab/predicate> <https://arbitrary.vocab/object>."
      );
    });

    it("reports HTTP error when an non-empty SolidDataset provided", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        // Mock an error response to the request.
        .mockReturnValueOnce(
          Promise.resolve(new Response("Forbidden", { status: 403 }))
        );

      const mockThing = addUrl(
        createThing({ url: "https://arbitrary.vocab/subject" }),
        "https://arbitrary.vocab/predicate",
        "https://arbitrary.vocab/object"
      );
      const mockDataset = setThing(createSolidDataset(), mockThing);

      await expect(
        createContainerAt("https://arbitrary.pod/container/", {
          fetch: mockFetch,
          initialContent: mockDataset,
        })
      ).rejects.toThrow("Creating the non-empty Container");
    });
  });
});

describe("saveSolidDatasetInContainer", () => {
  function setMockOnFetch(
    fetch: jest.Mocked<typeof window.fetch>,
    saveResponse = mockResponse(undefined, {
      status: 201,
      statusText: "Created",
      headers: { Location: "resource" },
      url: "https://some.pod/container/",
    })
  ): jest.Mocked<typeof window.fetch> {
    fetch.mockResolvedValueOnce(saveResponse);
    return fetch;
  }

  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mocked<typeof window.fetch>;
    };

    await saveSolidDatasetInContainer(
      "https://some.pod/container/",
      createSolidDataset()
    );

    // Two calls expected: one to store the dataset, one to retrieve its details
    // (e.g. Linked Resources).
    expect(mockedFetcher.fetch.mock.calls).toHaveLength(1);
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = setMockOnFetch(jest.fn(window.fetch));

    await saveSolidDatasetInContainer(
      "https://some.pod/container/",
      createSolidDataset(),
      {
        fetch: mockFetch,
      }
    );

    // Two calls expected: one to store the dataset, one to retrieve its details
    // (e.g. Linked Resources).
    expect(mockFetch.mock.calls).toHaveLength(1);
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = setMockOnFetch(
      jest.fn(window.fetch),
      mockResponse("Not allowed", {
        status: 403,
        url: "https://some.pod/container/",
      })
    );

    const fetchPromise = saveSolidDatasetInContainer(
      "https://some.pod/container/",
      createSolidDataset(),
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      "Storing the Resource in the Container at [https://some.pod/container/] failed: [403] [Forbidden]."
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = setMockOnFetch(
      jest.fn(window.fetch),
      mockResponse("Not found", {
        status: 404,
        url: "https://some.pod/container/",
      })
    );
    const fetchPromise = saveSolidDatasetInContainer(
      "https://some.pod/container/",
      createSolidDataset(),
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      "Storing the Resource in the Container at [https://some.pod/container/] failed: [404] [Not Found]."
    );
  });

  it("returns a meaningful error when the server does not return the new Resource's location", async () => {
    const mockFetch = setMockOnFetch(
      jest.fn(window.fetch),
      mockResponse(null, { url: "https://arbitrary.pod/container/" })
    );

    const fetchPromise = saveSolidDatasetInContainer(
      "https://arbitrary.pod/container/",
      createSolidDataset(),
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error(
        "Could not determine the location of the newly saved SolidDataset."
      )
    );
  });

  it("includes the status code and status message when a request failed", async () => {
    const mockFetch = setMockOnFetch(
      jest.fn(window.fetch),
      mockResponse("I'm a teapot!", {
        status: 418,
        statusText: "I'm a teapot!",
        url: "https://arbitrary.pod/container/",
      })
    );
    const fetchPromise = saveSolidDatasetInContainer(
      "https://arbitrary.pod/container/",
      createSolidDataset(),
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toMatchObject({
      statusCode: 418,
      statusText: "I'm a teapot!",
    });
  });

  it("sends the given SolidDataset to the Pod", async () => {
    const mockFetch = setMockOnFetch(jest.fn(window.fetch));
    const mockThing = addUrl(
      createThing({ url: "https://arbitrary.vocab/subject" }),
      "https://arbitrary.vocab/predicate",
      "https://arbitrary.vocab/object"
    );
    const mockDataset = setThing(createSolidDataset(), mockThing);

    await saveSolidDatasetInContainer(
      "https://some.pod/container/",
      mockDataset,
      {
        fetch: mockFetch,
      }
    );

    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/container/");
    expect(mockFetch.mock.calls[0][1]?.method).toBe("POST");
    expect(
      (mockFetch.mock.calls[0][1]?.headers as Record<string, string>)[
        "Content-Type"
      ]
    ).toBe("text/turtle");
    expect(
      (mockFetch.mock.calls[0][1]?.headers as Record<string, string>).Link
    ).toBe('<http://www.w3.org/ns/ldp#Resource>; rel="type"');
    expect((mockFetch.mock.calls[0][1]?.body as string).trim()).toBe(
      "<https://arbitrary.vocab/subject> <https://arbitrary.vocab/predicate> <https://arbitrary.vocab/object>."
    );
  });

  it("sets relative IRIs for LocalNodes", async () => {
    const mockFetch = setMockOnFetch(jest.fn(window.fetch));
    const mockObjectThing = createThing({ name: "some-object-name" });
    const mockThing = addUrl(
      createThing({ name: "some-subject-name" }),
      "https://arbitrary.vocab/predicate",
      mockObjectThing
    );
    const mockDataset = setThing(createSolidDataset(), mockThing);

    await saveSolidDatasetInContainer(
      "https://some.pod/container/",
      mockDataset,
      {
        fetch: mockFetch,
      }
    );

    expect((mockFetch.mock.calls[0][1]?.body as string).trim()).toBe(
      "<#some-subject-name> <https://arbitrary.vocab/predicate> <#some-object-name>."
    );
  });

  it("sends the suggested slug to the Pod", async () => {
    const mockFetch = setMockOnFetch(jest.fn(window.fetch));

    await saveSolidDatasetInContainer(
      "https://some.pod/container/",
      createSolidDataset(),
      {
        fetch: mockFetch,
        slugSuggestion: "some-slug",
      }
    );

    expect(mockFetch.mock.calls[0][1]?.headers).toMatchObject({
      slug: "some-slug",
    });
  });

  it("does not send a suggested slug if none was provided", async () => {
    const mockFetch = setMockOnFetch(jest.fn(window.fetch));

    await saveSolidDatasetInContainer(
      "https://some.pod/container/",
      createSolidDataset(),
      {
        fetch: mockFetch,
      }
    );

    expect(
      (mockFetch.mock.calls[0][1]?.headers as Record<string, string>).slug
    ).toBeUndefined();
  });

  it("includes the final slug with the return value", async () => {
    const mockFetch = setMockOnFetch(
      jest.fn(window.fetch),
      mockResponse("Arbitrary response", {
        headers: { Location: "https://some.pod/container/resource" },
        url: "https://some.pod/container/",
      })
    );

    const savedSolidDataset = await saveSolidDatasetInContainer(
      "https://some.pod/container/",
      createSolidDataset(),
      {
        fetch: mockFetch,
      }
    );

    expect(savedSolidDataset!.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/container/resource"
    );
  });

  it("resolves relative IRIs in the returned SolidDataset", async () => {
    const mockFetch = setMockOnFetch(
      jest.fn(window.fetch),
      mockResponse(null, {
        status: 201,
        statusText: "Created",
        headers: { Location: "/url" },
        url: "https://saved.at/url",
      })
    );

    const mockObjectThing = createThing({ name: "some-object-name" });
    const mockThing = addUrl(
      createThing({ name: "some-subject-name" }),
      "https://arbitrary.vocab/predicate",
      mockObjectThing
    );
    const mockDataset = setThing(createSolidDataset(), mockThing);

    const storedSolidDataset = await saveSolidDatasetInContainer(
      "https://some.pod/",
      mockDataset,
      {
        fetch: mockFetch,
      }
    );

    const storedThing = getThing(
      storedSolidDataset,
      "https://saved.at/url#some-subject-name"
    );

    expect(storedThing).not.toBeNull();
    expect(getUrl(storedThing!, "https://arbitrary.vocab/predicate")).toBe(
      "https://saved.at/url#some-object-name"
    );
  });

  it("includes the final slug with the return value, normalised to the Container's origin", async () => {
    const mockFetch = setMockOnFetch(
      jest.fn(window.fetch),
      mockResponse("Arbitrary response", {
        headers: { Location: "/container/resource" },
        url: "https://some.pod/container/",
      })
    );

    const savedSolidDataset = await saveSolidDatasetInContainer(
      "https://some.pod/container/",
      createSolidDataset(),
      {
        fetch: mockFetch,
      }
    );

    expect(savedSolidDataset!.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/container/resource"
    );
  });
});

describe("createContainerInContainer", () => {
  function setMockOnFetch(
    fetch: jest.Mocked<typeof window.fetch>,
    saveResponse = mockResponse(undefined, {
      status: 201,
      statusText: "Created",
      headers: { Location: "child" },
      url: "https://some.pod/",
    })
  ): jest.Mocked<typeof window.fetch> {
    fetch.mockResolvedValueOnce(saveResponse);
    return fetch;
  }

  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mocked<typeof window.fetch>;
    };
    mockedFetcher.fetch = setMockOnFetch(mockedFetcher.fetch);

    await createContainerInContainer("https://some.pod/parent-container/");

    // Two calls expected: one to store the dataset, one to retrieve its details
    // (e.g. Linked Resources).
    expect(mockedFetcher.fetch.mock.calls).toHaveLength(1);
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = setMockOnFetch(jest.fn(window.fetch));

    await createContainerInContainer("https://some.pod/parent-container/", {
      fetch: mockFetch,
    });

    // Two calls expected: one to store the dataset, one to retrieve its details
    // (e.g. Linked Resources).
    expect(mockFetch.mock.calls).toHaveLength(1);
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = setMockOnFetch(
      jest.fn(window.fetch),
      mockResponse("Not allowed", {
        status: 403,
        url: "https://some.pod/parent-container/",
      })
    );

    const fetchPromise = createContainerInContainer(
      "https://some.pod/parent-container/",
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error(
        "Creating an empty Container in the Container at [https://some.pod/parent-container/] failed: [403] [Forbidden]."
      )
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = setMockOnFetch(
      jest.fn(window.fetch),
      mockResponse("Not found", {
        status: 404,
        url: "https://some.pod/parent-container/",
      })
    );

    const fetchPromise = createContainerInContainer(
      "https://some.pod/parent-container/",
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error(
        "Creating an empty Container in the Container at [https://some.pod/parent-container/] failed: [404] [Not Found]."
      )
    );
  });

  it("returns a meaningful error when the server does not return the new Container's location", async () => {
    const mockFetch = setMockOnFetch(
      jest.fn(window.fetch),
      mockResponse(null, { url: "https://arbitrary.pod/parent-container/" })
    );

    const fetchPromise = createContainerInContainer(
      "https://arbitrary.pod/parent-container/",
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error(
        "Could not determine the location of the newly created Container."
      )
    );
  });

  it("includes the status code and status message when a request failed", async () => {
    const mockFetch = setMockOnFetch(
      jest.fn(window.fetch),
      mockResponse("I'm a teapot!", {
        status: 418,
        statusText: "I'm a teapot!",
        url: "https://arbitrary.pod/parent-container/",
      })
    );

    const fetchPromise = createContainerInContainer(
      "https://arbitrary.pod/parent-container/",
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toMatchObject({
      statusCode: 418,
      statusText: "I'm a teapot!",
    });
  });

  it("sends the right headers to create a Container", async () => {
    const mockFetch = setMockOnFetch(jest.fn(window.fetch));

    await createContainerInContainer("https://some.pod/parent-container/", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][0]).toBe(
      "https://some.pod/parent-container/"
    );
    expect(mockFetch.mock.calls[0][1]?.method).toBe("POST");
    expect(mockFetch.mock.calls[0][1]?.headers).toHaveProperty(
      "Content-Type",
      "text/turtle"
    );
    expect(mockFetch.mock.calls[0][1]?.headers).toHaveProperty(
      "Link",
      '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"'
    );
  });

  it("sends the suggested slug to the Pod", async () => {
    const mockFetch = setMockOnFetch(jest.fn(window.fetch));

    await createContainerInContainer("https://some.pod/parent-container/", {
      fetch: mockFetch,
      slugSuggestion: "child-container/",
    });

    expect(mockFetch.mock.calls[0][1]?.headers).toMatchObject({
      slug: "child-container/",
    });
  });

  it("does not send a suggested slug if none was provided", async () => {
    const mockFetch = setMockOnFetch(jest.fn(window.fetch));

    await createContainerInContainer("https://some.pod/parent-container/", {
      fetch: mockFetch,
    });

    expect(
      (mockFetch.mock.calls[0][1]?.headers as Record<string, string>).slug
    ).toBeUndefined();
  });

  it("includes the final slug with the return value", async () => {
    const mockFetch = setMockOnFetch(
      jest.fn(window.fetch),
      mockResponse("Arbitrary response", {
        headers: {
          Location: "https://some.pod/parent-container/child-container/",
        },
        url: "https://some.pod/parent-container/",
      })
    );

    const savedSolidDataset = await createContainerInContainer(
      "https://some.pod/parent-container/",
      {
        fetch: mockFetch,
      }
    );

    expect(savedSolidDataset!.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/parent-container/child-container/"
    );
  });

  it("uses the full location URL if absolute thereby applying server-side normalisation", async () => {
    const mockFetch = setMockOnFetch(
      jest.fn(window.fetch),
      mockResponse("Arbitrary response", {
        headers: {
          Location: "https://some.pod/parent-container/child-container/",
        },
        url: "https://some.pod/parent-container//",
      })
    );

    const savedSolidDataset = await createContainerInContainer(
      "https://some.pod/parent-container//",
      {
        fetch: mockFetch,
      }
    );

    expect(savedSolidDataset!.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/parent-container/child-container/"
    );
  });

  it("uses the relative location URL to indicate source IRI", async () => {
    const mockFetch = setMockOnFetch(
      jest.fn(window.fetch),
      mockResponse("Arbitrary response", {
        headers: {
          Location: "./x/y/",
        },
        url: "https://some.pod/parent-container//a/b",
      })
    );

    const savedSolidDataset = await createContainerInContainer(
      "https://some.pod/parent-container//a/b",
      {
        fetch: mockFetch,
      }
    );

    expect(savedSolidDataset!.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/parent-container//a/x/y/"
    );
  });

  it("includes the final slug with the return value, normalised to the target Container's origin", async () => {
    const mockFetch = setMockOnFetch(
      jest.fn(window.fetch),
      mockResponse("Arbitrary response", {
        headers: {
          Location: "/parent-container/child-container/",
        },
        url: "https://some.pod/parent-container/",
      })
    );

    const savedSolidDataset = await createContainerInContainer(
      "https://some.pod/parent-container/",
      {
        fetch: mockFetch,
      }
    );

    expect(savedSolidDataset!.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/parent-container/child-container/"
    );
  });

  it("includes the final slug with the return value, relative to the target Container", async () => {
    const mockFetch = setMockOnFetch(
      jest.fn(window.fetch),
      mockResponse("Arbitrary response", {
        headers: {
          Location: "child-container/",
          "Content-Location":
            "https://some.pod/parent-container/child-container/",
        },
        url: "https://some.pod/parent-container/",
      })
    );

    const savedSolidDataset = await createContainerInContainer(
      "https://some.pod/parent-container/",
      {
        fetch: mockFetch,
      }
    );

    expect(savedSolidDataset!.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/parent-container/child-container/"
    );
  });
});

describe("deleteContainer", () => {
  it("should DELETE a remote Container using the included fetcher if no other fetcher is available", async () => {
    const fetcher = jest.requireMock("../fetcher") as {
      fetch: jest.Mocked<typeof fetch>;
    };

    fetcher.fetch.mockResolvedValueOnce(
      new Response(undefined, { status: 200, statusText: "Deleted" })
    );

    const response = await deleteContainer("https://some.pod/container/");

    expect(fetcher.fetch.mock.calls).toEqual([
      [
        "https://some.pod/container/",
        {
          method: "DELETE",
        },
      ],
    ]);
    expect(response).toBeUndefined();
  });

  it("should DELETE a remote Container using the provided fetcher", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockResolvedValue(
        new Response(undefined, { status: 200, statusText: "Deleted" })
      );

    const response = await deleteContainer("https://some.pod/container/", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toEqual([
      [
        "https://some.pod/container/",
        {
          method: "DELETE",
        },
      ],
    ]);
    expect(response).toBeUndefined();
  });

  it("should accept a fetched Container as target", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockResolvedValue(
        new Response(undefined, { status: 200, statusText: "Deleted" })
      );

    const mockContainer = mockSolidDatasetFrom("https://some.pod/container/");

    const response = await deleteContainer(mockContainer, {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toEqual([
      [
        "https://some.pod/container/",
        {
          method: "DELETE",
        },
      ],
    ]);
    expect(response).toBeUndefined();
  });

  it("should throw an error when the target is not a Container", async () => {
    const mockSolidDataset = mockSolidDatasetFrom("https://some.pod/resource");
    const deletionPromise = deleteContainer(mockSolidDataset);

    await expect(deletionPromise).rejects.toThrow(
      "You're trying to delete the Container at [https://some.pod/resource], but Container URLs should end in a `/`. Are you sure this is a Container?"
    );
  });

  it("should throw an error on a failed request", async () => {
    const mockFetch = jest.fn(window.fetch).mockResolvedValue(
      new Response(undefined, {
        status: 400,
        statusText: "Bad request",
      })
    );

    const deletionPromise = deleteContainer("https://some.pod/container/", {
      fetch: mockFetch,
    });

    await expect(deletionPromise).rejects.toThrow(
      "Deleting the Container at [https://some.pod/container/] failed: [400] [Bad request]"
    );
  });

  it("includes the status code and status message when a request failed", async () => {
    const mockFetch = jest.fn(window.fetch).mockResolvedValue(
      new Response(undefined, {
        status: 418,
        statusText: "I'm a teapot!",
      })
    );

    const deletionPromise = deleteContainer(
      "https://arbitrary.pod/container/",
      {
        fetch: mockFetch,
      }
    );

    await expect(deletionPromise).rejects.toMatchObject({
      statusCode: 418,
      statusText: "I'm a teapot!",
    });
  });
});

describe("getContainedResourceUrlAll", () => {
  const mockContainer = (
    containerUrl: string,
    containedResourceNames: UrlString[]
  ) => {
    let childrenIndex = createThing({ url: containerUrl });
    let mockedContainer = mockContainerFrom(containerUrl);

    containedResourceNames.forEach((resourceName) => {
      let childListing = createThing({
        url: `${containerUrl + resourceName}.ttl`,
      });
      childListing = addUrl(childListing, rdf.type, ldp.Resource);

      childrenIndex = addUrl(childrenIndex, ldp.contains, childListing);
      mockedContainer = setThing(mockedContainer, childListing);
    });

    mockedContainer = setThing(mockedContainer, childrenIndex);
    childrenIndex = addUrl(childrenIndex, rdf.type, ldp.Container);

    return mockedContainer;
  };

  it("gets all URLs for contained Resources from a Container", () => {
    const containerUrl = "https://arbitrary.pod/container/";
    const containedThings = ["resource1", "resource2", "resource3"];
    const container = mockContainer(containerUrl, containedThings);
    const expectedReturnUrls = containedThings.map(
      (thingName) => `${containerUrl}${thingName}.ttl`
    );

    expect(getContainedResourceUrlAll(container)).toStrictEqual(
      expectedReturnUrls
    );
  });

  it("returns an empty array if the Container contains no Resources", () => {
    const containerUrl = "https://arbitrary.pod/container/";
    const containedThings: UrlString[] = [];
    const container = mockContainer(containerUrl, containedThings);

    expect(getContainedResourceUrlAll(container)).toStrictEqual(
      containedThings
    );
  });

  it("returns an empty array if the Container contains no index of contained Resources", () => {
    const dataset = mockSolidDatasetFrom("https://arbitrary.pod/dataset");
    expect(getContainedResourceUrlAll(dataset)).toStrictEqual([]);
  });
});

describe("solidDatasetAsMarkdown", () => {
  it("returns a readable version of an empty, unsaved SolidDataset", () => {
    const emptyDataset = createSolidDataset();

    expect(solidDatasetAsMarkdown(emptyDataset)).toBe(
      "# SolidDataset (no URL yet)\n\n<empty>\n"
    );
  });

  it("returns a readable version of an empty SolidDataset with a known URL", () => {
    const datasetWithSourceUrl = mockSolidDatasetFrom(
      "https://some.pod/resource"
    );

    expect(solidDatasetAsMarkdown(datasetWithSourceUrl)).toBe(
      "# SolidDataset: https://some.pod/resource\n\n<empty>\n"
    );
  });

  it("returns a readable version of a SolidDataset that contains an unsaved Thing", () => {
    let thing = createThing({ name: "thing" });
    thing = addStringNoLocale(
      thing,
      "https://some.vocab/predicate",
      "Some string"
    );
    thing = addStringNoLocale(
      thing,
      "https://some.vocab/predicate",
      "Some other string"
    );
    const datasetWithUnsavedThing = setThing(createSolidDataset(), thing);

    expect(solidDatasetAsMarkdown(datasetWithUnsavedThing)).toBe(
      "# SolidDataset (no URL yet)\n\n" +
        "## Thing (no URL yet — identifier: `#thing`)\n\n" +
        "Property: https://some.vocab/predicate\n" +
        '- "Some string" (string)\n' +
        '- "Some other string" (string)\n\n' +
        "(2 new values added / 0 values removed)\n"
    );
  });

  it("returns a readable version of a SolidDataset that contains a fetched Thing that has been changed", () => {
    let thing = mockThingFrom("https://some.pod/resource#thing");
    thing = addStringNoLocale(
      thing,
      "https://some.vocab/predicate",
      "Some string"
    );
    thing = addStringNoLocale(
      thing,
      "https://some.vocab/predicate",
      "Some other string"
    );
    let datasetWithSavedThing = setThing(
      mockSolidDatasetFrom("https://some.pod/resource"),
      thing
    );
    // Pretend that datasetWithSavedThing was fetched from the Pod with its current contents:
    datasetWithSavedThing = {
      ...datasetWithSavedThing,
      internal_changeLog: { additions: [], deletions: [] },
    };
    let changedThing = addStringNoLocale(
      thing,
      "https://some.vocab/predicate",
      "Yet another string"
    );
    changedThing = removeStringNoLocale(
      changedThing,
      "https://some.vocab/predicate",
      "Some other string"
    );
    const changedDataset = setThing(datasetWithSavedThing, changedThing);

    expect(solidDatasetAsMarkdown(changedDataset)).toBe(
      "# SolidDataset: https://some.pod/resource\n\n" +
        "## Thing: https://some.pod/resource#thing\n\n" +
        "Property: https://some.vocab/predicate\n" +
        '- "Some string" (string)\n' +
        '- "Yet another string" (string)\n\n' +
        "(1 new value added / 1 value removed)\n"
    );
  });

  it("returns a readable version of a SolidDataset that contains multiple Things", () => {
    let thing1 = createThing({ name: "thing1" });
    thing1 = addStringNoLocale(
      thing1,
      "https://some.vocab/predicate",
      "Some string"
    );
    let thing2 = createThing({ name: "thing2" });
    thing2 = addStringNoLocale(
      thing2,
      "https://some.vocab/predicate",
      "Some other string"
    );
    let datasetWithMultipleThings = setThing(createSolidDataset(), thing1);
    datasetWithMultipleThings = setThing(datasetWithMultipleThings, thing2);

    expect(solidDatasetAsMarkdown(datasetWithMultipleThings)).toBe(
      "# SolidDataset (no URL yet)\n\n" +
        "## Thing (no URL yet — identifier: `#thing1`)\n\n" +
        "Property: https://some.vocab/predicate\n" +
        '- "Some string" (string)\n\n' +
        "(1 new value added / 0 values removed)\n\n" +
        "## Thing (no URL yet — identifier: `#thing2`)\n\n" +
        "Property: https://some.vocab/predicate\n" +
        '- "Some other string" (string)\n\n' +
        "(1 new value added / 0 values removed)\n"
    );
  });

  it("returns a readable version of a SolidDataset that contains multiple fetched Things that have been changed", () => {
    let thing1 = mockThingFrom("https://some.pod/resource#thing1");
    thing1 = addStringNoLocale(
      thing1,
      "https://some.vocab/predicate",
      "Some string"
    );
    thing1 = addStringNoLocale(
      thing1,
      "https://some.vocab/predicate",
      "Some other string"
    );
    let thing2 = mockThingFrom("https://some.pod/resource#thing2");
    thing2 = addStringNoLocale(
      thing2,
      "https://some.vocab/predicate",
      "Some string"
    );
    thing2 = addStringNoLocale(
      thing2,
      "https://some.vocab/predicate",
      "Some other string"
    );
    let datasetWithSavedThings = setThing(
      mockSolidDatasetFrom("https://some.pod/resource"),
      thing1
    );
    datasetWithSavedThings = setThing(datasetWithSavedThings, thing2);

    // Pretend that datasetWithSavedThing was fetched from the Pod with its current contents:
    datasetWithSavedThings = {
      ...datasetWithSavedThings,
      internal_changeLog: {
        additions: [],
        deletions: [],
      },
    };
    let changedThing1 = addStringNoLocale(
      thing1,
      "https://some.vocab/predicate",
      "Yet another string"
    );
    changedThing1 = removeStringNoLocale(
      changedThing1,
      "https://some.vocab/predicate",
      "Some other string"
    );
    const changedThing2 = removeStringNoLocale(
      thing2,
      "https://some.vocab/predicate",
      "Some other string"
    );
    let changedDataset = setThing(datasetWithSavedThings, changedThing1);
    changedDataset = setThing(changedDataset, changedThing2);

    expect(solidDatasetAsMarkdown(changedDataset)).toBe(
      "# SolidDataset: https://some.pod/resource\n\n" +
        "## Thing: https://some.pod/resource#thing1\n\n" +
        "Property: https://some.vocab/predicate\n" +
        '- "Some string" (string)\n' +
        '- "Yet another string" (string)\n\n' +
        "(1 new value added / 1 value removed)\n\n" +
        "## Thing: https://some.pod/resource#thing2\n\n" +
        "Property: https://some.vocab/predicate\n" +
        '- "Some string" (string)\n\n' +
        "(0 new values added / 1 value removed)\n"
    );
  });

  it("does not show a list of changes if none is available", () => {
    const mockThing = addStringNoLocale(
      createThing({ url: "https://arbitrary.pod/resource#thing" }),
      "https://arbitrary.vocab/predicate",
      "Arbitrary string"
    );
    const datasetWithoutChangeLog = {
      ...setThing(createSolidDataset(), mockThing),
      internal_changeLog: undefined,
    };

    expect(solidDatasetAsMarkdown(datasetWithoutChangeLog)).toBe(
      "# SolidDataset (no URL yet)\n\n" +
        "## Thing: https://arbitrary.pod/resource#thing\n\n" +
        "Property: https://arbitrary.vocab/predicate\n" +
        '- "Arbitrary string" (string)\n'
    );
  });
});

describe("changeLogAsMarkdown", () => {
  it("returns a readable version of an in-memory-only SolidDataset", () => {
    const freshDataset = createSolidDataset();

    expect(
      changeLogAsMarkdown(
        freshDataset as unknown as SolidDataset & WithChangeLog
      )
    ).toBe(
      "This is a newly initialized SolidDataset, so there is no source to compare it to."
    );
  });

  it("returns a readable version of a SolidDataset that has not been changed yet", () => {
    const unchangedDataset = mockSolidDatasetFrom("https://some.pod/resource");

    expect(
      changeLogAsMarkdown(
        unchangedDataset as unknown as SolidDataset & WithChangeLog
      )
    ).toBe(
      "## Changes compared to https://some.pod/resource\n\n" +
        "This SolidDataset has not been modified since it was fetched from https://some.pod/resource.\n"
    );
  });

  it("returns a readable version of a SolidDataset that had changes that were undone again", () => {
    let thing = mockThingFrom("https://arbitrary.pod/resource#thing");
    thing = addStringNoLocale(
      thing,
      "https://arbitrary.vocab/predicate",
      "Arbitrary string"
    );
    const newDataset = mockSolidDatasetFrom("https://some.pod/resource");
    const changedDataset = setThing(newDataset, thing);
    const undoneThing = removeStringNoLocale(
      thing,
      "https://arbitrary.vocab/predicate",
      "Arbitrary string"
    );
    const undoneDataset = setThing(changedDataset, undoneThing);

    expect(changeLogAsMarkdown(undoneDataset)).toBe(
      "## Changes compared to https://some.pod/resource\n\n" +
        "This SolidDataset has not been modified since it was fetched from https://some.pod/resource.\n"
    );
  });

  it("returns a readable version of a SolidDataset that had a new Thing with a local Subject added to it", () => {
    let thing = createThing({ name: "some-new-thing" });
    thing = addStringNoLocale(
      thing,
      "https://arbitrary.vocab/predicate",
      "Arbitrary string"
    );
    const newDataset = mockSolidDatasetFrom("https://some.pod/resource");
    const fetchedDataset = {
      ...newDataset,
      internal_changeLog: {
        additions: [],
        deletions: [],
      },
    };
    const changedDataset = setThing(fetchedDataset, thing);

    expect(changeLogAsMarkdown(changedDataset)).toBe(
      "## Changes compared to https://some.pod/resource\n\n" +
        "### Thing: https://some.pod/resource#some-new-thing\n\n" +
        "Property: https://arbitrary.vocab/predicate\n" +
        "- Added:\n" +
        '  - "Arbitrary string" (string)\n'
    );
  });

  it("returns a readable version of local changes to a SolidDataset", () => {
    let thing1 = mockThingFrom("https://some.pod/resource#thing1");
    thing1 = addStringNoLocale(
      thing1,
      "https://some.vocab/predicate",
      "Some string"
    );
    thing1 = addStringNoLocale(
      thing1,
      "https://some.vocab/predicate",
      "Some other string"
    );
    let thing2 = mockThingFrom("https://some.pod/resource#thing2");
    thing2 = addStringNoLocale(
      thing2,
      "https://some.vocab/predicate",
      "Some string"
    );
    thing2 = addStringNoLocale(
      thing2,
      "https://some.vocab/predicate",
      "Some other string"
    );
    let datasetWithSavedThings = setThing(
      mockSolidDatasetFrom("https://some.pod/resource"),
      thing1
    );
    datasetWithSavedThings = setThing(datasetWithSavedThings, thing2);

    // Pretend that datasetWithSavedThing was fetched from the Pod with its current contents:
    datasetWithSavedThings = {
      ...datasetWithSavedThings,
      internal_changeLog: {
        additions: [],
        deletions: [],
      },
    };
    let changedThing1 = addStringNoLocale(
      thing1,
      "https://some.vocab/predicate",
      "Yet another string"
    );
    changedThing1 = removeStringNoLocale(
      changedThing1,
      "https://some.vocab/predicate",
      "Some other string"
    );
    let changedThing2 = removeStringNoLocale(
      thing2,
      "https://some.vocab/predicate",
      "Some string"
    );
    changedThing2 = removeStringNoLocale(
      changedThing2,
      "https://some.vocab/predicate",
      "Some other string"
    );
    let changedDataset = setThing(datasetWithSavedThings, changedThing1);
    changedDataset = setThing(changedDataset, changedThing2);

    let newThing = createThing({ name: "thing3" });
    newThing = addStringNoLocale(
      newThing,
      "https://some.vocab/predicate",
      "Some string"
    );
    changedDataset = setThing(changedDataset, newThing);

    expect(changeLogAsMarkdown(changedDataset)).toBe(
      "## Changes compared to https://some.pod/resource\n\n" +
        "### Thing: https://some.pod/resource#thing1\n\n" +
        "Property: https://some.vocab/predicate\n" +
        "- Removed:\n" +
        '  - "Some other string" (string)\n' +
        "- Added:\n" +
        '  - "Yet another string" (string)\n\n' +
        "### Thing: https://some.pod/resource#thing2\n\n" +
        "Property: https://some.vocab/predicate\n" +
        "- Removed:\n" +
        '  - "Some string" (string)\n' +
        '  - "Some other string" (string)\n\n' +
        "### Thing: https://some.pod/resource#thing3\n\n" +
        "Property: https://some.vocab/predicate\n" +
        "- Added:\n" +
        '  - "Some string" (string)\n'
    );
  });

  it("does not choke on invalid Quads that found their way into the ChangeLog", () => {
    let thing = createThing({ name: "thing" });
    thing = addStringNoLocale(
      thing,
      "https://some.vocab/predicate",
      "Some string"
    );
    const datasetWithInvalidChangeLog = setThing(
      mockSolidDatasetFrom("https://some.pod/resource"),
      thing
    );

    // Pretend that the deletions and additions contain the same Quad:
    datasetWithInvalidChangeLog.internal_changeLog.deletions.push(
      datasetWithInvalidChangeLog.internal_changeLog.additions[0]
    );

    const quadWithInvalidSubject = DataFactory.quad(
      // We'd never use a variable as the Subject:
      DataFactory.variable("Arbitrary variable name"),
      DataFactory.namedNode("https://arbitrary.vocab/predicate"),
      DataFactory.literal("Arbitrary object")
    );
    const quadWithInvalidPredicate = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.pod/resource#thing"),
      // Predicates should always be NamedNodes:
      DataFactory.literal("Not a NamedNode") as any,
      DataFactory.literal("Arbitrary object")
    );
    datasetWithInvalidChangeLog.internal_changeLog.additions.push(
      quadWithInvalidSubject,
      quadWithInvalidPredicate
    );
    datasetWithInvalidChangeLog.internal_changeLog.deletions.push(
      quadWithInvalidSubject,
      quadWithInvalidPredicate
    );

    expect(changeLogAsMarkdown(datasetWithInvalidChangeLog)).toBe(
      "## Changes compared to https://some.pod/resource\n\n" +
        "### Thing: https://some.pod/resource#thing\n\n" +
        "Property: https://some.vocab/predicate\n" +
        "- Removed:\n" +
        '  - "Some string" (string)\n' +
        "- Added:\n" +
        '  - "Some string" (string)\n'
    );
  });
});

describe("getWellKnownSolid", () => {
  const serverUrl = "https://example.org/";
  const podUrl = "https://example.org/pod/";
  const resourceUrl = "https://example.org/pod/resource";
  const wellKnownSolid = ".well-known/solid";
  let mockedFetcher: { fetch: jest.Mocked<typeof window.fetch> };

  const mockESS20 = () =>
    mockedFetcher.fetch.mockResolvedValueOnce(
      new Response(
        `@prefix solid: <http://www.w3.org/ns/solid/terms#> .

    [
        a solid:DiscoveryDocument ;
        <http://www.w3.org/ns/auth/acl#trustedApp>
                <https://podbrowser.inrupt.com/api/app> ;
        solid:maxPodsPerOwner      10 ;
        solid:notificationGateway  <https://notification.inrupt.com/> ;
        solid:provision            <https://provision.inrupt.com/> ;
        solid:validatesRdfSources  true
    ] .`,
        {
          headers: {
            "Content-Type": "text/turtle",
          },
        }
      )
    );

  const mockESS11 = () =>
    mockedFetcher.fetch.mockImplementation(
      async (url: RequestInfo | URL, init?: RequestInit) => {
        if (url === "https://example.org/.well-known/solid") {
          return mockResponse(undefined, { status: 404, url });
        }

        if (url === "https://example.org/pod/resource") {
          return mockResponse(undefined, {
            url: resourceUrl,
            headers: {
              "Content-Type": "text/turtle",
              link: `<${podUrl}>; rel="http://www.w3.org/ns/pim/space#storage"`,
            },
          });
        }

        if (url === "https://example.org/pod/.well-known/solid") {
          return mockResponse(
            `
          {
            "@context":"https://pod.inrupt.com/solid/v1",
            "consent":"https://consent.pod.inrupt.com",
            "notificationGateway":"https://notification.pod.inrupt.com",
            "powerSwitch":"https://pod.inrupt.com/powerswitch/username",
            "storage":"https://pod.inrupt.com/username/"
          }`,
            {
              url,
              headers: { "Content-Type": "application/ld+json" },
            }
          );
        }

        throw new Error(`Unhandled request: ${url}, ${JSON.stringify(init)}`);
      }
    );

  beforeAll(() => {
    mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mocked<typeof window.fetch>;
    };
  });

  it("fetches root well known solid by default", async () => {
    // Fetches root well known
    mockESS20();

    await getWellKnownSolid(resourceUrl);

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(1);
    expect(mockedFetcher.fetch.mock.calls[0][0]).toBe(
      serverUrl.concat(wellKnownSolid)
    );
  });

  it("uses the given fetcher for root well known solid if provided", async () => {
    mockESS20();

    await getWellKnownSolid(resourceUrl, { fetch: mockedFetcher.fetch });

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(1);
    expect(mockedFetcher.fetch.mock.calls[0][0]).toBe(
      serverUrl.concat(wellKnownSolid)
    );
  });

  it("fetches pod root well known solid otherwise", async () => {
    mockESS11();

    await getWellKnownSolid(resourceUrl);

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(3);

    // Tries the root well known solid first is used to determine well known Solid
    expect(mockedFetcher.fetch.mock.calls[0][0]).toBe(
      serverUrl.concat(wellKnownSolid)
    );
    // Checks the resource's location header otherwise
    expect(mockedFetcher.fetch.mock.calls[1][0]).toBe(resourceUrl);
    // The advertised podIdentifier (as storage) is used to determine well known Solid
    expect(mockedFetcher.fetch.mock.calls[2][0]).toBe(
      podUrl.concat(wellKnownSolid)
    );
  });

  it("uses the given fetcher for pod root well known solid if provided", async () => {
    mockESS11();

    await getWellKnownSolid(resourceUrl, { fetch: mockedFetcher.fetch });

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(3);

    // Fails at pod root (unauthenticated)
    expect(mockedFetcher.fetch.mock.calls[0][0]).toBe(
      serverUrl.concat(wellKnownSolid)
    );
    // Checks the pod root (authenticated/with the provided fetcher)
    expect(mockedFetcher.fetch.mock.calls[1][0]).toBe(resourceUrl);
    // Retrieve pod root well known solid
    expect(mockedFetcher.fetch.mock.calls[2][0]).toBe(
      podUrl.concat(".well-known/solid")
    );
  });

  it("appends a / to the Pod root if missing before appending .well-known/solid", async () => {
    // Root cannot be fetched
    mockedFetcher.fetch.mockResolvedValueOnce(
      new Response(undefined, { status: 404 })
    );
    // Resource advertises Pod root
    mockedFetcher.fetch.mockResolvedValueOnce(
      mockResponse(undefined, {
        url: resourceUrl,
        headers: {
          "Content-Type": "text/turtle",
          link: `</username>; rel="http://www.w3.org/ns/pim/space#storage"`,
        },
      })
    );
    // Fetches Pod root well known
    mockedFetcher.fetch.mockResolvedValueOnce(
      new Response(
        `{
          "@context":"https://pod.inrupt.com/solid/v1",
          "consent":"https://consent.pod.inrupt.com",
          "notificationGateway":"https://notification.pod.inrupt.com",
          "powerSwitch":"https://pod.inrupt.com/powerswitch/username",
          "storage":"https://pod.inrupt.com/username/"
        }`,
        {
          headers: {
            "Content-Type": "application/ld+json",
          },
        }
      )
    );

    await getWellKnownSolid(resourceUrl);

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(3);

    // Tries the root well known solid first is used to determine well known Solid
    expect(mockedFetcher.fetch.mock.calls[0][0]).toBe(
      serverUrl.concat(wellKnownSolid)
    );
    // Checks the resource's location header otherwise
    expect(mockedFetcher.fetch.mock.calls[1][0]).toBe(resourceUrl);
    // The advertised podIdentifier (as storage) is used to determine well known Solid
    expect(mockedFetcher.fetch.mock.calls[2][0]).toBe(
      serverUrl.concat("username/", wellKnownSolid)
    );
  });

  it("Throws an error if the resource metadata can't be fetched", async () => {
    // Can't fetch root well known
    mockedFetcher.fetch.mockResolvedValueOnce(
      new Response(undefined, { status: 404 })
    );
    // Resource advertises Pod root
    mockedFetcher.fetch.mockResolvedValueOnce(
      mockResponse(undefined, {
        url: resourceUrl,
        headers: {
          "Content-Type": "text/turtle",
          link: `</username>; rel="http://www.w3.org/ns/pim/space#storage"`,
        },
      })
    );
    // Can't fetch pod root well known solid
    mockedFetcher.fetch.mockResolvedValueOnce(
      new Response(undefined, { status: 404 })
    );

    await expect(getWellKnownSolid(resourceUrl)).rejects.toThrow();

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(3);
  });

  it("Throws an error if the pod root cannot be determined", async () => {
    // Can't fetch root well known
    mockedFetcher.fetch.mockResolvedValueOnce(
      new Response(undefined, { status: 404 })
    );
    // Resource does not advertise pod root
    mockedFetcher.fetch.mockResolvedValueOnce(new Response(undefined));

    await expect(getWellKnownSolid(resourceUrl)).rejects.toThrow(
      "Could not determine storage root or well-known solid resource."
    );

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(2);
  });

  it("returns the contents of .well-known/solid for the given resource (2.0)", async () => {
    mockESS20();

    const wellKnownSolidResponse = await getWellKnownSolid(resourceUrl, {
      fetch: mockedFetcher.fetch,
    });

    expect(wellKnownSolidResponse).toMatchSnapshot();
  });

  it("returns the contents of .well-known/solid for the given resource (1.1)", async () => {
    mockESS11();

    const wellKnownSolidResponse = await getWellKnownSolid(resourceUrl, {
      fetch: mockedFetcher.fetch,
    });

    expect(wellKnownSolidResponse).toMatchSnapshot();
  });
});
