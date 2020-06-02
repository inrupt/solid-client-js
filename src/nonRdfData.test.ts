import { it, expect } from "@jest/globals";

import { getFile } from "./nonRdfData";
import { Headers, Response } from "cross-fetch";

describe("Non-RDF data fetch", () => {
  it("should GET a remote resource using cross-fetch if no other fetcher is available", async () => {
    // Mocking cross-fetch must not happen in the global scope, otherwise it
    // breaks the imports of the Headers and Response classes.
    jest.mock("cross-fetch");
    const crossFetch = jest.requireMock("cross-fetch") as jest.Mock<
      ReturnType<typeof window.fetch>,
      [RequestInfo, RequestInit]
    >;
    crossFetch.mockReturnValue(
      Promise.resolve(
        new Response("Some data", { status: 200, statusText: "OK" })
      )
    );

    await getFile("https://some.url");

    expect(crossFetch.mock.calls).toEqual([["https://some.url", {}]]);
  });

  it("should GET a remote resource using the provided fetcher", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response("Some data", { status: 200, statusText: "OK" })
        )
      );

    await getFile("https://some.url", { fetch: mockFetch });

    expect(mockFetch.mock.calls).toEqual([["https://some.url", {}]]);
  });

  it("should pass the request headers through", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response("Some data", { status: 200, statusText: "OK" })
        )
      );

    await getFile("https://some.url", {
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
  });
});
