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

import { describe, it, jest, expect } from "@jest/globals";
import { Response } from "cross-fetch";
import { rdf, security } from "../constants";
import { mockSolidDatasetFrom } from "../resource/mock";
import { buildThing } from "../thing/build";
import { getUrl } from "../thing/get";
import { mockThingFrom } from "../thing/mock";
import { getThing, setThing } from "../thing/thing";
import {
  addJwkToJwks,
  addPublicKeyToProfileJwks,
  getProfileJwksIri,
  setProfileJwks,
} from "./jwks";

jest.mock("../resource/solidDataset", () => {
  const actualResourceModule = jest.requireActual(
    "../resource/solidDataset"
  ) as any;
  return {
    ...actualResourceModule,
    getSolidDataset: jest.fn(),
    saveSolidDatasetAt: jest.fn(),
  };
});

jest.mock("../resource/file", () => {
  const actualResourceModule = jest.requireActual("../resource/file") as any;
  return {
    ...actualResourceModule,
    getFile: jest.fn(),
  };
});

jest.mock("../fetcher.ts", () => ({
  fetch: jest.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify({ keys: [] }), {
        headers: { Location: "https://arbitrary.pod/resource" },
      })
    )
  ),
}));

describe("setProfileJwks", () => {
  it("overwrites an existing JWKS IRI value", () => {
    let dataset = mockSolidDatasetFrom("https://example.org/pod/");
    const profile = buildThing(mockThingFrom("https://example.org/pod/me"))
      .setIri(security.publicKey, "https://example.org/pod/jwks")
      .build();
    dataset = setThing(dataset, profile);
    dataset = setProfileJwks(
      dataset,
      "https://example.org/pod/me",
      "https://example.org/pod/new-jwks"
    );
    const updatedProfile = getThing(dataset, "https://example.org/pod/me");
    expect(getUrl(updatedProfile!, security.publicKey)).toBe(
      "https://example.org/pod/new-jwks"
    );
  });
});

describe("getProfileJwksIri", () => {
  it("returns the JWKS IRI attached to a profile", () => {
    let dataset = mockSolidDatasetFrom("https://example.org/pod/");
    const profile = buildThing(mockThingFrom("https://example.org/pod/me"))
      .setIri(security.publicKey, "https://example.org/pod/jwks")
      .build();
    dataset = setThing(dataset, profile);
    expect(getProfileJwksIri(dataset, "https://example.org/pod/me")).toBe(
      "https://example.org/pod/jwks"
    );
  });

  it("returns null if no JWKS IRI is attached to a profile", () => {
    let dataset = mockSolidDatasetFrom("https://example.org/pod/");
    const profile = mockThingFrom("https://example.org/pod/me");
    dataset = setThing(dataset, profile);
    expect(getProfileJwksIri(dataset, "https://example.org/pod/me")).toBeNull();
  });
});

describe("addJwkToJwks", () => {
  it("returns an updated JWKS with the provided JWK", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ keys: [] })));
    const jwks = await addJwkToJwks(
      { kid: "..." },
      "https://example.org/jwks",
      {
        fetch: mockFetch,
      }
    );
    expect(jwks).toEqual({ keys: [{ kid: "..." }] });
  });

  it("uses the default fetch if none is provided", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mocked<typeof fetch>;
    };

    await addJwkToJwks({ kid: "..." }, "https://example.org/jwks");

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(1);
    expect(mockedFetcher.fetch.mock.calls[0][0]).toBe(
      "https://example.org/jwks"
    );
  });

  it("throws if the given IRI does not resolve to a JWKS", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify("Not a JWKS")));
    await expect(
      addJwkToJwks({ kid: "..." }, "https://example.org/jwks", {
        fetch: mockFetch,
      })
    ).rejects.toThrow(/example.org.*Not a JWKS/);
  });

  it("throws if the given IRI cannot be resolved", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockResolvedValueOnce(
        new Response("", { status: 400, statusText: "Bad request" })
      );
    await expect(
      addJwkToJwks({ kid: "..." }, "https://example.org/jwks", {
        fetch: mockFetch,
      })
    ).rejects.toThrow(/400.*Bad request/);
  });

  it("throws if the given IRI resolves to a JSON document which isn't a JWKS", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ someKey: "some value" }))
      );
    await expect(
      addJwkToJwks({ kid: "..." }, "https://example.org/jwks", {
        fetch: mockFetch,
      })
    ).rejects.toThrow(/example.org.*valid JWKS.*some value/);
  });
});

describe("addPublicKeyToProfileJwks", () => {
  it("throws if the profile cannot be fetched", async () => {
    const mockedDatasetModule = jest.requireMock(
      "../resource/solidDataset"
    ) as any;
    mockedDatasetModule.getSolidDataset.mockResolvedValueOnce(null);

    await expect(
      addPublicKeyToProfileJwks(
        { kid: "..." },
        "https://some.pod/resource#webId"
      )
    ).rejects.toThrow(/profile document.*webId.*retrieved/);
  });

  it("throws if the profile does not have a JWKS", async () => {
    let mockedDataset = mockSolidDatasetFrom("https://some.pod/resource");
    const profile = buildThing({ name: "webId" })
      .addUrl(rdf.type, "https://example.org/ns/Person")
      .build();
    mockedDataset = setThing(mockedDataset, profile);

    const mockedDatasetModule = jest.requireMock(
      "../resource/solidDataset"
    ) as any;
    mockedDatasetModule.getSolidDataset.mockResolvedValueOnce(mockedDataset);

    await expect(
      addPublicKeyToProfileJwks(
        { kid: "..." },
        "https://some.pod/resource#webId"
      )
    ).rejects.toThrow(/No key set.*webId/);
  });

  it("adds the public key to JWKS file", async () => {
    let mockedDataset = mockSolidDatasetFrom("https://some.pod/resource");
    const profile = buildThing({ name: "webId" })
      .addUrl(security.publicKey, "https://example.org/pod/jwks")
      .build();
    mockedDataset = setThing(mockedDataset, profile);

    const mockedDatasetModule = jest.requireMock(
      "../resource/solidDataset"
    ) as any;
    mockedDatasetModule.getSolidDataset.mockResolvedValueOnce(mockedDataset);

    const mockFetch = jest
      .fn(window.fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ keys: [] })))
      .mockResolvedValueOnce(new Response(""));

    const mockedFileModule = jest.requireMock("../resource/file") as any;
    const spiedOverWrite = jest.spyOn(mockedFileModule, "overwriteFile");

    await addPublicKeyToProfileJwks(
      { kid: "..." },
      "https://some.pod/resource#webId",
      {
        fetch: mockFetch,
      }
    );

    // Intercept the saved dataset
    const savedJwks = spiedOverWrite.mock.calls[0][1];

    // check public key matches
    expect(savedJwks).toEqual(
      new Blob([JSON.stringify({ keys: [{ kid: "..." }] })])
    );
  });

  it("throws if the profile doc does not include the WebId", async () => {
    const mockedDataset = mockSolidDatasetFrom("https://some.pod/resource");
    const mockedDatasetModule = jest.requireMock(
      "../resource/solidDataset"
    ) as any;
    mockedDatasetModule.getSolidDataset.mockResolvedValueOnce(mockedDataset);
    await expect(
      addPublicKeyToProfileJwks(
        { kid: "..." },
        "https://some.pod/resource#webId"
      )
    ).rejects.toThrow(/Profile document.*webId/);
  });
});
