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

jest.mock("../fetcher", () => ({
  fetch: jest
    .fn()
    .mockImplementation(() =>
      Promise.resolve(
        new Response("Some data", { status: 200, statusText: "OK" })
      )
    ),
}));

import {
  getFile,
  deleteFile,
  saveFileInContainer,
  overwriteFile,
  getFileWithAcl,
} from "./nonRdfData";
import { Headers, Response } from "cross-fetch";
import { WithResourceInfo } from "../interfaces";

describe("getFile", () => {
  it("should GET a remote resource using the included fetcher if no other fetcher is available", async () => {
    const fetcher = jest.requireMock("../fetcher") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    fetcher.fetch.mockReturnValue(
      Promise.resolve(
        new Response("Some data", { status: 200, statusText: "OK" })
      )
    );

    await getFile("https://some.url");
    expect(fetcher.fetch.mock.calls).toEqual([["https://some.url", undefined]]);
  });

  it("should GET a remote resource using the provided fetcher", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response("Some data", { status: 200, statusText: "OK" })
        )
      );

    await getFile("https://some.url", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toEqual([["https://some.url", undefined]]);
  });

  it("should return the fetched data as a blob", async () => {
    const init: ResponseInit & { url: string } = {
      status: 200,
      statusText: "OK",
      url: "https://some.url",
    };

    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response("Some data", init)));

    const file = await getFile("https://some.url", {
      fetch: mockFetch,
    });

    expect(file.internal_resourceInfo.sourceIri).toEqual("https://some.url");
    expect(file.internal_resourceInfo.contentType).toContain("text/plain");
    expect(file.internal_resourceInfo.isRawData).toBe(true);

    const fileData = await file.text();
    expect(fileData).toEqual("Some data");
  });

  it("should pass the request headers through", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response("Some data", { status: 200, statusText: "OK" })
        )
      );

    const response = await getFile("https://some.url", {
      init: {
        headers: new Headers({ Accept: "text/turtle" }),
      },
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toEqual([
      [
        "https://some.url",
        {
          headers: new Headers({ Accept: "text/turtle" }),
        },
      ],
    ]);
  });

  it("should throw on failure", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response(undefined, { status: 400, statusText: "Bad request" })
        )
      );

    const response = getFile("https://some.url", {
      fetch: mockFetch,
    });
    await expect(response).rejects.toThrow(
      "Fetching the File failed: 400 Bad request"
    );
  });
});

