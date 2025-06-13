// Copyright Inrupt Inc.
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

import { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  testMatch: "*.playwright.ts",
  // Configure dotenv in local:
  globalSetup: "./e2e/browser/test/globalSetup.ts",
  retries: process.env.CI ? 3 : 1,
  // Extends from the default 30s
  timeout: 120000,
  use: {
    baseURL: "http://localhost:3000/",
    headless: true,
    screenshot: "only-on-failure",
    trace: "on",
    video: "on-first-retry",
  },
  webServer: {
    command: "cd ./e2e/browser/test-app/ && npm run dev",
    port: 3000,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "Firefox",
      use: {
        browserName: "firefox",
        userAgent: `Browser-based solid-client end-to-end tests running ${
          process.env.CI === "true" ? "in CI" : "locally"
        }. Mozilla/5.0 (X11; Linux x86_64; rv:10.0) Gecko/20100101 Firefox/10.0`,
      },
    },
    {
      name: "Chromium",
      use: {
        browserName: "chromium",
        userAgent: `Browser-based solid-client end-to-end tests running ${
          process.env.CI === "true" ? "in CI" : "locally"
        }. Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36`,
      },
    },
    // There are currently issues making the Webkit tests flaky on playwright, even using version 1.37.X.
    // {
    //   name: "WebKit",
    //   use: {
    //     browserName: "webkit",
    //     userAgent: `Browser-based solid-client end-to-end tests running ${
    //       process.env.CI === "true" ? "in CI" : "locally"
    //     }. Mozilla/5.0 (iPhone; CPU iPhone OS 13_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/604.1`,
    //   },
    // },
  ],
};

export default config;
