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
        headers: { Location: makeString(INRUPT_TEST_IRI.somePodResource) },
      })
    )
  ),
}));

import { Response } from "cross-fetch";
import { dataset } from "@rdfjs/dataset";
import {
  internal_fetchAcl,
  internal_fetchResourceInfo,
  unstable_saveAclFor,
  unstable_deleteAclFor,
} from "./resource";

import {
  isContainer,
  isLitDataset,
  getContentType,
  unstable_fetchResourceInfoWithAcl,
} from "./resource";
import {
  WithResourceInfo,
  unstable_AclDataset,
  unstable_WithAccessibleAcl,
  makeString,
  makeIri,
} from "./interfaces";
import { INRUPT_TEST_IRI } from "./GENERATED/INRUPT_TEST_IRI";

function mockResponse(
  body?: BodyInit | null,
  init?: ResponseInit & { url: string }
): Response {
  return new Response(body, init);
}

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
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };

    await internal_fetchAcl(mockResourceInfo);

    expect(mockedFetcher.fetch.mock.calls).toEqual([
      [makeString(INRUPT_TEST_IRI.somePodResourceAcl)],
      [makeString(INRUPT_TEST_IRI.somePodRootContainer), { method: "HEAD" }],
    ]);
  });

  it("does not attempt to fetch ACLs if the fetched Resource does not include a pointer to an ACL file, and sets an appropriate default value.", async () => {
    const mockFetch = jest.fn(window.fetch);

    const mockResourceInfo: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
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
        url === INRUPT_TEST_IRI.somePodResource.value
          ? {
              Link: `<${INRUPT_TEST_IRI.somePodResourceAclRelativePath}>; rel="acl"`,
            }
          : url === INRUPT_TEST_IRI.somePodRootContainer.value
          ? {
              Link: "",
            }
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
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };

    const fetchedAcl = await internal_fetchAcl(mockResourceInfo, {
      fetch: mockFetch,
    });

    expect(fetchedAcl).not.toBeNull();
    expect(fetchedAcl.fallbackAcl).toBeNull();
    expect(fetchedAcl.resourceAcl?.resourceInfo.fetchedFrom).toEqual(
      INRUPT_TEST_IRI.somePodResourceAcl
    );
  });

  it("returns the fallback ACL even if the Resource's own ACL could not be found", async () => {
    const mockFetch = jest.fn((url) => {
      if (url === makeString(INRUPT_TEST_IRI.somePodResourceAcl)) {
        return Promise.resolve(
          mockResponse("ACL not found", {
            status: 404,
            url: makeString(INRUPT_TEST_IRI.somePodResourceAcl),
          })
        );
      }

      const headers =
        url === INRUPT_TEST_IRI.somePodResource.value
          ? {
              Link: `<${INRUPT_TEST_IRI.somePodResourceAclRelativePath}>; rel="acl"`,
            }
          : url === INRUPT_TEST_IRI.somePodRootContainer.value
          ? {
              Link: `<${INRUPT_TEST_IRI.somePodRootContainerAclRelativePath}>; rel="acl"`,
            }
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
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };

    const fetchedAcl = await internal_fetchAcl(mockResourceInfo, {
      fetch: mockFetch,
    });

    expect(fetchedAcl.resourceAcl).toBeNull();
    expect(fetchedAcl.fallbackAcl?.resourceInfo.fetchedFrom).toEqual(
      INRUPT_TEST_IRI.somePodRootContainerAcl
    );
  });
});

