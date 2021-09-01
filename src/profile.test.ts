/**
 * Copyright 2021 Inrupt Inc.
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

import { describe, it, jest, expect } from "@jest/globals";
import { rdf } from "./constants";
import { SolidDataset } from "./interfaces";
import { setPublicKeyToProfile } from "./profile";
import { getFile } from "./resource/file";
import { mockSolidDatasetFrom } from "./resource/mock";
import { buildThing } from "./thing/build";
import { getUrl } from "./thing/get";
import { getThing, setThing } from "./thing/thing";

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

describe("setPublicKeyToProfile", () => {
  const publicKey = JSON.parse('{"publicKey": "121465147643"}');

  it("Adds JWK IRI if there is not one already", async () => {
    let mockedDataset = mockSolidDatasetFrom("https://some.pod/resource");
    const profile = buildThing({ name: "webId" })
      .addUrl(rdf.type, "https://example.org/ns/Person")
      .build();
    mockedDataset = setThing(mockedDataset, profile);

    const mockedDatasetModule = jest.requireMock(
      "../resource/solidDataset"
    ) as any;
    mockedDatasetModule.getSolidDataset.mockResolvedValueOnce(mockedDataset);
    const mockedSave = mockedDatasetModule.saveSolidDatasetAt;

    const mockedFileModule = jest.requireMock("../resource/file") as any;
    const file = new Blob([JSON.stringify({ keys: [] })], {
      type: "application/json",
    });
    mockedFileModule.getFile.mockResolvedValueOnce(file);

    await setPublicKeyToProfile(
      publicKey,
      "https://some.pod/resource#webId",
      "https://some.resource/jwks.json"
    );

    // Intercept the saved dataset
    const savedProfileDocument = mockedSave.mock.calls[0][1] as SolidDataset;
    const savedProfile = getThing(
      savedProfileDocument,
      "https://some.pod/resource#webId"
    );

    // check public key matches
    expect(
      getUrl(savedProfile!, "https://w3id.org/security#publicKey")
    ).toEqual("https://some.resource/jwks.json");
  });

  it("Adds JWK IRI if it is different to existing IRI", async () => {
    let mockedDataset = mockSolidDatasetFrom("https://some.pod/resource");
    const profile = buildThing({ name: "webId" })
      .addUrl(rdf.type, "https://example.org/ns/Person")
      .addUrl(
        "https://w3id.org/security#publicKey",
        "https://some.resource/jwks.json"
      )
      .build();
    mockedDataset = setThing(mockedDataset, profile);

    const mockedDatasetModule = jest.requireMock(
      "../resource/solidDataset"
    ) as any;
    mockedDatasetModule.getSolidDataset.mockResolvedValueOnce(mockedDataset);
    const mockedSave = mockedDatasetModule.saveSolidDatasetAt;

    const mockedFileModule = jest.requireMock("../resource/file") as any;
    const file = new Blob([JSON.stringify({ keys: [] })], {
      type: "application/json",
    });
    mockedFileModule.getFile.mockResolvedValueOnce(file);

    await setPublicKeyToProfile(
      publicKey,
      "https://some.pod/resource#webId",
      "https://some.different.resource/jwks.json"
    );

    // Intercept the saved dataset
    const savedProfileDocument = mockedSave.mock.calls[0][1] as SolidDataset;
    const savedProfile = getThing(
      savedProfileDocument,
      "https://some.pod/resource#webId"
    );
    // check public key matches
    expect(
      getUrl(savedProfile!, "https://w3id.org/security#publicKey")
    ).toEqual("https://some.different.resource/jwks.json");
  });

  it("adds the public key to JWKS file", async () => {
    let mockedDataset = mockSolidDatasetFrom("https://some.pod/resource");
    const profile = buildThing({ name: "webId" })
      .addUrl(rdf.type, "https://example.org/ns/Person")
      .build();
    mockedDataset = setThing(mockedDataset, profile);
    const jwksIri = addUrl(
      profile,
      "https://w3id.org/security#publicKey",
      "https://some.resource/jwks.json"
    );

    const mockedDatasetModule = jest.requireMock(
      "../resource/solidDataset"
    ) as any;
    mockedDatasetModule.getSolidDataset.mockResolvedValueOnce(mockedDataset);
    const mockedSave = mockedDatasetModule.saveSolidDatasetAt;

    const mockedFileModule = jest.requireMock("../resource/file") as any;
    const file = new Blob([JSON.stringify({ keys: [] })], {
      type: "application/json",
    });
    mockedFileModule.getFile.mockResolvedValueOnce(file);

    const jwksWithKey = await setPublicKeyToProfile(
      publicKey,
      "https://some.pod/resource#webId",
      "https://some.resource/jwks.json"
    );

    const updatedFile = await getFile("https://some.resource/jwks.json");
    const updatedJwks = await updatedFile.text();
    // check public key matches
    expect(updatedJwks).toEqual(JSON.stringify(publicKey));
    // modify this json to match JWKS format
  });

  it("throws an error when passed an invalid WebID", () => {});
});
