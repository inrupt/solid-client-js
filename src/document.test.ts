jest.mock("./fetcher.ts", () => ({
  fetch: jest.fn().mockImplementation(() => Promise.resolve(new Response())),
}));

import { Response } from "cross-fetch";
import { fetchDocument } from "./document";

it("should call the included fetcher by default", async () => {
  const mockedFetcher = jest.requireMock("./fetcher.ts");

  await fetchDocument("https://some.url");

  expect(mockedFetcher.fetch.mock.calls).toEqual([["https://some.url"]]);
});

it("should use the given fetcher if provided", async () => {
  const mockFetch = jest.fn().mockReturnValue(Promise.resolve(new Response()));

  await fetchDocument("https://some.url", { fetch: mockFetch });

  expect(mockFetch.mock.calls).toEqual([["https://some.url"]]);
});

it("should return a Dataset representing the fetched Turtle", async () => {
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
    .fn()
    .mockReturnValue(Promise.resolve(new Response(turtle)));

  const dataset = await fetchDocument("https://arbitrary.url", {
    fetch: mockFetch,
  });

  expect(dataset.size).toBe(5);
  expect(dataset).toMatchSnapshot();
});
