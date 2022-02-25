/**
 * Copyright 2022 Inrupt Inc.
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

/* eslint-disable jest/no-done-callback */

import { test, expect } from "@playwright/test";

// We re-use the test helpers from elsewhere, but we need to ignore the
// TypeScript error (TS6059) that complains about not all files being under the
// one 'rootDir'.
// @ts-ignore
import type { getHelpers } from "../../.codesandbox/sandbox/src/end-to-end-test-helpers";
import { getBrowserTestingEnvironment } from "../util/getTestingEnvironment";
import { essUserLogin } from "./roles";

// E2eHelpers is a global defined in .codesandbox/sandbox/src/end-to-end-helper.
// Since code inside of page.evaluate is executed in that context in the browser,
// that variable is available to it - but as far as TypeScript is concerned,
// it is executed in the context of this test file.
// Hence, we just declare this variable to be of the same type here.
const E2eHelpers: ReturnType<typeof getHelpers> = {} as any;

test("creating and removing empty Containers", async ({ page, baseURL }) => {
  const env = getBrowserTestingEnvironment();

  await page.goto(baseURL);
  await essUserLogin(page, env);

  const createContainer = () =>
    page.evaluate(() => E2eHelpers.createContainer());
  const deleteContainer = () =>
    page.evaluate(() => E2eHelpers.deleteContainer());

  const createdContainer = await createContainer();
  expect(createdContainer).not.toBeNull();
  expect(createdContainer).toEqual(expect.objectContaining({}));
  await deleteContainer();
});
