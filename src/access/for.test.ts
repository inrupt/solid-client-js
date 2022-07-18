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

import { jest, describe, it, expect } from "@jest/globals";
import { Access } from "./universal";
import { getAccessFor, getAccessForAll, setAccessFor } from "./for";

jest.mock("./universal");

describe("getAccessFor", () => {
  it("calls to getAgentAccess with the appropriate parameters", async () => {
    const universalModule = jest.requireMock("./universal") as {
      getAgentAccess: () => Promise<Access | null>;
    };
    const options = {
      fetch: jest.fn() as typeof fetch,
    };
    await getAccessFor(
      "https://some.resource",
      "agent",
      "https://some.pod/profile#webid",
      options
    );
    expect(universalModule.getAgentAccess).toHaveBeenCalledWith(
      "https://some.resource",
      "https://some.pod/profile#webid",
      options
    );
  });

  it("throws if the agent has been omitted", async () => {
    const options = {
      fetch: jest.fn() as typeof fetch,
    };
    await expect(
      getAccessFor(
        "https://some.resource",
        "agent" as unknown as "public",
        options
      )
    ).rejects.toThrow(
      "When reading Agent-specific access, the given agent cannot be left undefined."
    );
  });

  it("calls to getGroupAccess with the appropriate parameters", async () => {
    const universalModule = jest.requireMock("./universal") as {
      getGroupAccess: () => Promise<Access | null>;
    };
    const options = {
      fetch: jest.fn() as typeof fetch,
    };
    await getAccessFor(
      "https://some.resource",
      "group",
      "https://some.pod/groups#group",
      options
    );
    expect(universalModule.getGroupAccess).toHaveBeenCalledWith(
      "https://some.resource",
      "https://some.pod/groups#group",
      options
    );
  });

  it("throws if the group has been omitted", async () => {
    await expect(
      getAccessFor("https://some.resource", "group" as unknown as "public")
    ).rejects.toThrow(
      "When reading Group-specific access, the given group cannot be left undefined."
    );
  });

  it("throws if an actor is specified for public", async () => {
    await expect(
      getAccessFor(
        "https://some.resource",
        "public",
        "some actor" as unknown as { fetch: typeof fetch }
      )
    ).rejects.toThrow(
      "When reading public access, no actor type should be specified (here [some actor])."
    );
  });

  it("calls to getPublicAccess with the appropriate parameters", async () => {
    const universalModule = jest.requireMock("./universal") as {
      getPublicAccess: () => Promise<Access | null>;
    };

    const options = {
      fetch: jest.fn() as typeof fetch,
    };
    await getAccessFor("https://some.resource", "public", options);
    expect(universalModule.getPublicAccess).toHaveBeenCalledWith(
      "https://some.resource",
      options
    );
  });

  it("returns null if an unknown actor type is given", async () => {
    await expect(
      getAccessFor(
        "https://some.resource",
        "unknown-actor" as unknown as "public"
      )
    ).resolves.toBeNull();
  });
});

describe("getAccessForAll", () => {
  it("calls getAgentAccessAll with the correct parameters", async () => {
    const universalModule = jest.requireMock("./universal") as {
      getAgentAccessAll: () => Promise<Access | null>;
    };
    const options = {
      fetch: jest.fn() as typeof fetch,
    };
    await getAccessForAll("https://some.resource", "agent", options);
    expect(universalModule.getAgentAccessAll).toHaveBeenCalledWith(
      "https://some.resource",
      options
    );
  });

  it("calls getGroupAccessAll with the correct parameters", async () => {
    const universalModule = jest.requireMock("./universal") as {
      getGroupAccessAll: () => Promise<Access | null>;
    };
    const options = {
      fetch: jest.fn() as typeof fetch,
    };
    await getAccessForAll("https://some.resource", "group", options);
    expect(universalModule.getGroupAccessAll).toHaveBeenCalledWith(
      "https://some.resource",
      options
    );
  });

  it("returns null for unknown actor types", async () => {
    await expect(
      getAccessForAll(
        "https://some.resource",
        "some actor" as unknown as "agent"
      )
    ).resolves.toBeNull();
  });
});

describe("setAccessFor", () => {
  it("calls to setAgentAccess with the appropriate parameters", async () => {
    const universalModule = jest.requireMock("./universal") as {
      setAgentAccess: () => Promise<Access | null>;
    };
    const options = {
      fetch: jest.fn() as typeof fetch,
    };
    await setAccessFor(
      "https://some.resource",
      "agent",
      {
        read: true,
      },
      "https://some.pod/profile#webid",
      options
    );
    expect(universalModule.setAgentAccess).toHaveBeenCalledWith(
      "https://some.resource",
      "https://some.pod/profile#webid",
      {
        read: true,
      },
      options
    );
  });

  it("throws if the agent is missing", async () => {
    await expect(
      setAccessFor("https://some.resource", "agent" as unknown as "public", {
        read: true,
      })
    ).rejects.toThrow(
      "When writing Agent-specific access, the given agent cannot be left undefined."
    );
  });

  it("calls to getGroupAccess with the appropriate parameters", async () => {
    const universalModule = jest.requireMock("./universal") as {
      setGroupAccess: () => Promise<Access | null>;
    };
    const options = {
      fetch: jest.fn() as typeof fetch,
    };
    await setAccessFor(
      "https://some.resource",
      "group",
      {
        read: true,
      },
      "https://some.pod/groups#group",
      options
    );
    expect(universalModule.setGroupAccess).toHaveBeenCalledWith(
      "https://some.resource",
      "https://some.pod/groups#group",
      {
        read: true,
      },
      options
    );
  });

  it("throws if the group is missing", async () => {
    await expect(
      setAccessFor("https://some.resource", "group" as unknown as "public", {
        read: true,
      })
    ).rejects.toThrow(
      "When writing Group-specific access, the given group cannot be left undefined."
    );
  });

  it("throws if an actor is specified for public", async () => {
    await expect(
      setAccessFor(
        "https://some.resource",
        "public",
        {
          read: true,
        },
        "some actor" as unknown as { fetch: typeof fetch }
      )
    ).rejects.toThrow(
      "When writing public access, no actor type should be specified (here [some actor])."
    );
  });

  it("calls to getPublicAccess with the appropriate parameters", async () => {
    const universalModule = jest.requireMock("./universal") as {
      setPublicAccess: () => Promise<Access | null>;
    };

    const options = {
      fetch: jest.fn() as typeof fetch,
    };
    await setAccessFor(
      "https://some.resource",
      "public",
      {
        read: true,
      },
      options
    );
    expect(universalModule.setPublicAccess).toHaveBeenCalledWith(
      "https://some.resource",
      {
        read: true,
      },
      options
    );
  });

  it("returns null if an unknown actor type is given", async () => {
    await expect(
      setAccessFor(
        "https://some.resource",
        "unknown-actor" as unknown as "public",
        {
          read: true,
        }
      )
    ).resolves.toBeNull();
  });
});
