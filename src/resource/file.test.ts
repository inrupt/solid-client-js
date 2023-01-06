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
import type { Mock } from "jest-mock";

import { Headers, Response } from "cross-fetch";

import {
  getFile,
  deleteFile,
  saveFileInContainer,
  overwriteFile,
  flattenHeaders,
} from "./file";
import { WithResourceInfo } from "../interfaces";

jest.mock("../fetcher", () => ({
  fetch: jest
    .fn()
    .mockImplementation(() =>
      Promise.resolve(
        new Response("Some data", { status: 200, statusText: "OK" })
      )
    ),
}));

describe("flattenHeaders", () => {
  it("returns an empty object for undefined headers", () => {
    expect(flattenHeaders(undefined)).toEqual({});
  });

  it("returns well-formed headers as-is", () => {
    const headers: Record<string, string> = {
      test: "value",
    };
    expect(flattenHeaders(headers)).toEqual(headers);
  });

  it("transforms an incoming Headers object into a flat headers structure", () => {
    const myHeaders = new Headers();
    myHeaders.append("accept", "application/json");
    myHeaders.append("Content-Type", "text/turtle");
    const flatHeaders = flattenHeaders(myHeaders);
    expect(flatHeaders).toEqual({
      accept: "application/json",
      "content-type": "text/turtle",
    });
  });

  it("supports non-iterable headers if they provide a reasonably standard way of browsing them", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const myHeaders: any = {};
    myHeaders.forEach = (
      callback: (value: string, key: string) => void
    ): void => {
      callback("application/json", "accept");
      callback("text/turtle", "Content-Type");
    };
    const flatHeaders = flattenHeaders(myHeaders);
    expect(flatHeaders).toEqual({
      accept: "application/json",
      "Content-Type": "text/turtle",
    });
  });

  it("transforms an incoming string[][] array into a flat headers structure", () => {
    const myHeaders: string[][] = [
      ["accept", "application/json"],
      ["Content-Type", "text/turtle"],
    ];
    const flatHeaders = flattenHeaders(myHeaders);
    expect(flatHeaders).toEqual({
      accept: "application/json",
      "Content-Type": "text/turtle",
    });
  });
});

describe("getFile", () => {
  it("should GET a remote resource using the included fetcher if no other fetcher is available", async () => {
    const fetcher = jest.requireMock("../fetcher") as {
      fetch: jest.Mocked<typeof fetch>;
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

    expect(file.internal_resourceInfo.sourceIri).toBe("https://some.url");
    expect(file.internal_resourceInfo.contentType).toContain("text/plain");
    expect(file.internal_resourceInfo.isRawData).toBe(true);

    const fileData = await file.text();
    expect(fileData).toBe("Some data");
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
      "Fetching the File failed: [400] [Bad request]"
    );
  });

  it("includes the status code and status message when a request failed", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response(undefined, { status: 418, statusText: "I'm a teapot!" })
        )
      );

    const response = getFile("https://arbitrary.url", {
      fetch: mockFetch,
    });
    await expect(response).rejects.toMatchObject({
      statusCode: 418,
      statusText: "I'm a teapot!",
    });
  });
});

describe("Non-RDF data deletion", () => {
  it("should DELETE a remote resource using the included fetcher if no other fetcher is available", async () => {
    const fetcher = jest.requireMock("../fetcher") as {
      fetch: jest.Mocked<typeof fetch>;
    };

    fetcher.fetch.mockReturnValueOnce(
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
      "Deleting the file at [https://some.url] failed: [400] [Bad request]"
    );
  });
  it("includes the status code and status message when a request failed", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          status: 418,
          statusText: "I'm a teapot!",
        })
      )
    );

    const deletionPromise = deleteFile("https://arbitrary.url", {
      fetch: mockFetch,
    });

    await expect(deletionPromise).rejects.toMatchObject({
      statusCode: 418,
      statusText: "I'm a teapot!",
    });
  });
});

