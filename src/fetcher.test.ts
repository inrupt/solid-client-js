jest.mock("cross-fetch");

import { fetch } from "./fetcher";

it("should fallback to cross-fetch if no Solid-specific fetcher is available", async () => {
  const crossFetch = jest.requireMock("cross-fetch");

  await fetch("https://some.url");

  expect(crossFetch.mock.calls).toEqual([["https://some.url", undefined]]);
});
