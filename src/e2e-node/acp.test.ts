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

import {
  jest,
  beforeAll,
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
} from "@jest/globals";

import { Session } from "@inrupt/solid-client-authn-node";
import { config } from "dotenv-flow";
import {
  saveSolidDatasetAt,
  createSolidDataset,
  deleteSolidDataset,
  acp_v4 as acp,
  getSolidDataset,
} from "../index";
import { getAccessControlUrlAll } from "../acp/accessControl/getAccessControlUrlAll";
import { getAgentAccess } from "../universal/getAgentAccess";
import { setAgentAccess } from "../universal/setAgentAccess";
import { getPublicAccess } from "../universal/getPublicAccess";
import { setPublicAccess } from "../universal/setPublicAccess";

// Load environment variables from .env.test.local if available:
config({
  path: __dirname,
  // In CI, actual environment variables will overwrite values from .env files.
  // We don't need warning messages in the logs for that:
  silent: process.env.CI === "true",
});

type OidcIssuer = string;
type ClientId = string;
type ClientSecret = string;
type Pod = string;
type AuthDetails = [Pod, OidcIssuer, ClientId, ClientSecret];

// Instructions for obtaining these credentials can be found here:
// https://github.com/inrupt/solid-client-authn-js/blob/1a97ef79057941d8ac4dc328fff18333eaaeb5d1/packages/node/example/bootstrappedApp/README.md
const serversUnderTest: AuthDetails[] = [
  // pod.inrupt.com:
  // FIXME: Currently, pod.inrupt.com is based on a legacy ACP spec. When it is upgraded
  // to the latest spec, uncomment the following.
  // [
  //   // Cumbersome workaround, but:
  //   // Trim `https://` from the start of these URLs,
  //   // so that GitHub Actions doesn't replace them with *** in the logs.
  //   process.env.E2E_TEST_ESS_POD!.replace(/^https:\/\//, ""),
  //   process.env.E2E_TEST_ESS_IDP_URL!.replace(/^https:\/\//, ""),
  //   process.env.E2E_TEST_ESS_CLIENT_ID!,
  //   process.env.E2E_TEST_ESS_CLIENT_SECRET!,
  // ],
  // dev-next.inrupt.com:
  [
    // Cumbersome workaround, but:
    // Trim `https://` from the start of these URLs,
    // so that GitHub Actions doesn't replace them with *** in the logs.
    process.env.E2E_TEST_DEV_NEXT_POD!.replace(/^https:\/\//, ""),
    process.env.E2E_TEST_DEV_NEXT_IDP_URL!.replace(/^https:\/\//, ""),
    process.env.E2E_TEST_DEV_NEXT_CLIENT_ID!,
    process.env.E2E_TEST_DEV_NEXT_CLIENT_SECRET!,
  ],
  // inrupt.net
  // Unfortunately we cannot authenticate against Node Solid Server yet, due to this issue:
  // https://github.com/solid/node-solid-server/issues/1533
  // Once that is fixed, credentials can be added here, and the other `describe()` can be removed.
];

// End-to-end tests against ESS are temporarily disabled while we work out
// how to authenticate against it now that refresh tokens are rotated after
// every request:
// eslint-disable-next-line jest/no-disabled-tests
describe.each(serversUnderTest)(
  "ACP end-to-end tests against Pod [%s] and OIDC Issuer [%s]:",
  (rootContainer, oidcIssuer, clientId, clientSecret) => {
    // Re-add `https://` at the start of these URLs, which we trimmed above
    // so that GitHub Actions doesn't replace them with *** in the logs.
    rootContainer = "https://" + rootContainer;
    oidcIssuer = "https://" + oidcIssuer;

    describe("An ACP Solid server", () => {
      let options: any;
      let session: Session;
      let sessionDataset: string;

      beforeEach(async () => {
        session = new Session();
        await session.login({
          oidcIssuer,
          clientId,
          clientName: "Solid Client End-2-End Test Client App - Node.js",
          clientSecret,
        });
        sessionDataset = new URL(
          `acp-test-${session.info.sessionId}`,
          rootContainer
        ).href;
        options = { fetch: session.fetch };
        await saveSolidDatasetAt(sessionDataset, createSolidDataset(), options);
      });

      afterEach(async () => {
        await deleteSolidDataset(sessionDataset, options);
        await session.logout();
      });

      it("advertises its ACLs as ACP AccessControlResources", async () => {
        expect(await acp.isAcpControlled(sessionDataset, options)).toBe(true);
      });

      it("can read ACP access controls", async () => {
        const resourceWithAcr = (await acp.getSolidDatasetWithAcr(
          sessionDataset,
          {
            fetch: session.fetch,
          }
        )) as any;
        expect(resourceWithAcr).toBeDefined();
        const accessControlUrlArray = getAccessControlUrlAll(resourceWithAcr);
        expect(accessControlUrlArray).toHaveLength(1);
      });

      // TODO: re-enable once there is support for external access controls.
      // eslint-disable-next-line jest/no-disabled-tests
      it.skip("understands an Access Control Resource's default agent access", async () => {
        expect(
          await getAgentAccess(sessionDataset, session.info.webId!, options)
        ).toEqual({
          read: true,
          append: false,
          write: true,
          controlRead: false,
          controlWrite: false,
        });
      });

      it("can get and set read access for an agent", async () => {
        const agent = "https://example.org/bob";
        const agentAccess = await setAgentAccess(
          sessionDataset,
          agent,
          { read: true },
          { fetch: session.fetch }
        );
        expect(agentAccess).toStrictEqual({
          read: true,
          append: false,
          write: false,
          controlRead: false,
          controlWrite: false,
        });
        expect(
          await getAgentAccess(sessionDataset, agent, options)
        ).toStrictEqual({
          read: true,
          append: false,
          write: false,
          controlRead: false,
          controlWrite: false,
        });
      });

      it("can get and set read access for the public", async () => {
        await expect(
          getSolidDataset(sessionDataset, { fetch: session.fetch })
        ).resolves.toEqual(
          expect.objectContaining({ graphs: { default: {} } })
        );

        await expect(getSolidDataset(sessionDataset)).rejects.toThrow();

        const access = await setPublicAccess(
          sessionDataset,
          { read: true },
          { fetch: session.fetch }
        );

        expect(access).toStrictEqual({
          read: true,
          append: false,
          write: false,
          controlRead: false,
          controlWrite: false,
        });

        expect(await getPublicAccess(sessionDataset, options)).toStrictEqual({
          read: true,
          append: false,
          write: false,
          controlRead: false,
          controlWrite: false,
        });

        await expect(getSolidDataset(sessionDataset)).resolves.not.toThrow();
      });

      it("can get and set full access for an agent", async () => {
        const agent = "https://example.org/alice";
        const agentAccess = await setAgentAccess(
          sessionDataset,
          agent,
          {
            read: true,
            append: true,
            write: true,
            controlRead: true,
            controlWrite: true,
          },
          { fetch: session.fetch }
        );
        expect(agentAccess).toStrictEqual({
          read: true,
          append: true,
          write: true,
          controlRead: true,
          controlWrite: true,
        });
        expect(
          await getAgentAccess(sessionDataset, agent, options)
        ).toStrictEqual({
          read: true,
          append: true,
          write: true,
          controlRead: true,
          controlWrite: true,
        });
      });

      it("can remove access for an agent", async () => {
        const agent = "https://example.org/malika";
        const agentAccess = await setAgentAccess(
          sessionDataset,
          agent,
          {
            read: true,
            append: true,
            write: true,
            controlRead: true,
            controlWrite: true,
          },
          { fetch: session.fetch }
        );
        const removedAgentAccess = await setAgentAccess(
          sessionDataset,
          agent,
          {
            read: true,
            append: true,
            write: false,
            controlRead: false,
            controlWrite: false,
          },
          { fetch: session.fetch }
        );
        expect(removedAgentAccess).toStrictEqual({
          read: true,
          append: true,
          write: false,
          controlRead: false,
          controlWrite: false,
        });
        expect(
          await getAgentAccess(sessionDataset, agent, options)
        ).toStrictEqual({
          read: true,
          append: true,
          write: false,
          controlRead: false,
          controlWrite: false,
        });
      });
    });
  }
);