describe("fetchResourceInfoWithAcl", () => {
  it("returns both the Resource's own ACL as well as its Container's", async () => {
    const mockFetch = jest.fn((url) => {
      const headers =
        url === INRUPT_TEST_IRI.somePodResource.value
          ? {
              Link: `<${INRUPT_TEST_IRI.somePodResourceAclRelativePath}>; rel="acl"`,
            }
          : url === INRUPT_TEST_IRI.somePodRootContainer.value
          ? {
              Link: `<${INRUPT_TEST_IRI.somePodRootContainerAclRelativePath}>; rel="acl"`,
            }
          : undefined;
      return Promise.resolve(
        mockResponse(undefined, {
          headers: headers,
          url: url,
        })
      );
    });

    const fetchedLitDataset = await unstable_fetchResourceInfoWithAcl(
      INRUPT_TEST_IRI.somePodResource,
      { fetch: mockFetch }
    );

    expect(fetchedLitDataset.resourceInfo.fetchedFrom).toEqual(
      INRUPT_TEST_IRI.somePodResource
    );
    expect(
      fetchedLitDataset.acl?.resourceAcl?.resourceInfo.fetchedFrom
    ).toEqual(INRUPT_TEST_IRI.somePodResourceAcl);
    expect(
      fetchedLitDataset.acl?.fallbackAcl?.resourceInfo.fetchedFrom
    ).toEqual(INRUPT_TEST_IRI.somePodRootContainerAcl);
    expect(mockFetch.mock.calls).toHaveLength(4);
    expect(mockFetch.mock.calls[0][0]).toEqual(
      makeString(INRUPT_TEST_IRI.somePodResource)
    );
    expect(mockFetch.mock.calls[1][0]).toEqual(
      makeString(INRUPT_TEST_IRI.somePodResourceAcl)
    );
    expect(mockFetch.mock.calls[2][0]).toEqual(
      makeString(INRUPT_TEST_IRI.somePodRootContainer)
    );
    expect(mockFetch.mock.calls[3][0]).toEqual(
      makeString(INRUPT_TEST_IRI.somePodRootContainerAcl)
    );
  });

  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("./fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await unstable_fetchResourceInfoWithAcl(INRUPT_TEST_IRI.somePodResource);

    expect(mockedFetcher.fetch.mock.calls).toEqual([
      [
        makeString(INRUPT_TEST_IRI.somePodResource),
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
          url: makeString(INRUPT_TEST_IRI.somePodResource),
        })
      )
    );

    const fetchedLitDataset = await unstable_fetchResourceInfoWithAcl(
      INRUPT_TEST_IRI.somePodResource,
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
      INRUPT_TEST_IRI.somePodResource,
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
      INRUPT_TEST_IRI.somePodResource,
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
          mockResponse(undefined, {
            url: makeString(INRUPT_TEST_IRI.somePodResource),
          })
        )
      );

    await unstable_fetchResourceInfoWithAcl(INRUPT_TEST_IRI.somePodResource, {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toEqual([
      [INRUPT_TEST_IRI.somePodResource.value, { method: "HEAD" }],
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

    await internal_fetchResourceInfo(INRUPT_TEST_IRI.somePodResource);

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(1);
    expect(mockedFetcher.fetch.mock.calls[0][0]).toEqual(
      makeString(INRUPT_TEST_IRI.somePodResource)
    );
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    await internal_fetchResourceInfo(INRUPT_TEST_IRI.somePodResource, {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toHaveLength(1);
    expect(mockFetch.mock.calls[0][0]).toEqual(
      makeString(INRUPT_TEST_IRI.somePodResource)
    );
  });

  it("keeps track of where the LitDataset was fetched from", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          mockResponse(undefined, {
            url: makeString(INRUPT_TEST_IRI.somePodResource),
          })
        )
      );

    const litDatasetInfo = await internal_fetchResourceInfo(
      INRUPT_TEST_IRI.somePodResource,
      {
        fetch: mockFetch,
      }
    );

    expect(litDatasetInfo.fetchedFrom).toEqual(INRUPT_TEST_IRI.somePodResource);
  });

  it("knows when the Resource contains a LitDataset", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          url: makeString(INRUPT_TEST_IRI.somePodResource),
          headers: { "Content-Type": "text/turtle" },
        })
      )
    );

    const litDatasetInfo = await internal_fetchResourceInfo(
      INRUPT_TEST_IRI.somePodResource,
      {
        fetch: mockFetch,
      }
    );

    expect(litDatasetInfo.isLitDataset).toEqual(true);
  });

  it("knows when the Resource does not contain a LitDataset", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          url: makeString(INRUPT_TEST_IRI.somePodResource),
          headers: { "Content-Type": "image/svg+xml" },
        })
      )
    );

    const litDatasetInfo = await internal_fetchResourceInfo(
      INRUPT_TEST_IRI.somePodResource,
      {
        fetch: mockFetch,
      }
    );

    expect(litDatasetInfo.isLitDataset).toEqual(false);
  });

  it("marks a Resource as not a LitDataset when its Content Type is unknown", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          mockResponse(undefined, {
            url: makeString(INRUPT_TEST_IRI.somePodResource),
          })
        )
      );

    const litDatasetInfo = await internal_fetchResourceInfo(
      INRUPT_TEST_IRI.somePodResource,
      {
        fetch: mockFetch,
      }
    );

    expect(litDatasetInfo.isLitDataset).toEqual(false);
  });

  it("exposes the Content Type when known", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          url: makeString(INRUPT_TEST_IRI.somePodResource),
          headers: { "Content-Type": "text/turtle; charset=UTF-8" },
        })
      )
    );

    const litDatasetInfo = await internal_fetchResourceInfo(
      INRUPT_TEST_IRI.somePodResource,
      {
        fetch: mockFetch,
      }
    );

    expect(litDatasetInfo.contentType).toEqual("text/turtle; charset=UTF-8");
  });

  it("does not expose a Content-Type when none is known", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse()));

    const litDatasetInfo = await internal_fetchResourceInfo(
      INRUPT_TEST_IRI.somePodResource,
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
            Link: `<${INRUPT_TEST_IRI.somePodResourceAclRelativePath}>; rel="acl"`,
          },
          url: makeString(INRUPT_TEST_IRI.somePodResource),
        })
      )
    );

    const litDatasetInfo = await internal_fetchResourceInfo(
      INRUPT_TEST_IRI.somePodResource,
      { fetch: mockFetch }
    );

    expect(litDatasetInfo.unstable_aclUrl).toEqual(
      INRUPT_TEST_IRI.somePodResourceAcl
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
      INRUPT_TEST_IRI.somePodResource,
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
      INRUPT_TEST_IRI.somePodResource,
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
      INRUPT_TEST_IRI.somePodResource,
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
      INRUPT_TEST_IRI.somePodResource,
      { fetch: mockFetch }
    );

    expect(litDatasetInfo.unstable_permissions).toBeUndefined();
  });

  it("does not request the actual data from the server", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          mockResponse(undefined, {
            url: makeString(INRUPT_TEST_IRI.somePodResource),
          })
        )
      );

    await internal_fetchResourceInfo(INRUPT_TEST_IRI.somePodResource, {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toEqual([
      [INRUPT_TEST_IRI.somePodResource.value, { method: "HEAD" }],
    ]);
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = internal_fetchResourceInfo(
      INRUPT_TEST_IRI.somePodResource,
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
      INRUPT_TEST_IRI.somePodResource,
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
        fetchedFrom: INRUPT_TEST_IRI.somePodRootContainer,
        isLitDataset: true,
      },
    };

    expect(isContainer(resourceInfo)).toEqual(true);
  });

  it("should recognise non-Containers", () => {
    const resourceInfo: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: makeIri("https://arbitrary.pod/container/not-a-container"),
        isLitDataset: true,
      },
    };

    expect(isContainer(resourceInfo)).toEqual(false);
  });
});

