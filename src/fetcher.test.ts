import { it, expect } from "@jest/globals";
jest.mock("cross-fetch");

import { fetch } from "./fetcher";

it("should fallback to cross-fetch if no Solid-specific fetcher is available", async () => {
  const crossFetch = jest.requireMock("cross-fetch") as jest.Mock<
    ReturnType<typeof window.fetch>,
    [RequestInfo, RequestInit]
  >;

  await fetch("https://some.url");

  expect(crossFetch.mock.calls).toEqual([["https://some.url", undefined]]);
});
