import { it, expect } from "@jest/globals";

import { getFile } from "./nonRdfData";
import { Headers, Response } from "cross-fetch";

describe("Non-RDF data fetch", () => {
  it("should GET a remote resource using cross-fetch if no other fetcher is available", async () => {
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

    expect(crossFetch.mock.calls).toEqual([
      [
        "https://some.url",
        {
          headers: new Headers({}),
        },
      ],
    ]);
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

    expect(mockFetch.mock.calls).toEqual([
      [
        "https://some.url",
        {
          headers: new Headers({}),
        },
      ],
    ]);
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
      headers: new Headers({ Accept: "text/turlte" }),
    });

    expect(mockFetch.mock.calls).toEqual([
      [
        "https://some.url",
        {
          headers: new Headers({ Accept: "text/turlte" }),
        },
      ],
    ]);
  });

  it("should throw on failed request", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response("Some data", {
          status: 400,
          statusText: "Bad request",
        })
      )
    );

    await expect(
      getFile("https://some.url", {
        fetch: mockFetch,
      })
    ).rejects.toThrow(
      new Error(
        "Failed to fetch the data at https://some.url: 400 Bad request."
      )
    );
  });
});
