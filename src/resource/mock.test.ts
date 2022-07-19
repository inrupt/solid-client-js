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

import { describe, it, expect } from "@jest/globals";

import * as crossFetch from "cross-fetch";

import {
  mockSolidDatasetFrom,
  mockFileFrom,
  mockContainerFrom,
  mockFetchError,
} from "./mock";
import {
  getSourceIri,
  isRawData,
  isContainer,
  getContentType,
} from "./resource";

const { Response } = crossFetch;

describe("mockSolidDatasetFrom", () => {
  it("is linked to the given source URL", async () => {
    const mockedDataset = mockSolidDatasetFrom("https://some.pod/resource");

    expect(getSourceIri(mockedDataset)).toBe("https://some.pod/resource");
  });

  it("is recognised as a SolidDataset", async () => {
    const mockedDataset = mockSolidDatasetFrom("https://some.pod/resource");

    expect(isRawData(mockedDataset)).toBe(false);
  });
});

describe("mockContainerFrom", () => {
  it("is linked to the given source URL", async () => {
    const mockedContainer = mockContainerFrom("https://some.pod/container/");

    expect(getSourceIri(mockedContainer)).toBe("https://some.pod/container/");
  });

  it("is recognised as a SolidDataset", async () => {
    const mockedContainer = mockContainerFrom("https://some.pod/container/");

    expect(isRawData(mockedContainer)).toBe(false);
  });

  it("throws an error if the URL is not a Container's", async () => {
    expect(() => mockContainerFrom("https://some.pod/resource")).toThrow(
      "A Container's URL should end in a slash. Please update your tests."
    );
  });

  it("is recognised as a Container", async () => {
    const mockedContainer = mockContainerFrom("https://some.pod/container/");

    expect(isContainer(mockedContainer)).toBe(true);
  });
});

describe("mockFileFrom", () => {
  it("is linked to the given source URL", async () => {
    const mockedFile = mockFileFrom("https://some.pod/file.png");

    expect(getSourceIri(mockedFile)).toBe("https://some.pod/file.png");
  });

  it("is recognised as a File", async () => {
    const mockedFile = mockFileFrom("https://some.pod/file.png");

    expect(isRawData(mockedFile)).toBe(true);
  });

  it("doesn't have a Content Type if not specified", async () => {
    const mockedFile = mockFileFrom("https://some.pod/file.png");

    expect(getContentType(mockedFile)).toBeNull();
  });

  it("has the specified Content Type", async () => {
    const mockedFile = mockFileFrom("https://some.pod/file.png", {
      contentType: "image/png",
    });

    expect(getContentType(mockedFile)).toBe("image/png");
  });
});

describe("mockFetchError", () => {
  it("returns a fetch-specific Error object containing response details", () => {
    const error = mockFetchError("https://some.pod/resource");

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(
      "Fetching the Resource at [https://some.pod/resource] failed: [404] [Not Found]."
    );
    expect(error.statusCode).toBe(404);
    expect(error.statusText).toBe("Not Found");
    expect(error.response).toBeInstanceOf(Response);
    expect(error.response.status).toBe(error.statusCode);
  });

  it("can represent different error statuses", () => {
    const error = mockFetchError("https://some.pod/resource", 418);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(
      "Fetching the Resource at [https://some.pod/resource] failed: [418] [I'm a Teapot]."
    );
    expect(error.statusCode).toBe(418);
    expect(error.statusText).toBe("I'm a Teapot");
    expect(error.response.status).toBe(error.statusCode);
  });

  it("can represent unknown status codes", () => {
    const error = mockFetchError("https://some.pod/resource", 1337);

    expect(error).toBeInstanceOf(Error);
    expect(error.statusText).toBeUndefined();
    expect(error.message).toBe(
      "Fetching the Resource at [https://some.pod/resource] failed: [1337] [undefined]."
    );
    expect(error.statusCode).toBe(1337);
    expect(error.response.status).toBe(error.statusCode);
  });
});