describe("getFileWithAcl", () => {
  it("should GET a remote resource using the included fetcher if no other fetcher is available", async () => {
    const fetcher = jest.requireMock("../fetcher") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    fetcher.fetch.mockReturnValue(
      Promise.resolve(
        new Response("Some data", { status: 200, statusText: "OK" })
      )
    );

    await getFileWithAcl("https://some.url");
    expect(fetcher.fetch.mock.calls).toEqual([["https://some.url", undefined]]);
  });

  it("should GET a remote resource using the provided fetcher", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response("Some data", { status: 200, statusText: "OK" })
        )
      );

    const response = await getFileWithAcl("https://some.url", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toEqual([["https://some.url", undefined]]);
  });

  it("should return the fetched data as a blob, along with its ACL", async () => {
    const init: ResponseInit & { url: string } = {
      status: 200,
      statusText: "OK",
      url: "https://some.url",
    };

    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response("Some data", init)));

    const file = await getFileWithAcl("https://some.url", {
      fetch: mockFetch,
    });

    expect(file.internal_resourceInfo.sourceIri).toEqual("https://some.url");
    expect(file.internal_resourceInfo.contentType).toContain("text/plain");
    expect(file.internal_resourceInfo.isRawData).toBe(true);

    const fileData = await file.text();
    expect(fileData).toEqual("Some data");
  });

  it("returns both the Resource's own ACL as well as its Container's", async () => {
    const mockFetch = jest.fn((url) => {
      const headers =
        url === "https://some.pod/resource"
          ? { Link: '<resource.acl>; rel="acl"' }
          : url === "https://some.pod/"
          ? { Link: '<.acl>; rel="acl"' }
          : undefined;
      const init: ResponseInit & { url: string } = {
        headers: headers,
        url: url,
      };
      return Promise.resolve(new Response(undefined, init));
    });

    const fetchedSolidDataset = await getFileWithAcl(
      "https://some.pod/resource",
      { fetch: mockFetch }
    );

    expect(fetchedSolidDataset.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/resource"
    );
    expect(
      fetchedSolidDataset.internal_acl?.resourceAcl?.internal_resourceInfo
        .sourceIri
    ).toBe("https://some.pod/resource.acl");
    expect(
      fetchedSolidDataset.internal_acl?.fallbackAcl?.internal_resourceInfo
        .sourceIri
    ).toBe("https://some.pod/.acl");
    expect(mockFetch.mock.calls).toHaveLength(4);
    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource");
    expect(mockFetch.mock.calls[1][0]).toBe("https://some.pod/resource.acl");
    expect(mockFetch.mock.calls[2][0]).toBe("https://some.pod/");
    expect(mockFetch.mock.calls[3][0]).toBe("https://some.pod/.acl");
  });

  it("does not attempt to fetch ACLs if the fetched Resource does not include a pointer to an ACL file, and sets an appropriate default value.", async () => {
    const mockFetch = jest.fn(window.fetch);
    const init: ResponseInit & { url: string } = {
      headers: {
        Link: "",
      },
      url: "https://some.pod/resource",
    };
    mockFetch.mockReturnValueOnce(
      Promise.resolve(new Response(undefined, init))
    );

    const fetchedSolidDataset = await getFileWithAcl(
      "https://some.pod/resource",
      { fetch: mockFetch }
    );

    expect(mockFetch.mock.calls).toHaveLength(1);
    expect(fetchedSolidDataset.internal_acl.resourceAcl).toBeNull();
    expect(fetchedSolidDataset.internal_acl.fallbackAcl).toBeNull();
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = getFileWithAcl("https://arbitrary.pod/resource", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the File failed: 403 Forbidden.")
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = getFileWithAcl("https://arbitrary.pod/resource", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the File failed: 404 Not Found.")
    );
  });

  it("should pass the request headers through", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response("Some data", { status: 200, statusText: "OK" })
        )
      );

    const response = await getFile("https://some.url", {
      init: {
        headers: new Headers({ Accept: "text/turtle" }),
      },
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toEqual([
      [
        "https://some.url",
        {
          headers: new Headers({ Accept: "text/turtle" }),
        },
      ],
    ]);
  });

  it("should throw on failure", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response(undefined, { status: 400, statusText: "Bad request" })
        )
      );

    const response = getFile("https://some.url", {
      fetch: mockFetch,
    });
    await expect(response).rejects.toThrow(
      "Fetching the File failed: 400 Bad request"
    );
  });
});

describe("Non-RDF data deletion", () => {
  it("should DELETE a remote resource using the included fetcher if no other fetcher is available", async () => {
    const fetcher = jest.requireMock("../fetcher") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    fetcher.fetch.mockReturnValue(
      Promise.resolve(
        new Response(undefined, { status: 200, statusText: "Deleted" })
      )
    );

    const response = await deleteFile("https://some.url");

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

  it("should DELETE a remote resource using the provided fetcher", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response(undefined, { status: 200, statusText: "Deleted" })
        )
      );

    const response = await deleteFile("https://some.url", {
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

  it("should accept a fetched File as target", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response(undefined, { status: 200, statusText: "Deleted" })
        )
      );

    const mockFile: WithResourceInfo = {
      internal_resourceInfo: {
        isRawData: true,
        sourceIri: "https://some.url",
      },
    };

    const response = await deleteFile(mockFile, {
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

  it("should pass through the request init if it is set by the user", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response(undefined, { status: 200, statusText: "Deleted" })
        )
      );

    await deleteFile("https://some.url", {
      fetch: mockFetch,
      init: {
        mode: "same-origin",
      },
    });

    expect(mockFetch.mock.calls).toEqual([
      [
        "https://some.url",
        {
          method: "DELETE",
          mode: "same-origin",
        },
      ],
    ]);
  });
  it("should throw an error on a failed request", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          status: 400,
          statusText: "Bad request",
        })
      )
    );

    const deletionPromise = deleteFile("https://some.url", {
      fetch: mockFetch,
    });

    await expect(deletionPromise).rejects.toThrow(
      "Deleting the file at `https://some.url` failed: 400 Bad request"
    );
  });
});

