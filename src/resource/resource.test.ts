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

import { jest, describe, it, expect } from "@jest/globals";

import { Response } from "cross-fetch";
import {
  getResourceInfo,
  getSourceIri,
  getPodOwner,
  isPodOwner,
  FetchError,
  isContainer,
  isRawData,
  getContentType,
  getLinkedResourceUrlAll,
  getEffectiveAccess,
} from "./resource";
import { internal_cloneResource } from "./resource.internal";
import {
  WithResourceInfo,
  IriString,
  WithServerResourceInfo,
  SolidClientError,
} from "../interfaces";
import { createSolidDataset } from "./solidDataset";

jest.mock("../fetcher.ts", () => ({
  fetch: jest.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(undefined, {
        headers: { Location: "https://arbitrary.pod/resource" },
      })
    )
  ),
}));

function mockResponse(
  body?: BodyInit | null,
  init?: ResponseInit & { url: string }
): Response {
  return new Response(body, init);
}

type MockedFetch = jest.Mock<
  ReturnType<typeof window.fetch>,
  Parameters<typeof window.fetch>
>;

describe("getResourceInfo", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: MockedFetch;
    };

    await getResourceInfo("https://some.pod/resource");

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(1);
    expect(mockedFetcher.fetch.mock.calls[0][0]).toBe(
      "https://some.pod/resource"
    );
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    await getResourceInfo("https://some.pod/resource", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toHaveLength(1);
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

    const solidDatasetInfo = await getResourceInfo(
      "https://some.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    expect(solidDatasetInfo.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/resource"
    );
  });

  it("knows when the Resource contains a SolidDataset", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          url: "https://arbitrary.pod/resource",
          headers: { "Content-Type": "text/turtle" },
        })
      )
    );

    const solidDatasetInfo = await getResourceInfo(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    expect(solidDatasetInfo.internal_resourceInfo.isRawData).toBe(false);
  });

  it("knows when the Resource does not contain a SolidDataset", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          url: "https://arbitrary.pod/resource",
          headers: { "Content-Type": "image/svg+xml" },
        })
      )
    );

    const solidDatasetInfo = await getResourceInfo(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    expect(solidDatasetInfo.internal_resourceInfo.isRawData).toBe(true);
  });

  it("marks a Resource as not a SolidDataset when its Content Type is unknown", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          mockResponse(undefined, { url: "https://arbitrary.pod/resource" })
        )
      );

    const solidDatasetInfo = await getResourceInfo(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    expect(solidDatasetInfo.internal_resourceInfo.isRawData).toBe(true);
  });

  it("exposes the Content Type when known", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          url: "https://some.pod/resource",
          headers: { "Content-Type": "text/turtle; charset=UTF-8" },
        })
      )
    );

    const solidDatasetInfo = await getResourceInfo(
      "https://some.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    expect(solidDatasetInfo.internal_resourceInfo.contentType).toBe(
      "text/turtle; charset=UTF-8"
    );
  });

  it("does not expose a Content-Type when none is known", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse()));

    const solidDatasetInfo = await getResourceInfo(
      "https://some.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    expect(solidDatasetInfo.internal_resourceInfo.contentType).toBeUndefined();
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

    const solidDatasetInfo = await getResourceInfo(
      "https://some.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(solidDatasetInfo.internal_resourceInfo.aclUrl).toBe(
      "https://some.pod/container/aclresource.acl"
    );
  });

  it("exposes the URLs of linked Resources", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          headers: {
            Link: '<aclresource.acl>; rel="acl", <https://some.pod/profile#WebId>; rel="http://www.w3.org/ns/solid/terms#podOwner", <https://some.pod/rss>; rel="alternate", <https://some.pod/atom>; rel="alternate"',
          },
          url: "https://some.pod",
        })
      )
    );

    const solidDatasetInfo = await getResourceInfo(
      "https://some.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(solidDatasetInfo.internal_resourceInfo.linkedResources).toEqual({
      acl: ["https://some.pod/aclresource.acl"],
      "http://www.w3.org/ns/solid/terms#podOwner": [
        "https://some.pod/profile#WebId",
      ],
      alternate: ["https://some.pod/rss", "https://some.pod/atom"],
    });
  });

  it("exposes when no Resources were linked", async () => {
    const mockFetch = jest.fn(window.fetch).mockResolvedValue(
      mockResponse(undefined, {
        url: "https://arbitrary.pod",
      })
    );

    const solidDatasetInfo = await getResourceInfo(
      "https://some.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(solidDatasetInfo.internal_resourceInfo.linkedResources).toEqual({});
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

    const solidDatasetInfo = await getResourceInfo(
      "https://some.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(solidDatasetInfo.internal_resourceInfo.aclUrl).toBeUndefined();
  });

  it("provides the relevant access permissions to the Resource, if available", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          headers: {
            "wac-aLLOW": 'public="read",user="read write append control"',
          },
        })
      )
    );

    const solidDatasetInfo = await getResourceInfo(
      "https://arbitrary.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(solidDatasetInfo.internal_resourceInfo.permissions).toEqual({
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

    const solidDatasetInfo = await getResourceInfo(
      "https://arbitrary.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(solidDatasetInfo.internal_resourceInfo.permissions).toEqual({
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

    const solidDatasetInfo = await getResourceInfo(
      "https://arbitrary.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(solidDatasetInfo.internal_resourceInfo.permissions).toBeUndefined();
  });

  it("does not request the actual data from the server", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          mockResponse(undefined, { url: "https://some.pod/resource" })
        )
      );

    await getResourceInfo("https://some.pod/resource", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toEqual([
      ["https://some.pod/resource", { method: "HEAD" }],
    ]);
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockResponse = new Response("Not allowed", { status: 403 });
    jest
      .spyOn(mockResponse, "url", "get")
      .mockReturnValue("https://some.pod/resource");
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse));

    const fetchPromise = getResourceInfo("https://some.pod/resource", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error(
        "Fetching the metadata of the Resource at [https://some.pod/resource] failed: [403] [Forbidden]."
      )
    );
  });

  it("overrides a 403 error if provided the appropriate option", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          mockResponse("Forbidden", { status: 403, url: "https://some.url" })
        )
      );

    const resourceInfo = await getResourceInfo("https://some.pod/resource", {
      fetch: mockFetch,
      ignoreAuthenticationErrors: true,
    });

    expect(resourceInfo.internal_resourceInfo.sourceIri).toBe(
      "https://some.url"
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockResponse = new Response("Not found", { status: 404 });
    jest
      .spyOn(mockResponse, "url", "get")
      .mockReturnValue("https://some.pod/resource");
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse));

    const fetchPromise = getResourceInfo("https://some.pod/resource", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error(
        "Fetching the metadata of the Resource at [https://some.pod/resource] failed: [404] [Not Found]."
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

    const fetchPromise = getResourceInfo("https://arbitrary.pod/resource", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toMatchObject({
      statusCode: 418,
      statusText: "I'm a teapot!",
    });
  });

  it("does not ignore non-auth errors", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response("I'm a teapot!", {
          status: 418,
          statusText: "I'm a teapot!",
        })
      )
    );

    const fetchPromise = getResourceInfo("https://arbitrary.pod/resource", {
      fetch: mockFetch,
      ignoreAuthenticationErrors: true,
    });

    await expect(fetchPromise).rejects.toMatchObject({
      statusCode: 418,
      statusText: "I'm a teapot!",
    });
  });

  it("throws an instance of SolidClientError when a request failed", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response("I'm a teapot!", {
          status: 418,
          statusText: "I'm a teapot!",
        })
      )
    );

    const fetchPromise = getResourceInfo("https://arbitrary.pod/resource", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toBeInstanceOf(SolidClientError);
  });

  it("throws an instance of FetchError when a request failed", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response("I'm a teapot!", {
          status: 418,
          statusText: "I'm a teapot!",
        })
      )
    );

    const fetchPromise = getResourceInfo("https://arbitrary.pod/resource", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toBeInstanceOf(FetchError);
  });
});

