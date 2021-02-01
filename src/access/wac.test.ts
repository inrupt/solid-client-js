/**
 * Copyright 2020 Inrupt Inc.
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

import { jest, describe, it } from "@jest/globals";
import { IriString, SolidDataset, WithServerResourceInfo } from "../interfaces";
import { dataset } from "../rdfjs";
import { getAgentAccess } from "./wac";
import { Response } from "cross-fetch";
import { triplesToTurtle } from "../formats/turtle";
import { mock_addAclRuleQuads } from "../acl/mock.internal";
import { acl, foaf } from "../constants";
import { setMockAclUrl } from "../acl/mock";

jest.mock("../fetcher.ts", () => ({
  fetch: jest.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(undefined, {
        headers: { Location: "https://arbitrary.pod/resource" },
      })
    )
  ),
}));

import { setAgentResourceAccess } from "../acl/agent";
import { AclDataset } from "../acl/acl";
import { mockSolidDatasetFrom } from "../resource/mock";

function getMockDataset(
  sourceIri: IriString,
  aclIri?: IriString
): SolidDataset & WithServerResourceInfo {
  const result = mockSolidDatasetFrom(sourceIri);
  if (aclIri === undefined) {
    return result;
  }
  return setMockAclUrl(result, aclIri);
}

function mockResponse(
  body?: BodyInit | null,
  init?: ResponseInit & { url: string }
): Response {
  return new Response(body, init);
}

describe("getAgentAccess", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    const resource = getMockDataset(
      "https://some.pod/resource",
      "https://some.pod/resource.acl"
    );
    await getAgentAccess(resource, "https://some.pod/profile#agent");

    expect(mockedFetcher.fetch.mock.calls[0][0]).toEqual(
      "https://some.pod/resource.acl"
    );
  });

  it("returns null if no ACL is accessible", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      // No resource ACL available...
      .mockResolvedValueOnce(
        mockResponse("", {
          status: 404,
          url: "https://some.pod/resource.acl",
        })
      )
      // Link to the fallback ACL...
      .mockResolvedValueOnce(
        mockResponse("", {
          status: 200,
          url: "https://some.pod/",
          headers: {
            Link: '<.acl>; rel="acl"',
          },
        })
      )
      // Get the fallback ACL
      .mockResolvedValueOnce(
        mockResponse("", {
          status: 404,
          url: "https://some.pod/.acl",
        })
      );

    const resource = getMockDataset(
      "https://some.pod/resource",
      "https://some.pod/resource.acl"
    );
    const result = getAgentAccess(resource, "https://some.pod/profile#agent", {
      fetch: mockFetch,
    });

    await expect(result).resolves.toBeNull();
  });

  it("returns null if no ACL is advertised by the target resource", async () => {
    const mockFetch = jest.fn(window.fetch).mockResolvedValue(
      mockResponse("ACL not found", {
        status: 404,
        url: "https://some.pod/resource.acl",
      })
    );

    const resource = getMockDataset("https://some.pod/resource");
    const result = getAgentAccess(resource, "https://some.pod/profile#agent", {
      fetch: mockFetch,
    });

    await expect(result).resolves.toBeNull();
  });

  it("fetches the resource ACL if available", async () => {
    const aclResource = mock_addAclRuleQuads(
      getMockDataset("https://some.pod/resource.acl"),
      "https://some.pod/profile#agent",
      "https://some.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );

    const mockFetch = jest.fn(window.fetch).mockResolvedValue(
      mockResponse(await triplesToTurtle(Array.from(aclResource)), {
        status: 200,
        url: "https://some.pod/resource.acl",
      })
    );

    const resource = getMockDataset(
      "https://some.pod/resource",
      "https://some.pod/resource.acl"
    );
    const result = getAgentAccess(resource, "https://some.pod/profile#agent", {
      fetch: mockFetch,
    });

    await expect(result).resolves.toStrictEqual({
      read: true,
      append: undefined,
      write: undefined,
      controlRead: undefined,
      controlWrite: undefined,
    });
  });

  it("fetches the fallback ACL if no resource ACL is available", async () => {
    const aclResource = mock_addAclRuleQuads(
      getMockDataset("https://some.pod/.acl"),
      "https://some.pod/profile#agent",
      "https://some.pod/",
      { read: true, append: false, write: false, control: false },
      "default"
    );

    const mockFetch = jest
      .fn(window.fetch)
      // No resource ACL available...
      .mockResolvedValueOnce(
        mockResponse("", {
          status: 404,
          url: "https://some.pod/resource.acl",
        })
      )
      // Link to the fallback ACL...
      .mockResolvedValueOnce(
        mockResponse("", {
          status: 200,
          url: "https://some.pod/",
          headers: {
            Link: '<.acl>; rel="acl"',
          },
        })
      )
      // Get the fallback ACL
      .mockResolvedValueOnce(
        mockResponse(await triplesToTurtle(Array.from(aclResource)), {
          status: 200,
          url: "https://some.pod/.acl",
        })
      );

    const resource = getMockDataset(
      "https://some.pod/resource",
      "https://some.pod/resource.acl"
    );
    const result = getAgentAccess(resource, "https://some.pod/profile#agent", {
      fetch: mockFetch,
    });
    await expect(result).resolves.toStrictEqual({
      read: true,
      append: undefined,
      write: undefined,
      controlRead: undefined,
      controlWrite: undefined,
    });
  });

  it("ignores the fallback ACL if the resource ACL is available", async () => {
    const fallbackAclResource = mock_addAclRuleQuads(
      getMockDataset("https://some.pod/.acl"),
      "https://some.pod/profile#agent",
      "https://some.pod/",
      { read: false, append: true, write: false, control: false },
      "default"
    );

    const aclResource = mock_addAclRuleQuads(
      getMockDataset("https://some.pod/resource.acl"),
      "https://some.pod/profile#agent",
      "https://some.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );

    const mockFetch = jest
      .fn(window.fetch)
      // The resource ACL is available...
      .mockResolvedValueOnce(
        mockResponse(await triplesToTurtle(Array.from(aclResource)), {
          status: 200,
          url: "https://some.pod/resource.acl",
        })
      )
      // Link to the fallback ACL...
      .mockResolvedValueOnce(
        mockResponse("", {
          status: 200,
          url: "https://some.pod/",
          headers: {
            Link: '<.acl>; rel="acl"',
          },
        })
      )
      // Get the fallback ACL
      .mockResolvedValueOnce(
        mockResponse(await triplesToTurtle(Array.from(fallbackAclResource)), {
          status: 200,
          url: "https://some.pod/.acl",
        })
      );

    const resource = getMockDataset(
      "https://some.pod/resource",
      "https://some.pod/resource.acl"
    );
    const result = getAgentAccess(resource, "https://some.pod/profile#agent", {
      fetch: mockFetch,
    });
    await expect(result).resolves.toStrictEqual({
      append: undefined,
      read: true,
      write: undefined,
      controlRead: undefined,
      controlWrite: undefined,
    });
  });

  it("returns true for both controlRead and controlWrite if the Agent has control access", async () => {
    const aclResource = mock_addAclRuleQuads(
      getMockDataset("https://some.pod/resource.acl"),
      "https://some.pod/profile#agent",
      "https://some.pod/resource",
      { read: false, append: false, write: false, control: true },
      "resource"
    );

    const mockFetch = jest.fn(window.fetch).mockResolvedValue(
      mockResponse(await triplesToTurtle(Array.from(aclResource)), {
        status: 200,
        url: "https://some.pod/resource.acl",
      })
    );

    const resource = getMockDataset(
      "https://some.pod/resource",
      "https://some.pod/resource.acl"
    );
    const result = getAgentAccess(resource, "https://some.pod/profile#agent", {
      fetch: mockFetch,
    });

    await expect(result).resolves.toStrictEqual({
      read: undefined,
      append: undefined,
      write: undefined,
      controlRead: true,
      controlWrite: true,
    });
  });

  it("correctly reads the Agent append access", async () => {
    const aclResource = mock_addAclRuleQuads(
      getMockDataset("https://some.pod/resource.acl"),
      "https://some.pod/profile#agent",
      "https://some.pod/resource",
      { read: false, append: true, write: false, control: false },
      "resource"
    );

    const mockFetch = jest.fn(window.fetch).mockResolvedValue(
      mockResponse(await triplesToTurtle(Array.from(aclResource)), {
        status: 200,
        url: "https://some.pod/resource.acl",
      })
    );

    const resource = getMockDataset(
      "https://some.pod/resource",
      "https://some.pod/resource.acl"
    );
    const result = getAgentAccess(resource, "https://some.pod/profile#agent", {
      fetch: mockFetch,
    });

    await expect(result).resolves.toStrictEqual({
      read: undefined,
      append: true,
      write: undefined,
      controlRead: undefined,
      controlWrite: undefined,
    });
  });

  it("correctly reads the Agent write access, which implies append", async () => {
    const aclResource = mock_addAclRuleQuads(
      getMockDataset("https://some.pod/resource.acl"),
      "https://some.pod/profile#agent",
      "https://some.pod/resource",
      { read: false, append: false, write: true, control: false },
      "resource"
    );

    const mockFetch = jest.fn(window.fetch).mockResolvedValue(
      mockResponse(await triplesToTurtle(Array.from(aclResource)), {
        status: 200,
        url: "https://some.pod/resource.acl",
      })
    );

    const resource = getMockDataset(
      "https://some.pod/resource",
      "https://some.pod/resource.acl"
    );
    const result = getAgentAccess(resource, "https://some.pod/profile#agent", {
      fetch: mockFetch,
    });

    await expect(result).resolves.toStrictEqual({
      read: undefined,
      append: true,
      write: true,
      controlRead: undefined,
      controlWrite: undefined,
    });
  });

  it("returns undefined for all modes the Agent isn't present", async () => {
    const aclResource = mock_addAclRuleQuads(
      getMockDataset("https://some.pod/resource.acl"),
      "https://some.pod/profile#another-agent",
      "https://some.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );

    const mockFetch = jest.fn(window.fetch).mockResolvedValue(
      mockResponse(await triplesToTurtle(Array.from(aclResource)), {
        status: 200,
        url: "https://some.pod/resource.acl",
      })
    );

    const resource = getMockDataset(
      "https://some.pod/resource",
      "https://some.pod/resource.acl"
    );
    const result = getAgentAccess(resource, "https://some.pod/profile#agent", {
      fetch: mockFetch,
    });

    await expect(result).resolves.toStrictEqual({
      read: undefined,
      append: undefined,
      write: undefined,
      controlRead: undefined,
      controlWrite: undefined,
    });
  });

  it("does not return access for groups", async () => {
    const aclResource = mock_addAclRuleQuads(
      getMockDataset("https://some.pod/resource.acl"),
      "https://some.pod/profile#agent",
      "https://some.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource",
      "https://some.pod/resource.acl#some-rule",
      acl.agentGroup
    );

    const mockFetch = jest.fn(window.fetch).mockResolvedValue(
      mockResponse(await triplesToTurtle(Array.from(aclResource)), {
        status: 200,
        url: "https://some.pod/resource.acl",
      })
    );

    const resource = getMockDataset(
      "https://some.pod/resource",
      "https://some.pod/resource.acl"
    );
    const result = getAgentAccess(resource, "https://some.pod/profile#agent", {
      fetch: mockFetch,
    });

    await expect(result).resolves.toStrictEqual({
      read: undefined,
      append: undefined,
      write: undefined,
      controlRead: undefined,
      controlWrite: undefined,
    });
  });

  it("does not return access for everyone", async () => {
    const aclResource = mock_addAclRuleQuads(
      getMockDataset("https://some.pod/resource.acl"),
      foaf.Agent,
      "https://some.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource",
      "https://some.pod/resource.acl#some-rule",
      acl.agentClass
    );

    const mockFetch = jest.fn(window.fetch).mockResolvedValue(
      mockResponse(await triplesToTurtle(Array.from(aclResource)), {
        status: 200,
        url: "https://some.pod/resource.acl",
      })
    );

    const resource = getMockDataset(
      "https://some.pod/resource",
      "https://some.pod/resource.acl"
    );
    const result = getAgentAccess(resource, "https://some.pod/profile#agent", {
      fetch: mockFetch,
    });

    await expect(result).resolves.toStrictEqual({
      read: undefined,
      append: undefined,
      write: undefined,
      controlRead: undefined,
      controlWrite: undefined,
    });
  });

  it("does not return access for authenticated agents", async () => {
    const aclResource = mock_addAclRuleQuads(
      getMockDataset("https://some.pod/resource.acl"),
      acl.AuthenticatedAgent,
      "https://some.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource",
      "https://some.pod/resource.acl#some-rule",
      acl.agentClass
    );

    const mockFetch = jest.fn(window.fetch).mockResolvedValue(
      mockResponse(await triplesToTurtle(Array.from(aclResource)), {
        status: 200,
        url: "https://some.pod/resource.acl",
      })
    );

    const resource = getMockDataset(
      "https://some.pod/resource",
      "https://some.pod/resource.acl"
    );
    const result = getAgentAccess(resource, "https://some.pod/profile#agent", {
      fetch: mockFetch,
    });

    await expect(result).resolves.toStrictEqual({
      read: undefined,
      append: undefined,
      write: undefined,
      controlRead: undefined,
      controlWrite: undefined,
    });
  });
});
