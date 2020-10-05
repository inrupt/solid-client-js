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

import { describe, it, expect } from "@jest/globals";

import {
  createAccessControl,
  getAccessControl,
  getAccessControlAll,
  hasLinkedAcr,
  removeAccessControl,
  setAccessControl,
  WithLinkedAcpAccessControl,
} from "./control";
import { acp, rdf } from "../constants";
import { WithAccessibleAcl, WithResourceInfo } from "../interfaces";
import { getIri } from "../thing/get";
import { createSolidDataset } from "../resource/solidDataset";
import { createThing, getThing, setThing } from "../thing/thing";
import { mockAcrFor } from "./mock";
import { setUrl } from "../thing/set";

describe("hasLinkedAcr", () => {
  it("returns true if a Resource exposes a URL to an Access Control Resource", () => {
    const withLinkedAcr: WithLinkedAcpAccessControl = {
      internal_resourceInfo: {
        isRawData: false,
        sourceIri: "https://some.pod/resource",
        linkedResources: {
          [acp.accessControl]: ["https://some.pod/access-control-resource"],
        },
      },
    };

    expect(hasLinkedAcr(withLinkedAcr)).toBe(true);
  });

  it("returns false if a Resource is governed by Web-Access-Control", () => {
    const withLinkedAcr: WithAccessibleAcl = {
      internal_resourceInfo: {
        isRawData: false,
        sourceIri: "https://some.pod/resource",
        linkedResources: {
          acl: ["https://some.pod/access-control-resource"],
        },
        aclUrl: "https://some.pod/access-control-resource",
      },
    };

    expect(hasLinkedAcr(withLinkedAcr)).toBe(false);
  });

  it("returns false if a Resource does not expose anything Access Control-related", () => {
    const withLinkedAcr: WithResourceInfo = {
      internal_resourceInfo: {
        isRawData: false,
        sourceIri: "https://some.pod/resource",
        linkedResources: {},
      },
    };

    expect(hasLinkedAcr(withLinkedAcr)).toBe(false);
  });
});

describe("createAccessControl", () => {
  it("sets the type of the new Access Control to acp:AccessControl", () => {
    const newAccessControl = createAccessControl();

    expect(getIri(newAccessControl, rdf.type)).toBe(acp.AccessControl);
  });
});

describe("getAccessControl", () => {
  it("returns the Access Control if found", () => {
    const accessControlUrl =
      "https://some.pod/access-control-resource.ttl#access-control";
    const accessControl = setUrl(
      createThing({ url: accessControlUrl }),
      rdf.type,
      acp.AccessControl
    );
    const accessControlResource = setThing(
      mockAcrFor("https://some.pod/resource"),
      accessControl
    );

    const foundAccessControl = getAccessControl(
      accessControlResource,
      accessControlUrl
    );

    expect(foundAccessControl).toEqual(accessControl);
  });

  it("returns null if the specified Thing is not an Access Control", () => {
    const accessControlUrl =
      "https://some.pod/access-control-resource.ttl#access-control";
    const accessControl = createThing({ url: accessControlUrl });
    const accessControlResource = setThing(
      mockAcrFor("https://some.pod/resource"),
      accessControl
    );

    const foundAccessControl = getAccessControl(
      accessControlResource,
      accessControlUrl
    );

    expect(foundAccessControl).toBeNull();
  });

  it("returns null if the Access Control could not be found", () => {
    const accessControlUrl =
      "https://some.pod/access-control-resource.ttl#access-control";
    const accessControl = createThing({ url: accessControlUrl });
    const accessControlResource = setThing(
      mockAcrFor("https://some.pod/resource"),
      accessControl
    );

    const foundAccessControl = getAccessControl(
      accessControlResource,
      "https://some-other.pod/access-control-resource.ttl#access-control"
    );

    expect(foundAccessControl).toBeNull();
  });
});

describe("getAccessControlAll", () => {
  it("returns all included Access Controls", () => {
    const accessControl = setUrl(createThing(), rdf.type, acp.AccessControl);
    const accessControlResource = setThing(
      mockAcrFor("https://some.pod/resource"),
      accessControl
    );

    const foundAccessControls = getAccessControlAll(accessControlResource);

    expect(foundAccessControls).toEqual([accessControl]);
  });

  it("ignores Things that are not Access Controls", () => {
    const accessControl = setUrl(createThing(), rdf.type, acp.AccessControl);
    const notAnAccessControl = setUrl(
      createThing(),
      rdf.type,
      "https://some.vocab/not-access-control"
    );
    let accessControlResource = mockAcrFor("https://some.pod/resource");
    accessControlResource = setThing(accessControlResource, accessControl);
    accessControlResource = setThing(accessControlResource, notAnAccessControl);

    const foundAccessControls = getAccessControlAll(accessControlResource);

    expect(foundAccessControls).toEqual([accessControl]);
  });

  it("returns an empty array if no Access Controls could be found", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");

    const foundAccessControl = getAccessControlAll(accessControlResource);

    expect(foundAccessControl).toEqual([]);
  });
});

describe("setAccessControl", () => {
  it("adds the given Access Control to the given Access Control Resource", () => {
    const accessControlUrl =
      "https://some.pod/access-control-resource.ttl#access-control";
    const accessControl = setUrl(
      createThing({ url: accessControlUrl }),
      rdf.type,
      acp.AccessControl
    );
    const accessControlResource = mockAcrFor("https://some.pod/resource");

    const newAccessControlResource = setAccessControl(
      accessControlResource,
      accessControl
    );

    expect(getThing(newAccessControlResource, accessControlUrl)).toEqual(
      accessControl
    );
  });
});

describe("removeAccessControl", () => {
  it("removes the given Access Control from the given Access Control Resource", () => {
    const accessControlUrl =
      "https://some.pod/access-control-resource.ttl#access-control";
    const accessControl = setUrl(
      createThing({ url: accessControlUrl }),
      rdf.type,
      acp.AccessControl
    );
    const accessControlResource = setThing(
      mockAcrFor("https://some.pod/resource"),
      accessControl
    );

    const newAccessControlResource = removeAccessControl(
      accessControlResource,
      accessControl
    );

    expect(getThing(newAccessControlResource, accessControlUrl)).toBeNull();
  });
});