describe("isLitDataset", () => {
  it("should recognise a LitDataset", () => {
    const resourceInfo: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodRootContainer,
        isLitDataset: true,
      },
    };

    expect(isLitDataset(resourceInfo)).toEqual(true);
  });

  it("should recognise non-RDF Resources", () => {
    const resourceInfo: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: makeIri(
          "https://arbitrary.pod/container/not-a-litdataset.png"
        ),
        isLitDataset: false,
      },
    };

    expect(isLitDataset(resourceInfo)).toEqual(false);
  });
});

describe("getContentType", () => {
  it("should return the Content Type if known", () => {
    const resourceInfo: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        contentType: "multipart/form-data; boundary=something",
      },
    };

    expect(getContentType(resourceInfo)).toEqual(
      "multipart/form-data; boundary=something"
    );
  });

  it("should return null if no Content Type is known", () => {
    const resourceInfo: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
      },
    };

    expect(getContentType(resourceInfo)).toBeNull();
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
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };
    const aclResource: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.somePodResource,
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
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };
    const aclResource: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.somePodResource,
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
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };
    const aclResource: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.somePodResource,
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
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };
    const aclResource: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.someOtherPodResource,
    });

    const savedAcl = await unstable_saveAclFor(withResourceInfo, aclResource, {
      fetch: mockFetch,
    });

    expect(savedAcl.accessTo).toEqual(INRUPT_TEST_IRI.somePodResource);
  });

  it("sends a PATCH if the ACL contains a ChangeLog and was originally fetched from the same location", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));
    const withResourceInfo = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };
    const aclResource: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.somePodResource,
      changeLog: {
        additions: [],
        deletions: [],
      },
    });

    await unstable_saveAclFor(withResourceInfo, aclResource, {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][1]?.method).toEqual("PATCH");
  });

  it("sends a PUT if the ACL contains a ChangeLog but was originally fetched from a different location", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));
    const withResourceInfo = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };
    const aclResource: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: makeIri("https://arbitrary-other.pod/resource.acl"),
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.somePodResource,
      changeLog: {
        additions: [],
        deletions: [],
      },
    });

    await unstable_saveAclFor(withResourceInfo, aclResource, {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][1]?.method).toEqual("PUT");
  });
});

describe("deleteAclFor", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("./fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };
    const mockResource: WithResourceInfo & unstable_WithAccessibleAcl = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: false,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };

    await unstable_deleteAclFor(mockResource);

    expect(mockedFetcher.fetch.mock.calls).toEqual([
      [
        makeString(INRUPT_TEST_IRI.somePodResourceAcl),
        {
          method: "DELETE",
        },
      ],
    ]);
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    const mockResource: WithResourceInfo & unstable_WithAccessibleAcl = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: false,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };

    await unstable_deleteAclFor(mockResource, { fetch: mockFetch });

    expect(mockFetch.mock.calls).toEqual([
      [
        makeString(INRUPT_TEST_IRI.somePodResourceAcl),
        {
          method: "DELETE",
        },
      ],
    ]);
  });

  it("returns the input Resource without a Resource ACL", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    const mockResource: WithResourceInfo & unstable_WithAccessibleAcl = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: false,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };

    const savedResource = await unstable_deleteAclFor(mockResource, {
      fetch: mockFetch,
    });

    expect(savedResource.acl.resourceAcl).toBeNull();
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const mockResource: WithResourceInfo & unstable_WithAccessibleAcl = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: false,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };

    const fetchPromise = unstable_deleteAclFor(mockResource, {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error("Deleting the ACL failed: 403 Forbidden.")
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const mockResource: WithResourceInfo & unstable_WithAccessibleAcl = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: false,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };

    const fetchPromise = unstable_deleteAclFor(mockResource, {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error("Deleting the ACL failed: 404 Not Found.")
    );
  });
});
