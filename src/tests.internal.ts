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

import { Response } from "@inrupt/universal-fetch";
import { jest } from "@jest/globals";

/**
 * This function is intended to be extracted into a shared package, as it is used
 * across multiple repositories. It receiving a callback allows the shared package
 * to have no dependency on jest, the need for peer dependencies and version alignment.
 */
const buildResponseMocker =
  (urlMock: (sourceUrl: string, response: Response) => void) =>
  (body?: BodyInit | null, init?: ResponseInit, sourceUrl?: string) => {
    const response = new Response(body, init);
    if (sourceUrl !== undefined) {
      urlMock(sourceUrl, response);
    }
    return response;
  };

/**
 * The `url` property of a Response is read-only, and using the default constructor
 * doesn't allow to set it. Our library requires `response.url` to be set in order
 * to track the resource's URL, so we use jest to mock this call.
 */
export const mockResponse = buildResponseMocker(
  (sourceUrl: string, response: Response) => {
    jest.spyOn(response, "url", "get").mockReturnValue(sourceUrl);
  }
);