describe("Write non-RDF data into a folder", () => {
  const mockBlob = new Blob(["mock blob data"], { type: "binary" });
  function setMockOnFetch(
    fetch: jest.Mocked<typeof window.fetch>,
    saveResponse = new Response(undefined, {
      status: 201,
      statusText: "Created",
      headers: { Location: "someFileName" },
    })
  ): jest.Mocked<typeof window.fetch> {
    fetch.mockResolvedValueOnce(saveResponse);
    return fetch;
  }

  it("should default to the included fetcher if no other is available", async () => {
    const fetcher = jest.requireMock("../fetcher") as {
      fetch: jest.Mocked<typeof window.fetch>;
    };

    fetcher.fetch = setMockOnFetch(fetcher.fetch);

    await saveFileInContainer("https://some.url", mockBlob);

    expect(fetcher.fetch).toHaveBeenCalled();
  });

  it("should POST to a remote resource using the included fetcher, and return the saved file", async () => {
    const fetcher = jest.requireMock("../fetcher") as {
      fetch: jest.Mocked<typeof window.fetch>;
    };

    fetcher.fetch = setMockOnFetch(fetcher.fetch);

    const savedFile = await saveFileInContainer("https://some.url", mockBlob);

    const mockCall = fetcher.fetch.mock.calls[0];
    expect(mockCall[0]).toBe("https://some.url");
    expect(mockCall[1]?.headers).toEqual({
      "Content-Type": "binary",
    });
    expect(mockCall[1]?.method).toBe("POST");
    expect(mockCall[1]?.body).toEqual(mockBlob);
    expect(savedFile).toBeInstanceOf(Blob);
    expect(savedFile!.internal_resourceInfo).toEqual({
      contentType: "binary",
      sourceIri: "https://some.url/someFileName",
      isRawData: true,
    });
  });

  it("should use the provided fetcher if available", async () => {
    const mockFetch = setMockOnFetch(jest.fn(window.fetch));

    await saveFileInContainer("https://some.url", mockBlob, {
      fetch: mockFetch,
    });

    expect(mockFetch).toHaveBeenCalled();
  });

  it("should POST a remote resource using the provided fetcher", async () => {
    const mockFetch = setMockOnFetch(jest.fn(window.fetch));

    await saveFileInContainer("https://some.url", mockBlob, {
      fetch: mockFetch,
    });

    const mockCall = mockFetch.mock.calls[0];
    expect(mockCall[0]).toBe("https://some.url");
    expect(mockCall[1]?.headers).toEqual({ "Content-Type": "binary" });
    expect(mockCall[1]?.body).toEqual(mockBlob);
  });

  it("should pass the suggested slug through", async () => {
    const mockFetch = setMockOnFetch(jest.fn(window.fetch));

    await saveFileInContainer("https://some.url", mockBlob, {
      fetch: mockFetch,
      slug: "someFileName",
    });

    const mockCall = mockFetch.mock.calls[0];
    expect(mockCall[0]).toBe("https://some.url");
    expect(mockCall[1]?.headers).toEqual({
      "Content-Type": "binary",
      Slug: "someFileName",
    });
    expect(mockCall[1]?.body).toEqual(mockBlob);
  });

  it("sets the correct Content Type on the returned file, if available", async () => {
    const fetcher = jest.requireMock("../fetcher") as {
      fetch: jest.Mocked<typeof window.fetch>;
    };

    fetcher.fetch = setMockOnFetch(fetcher.fetch);

    const mockTextBlob = new Blob(["mock blob data"], { type: "text/plain" });
    const savedFile = await saveFileInContainer(
      "https://some.url",
      mockTextBlob
    );

    expect(savedFile).toBeInstanceOf(Blob);
    expect(savedFile!.internal_resourceInfo.contentType).toBe("text/plain");
  });

  it("sets the given Content Type on the returned file, if any was given", async () => {
    const fetcher = jest.requireMock("../fetcher") as {
      fetch: jest.Mocked<typeof window.fetch>;
    };

    fetcher.fetch = setMockOnFetch(fetcher.fetch);

    const mockTextBlob = new Blob(["mock blob data"], { type: "text/plain" });
    const savedFile = await saveFileInContainer(
      "https://some.url",
      mockTextBlob,
      {
        contentType: "text/csv",
      }
    );

    expect(savedFile).toBeInstanceOf(Blob);
    expect(savedFile!.internal_resourceInfo.contentType).toBe("text/csv");
  });

  it("defaults the Content Type to `application/octet-stream` if none is known", async () => {
    const fetcher = jest.requireMock("../fetcher") as {
      fetch: jest.Mocked<typeof window.fetch>;
    };

    fetcher.fetch = setMockOnFetch(fetcher.fetch);

    const mockTextBlob = new Blob(["mock blob data"]);
    const savedFile = await saveFileInContainer(
      "https://some.url",
      mockTextBlob
    );

    expect(savedFile).toBeInstanceOf(Blob);
    expect(savedFile!.internal_resourceInfo.contentType).toBe(
      "application/octet-stream"
    );
  });

  it("throws when a reserved header is passed", async () => {
    const mockFetch = setMockOnFetch(jest.fn(window.fetch));

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
    const mockFetch = setMockOnFetch(
      jest.fn(window.fetch),
      new Response(undefined, { status: 403, statusText: "Forbidden" })
    );

    await expect(
      saveFileInContainer("https://some.url", mockBlob, {
        fetch: mockFetch,
      })
    ).rejects.toThrow(
      "Saving the file in [https://some.url] failed: [403] [Forbidden]."
    );
  });

  it("throws when the server did not return the location of the newly-saved file", async () => {
    const mockFetch = setMockOnFetch(
      jest.fn(window.fetch),
      new Response(undefined, { status: 201, statusText: "Created" })
    );

    await expect(
      saveFileInContainer("https://some.url", mockBlob, {
        fetch: mockFetch,
      })
    ).rejects.toThrow(
      "Could not determine the location of the newly saved file."
    );
  });

  it("includes the status code and status message when a request failed", async () => {
    const mockFetch = setMockOnFetch(
      jest.fn(window.fetch),
      new Response(undefined, { status: 418, statusText: "I'm a teapot!" })
    );

    await expect(
      saveFileInContainer("https://arbitrary.url", mockBlob, {
        fetch: mockFetch,
      })
    ).rejects.toMatchObject({
      statusCode: 418,
      statusText: "I'm a teapot!",
    });
  });
});

