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

export interface TestingEnvironment {
  environment: "Inrupt Dev-Next" | "Inrupt Production" | "Inrupt 1.1" | "NSS";
  idp: string;
  pod: string;
}

export interface NodeTestingEnvironment extends TestingEnvironment {
  clientId: string;
  clientSecret: string;
  feature: {
    acp: boolean;
    acp_v3: boolean;
    wac: boolean;
  };
}

export interface BrowserTestingEnvironment extends TestingEnvironment {
  username: string;
  password: string;
}

function checkEnvVars(...keys: string[]) {
  const missing = keys.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Environment variable${
        missing.length > 1 ? "s" : ""
      } missing: ${missing.join(" ")}`
    );
  }
}

function getTestingEnvironment(): TestingEnvironment {
  if (
    process.env.E2E_TEST_ENVIRONMENT !== "Inrupt Dev-Next" &&
    process.env.E2E_TEST_ENVIRONMENT !== "Inrupt Production" &&
    process.env.E2E_TEST_ENVIRONMENT !== "Inrupt 1.1" &&
    process.env.E2E_TEST_ENVIRONMENT !== "NSS"
  ) {
    throw new Error(`Unknown environment: ${process.env.E2E_TEST_ENVIRONMENT}`);
  }

  checkEnvVars("E2E_TEST_POD", "E2E_TEST_IDP");

  return {
    environment: process.env.E2E_TEST_ENVIRONMENT!,
    idp: process.env.E2E_TEST_IDP!,
    pod: process.env.E2E_TEST_POD!,
  };
}

export function getBrowserTestingEnvironment(): BrowserTestingEnvironment {
  const baseEnv = getTestingEnvironment();

  checkEnvVars("E2E_TEST_USER", "E2E_TEST_PASSWORD");

  return {
    ...baseEnv,
    username: process.env.E2E_TEST_USER!,
    password: process.env.E2E_TEST_PASSWORD!,
  };
}

export function getNodeTestingEnvironment(): NodeTestingEnvironment {
  const baseEnv = getTestingEnvironment();

  checkEnvVars("E2E_TEST_CLIENT_ID", "E2E_TEST_CLIENT_SECRET");

  return {
    ...baseEnv,
    clientId: process.env.E2E_TEST_CLIENT_ID!,
    clientSecret: process.env.E2E_TEST_CLIENT_SECRET!,
    feature: {
      acp: process.env.E2E_TEST_FEATURE_ACP === "true" ? true : false,
      acp_v3: process.env.E2E_TEST_FEATURE_ACP_V3 === "true" ? true : false,
      wac: process.env.E2E_TEST_FEATURE_WAC === "true" ? true : false,
    },
  };
}