describe("isContainer", () => {
  it("should recognise a Container", () => {
    const resourceInfo: WithResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/container/",
        isRawData: false,
      },
    };

    expect(isContainer(resourceInfo)).toBe(true);
  });

  it("should recognise non-Containers", () => {
    const resourceInfo: WithResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/container/not-a-container",
        isRawData: false,
      },
    };

    expect(isContainer(resourceInfo)).toBe(false);
  });

  it("should recognise a Container's URL", () => {
    expect(isContainer("https://arbitrary.pod/container/")).toBe(true);
  });

  it("should recognise non-Container URLs", () => {
    expect(isContainer("https://arbitrary.pod/container/not-a-container")).toBe(
      false
    );
  });
});

describe("isRawData", () => {
  it("should recognise a SolidDataset", () => {
    const resourceInfo: WithResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/container/",
        isRawData: false,
      },
    };

    expect(isRawData(resourceInfo)).toBe(false);
  });

  it("should recognise non-RDF Resources", () => {
    const resourceInfo: WithResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/container/not-a-soliddataset.png",
        isRawData: true,
      },
    };

    expect(isRawData(resourceInfo)).toBe(true);
  });
});

describe("getContentType", () => {
  it("should return the Content Type if known", () => {
    const resourceInfo: WithResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: false,
        contentType: "multipart/form-data; boundary=something",
      },
    };

    expect(getContentType(resourceInfo)).toBe(
      "multipart/form-data; boundary=something"
    );
  });

  it("should return null if no Content Type is known", () => {
    const resourceInfo: WithResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: false,
      },
    };

    expect(getContentType(resourceInfo)).toBeNull();
  });
});