describe("Write non-RDF data directly into a resource (potentially erasing previous value)", () => {
  const mockBlob = new Blob(["mock blob data"], { type: "binary" });

  it("should default to the included fetcher if no other fetcher is available", async () => {
    const fetcher = jest.requireMock("../fetcher") as {
      fetch: jest.Mocked<typeof fetch>;
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
      fetch: jest.Mocked<typeof fetch>;
    };

    fetcher.fetch.mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          status: 201,
          statusText: "Created",
          url: "https://some.url",
        } as ResponseInit)
      )
    );

    const savedFile = await overwriteFile("https://some.url", mockBlob);

    const mockCall = fetcher.fetch.mock.calls[0];
    expect(mockCall[0]).toBe("https://some.url");
    expect(mockCall[1]?.headers).toEqual({
      "Content-Type": "binary",
    });
    expect(mockCall[1]?.method).toBe("PUT");
    expect(mockCall[1]?.body).toEqual(mockBlob);

    expect(savedFile).toBeInstanceOf(Blob);
    expect(savedFile.internal_resourceInfo).toEqual({
      contentType: undefined,
      sourceIri: "https://some.url",
      isRawData: true,
      linkedResources: {},
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
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          status: 201,
          statusText: "Created",
          url: "https://some.url",
        } as ResponseInit)
      )
    );

    const savedFile = await overwriteFile("https://some.url", mockBlob, {
      fetch: mockFetch,
    });

    const mockCall = mockFetch.mock.calls[0];
    expect(mockCall[0]).toBe("https://some.url");
    expect(mockCall[1]?.headers).toEqual({ "Content-Type": "binary" });
    expect(mockCall[1]?.method).toBe("PUT");
    expect(mockCall[1]?.body).toEqual(mockBlob);

    expect(savedFile).toBeInstanceOf(Blob);
    expect(savedFile.internal_resourceInfo).toEqual({
      contentType: undefined,
      sourceIri: "https://some.url",
      isRawData: true,
      linkedResources: {},
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
      "Overwriting the file at [https://some.url] failed: [403] [Forbidden]."
    );
  });

  it("includes the status code and status message when a request failed", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response(undefined, { status: 418, statusText: "I'm a teapot!" })
        )
      );

    await expect(
      overwriteFile("https://arbitrary.url", mockBlob, {
        fetch: mockFetch,
      })
    ).rejects.toMatchObject({
      statusCode: 418,
      statusText: "I'm a teapot!",
    });
  });
});
