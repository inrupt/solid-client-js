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

/* eslint-disable jest/no-done-callback */

import { test, expect } from "@inrupt/internal-playwright-helpers";

test("creating and removing empty Containers", async ({ page, auth }) => {
  await auth.login({ allow: true });

  // The button is only shown once the app is ready.
  await page.waitForSelector("button[data-testid=createContainer]");

  // A root container should have been found.
  await expect(page.getByTestId("parentContainerUrl")).toContainText(
    /https:\/\//
  );
  // No child container should be available yet.
  await expect(page.getByTestId("childContainerUrl")).toContainText("None");

  await Promise.all([
    page.waitForRequest((request) => request.method() === "POST"),
    page.waitForResponse((response) => response.status() === 201),
    page.click("button[data-testid=createContainer]"),
  ]);

  // The delete button is only shown once the state has been updated after creation.
  await page.waitForSelector("button[data-testid=deleteContainer]");

  // The child container should have been created under the parent
  await expect(
    page.locator("span[data-testid=childContainerUrl]")
  ).toContainText(
    await page.locator("span[data-testid=childContainerUrl]").allInnerTexts()
  );

  await Promise.all([
    page.waitForRequest((request) => request.method() === "DELETE"),
    page.waitForResponse((response) => response.status() === 204),
    page.click("button[data-testid=deleteContainer]"),
  ]);

  await page.waitForSelector("button[data-testid=createContainer]");

  // The child container should have been deleted.
  await expect(
    page.locator("span[data-testid=childContainerUrl]")
  ).toContainText("None");
});