describe("getSourceIri", () => {
  it("returns the source IRI if known", () => {
    const withResourceInfo: WithResourceInfo = Object.assign(new Blob(), {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: true,
      },
    });

    const sourceIri: IriString = getSourceIri(withResourceInfo);
    expect(sourceIri).toBe("https://arbitrary.pod/resource");
  });

  it("returns null if no source IRI is known", () => {
    expect(getSourceIri(new Blob())).toBeNull();
  });
});

describe("getPodOwner", () => {
  it("returns the Pod Owner when known", () => {
    const resourceInfo: WithServerResourceInfo = {
      internal_resourceInfo: {
        isRawData: true,
        sourceIri: "https://arbitrary.pod",
        linkedResources: {
          "http://www.w3.org/ns/solid/terms#podOwner": [
            "https://some.pod/profile#WebId",
          ],
        },
      },
    };

    expect(getPodOwner(resourceInfo)).toBe("https://some.pod/profile#WebId");
  });

  it("returns null if the Pod Owner is not exposed", () => {
    const resourceInfo: WithServerResourceInfo = {
      internal_resourceInfo: {
        isRawData: true,
        sourceIri: "https://arbitrary.pod/not-the-root",
        linkedResources: {
          "not-pod-owner": ["https://arbitrary.url"],
        },
      },
    };

    expect(getPodOwner(resourceInfo)).toBeNull();
  });

  it("returns null if no Server Resource Info is attached to the given Resource", () => {
    expect(getPodOwner({} as WithServerResourceInfo)).toBeNull();
  });
});

describe("isPodOwner", () => {
  it("returns true when the Pod Owner is known and equal to the given WebID", () => {
    const resourceInfo: WithServerResourceInfo = {
      internal_resourceInfo: {
        isRawData: true,
        sourceIri: "https://arbitrary.pod",
        linkedResources: {
          "http://www.w3.org/ns/solid/terms#podOwner": [
            "https://some.pod/profile#WebId",
          ],
        },
      },
    };

    expect(isPodOwner("https://some.pod/profile#WebId", resourceInfo)).toBe(
      true
    );
  });

  it("returns false when the Pod Owner is known but not equal to the given WebID", () => {
    const resourceInfo: WithServerResourceInfo = {
      internal_resourceInfo: {
        isRawData: true,
        sourceIri: "https://arbitrary.pod",
        linkedResources: {
          "http://www.w3.org/ns/solid/terms#podOwner": [
            "https://some.pod/profile#WebId",
          ],
        },
      },
    };

    expect(
      isPodOwner("https://some-other.pod/profile#WebId", resourceInfo)
    ).toBe(false);
  });

  it("returns null if the Pod Owner is not exposed", () => {
    const resourceInfo: WithServerResourceInfo = {
      internal_resourceInfo: {
        isRawData: true,
        sourceIri: "https://arbitrary.pod/not-the-root",
        linkedResources: {},
      },
    };

    expect(
      isPodOwner("https://arbitrary.pod/profile#WebId", resourceInfo)
    ).toBeNull();
  });
});