describe("Write non-RDF data into a folder", () => {
  const mockBlob = {
    type: "binary",
  } as Blob;

  it("should default to the included fetcher if no other is available", async () => {
    const fetcher = jest.requireMock("../fetcher") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    fetcher.fetch.mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          status: 201,
          statusText: "Created",
          headers: { Location: "https://some.url/someFileName" },
        })
      )
    );

    const response = await saveFileInContainer("https://some.url", mockBlob);

    expect(fetcher.fetch).toHaveBeenCalled();
  });

  it("should POST to a remote resource using the included fetcher, and return the saved file", async () => {
    const fetcher = jest.requireMock("../fetcher") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    fetcher.fetch.mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          status: 201,
          statusText: "Created",
          headers: { Location: "someFileName" },
        })
      )
    );

    const savedFile = await saveFileInContainer("https://some.url", mockBlob);

    const mockCall = fetcher.fetch.mock.calls[0];
    expect(mockCall[0]).toEqual("https://some.url");
    expect(mockCall[1]?.headers).toEqual(
      new Headers({
        "Content-Type": "binary",
      })
    );
    expect(mockCall[1]?.method).toEqual("POST");
    expect(mockCall[1]?.body).toEqual(mockBlob);
    expect(savedFile).toBeInstanceOf(Blob);
    expect(savedFile.internal_resourceInfo).toEqual({
      sourceIri: "https://some.url/someFileName",
      isRawData: true,
    });
  });

  it("should use the provided fetcher if available", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          status: 201,
          statusText: "Created",
          headers: { Location: "https://some.url/someFileName" },
        })
      )
    );

    const response = await saveFileInContainer("https://some.url", mockBlob, {
      fetch: mockFetch,
    });

    expect(mockFetch).toHaveBeenCalled();
  });

  it("should POST a remote resource using the provided fetcher", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          status: 201,
          statusText: "Created",
          headers: { Location: "https://some.url/someFileName" },
        })
      )
    );

    const response = await saveFileInContainer("https://some.url", mockBlob, {
      fetch: mockFetch,
    });

    const mockCall = mockFetch.mock.calls[0];
    expect(mockCall[0]).toEqual("https://some.url");
    expect(mockCall[1]?.headers).toEqual(
      new Headers({ "Content-Type": "binary" })
    );
    expect(mockCall[1]?.body).toEqual(mockBlob);
  });

  it("should pass the suggested slug through", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          status: 201,
          statusText: "Created",
          headers: { Location: "https://some.url/someFileName" },
        })
      )
    );

    const savedFile = await saveFileInContainer("https://some.url", mockBlob, {
      fetch: mockFetch,
      slug: "someFileName",
    });

    const mockCall = mockFetch.mock.calls[0];
    expect(mockCall[0]).toEqual("https://some.url");
    expect(mockCall[1]?.headers).toEqual(
      new Headers({
        "Content-Type": "binary",
        Slug: "someFileName",
      })
    );
    expect(mockCall[1]?.body).toEqual(mockBlob);
  });

  it("throws when a reserved header is passed", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response(undefined, { status: 201, statusText: "Created" })
        )
      );

    await expect(
      saveFileInContainer("https://some.url", mockBlob, {
        fetch: mockFetch,
        init: {
          headers: {
            Slug: "someFileName",
          },
        },
      })
    ).rejects.toThrow(/reserved header/);
  });

  it("throws when saving failed", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response(undefined, { status: 403, statusText: "Forbidden" })
        )
      );

    await expect(
      saveFileInContainer("https://some.url", mockBlob, {
        fetch: mockFetch,
      })
    ).rejects.toThrow(
      "Saving the file in `https://some.url` failed: 403 Forbidden."
    );
  });

  it("throws when the server did not return the location of the newly-saved file", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response(undefined, { status: 201, statusText: "Created" })
        )
      );

    await expect(
      saveFileInContainer("https://some.url", mockBlob, {
        fetch: mockFetch,
      })
    ).rejects.toThrow(
      "Could not determine the location of the newly saved file."
    );
  });
});

