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
import { getSession } from "./util/getSession";
import { config } from "dotenv-flow";
import {
  saveSolidDatasetAt,
  createSolidDataset,
  deleteSolidDataset,
  acp_v4 as acp,
  getSolidDataset,
} from "../index";
import {
  getTestingEnvironment,
  TestingEnvironment,
} from "./util/getTestingEnvironment";
import { getAccessControlUrlAll } from "../acp/accessControl/getAccessControlUrlAll";
import { getAgentAccess } from "../universal/getAgentAccess";
import { setAgentAccess } from "../universal/setAgentAccess";
import { getPublicAccess } from "../universal/getPublicAccess";
import { setPublicAccess } from "../universal/setPublicAccess";

let env: TestingEnvironment;

beforeAll(() => {
  config({
    path: __dirname,
    // Disable warning messages in CI
    silent: process.env.CI === "true",
  });
  env = getTestingEnvironment();
});

describe("An ACP Solid server", () => {
  let options: any;
  let session: Session;
  let sessionDataset: string;

  beforeEach(async () => {
    session = await getSession(env);
    sessionDataset = `${env.pod}acp-test-${session.info.sessionId}`;
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
    const resourceWithAcr = (await acp.getSolidDatasetWithAcr(sessionDataset, {
      fetch: session.fetch,
    })) as any;
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
    expect(await getAgentAccess(sessionDataset, agent, options)).toStrictEqual({
      read: true,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip("can get and set read access for the public", async () => {
    await expect(
      getSolidDataset(sessionDataset, { fetch: session.fetch })
    ).resolves.toEqual(expect.objectContaining({ graphs: { default: {} } }));

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

    // TODO: Find out why the unauthenticated fetch still fails after setting public access
    // Answer: Unauthenticated fetch is currently not supported in ESS 1.2
    await expect(getSolidDataset(sessionDataset)).resolves.toEqual(
      expect.objectContaining({ graphs: { default: {} } })
    );
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
    expect(await getAgentAccess(sessionDataset, agent, options)).toStrictEqual({
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
    expect(await getAgentAccess(sessionDataset, agent, options)).toStrictEqual({
      read: true,
      append: true,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });
});
