import { describe, it, expect } from "@jest/globals";

jest.mock("./fetcher", () => ({
  fetch: jest
    .fn()
    .mockImplementation(() =>
      Promise.resolve(
        new Response("Some data", { status: 200, statusText: "OK" })
      )
    ),
}));

import { fetchFile } from "./nonRdfData";
import { Headers, Response } from "cross-fetch";

describe("Non-RDF data fetch", () => {
  it("should GET a remote resource using cross-fetch if no other fetcher is available", async () => {
    // Mocking cross-fetch must not happen in the global scope, otherwise it
    // breaks the imports of the Headers and Response classes.

    const fetcher = jest.requireMock("./fetcher") as {
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

    const response = await fetchFile("https://some.url");

    expect(fetcher.fetch.mock.calls).toEqual([["https://some.url", {}]]);
    expect(response).toEqual(
      new Response("Some data", { status: 200, statusText: "OK" })
    );
  });

  it("should GET a remote resource using the provided fetcher", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response("Some data", { status: 200, statusText: "OK" })
        )
      );

    const response = await fetchFile("https://some.url", { fetch: mockFetch });

    expect(mockFetch.mock.calls).toEqual([["https://some.url", {}]]);
    expect(response).toEqual(
      new Response("Some data", { status: 200, statusText: "OK" })
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

    const response = await fetchFile("https://some.url", {
      fetch: mockFetch,
      headers: new Headers({ Accept: "text/turtle" }),
    });

    expect(mockFetch.mock.calls).toEqual([
      [
        "https://some.url",
        {
          headers: new Headers({ Accept: "text/turtle" }),
        },
      ],
    ]);
    expect(response).toEqual(
      new Response("Some data", { status: 200, statusText: "OK" })
    );
  });

  it("should return the response even on failure", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response(undefined, { status: 400, statusText: "Bad request" })
        )
      );

    const response = await fetchFile("https://some.url", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toEqual([["https://some.url", {}]]);
    expect(response).toEqual(
      new Response(undefined, { status: 400, statusText: "Bad request" })
    );
  });
});