describe("Write non-RDF data directly into a resource (potentially erasing previous value)", () => {
  const mockBlob = {
    type: "binary",
  } as Blob;

  it("should default to the included fetcher if no other fetcher is available", async () => {
    const fetcher = jest.requireMock("../fetcher") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    fetcher.fetch.mockReturnValue(
      Promise.resolve(
        new Response(undefined, { status: 201, statusText: "Created" })
      )
    );

    await overwriteFile("https://some.url", mockBlob);

    expect(fetcher.fetch).toHaveBeenCalled();
  });

  it("should PUT to a remote resource when using the included fetcher, and return the saved file", async () => {
    const fetcher = jest.requireMock("../fetcher") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    fetcher.fetch.mockReturnValue(
      Promise.resolve(
        new Response(undefined, { status: 201, statusText: "Created" })
      )
    );

    const savedFile = await overwriteFile("https://some.url", mockBlob);

    const mockCall = fetcher.fetch.mock.calls[0];
    expect(mockCall[0]).toEqual("https://some.url");
    expect(mockCall[1]?.headers).toEqual(
      new Headers({
        "Content-Type": "binary",
      })
    );
    expect(mockCall[1]?.method).toEqual("PUT");
    expect(mockCall[1]?.body).toEqual(mockBlob);

    expect(savedFile).toBeInstanceOf(Blob);
    expect(savedFile.internal_resourceInfo).toEqual({
      sourceIri: "https://some.url",
      isRawData: true,
    });
  });

  it("should use the provided fetcher", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response(undefined, { status: 201, statusText: "Created" })
        )
      );

    const response = await overwriteFile("https://some.url", mockBlob, {
      fetch: mockFetch,
    });

    expect(mockFetch).toHaveBeenCalled();
  });

  it("should PUT a remote resource using the provided fetcher, and return the saved file", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response(undefined, { status: 201, statusText: "Created" })
        )
      );

    const savedFile = await overwriteFile("https://some.url", mockBlob, {
      fetch: mockFetch,
    });

    const mockCall = mockFetch.mock.calls[0];
    expect(mockCall[0]).toEqual("https://some.url");
    expect(mockCall[1]?.headers).toEqual(
      new Headers({ "Content-Type": "binary" })
    );
    expect(mockCall[1]?.method).toEqual("PUT");
    expect(mockCall[1]?.body).toEqual(mockBlob);

    expect(savedFile).toBeInstanceOf(Blob);
    expect(savedFile.internal_resourceInfo).toEqual({
      sourceIri: "https://some.url",
      isRawData: true,
    });
  });

  it("throws when saving failed", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response(undefined, { status: 403, statusText: "Forbidden" })
        )
      );

    await expect(
      overwriteFile("https://some.url", mockBlob, {
        fetch: mockFetch,
      })
    ).rejects.toThrow(
      "Overwriting the file at `https://some.url` failed: 403 Forbidden."
    );
  });
});