describe("getLinkedResourceUrlAll", () => {
  it("returns the URLs of the Resources linked to the given URL, indexed by their relation type", () => {
    const resourceInfo: WithServerResourceInfo = {
      internal_resourceInfo: {
        isRawData: true,
        sourceIri: "https://arbitrary.pod",
        linkedResources: {
          acl: ["https://arbitrary.pod/.acl"],
          "http://www.w3.org/ns/solid/terms#podOwner": [
            "https://some.pod/profile#WebId",
          ],
        },
      },
    };

    expect(getLinkedResourceUrlAll(resourceInfo)).toStrictEqual({
      acl: ["https://arbitrary.pod/.acl"],
      "http://www.w3.org/ns/solid/terms#podOwner": [
        "https://some.pod/profile#WebId",
      ],
    });
  });

  it("returns an empty object when there are no linked Resources", () => {
    const resourceInfo: WithServerResourceInfo = {
      internal_resourceInfo: {
        isRawData: true,
        sourceIri: "https://arbitrary.pod",
        linkedResources: {},
      },
    };

    expect(getLinkedResourceUrlAll(resourceInfo)).toStrictEqual({});
  });
});

describe("getEffectiveAccess", () => {
  it("returns the access for the current user and everyone for WAC-controlled Resources", () => {
    const resourceInfo: WithServerResourceInfo = {
      internal_resourceInfo: {
        isRawData: true,
        sourceIri: "https://arbitrary.pod",
        permissions: {
          user: {
            read: true,
            append: true,
            write: false,
            control: false,
          },
          public: {
            read: true,
            append: false,
            write: false,
            control: false,
          },
        },
        linkedResources: {},
      },
    };

    expect(getEffectiveAccess(resourceInfo)).toStrictEqual({
      user: {
        read: true,
        append: true,
        write: false,
      },
      public: {
        read: true,
        append: false,
        write: false,
      },
    });
  });

  it("returns the access for the current user for ACP-controlled Resources", () => {
    const resourceInfo: WithServerResourceInfo = {
      internal_resourceInfo: {
        isRawData: true,
        sourceIri: "https://arbitrary.pod",
        linkedResources: {
          "http://www.w3.org/ns/solid/acp#allow": [
            "http://www.w3.org/ns/solid/acp#Read",
            "http://www.w3.org/ns/solid/acp#Append",
          ],
        },
      },
    };

    expect(getEffectiveAccess(resourceInfo)).toStrictEqual({
      user: {
        read: true,
        append: true,
        write: false,
      },
    });
  });

  it("understands Write to imply Append for ACP-controlled servers", () => {
    const resourceInfo: WithServerResourceInfo = {
      internal_resourceInfo: {
        isRawData: true,
        sourceIri: "https://arbitrary.pod",
        linkedResources: {
          "http://www.w3.org/ns/solid/acp#allow": [
            "http://www.w3.org/ns/solid/acp#Read",
            "http://www.w3.org/ns/solid/acp#Write",
          ],
        },
      },
    };

    expect(getEffectiveAccess(resourceInfo)).toStrictEqual({
      user: {
        read: true,
        append: true,
        write: true,
      },
    });
  });

  it("interprets absence of acp:allow Link headers to mean absence of their respective access", () => {
    const resourceInfo: WithServerResourceInfo = {
      internal_resourceInfo: {
        isRawData: true,
        sourceIri: "https://arbitrary.pod",
        linkedResources: {},
      },
    };

    expect(getEffectiveAccess(resourceInfo)).toStrictEqual({
      user: {
        read: false,
        append: false,
        write: false,
      },
    });
  });
});

describe("cloneResource", () => {
  it("returns a new but equal Dataset", () => {
    const sourceObject = {
      ...createSolidDataset(),
      some: "property",
    };

    const clonedObject = internal_cloneResource(sourceObject);

    expect(clonedObject.some).toBe("property");
    expect(clonedObject).not.toBe(sourceObject);
  });

  it("returns a new but equal Blob", () => {
    const sourceObject = Object.assign(new Blob(["Some text"]), {
      some: "property",
    });

    const clonedObject = internal_cloneResource(sourceObject);

    expect(clonedObject.some).toBe("property");
    expect(clonedObject).not.toBe(sourceObject);
  });

  it("returns a new but equal plain object", () => {
    const sourceObject = { some: "property" };

    const clonedObject = internal_cloneResource(sourceObject);

    expect(clonedObject).toEqual(sourceObject);
    expect(clonedObject).not.toBe(sourceObject);
  });

  it("clones an object containing an object with no 'constructor' at all", () => {
    // This object creation approach creates an object with no 'constructor'
    // field at all.
    const sourceObject = { noCtor: Object.create(null) };

    const clonedObject = internal_cloneResource(sourceObject);

    expect(clonedObject).toEqual(sourceObject);
    expect(clonedObject).not.toBe(sourceObject);
  });
});
