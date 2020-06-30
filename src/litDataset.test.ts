/**
 * Copyright 2020 Inrupt Inc.
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

import { describe, it, expect } from "@jest/globals";
jest.mock("./fetcher.ts", () => ({
  fetch: jest.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(undefined, {
        headers: { Location: "https://arbitrary.pod/resource" },
      })
    )
  ),
}));

import { Response } from "cross-fetch";
import { DataFactory } from "n3";
import { dataset } from "@rdfjs/dataset";
import {
  fetchLitDataset,
  saveLitDatasetAt,
  saveLitDatasetInContainer,
  internal_fetchAcl,
  unstable_fetchLitDatasetWithAcl,
  internal_fetchResourceInfo,
  isContainer,
  isLitDataset,
  getContentType,
  createLitDataset,
  unstable_fetchResourceInfoWithAcl,
  unstable_saveAclFor,
} from "./litDataset";
import {
  WithChangeLog,
  WithResourceInfo,
  IriString,
  LitDataset,
  LocalNode,
  unstable_AclDataset,
} from "./interfaces";

function mockResponse(
  body?: BodyInit | null,
  init?: ResponseInit & { url: string }
): Response {
  return new Response(body, init);
}

describe("createLitDataset", () => {
  it("should initialise a new empty LitDataset", () => {
    const litDataset = createLitDataset();

    expect(Array.from(litDataset)).toEqual([]);
  });
});

describe("fetchLitDataset", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("./fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await fetchLitDataset("https://some.pod/resource");

    expect(mockedFetcher.fetch.mock.calls).toEqual([
      ["https://some.pod/resource"],
    ]);
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    await fetchLitDataset("https://some.pod/resource", { fetch: mockFetch });

    expect(mockFetch.mock.calls).toEqual([["https://some.pod/resource"]]);
  });

  it("keeps track of where the LitDataset was fetched from", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          mockResponse(undefined, { url: "https://some.pod/resource" })
        )
      );

    const litDataset = await fetchLitDataset("https://some.pod/resource", {
      fetch: mockFetch,
    });

    expect(litDataset.resourceInfo.fetchedFrom).toBe(
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

    const litDataset = await fetchLitDataset(
      "https://some.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(litDataset.resourceInfo.unstable_aclUrl).toBe(
      "https://some.pod/container/aclresource.acl"
    );
  });

  it("does not provide an IRI to an ACL resource if not provided one by the server", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          headers: {
            Link: '<arbitrary-resource>; rel="not-acl"',
          },
        })
      )
    );

    const litDataset = await fetchLitDataset(
      "https://some.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(litDataset.resourceInfo.unstable_aclUrl).toBeUndefined();
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

    const litDataset = await fetchLitDataset(
      "https://arbitrary.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(litDataset.resourceInfo.unstable_permissions).toEqual({
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

    const litDataset = await fetchLitDataset(
      "https://arbitrary.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(litDataset.resourceInfo.unstable_permissions).toEqual({
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

    const litDataset = await fetchLitDataset(
      "https://arbitrary.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(litDataset.resourceInfo.unstable_permissions).toBeUndefined();
  });

  it("returns a LitDataset representing the fetched Turtle", async () => {
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

    const litDataset = await fetchLitDataset("https://arbitrary.pod/resource", {
      fetch: mockFetch,
    });

    expect(litDataset.size).toBe(5);
    expect(litDataset).toMatchSnapshot();
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = fetchLitDataset("https://arbitrary.pod/resource", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the Resource failed: 403 Forbidden.")
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = fetchLitDataset("https://arbitrary.pod/resource", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the Resource failed: 404 Not Found.")
    );
  });
});

describe("fetchAcl", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("./fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    const mockResourceInfo: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: "https://some.pod/resource",
        isLitDataset: true,
        unstable_aclUrl: "https://some.pod/resource.acl",
      },
    };

    await internal_fetchAcl(mockResourceInfo);

    expect(mockedFetcher.fetch.mock.calls).toEqual([
      ["https://some.pod/resource.acl"],
      ["https://some.pod/", { method: "HEAD" }],
    ]);
  });

  it("does not attempt to fetch ACLs if the fetched Resource does not include a pointer to an ACL file, and sets an appropriate default value.", async () => {
    const mockFetch = jest.fn(window.fetch);

    const mockResourceInfo: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: "https://some.pod/resource",
        isLitDataset: true,
      },
    };

    const fetchedAcl = await internal_fetchAcl(mockResourceInfo, {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toHaveLength(0);
    expect(fetchedAcl.resourceAcl).toBeNull();
    expect(fetchedAcl.fallbackAcl).toBeNull();
  });

  it("returns null for the Container ACL if the Container's ACL file could not be fetched", async () => {
    const mockFetch = jest.fn((url) => {
      const headers =
        url === "https://some.pod/resource"
          ? { Link: '<resource.acl>; rel="acl"' }
          : url === "https://some.pod/"
          ? { Link: "" }
          : undefined;
      return Promise.resolve(
        mockResponse(undefined, {
          headers: headers,
          url: url,
        })
      );
    });

    const mockResourceInfo: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: "https://some.pod/resource",
        isLitDataset: true,
        unstable_aclUrl: "https://some.pod/resource.acl",
      },
    };

    const fetchedAcl = await internal_fetchAcl(mockResourceInfo, {
      fetch: mockFetch,
    });

    expect(fetchedAcl).not.toBeNull();
    expect(fetchedAcl.fallbackAcl).toBeNull();
    expect(fetchedAcl.resourceAcl?.resourceInfo.fetchedFrom).toBe(
      "https://some.pod/resource.acl"
    );
  });

  it("returns the fallback ACL even if the Resource's own ACL could not be found", async () => {
    const mockFetch = jest.fn((url) => {
      if (url === "https://some.pod/resource.acl") {
        return Promise.resolve(
          mockResponse("ACL not found", {
            status: 404,
            url: "https://some.pod/resource.acl",
          })
        );
      }

      const headers =
        url === "https://some.pod/resource"
          ? { Link: '<resource.acl>; rel="acl"' }
          : url === "https://some.pod/"
          ? { Link: '<.acl>; rel="acl"' }
          : undefined;
      return Promise.resolve(
        mockResponse(undefined, {
          headers: headers,
          url: url,
        })
      );
    });

    const mockResourceInfo: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: "https://some.pod/resource",
        isLitDataset: true,
        unstable_aclUrl: "https://some.pod/resource.acl",
      },
    };

    const fetchedAcl = await internal_fetchAcl(mockResourceInfo, {
      fetch: mockFetch,
    });

    expect(fetchedAcl.resourceAcl).toBeNull();
    expect(fetchedAcl.fallbackAcl?.resourceInfo.fetchedFrom).toBe(
      "https://some.pod/.acl"
    );
  });
});

describe("fetchLitDatasetWithAcl", () => {
  it("returns both the Resource's own ACL as well as its Container's", async () => {
    const mockFetch = jest.fn((url) => {
      const headers =
        url === "https://some.pod/resource"
          ? { Link: '<resource.acl>; rel="acl"' }
          : url === "https://some.pod/"
          ? { Link: '<.acl>; rel="acl"' }
          : undefined;
      return Promise.resolve(
        mockResponse(undefined, {
          headers: headers,
          url: url,
        })
      );
    });

    const fetchedLitDataset = await unstable_fetchLitDatasetWithAcl(
      "https://some.pod/resource",
      { fetch: mockFetch }
    );

    expect(fetchedLitDataset.resourceInfo.fetchedFrom).toBe(
      "https://some.pod/resource"
    );
    expect(fetchedLitDataset.acl?.resourceAcl?.resourceInfo.fetchedFrom).toBe(
      "https://some.pod/resource.acl"
    );
    expect(fetchedLitDataset.acl?.fallbackAcl?.resourceInfo.fetchedFrom).toBe(
      "https://some.pod/.acl"
    );
    expect(mockFetch.mock.calls).toHaveLength(4);
    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource");
    expect(mockFetch.mock.calls[1][0]).toBe("https://some.pod/resource.acl");
    expect(mockFetch.mock.calls[2][0]).toBe("https://some.pod/");
    expect(mockFetch.mock.calls[3][0]).toBe("https://some.pod/.acl");
  });

  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("./fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await unstable_fetchLitDatasetWithAcl("https://some.pod/resource");

    expect(mockedFetcher.fetch.mock.calls).toEqual([
      ["https://some.pod/resource"],
    ]);
  });

  it("does not attempt to fetch ACLs if the fetched Resource does not include a pointer to an ACL file, and sets an appropriate default value.", async () => {
    const mockFetch = jest.fn(window.fetch);

    mockFetch.mockReturnValueOnce(
      Promise.resolve(
        mockResponse(undefined, {
          headers: {
            Link: "",
          },
          url: "https://some.pod/resource",
        })
      )
    );

    const fetchedLitDataset = await unstable_fetchLitDatasetWithAcl(
      "https://some.pod/resource",
      { fetch: mockFetch }
    );

    expect(mockFetch.mock.calls).toHaveLength(1);
    expect(fetchedLitDataset.acl.resourceAcl).toBeNull();
    expect(fetchedLitDataset.acl.fallbackAcl).toBeNull();
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = unstable_fetchLitDatasetWithAcl(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the Resource failed: 403 Forbidden.")
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = unstable_fetchLitDatasetWithAcl(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the Resource failed: 404 Not Found.")
    );
  });
});

describe("fetchResourceInfoWithAcl", () => {
  it("returns both the Resource's own ACL as well as its Container's", async () => {
    const mockFetch = jest.fn((url) => {
      const headers =
        url === "https://some.pod/resource"
          ? { Link: '<resource.acl>; rel="acl"' }
          : url === "https://some.pod/"
          ? { Link: '<.acl>; rel="acl"' }
          : undefined;
      return Promise.resolve(
        mockResponse(undefined, {
          headers: headers,
          url: url,
        })
      );
    });

    const fetchedLitDataset = await unstable_fetchResourceInfoWithAcl(
      "https://some.pod/resource",
      { fetch: mockFetch }
    );

    expect(fetchedLitDataset.resourceInfo.fetchedFrom).toBe(
      "https://some.pod/resource"
    );
    expect(fetchedLitDataset.acl?.resourceAcl?.resourceInfo.fetchedFrom).toBe(
      "https://some.pod/resource.acl"
    );
    expect(fetchedLitDataset.acl?.fallbackAcl?.resourceInfo.fetchedFrom).toBe(
      "https://some.pod/.acl"
    );
    expect(mockFetch.mock.calls).toHaveLength(4);
    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource");
    expect(mockFetch.mock.calls[1][0]).toBe("https://some.pod/resource.acl");
    expect(mockFetch.mock.calls[2][0]).toBe("https://some.pod/");
    expect(mockFetch.mock.calls[3][0]).toBe("https://some.pod/.acl");
  });

  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("./fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await unstable_fetchResourceInfoWithAcl("https://some.pod/resource");

    expect(mockedFetcher.fetch.mock.calls).toEqual([
      [
        "https://some.pod/resource",
        {
          method: "HEAD",
        },
      ],
    ]);
  });

  it("does not attempt to fetch ACLs if the fetched Resource does not include a pointer to an ACL file, and sets an appropriate default value.", async () => {
    const mockFetch = jest.fn(window.fetch);

    mockFetch.mockReturnValueOnce(
      Promise.resolve(
        mockResponse(undefined, {
          headers: {
            Link: "",
          },
          url: "https://some.pod/resource",
        })
      )
    );

    const fetchedLitDataset = await unstable_fetchResourceInfoWithAcl(
      "https://some.pod/resource",
      { fetch: mockFetch }
    );

    expect(mockFetch.mock.calls).toHaveLength(1);
    expect(fetchedLitDataset.acl.resourceAcl).toBeNull();
    expect(fetchedLitDataset.acl.fallbackAcl).toBeNull();
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = unstable_fetchResourceInfoWithAcl(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the Resource metadata failed: 403 Forbidden.")
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = unstable_fetchResourceInfoWithAcl(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the Resource metadata failed: 404 Not Found.")
    );
  });

  it("does not request the actual data from the server", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          mockResponse(undefined, { url: "https://some.pod/resource" })
        )
      );

    await unstable_fetchResourceInfoWithAcl("https://some.pod/resource", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toEqual([
      ["https://some.pod/resource", { method: "HEAD" }],
    ]);
  });
});

describe("fetchResourceInfo", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("./fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await internal_fetchResourceInfo("https://some.pod/resource");

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(1);
    expect(mockedFetcher.fetch.mock.calls[0][0]).toBe(
      "https://some.pod/resource"
    );
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    await internal_fetchResourceInfo("https://some.pod/resource", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toHaveLength(1);
    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource");
  });

  it("keeps track of where the LitDataset was fetched from", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          mockResponse(undefined, { url: "https://some.pod/resource" })
        )
      );

    const litDatasetInfo = await internal_fetchResourceInfo(
      "https://some.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    expect(litDatasetInfo.fetchedFrom).toBe("https://some.pod/resource");
  });

  it("knows when the Resource contains a LitDataset", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          url: "https://arbitrary.pod/resource",
          headers: { "Content-Type": "text/turtle" },
        })
      )
    );

    const litDatasetInfo = await internal_fetchResourceInfo(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    expect(litDatasetInfo.isLitDataset).toBe(true);
  });

  it("knows when the Resource does not contain a LitDataset", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          url: "https://arbitrary.pod/resource",
          headers: { "Content-Type": "image/svg+xml" },
        })
      )
    );

    const litDatasetInfo = await internal_fetchResourceInfo(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    expect(litDatasetInfo.isLitDataset).toBe(false);
  });

  it("marks a Resource as not a LitDataset when its Content Type is unknown", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          mockResponse(undefined, { url: "https://arbitrary.pod/resource" })
        )
      );

    const litDatasetInfo = await internal_fetchResourceInfo(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    expect(litDatasetInfo.isLitDataset).toBe(false);
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

    const litDatasetInfo = await internal_fetchResourceInfo(
      "https://some.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    expect(litDatasetInfo.contentType).toBe("text/turtle; charset=UTF-8");
  });

  it("does not expose a Content-Type when none is known", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse()));

    const litDatasetInfo = await internal_fetchResourceInfo(
      "https://some.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    expect(litDatasetInfo.contentType).toBeUndefined();
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

    const litDatasetInfo = await internal_fetchResourceInfo(
      "https://some.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(litDatasetInfo.unstable_aclUrl).toBe(
      "https://some.pod/container/aclresource.acl"
    );
  });

  it("does not provide an IRI to an ACL resource if not provided one by the server", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          headers: {
            Link: '<arbitrary-resource>; rel="not-acl"',
          },
        })
      )
    );

    const litDatasetInfo = await internal_fetchResourceInfo(
      "https://some.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(litDatasetInfo.unstable_aclUrl).toBeUndefined();
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

    const litDatasetInfo = await internal_fetchResourceInfo(
      "https://arbitrary.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(litDatasetInfo.unstable_permissions).toEqual({
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

    const litDatasetInfo = await internal_fetchResourceInfo(
      "https://arbitrary.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(litDatasetInfo.unstable_permissions).toEqual({
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

    const litDatasetInfo = await internal_fetchResourceInfo(
      "https://arbitrary.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(litDatasetInfo.unstable_permissions).toBeUndefined();
  });

  it("does not request the actual data from the server", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          mockResponse(undefined, { url: "https://some.pod/resource" })
        )
      );

    await internal_fetchResourceInfo("https://some.pod/resource", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toEqual([
      ["https://some.pod/resource", { method: "HEAD" }],
    ]);
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = internal_fetchResourceInfo(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the Resource metadata failed: 403 Forbidden.")
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = internal_fetchResourceInfo(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the Resource metadata failed: 404 Not Found.")
    );
  });
});

describe("isContainer", () => {
  it("should recognise a Container", () => {
    const resourceInfo: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: "https://arbitrary.pod/container/",
        isLitDataset: true,
      },
    };

    expect(isContainer(resourceInfo)).toBe(true);
  });

  it("should recognise non-Containers", () => {
    const resourceInfo: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: "https://arbitrary.pod/container/not-a-container",
        isLitDataset: true,
      },
    };

    expect(isContainer(resourceInfo)).toBe(false);
  });
});

describe("isLitDataset", () => {
  it("should recognise a LitDataset", () => {
    const resourceInfo: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: "https://arbitrary.pod/container/",
        isLitDataset: true,
      },
    };

    expect(isLitDataset(resourceInfo)).toBe(true);
  });

  it("should recognise non-RDF Resources", () => {
    const resourceInfo: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: "https://arbitrary.pod/container/not-a-litdataset.png",
        isLitDataset: false,
      },
    };

    expect(isLitDataset(resourceInfo)).toBe(false);
  });
});

describe("getContentType", () => {
  it("should return the Content Type if known", () => {
    const resourceInfo: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: "https://arbitrary.pod/resource",
        isLitDataset: true,
        contentType: "multipart/form-data; boundary=something",
      },
    };

    expect(getContentType(resourceInfo)).toBe(
      "multipart/form-data; boundary=something"
    );
  });

  it("should return null if no Content Type is known", () => {
    const resourceInfo: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: "https://arbitrary.pod/resource",
        isLitDataset: true,
      },
    };

    expect(getContentType(resourceInfo)).toBeNull();
  });
});

describe("saveLitDatasetAt", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("./fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await saveLitDatasetAt("https://some.pod/resource", dataset());

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(1);
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    await saveLitDatasetAt("https://some.pod/resource", dataset(), {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toHaveLength(1);
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = saveLitDatasetAt(
      "https://arbitrary.pod/resource",
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error("Storing the Resource failed: 403 Forbidden.")
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = saveLitDatasetAt(
      "https://arbitrary.pod/resource",
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error("Storing the Resource failed: 404 Not Found.")
    );
  });

  describe("when saving a new resource", () => {
    it("sends the given LitDataset to the Pod", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));
      const mockDataset = dataset();
      mockDataset.add(
        DataFactory.quad(
          DataFactory.namedNode("https://arbitrary.vocab/subject"),
          DataFactory.namedNode("https://arbitrary.vocab/predicate"),
          DataFactory.namedNode("https://arbitrary.vocab/object"),
          undefined
        )
      );

      await saveLitDatasetAt("https://some.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][0]).toEqual("https://some.pod/resource");
      expect(mockFetch.mock.calls[0][1]?.method).toBe("PUT");
      expect(
        (mockFetch.mock.calls[0][1]?.headers as Record<string, string>)[
          "Content-Type"
        ]
      ).toBe("text/turtle");
      expect(
        (mockFetch.mock.calls[0][1]?.headers as Record<string, string>)["Link"]
      ).toBe('<http://www.w3.org/ns/ldp#Resource>; rel="type"');
      expect((mockFetch.mock.calls[0][1]?.body as string).trim()).toBe(
        "<https://arbitrary.vocab/subject> <https://arbitrary.vocab/predicate> <https://arbitrary.vocab/object>."
      );
    });

    it("sets relative IRIs for LocalNodes", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));
      const mockDataset = dataset();
      const subjectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
        name: "some-subject-name",
      });
      const objectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
        name: "some-object-name",
      });
      mockDataset.add(
        DataFactory.quad(
          subjectLocal,
          DataFactory.namedNode("https://arbitrary.vocab/predicate"),
          objectLocal,
          undefined
        )
      );

      await saveLitDatasetAt("https://some.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][1]?.body).toMatch("#some-subject-name");
      expect(mockFetch.mock.calls[0][1]?.body).toMatch("#some-object-name");
    });

    it("resolves relative IRIs in the returned LitDataset", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));
      const mockDataset = dataset();
      const subjectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
        name: "some-subject-name",
      });
      const objectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
        name: "some-object-name",
      });
      mockDataset.add(
        DataFactory.quad(
          subjectLocal,
          DataFactory.namedNode("https://arbitrary.vocab/predicate"),
          objectLocal,
          undefined
        )
      );

      const storedLitDataset = await saveLitDatasetAt(
        "https://some.pod/resource",
        mockDataset,
        {
          fetch: mockFetch,
        }
      );

      expect(Array.from(storedLitDataset)[0].subject.value).toBe(
        "https://some.pod/resource#some-subject-name"
      );
      expect(Array.from(storedLitDataset)[0].object.value).toBe(
        "https://some.pod/resource#some-object-name"
      );
    });

    it("makes sure the returned LitDataset has an empty change log", async () => {
      const mockDataset = dataset();

      const storedLitDataset = await saveLitDatasetAt(
        "https://arbitrary.pod/resource",
        mockDataset
      );

      expect(storedLitDataset.changeLog).toEqual({
        additions: [],
        deletions: [],
      });
    });

    it("tells the Pod to only save new data when no data exists yet", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));

      await saveLitDatasetAt("https://arbitrary.pod/resource", dataset(), {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls[0][1]?.headers).toMatchObject({
        "If-None-Match": "*",
      });
    });
  });

  describe("when updating an existing resource", () => {
    function getMockUpdatedDataset(
      changeLog: WithChangeLog["changeLog"],
      fromUrl: IriString
    ): LitDataset & WithChangeLog & WithResourceInfo {
      const mockDataset = dataset();
      mockDataset.add(
        DataFactory.quad(
          DataFactory.namedNode("https://arbitrary.vocab/subject"),
          DataFactory.namedNode("https://arbitrary.vocab/predicate"),
          DataFactory.namedNode("https://arbitrary.vocab/object"),
          undefined
        )
      );

      changeLog.additions.forEach((tripleToAdd) =>
        mockDataset.add(tripleToAdd)
      );

      const resourceInfo: WithResourceInfo["resourceInfo"] = {
        fetchedFrom: fromUrl,
        isLitDataset: true,
      };

      return Object.assign(mockDataset, {
        changeLog: changeLog,
        resourceInfo: resourceInfo,
      });
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

      await saveLitDatasetAt("https://some.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][0]).toEqual("https://some.pod/resource");
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

    it("sets relative IRIs for LocalNodes", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));

      const subjectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
        name: "some-subject-name",
      });
      const objectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
        name: "some-object-name",
      });
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

      await saveLitDatasetAt("https://some.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      const [deleteStatement, insertStatement] = (mockFetch.mock.calls[0][1]!
        .body as string).split(";");
      expect(deleteStatement).toMatch("#some-subject-name");
      expect(insertStatement).toMatch("#some-subject-name");
      expect(deleteStatement).toMatch("#some-object-name");
      expect(insertStatement).toMatch("#some-object-name");
    });

    it("resolves relative IRIs in the returned LitDataset", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));

      const subjectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
        name: "some-subject-name",
      });
      const objectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
        name: "some-object-name",
      });
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

      const storedLitDataset = await saveLitDatasetAt(
        "https://some.pod/resource",
        mockDataset,
        {
          fetch: mockFetch,
        }
      );

      const storedQuads = Array.from(storedLitDataset);
      expect(storedQuads[storedQuads.length - 1].subject.value).toBe(
        "https://some.pod/resource#some-subject-name"
      );
      expect(storedQuads[storedQuads.length - 1].object.value).toBe(
        "https://some.pod/resource#some-object-name"
      );
    });

    it("sends the full LitDataset if it is saved to a different IRI", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));

      const mockDataset = getMockUpdatedDataset(
        { additions: [], deletions: [] },
        "https://some.pod/resource"
      );

      await saveLitDatasetAt("https://some-other.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][0]).toEqual(
        "https://some-other.pod/resource"
      );
      expect(mockFetch.mock.calls[0][1]?.method).toBe("PUT");
      // Even though the change log is empty there should still be a body,
      // since the Dataset itself is not empty:
      expect(
        (mockFetch.mock.calls[0][1]?.body as string).trim().length
      ).toBeGreaterThan(0);
    });

    it("does not include a DELETE statement if the change log contains no deletions", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));

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

      await saveLitDatasetAt("https://arbitrary.pod/resource", mockDataset, {
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

      await saveLitDatasetAt("https://arbitrary.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][1]?.body as string).not.toMatch("INSERT");
    });

    it("makes sure the returned LitDataset has an empty change log", async () => {
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

      const storedLitDataset = await saveLitDatasetAt(
        "https://arbitrary.pod/resource",
        mockDataset
      );

      expect(storedLitDataset.changeLog).toEqual({
        additions: [],
        deletions: [],
      });
    });
  });
});

describe("saveLitDatasetInContainer", () => {
  const mockResponse = new Response("Arbitrary response", {
    headers: { Location: "https://arbitrary.pod/container/resource" },
  });

  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("./fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await saveLitDatasetInContainer("https://some.pod/container/", dataset());

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(1);
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse));

    await saveLitDatasetInContainer("https://some.pod/container/", dataset(), {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toHaveLength(1);
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = saveLitDatasetInContainer(
      "https://arbitrary.pod/container/",
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error("Storing the Resource in the Container failed: 403 Forbidden.")
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = saveLitDatasetInContainer(
      "https://arbitrary.pod/container/",
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error("Storing the Resource in the Container failed: 404 Not Found.")
    );
  });

  it("returns a meaningful error when the server does not return the new Resource's location", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    const fetchPromise = saveLitDatasetInContainer(
      "https://arbitrary.pod/container/",
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error(
        "Could not determine the location for the newly saved LitDataset."
      )
    );
  });

  it("sends the given LitDataset to the Pod", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse));
    const mockDataset = dataset();
    mockDataset.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.vocab/subject"),
        DataFactory.namedNode("https://arbitrary.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.vocab/object"),
        undefined
      )
    );

    await saveLitDatasetInContainer(
      "https://some.pod/container/",
      mockDataset,
      {
        fetch: mockFetch,
      }
    );

    expect(mockFetch.mock.calls).toHaveLength(1);
    expect(mockFetch.mock.calls[0][0]).toEqual("https://some.pod/container/");
    expect(mockFetch.mock.calls[0][1]?.method).toBe("POST");
    expect(
      (mockFetch.mock.calls[0][1]?.headers as Record<string, string>)[
        "Content-Type"
      ]
    ).toBe("text/turtle");
    expect(
      (mockFetch.mock.calls[0][1]?.headers as Record<string, string>)["Link"]
    ).toBe('<http://www.w3.org/ns/ldp#Resource>; rel="type"');
    expect((mockFetch.mock.calls[0][1]?.body as string).trim()).toBe(
      "<https://arbitrary.vocab/subject> <https://arbitrary.vocab/predicate> <https://arbitrary.vocab/object>."
    );
  });

  it("sets relative IRIs for LocalNodes", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse));
    const subjectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
      name: "some-subject-name",
    });
    const objectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
      name: "some-object-name",
    });
    const mockDataset = dataset();
    mockDataset.add(
      DataFactory.quad(
        subjectLocal,
        DataFactory.namedNode("https://arbitrary.vocab/predicate"),
        objectLocal,
        undefined
      )
    );

    await saveLitDatasetInContainer(
      "https://some.pod/container/",
      mockDataset,
      {
        fetch: mockFetch,
      }
    );

    expect(mockFetch.mock.calls).toHaveLength(1);
    expect((mockFetch.mock.calls[0][1]?.body as string).trim()).toBe(
      "<#some-subject-name> <https://arbitrary.vocab/predicate> <#some-object-name>."
    );
  });

  it("sends the suggested slug to the Pod", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse));

    await saveLitDatasetInContainer(
      "https://arbitrary.pod/container/",
      dataset(),
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
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse));

    await saveLitDatasetInContainer(
      "https://arbitrary.pod/container/",
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    expect(
      (mockFetch.mock.calls[0][1]?.headers as Record<string, string>).slug
    ).toBeUndefined();
  });

  it("includes the final slug with the return value", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response("Arbitrary response", {
          headers: { Location: "https://some.pod/container/resource" },
        })
      )
    );

    const savedLitDataset = await saveLitDatasetInContainer(
      "https://some.pod/container/",
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    expect(savedLitDataset.resourceInfo.fetchedFrom).toBe(
      "https://some.pod/container/resource"
    );
  });

  it("resolves relative IRIs in the returned LitDataset", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response("Arbitrary response", {
          headers: { Location: "https://some.pod/container/resource" },
        })
      )
    );

    const subjectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
      name: "some-subject-name",
    });
    const objectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
      name: "some-object-name",
    });
    const mockDataset = dataset();
    mockDataset.add(
      DataFactory.quad(
        subjectLocal,
        DataFactory.namedNode("https://arbitrary.vocab/predicate"),
        objectLocal,
        undefined
      )
    );

    const storedLitDataset = await saveLitDatasetInContainer(
      "https://some.pod/container/",
      mockDataset,
      {
        fetch: mockFetch,
      }
    );

    expect(Array.from(storedLitDataset)[0].subject.value).toBe(
      "https://some.pod/container/resource#some-subject-name"
    );
    expect(Array.from(storedLitDataset)[0].object.value).toBe(
      "https://some.pod/container/resource#some-object-name"
    );
  });

  it("includes the final slug with the return value, normalised to the Container's origin", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response("Arbitrary response", {
          headers: { Location: "/container/resource" },
        })
      )
    );

    const savedLitDataset = await saveLitDatasetInContainer(
      "https://some.pod/container/",
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    expect(savedLitDataset.resourceInfo.fetchedFrom).toBe(
      "https://some.pod/container/resource"
    );
  });
});

describe("saveAclFor", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("./fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };
    const withResourceInfo = {
      resourceInfo: {
        fetchedFrom: "https://arbitrary.pod/resource",
        isLitDataset: true,
        unstable_aclUrl: "https://arbitrary.pod/resource.acl",
      },
    };
    const aclResource: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: "https://arbitrary.pod/resource.acl",
        isLitDataset: true,
      },
      accessTo: "https://arbitrary.pod/resource",
    });

    await unstable_saveAclFor(withResourceInfo, aclResource);

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(1);
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));
    const withResourceInfo = {
      resourceInfo: {
        fetchedFrom: "https://arbitrary.pod/resource",
        isLitDataset: true,
        unstable_aclUrl: "https://arbitrary.pod/resource.acl",
      },
    };
    const aclResource: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: "https://arbitrary.pod/resource.acl",
        isLitDataset: true,
      },
      accessTo: "https://arbitrary.pod/resource",
    });

    await unstable_saveAclFor(withResourceInfo, aclResource, {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toHaveLength(1);
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );
    const withResourceInfo = {
      resourceInfo: {
        fetchedFrom: "https://arbitrary.pod/resource",
        isLitDataset: true,
        unstable_aclUrl: "https://arbitrary.pod/resource.acl",
      },
    };
    const aclResource: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: "https://arbitrary.pod/resource.acl",
        isLitDataset: true,
      },
      accessTo: "https://arbitrary.pod/resource",
    });

    const fetchPromise = unstable_saveAclFor(withResourceInfo, aclResource, {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error("Storing the Resource failed: 403 Forbidden.")
    );
  });

  it("marks the stored ACL as applying to the given Resource", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));
    const withResourceInfo = {
      resourceInfo: {
        fetchedFrom: "https://some.pod/resource",
        isLitDataset: true,
        unstable_aclUrl: "https://arbitrary.pod/resource.acl",
      },
    };
    const aclResource: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: "https://arbitrary.pod/resource.acl",
        isLitDataset: true,
      },
      accessTo: "https://some-other.pod/resource",
    });

    const savedAcl = await unstable_saveAclFor(withResourceInfo, aclResource, {
      fetch: mockFetch,
    });

    expect(savedAcl.accessTo).toBe("https://some.pod/resource");
  });

  it("sends a PATCH if the ACL contains a ChangeLog and was originally fetched from the same location", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));
    const withResourceInfo = {
      resourceInfo: {
        fetchedFrom: "https://arbitrary.pod/resource",
        isLitDataset: true,
        unstable_aclUrl: "https://arbitrary.pod/resource.acl",
      },
    };
    const aclResource: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: "https://arbitrary.pod/resource.acl",
        isLitDataset: true,
      },
      accessTo: "https://arbitrary.pod/resource",
      changeLog: {
        additions: [],
        deletions: [],
      },
    });

    await unstable_saveAclFor(withResourceInfo, aclResource, {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][1]?.method).toBe("PATCH");
  });

  it("sends a PUT if the ACL contains a ChangeLog but was originally fetched from a different location", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));
    const withResourceInfo = {
      resourceInfo: {
        fetchedFrom: "https://arbitrary.pod/resource",
        isLitDataset: true,
        unstable_aclUrl: "https://arbitrary.pod/resource.acl",
      },
    };
    const aclResource: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: "https://arbitrary-other.pod/resource.acl",
        isLitDataset: true,
      },
      accessTo: "https://arbitrary.pod/resource",
      changeLog: {
        additions: [],
        deletions: [],
      },
    });

    await unstable_saveAclFor(withResourceInfo, aclResource, {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][1]?.method).toBe("PUT");
  });
});
