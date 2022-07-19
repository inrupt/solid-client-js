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

import { describe, it, expect } from "@jest/globals";
import { ACL, ACP } from "../constants";
import {
  DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
  DEFAULT_DOMAIN,
  TEST_URL,
} from "../mock/constants";
import { createDatasetFromSubjects } from "../mock/dataset";
import { mockAccessControlledResource } from "../mock/mockAccessControlledResource";
import { getAgentAccessAll } from "./getAgentAccessAll";

describe("getAgentAccessAll", () => {
  it("returns an empty object for an empty ACR", async () => {
    const resource = mockAccessControlledResource();

    expect(resource.internal_acp.acr.graphs).toStrictEqual({ default: {} });
    expect(await getAgentAccessAll(resource)).toStrictEqual({});
  });

  it("returns one allowed access modes an ACR with 1 policy", async () => {
    const resource = mockAccessControlledResource(
      createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [[ACP.accessControl, [DEFAULT_DOMAIN.concat("ac1")]]],
        ],
        [
          DEFAULT_DOMAIN.concat("ac1"),
          [[ACP.apply, [DEFAULT_DOMAIN.concat("p1")]]],
        ],
        [
          DEFAULT_DOMAIN.concat("p1"),
          [
            [ACP.anyOf, [DEFAULT_DOMAIN.concat("m1")]],
            [ACP.allow, [ACL.Read]],
          ],
        ],
        [
          DEFAULT_DOMAIN.concat("m1"),
          [[ACP.agent, [DEFAULT_DOMAIN.concat("bob")]]],
        ],
      ])
    );

    expect(await getAgentAccessAll(resource)).toStrictEqual({
      [DEFAULT_DOMAIN.concat("bob")]: {
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      },
    });
  });

  it("returns all access modes defined in multiple policies", async () => {
    const resource = mockAccessControlledResource(
      createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [[ACP.accessControl, [DEFAULT_DOMAIN.concat("ac1")]]],
        ],
        [
          DEFAULT_DOMAIN.concat("ac1"),
          [
            [ACP.apply, [DEFAULT_DOMAIN.concat("p1")]],
            [ACP.access, [DEFAULT_DOMAIN.concat("p2")]],
          ],
        ],
        [
          DEFAULT_DOMAIN.concat("p1"),
          [
            [ACP.anyOf, [DEFAULT_DOMAIN.concat("m1")]],
            [ACP.allow, [ACL.Read, ACL.Append, ACL.Write]],
          ],
        ],
        [
          DEFAULT_DOMAIN.concat("p2"),
          [
            [ACP.anyOf, [DEFAULT_DOMAIN.concat("m1")]],
            [ACP.allow, [ACL.Read, ACL.Write]],
          ],
        ],
        [
          DEFAULT_DOMAIN.concat("m1"),
          [[ACP.agent, [DEFAULT_DOMAIN.concat("bob")]]],
        ],
      ])
    );

    expect(await getAgentAccessAll(resource)).toStrictEqual({
      [DEFAULT_DOMAIN.concat("bob")]: {
        read: true,
        append: true,
        write: true,
        controlRead: true,
        controlWrite: true,
      },
    });
  });

  it("returns access modes when the same policy is used for ACR and Resource", async () => {
    const resource = mockAccessControlledResource(
      createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [[ACP.accessControl, [DEFAULT_DOMAIN.concat("ac1")]]],
        ],
        [
          DEFAULT_DOMAIN.concat("ac1"),
          [
            [ACP.apply, [DEFAULT_DOMAIN.concat("p1")]],
            [ACP.access, [DEFAULT_DOMAIN.concat("p1")]],
          ],
        ],
        [
          DEFAULT_DOMAIN.concat("p1"),
          [
            [ACP.anyOf, [DEFAULT_DOMAIN.concat("m1")]],
            [ACP.allow, [ACL.Read, ACL.Append, ACL.Write]],
          ],
        ],
        [
          DEFAULT_DOMAIN.concat("m1"),
          [[ACP.agent, [DEFAULT_DOMAIN.concat("bob")]]],
        ],
      ])
    );

    expect(await getAgentAccessAll(resource)).toStrictEqual({
      [DEFAULT_DOMAIN.concat("bob")]: {
        read: true,
        append: true,
        write: true,
        controlRead: true,
        controlWrite: true,
      },
    });
  });

  it("doesn't return access modes when the agent is not matched", async () => {
    const resource = mockAccessControlledResource(
      createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [[ACP.accessControl, [DEFAULT_DOMAIN.concat("ac1")]]],
        ],
        [
          DEFAULT_DOMAIN.concat("ac1"),
          [
            [ACP.apply, [DEFAULT_DOMAIN.concat("p1")]],
            [ACP.access, [DEFAULT_DOMAIN.concat("p2")]],
          ],
        ],
        [
          DEFAULT_DOMAIN.concat("p1"),
          [
            [ACP.anyOf, [DEFAULT_DOMAIN.concat("m1")]],
            [ACP.allow, [ACL.Read, ACL.Append, ACL.Write]],
          ],
        ],
        [
          DEFAULT_DOMAIN.concat("p2"),
          [
            [ACP.anyOf, [DEFAULT_DOMAIN.concat("m2")]],
            [ACP.allow, [ACL.Read, ACL.Append, ACL.Write]],
          ],
        ],
        [
          DEFAULT_DOMAIN.concat("m1"),
          [
            [
              ACP.agent,
              [DEFAULT_DOMAIN.concat("alice"), DEFAULT_DOMAIN.concat("bob")],
            ],
          ],
        ],
        [
          DEFAULT_DOMAIN.concat("m2"),
          [[ACP.agent, [DEFAULT_DOMAIN.concat("alice")]]],
        ],
      ])
    );

    expect(await getAgentAccessAll(resource)).toStrictEqual({
      [DEFAULT_DOMAIN.concat("alice")]: {
        read: true,
        append: true,
        write: true,
        controlRead: true,
        controlWrite: true,
      },
      [DEFAULT_DOMAIN.concat("bob")]: {
        read: true,
        append: true,
        write: true,
        controlRead: false,
        controlWrite: false,
      },
    });
  });

  it("returns access modes without the ones denied", async () => {
    const resource = mockAccessControlledResource(
      createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [[ACP.accessControl, [DEFAULT_DOMAIN.concat("ac1")]]],
        ],
        [
          DEFAULT_DOMAIN.concat("ac1"),
          [
            [
              ACP.apply,
              [DEFAULT_DOMAIN.concat("p1"), DEFAULT_DOMAIN.concat("p2")],
            ],
            [
              ACP.access,
              [DEFAULT_DOMAIN.concat("p3"), DEFAULT_DOMAIN.concat("p4")],
            ],
          ],
        ],
        [
          DEFAULT_DOMAIN.concat("p1"),
          [
            [ACP.anyOf, [DEFAULT_DOMAIN.concat("m1")]],
            [ACP.allow, [ACL.Read, ACL.Append, ACL.Write]],
          ],
        ],
        [
          DEFAULT_DOMAIN.concat("p2"),
          [
            [ACP.anyOf, [DEFAULT_DOMAIN.concat("m1")]],
            [ACP.deny, [ACL.Write]],
          ],
        ],
        [
          DEFAULT_DOMAIN.concat("p3"),
          [
            [ACP.anyOf, [DEFAULT_DOMAIN.concat("m1")]],
            [ACP.allow, [ACL.Read, ACL.Write]],
          ],
        ],
        [
          DEFAULT_DOMAIN.concat("p4"),
          [
            [ACP.anyOf, [DEFAULT_DOMAIN.concat("m1")]],
            [ACP.deny, [ACL.Read]],
          ],
        ],
        [
          DEFAULT_DOMAIN.concat("m1"),
          [[ACP.agent, [DEFAULT_DOMAIN.concat("bob")]]],
        ],
      ])
    );

    expect(await getAgentAccessAll(resource)).toStrictEqual({
      [DEFAULT_DOMAIN.concat("bob")]: {
        read: true,
        append: true,
        write: false,
        controlRead: false,
        controlWrite: true,
      },
    });
  });

  it("returns access modes only if all of matchers match", async () => {
    const resource = mockAccessControlledResource(
      createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [[ACP.accessControl, [DEFAULT_DOMAIN.concat("ac1")]]],
        ],
        [
          DEFAULT_DOMAIN.concat("ac1"),
          [
            [
              ACP.apply,
              [DEFAULT_DOMAIN.concat("p1"), DEFAULT_DOMAIN.concat("p2")],
            ],
          ],
        ],
        [
          DEFAULT_DOMAIN.concat("p1"),
          [
            [
              ACP.allOf,
              [DEFAULT_DOMAIN.concat("m1"), DEFAULT_DOMAIN.concat("m2")],
            ],
            [ACP.allow, [ACL.Read, ACL.Append, ACL.Write]],
          ],
        ],
        [
          DEFAULT_DOMAIN.concat("p2"),
          [
            [
              ACP.allOf,
              [DEFAULT_DOMAIN.concat("m1"), DEFAULT_DOMAIN.concat("m3")],
            ],
            [ACP.allow, [ACL.Write]],
          ],
        ],
        [
          DEFAULT_DOMAIN.concat("m1"),
          [[ACP.agent, [DEFAULT_DOMAIN.concat("bob")]]],
        ],
        [
          DEFAULT_DOMAIN.concat("m2"),
          [
            [
              ACP.agent,
              [DEFAULT_DOMAIN.concat("alice"), DEFAULT_DOMAIN.concat("latifa")],
            ],
          ],
        ],
        [
          DEFAULT_DOMAIN.concat("m3"),
          [
            [
              ACP.agent,
              [DEFAULT_DOMAIN.concat("malik"), DEFAULT_DOMAIN.concat("bob")],
            ],
          ],
        ],
      ])
    );

    expect(await getAgentAccessAll(resource)).toStrictEqual({
      [DEFAULT_DOMAIN.concat("bob")]: {
        read: false,
        append: false,
        write: true,
        controlRead: false,
        controlWrite: false,
      },
      [DEFAULT_DOMAIN.concat("malik")]: {
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      },
      [DEFAULT_DOMAIN.concat("alice")]: {
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      },
      [DEFAULT_DOMAIN.concat("latifa")]: {
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      },
    });
  });

  it("returns access modes only if any of matchers match", async () => {
    const resource = mockAccessControlledResource(
      createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [[ACP.accessControl, [DEFAULT_DOMAIN.concat("ac1")]]],
        ],
        [
          DEFAULT_DOMAIN.concat("ac1"),
          [[ACP.apply, [DEFAULT_DOMAIN.concat("p1")]]],
        ],
        [
          DEFAULT_DOMAIN.concat("p1"),
          [
            [
              ACP.anyOf,
              [DEFAULT_DOMAIN.concat("m1"), DEFAULT_DOMAIN.concat("m2")],
            ],
            [ACP.allow, [ACL.Read]],
          ],
        ],
        [
          DEFAULT_DOMAIN.concat("m1"),
          [[ACP.agent, [DEFAULT_DOMAIN.concat("jorge")]]],
        ],
        [
          DEFAULT_DOMAIN.concat("m2"),
          [
            [
              ACP.agent,
              [DEFAULT_DOMAIN.concat("latifa"), DEFAULT_DOMAIN.concat("bob")],
            ],
          ],
        ],
      ])
    );

    expect(await getAgentAccessAll(resource)).toStrictEqual({
      [DEFAULT_DOMAIN.concat("bob")]: {
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      },
      [DEFAULT_DOMAIN.concat("latifa")]: {
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      },
      [DEFAULT_DOMAIN.concat("jorge")]: {
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      },
    });
  });

  it("returns access modes only if none of matchers don't match", async () => {
    const resource = mockAccessControlledResource(
      createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [[ACP.accessControl, [DEFAULT_DOMAIN.concat("ac1")]]],
        ],
        [
          DEFAULT_DOMAIN.concat("ac1"),
          [[ACP.apply, [DEFAULT_DOMAIN.concat("p1")]]],
        ],
        [
          DEFAULT_DOMAIN.concat("p1"),
          [
            [ACP.anyOf, [DEFAULT_DOMAIN.concat("m2")]],
            [
              ACP.noneOf,
              [DEFAULT_DOMAIN.concat("m1"), DEFAULT_DOMAIN.concat("m3")],
            ],
            [ACP.allow, [ACL.Read]],
          ],
        ],
        [
          DEFAULT_DOMAIN.concat("m1"),
          [[ACP.agent, [DEFAULT_DOMAIN.concat("jorge")]]],
        ],
        [
          DEFAULT_DOMAIN.concat("m2"),
          [
            [
              ACP.agent,
              [DEFAULT_DOMAIN.concat("latifa"), DEFAULT_DOMAIN.concat("bob")],
            ],
          ],
        ],
        [
          DEFAULT_DOMAIN.concat("m3"),
          [
            [
              ACP.agent,
              [DEFAULT_DOMAIN.concat("malik"), DEFAULT_DOMAIN.concat("bob")],
            ],
          ],
        ],
      ])
    );

    expect(await getAgentAccessAll(resource)).toStrictEqual({
      [DEFAULT_DOMAIN.concat("jorge")]: {
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      },
      [DEFAULT_DOMAIN.concat("latifa")]: {
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      },
      [DEFAULT_DOMAIN.concat("bob")]: {
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      },
      [DEFAULT_DOMAIN.concat("malik")]: {
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      },
    });
  });

  it("doesn't match if there is only a noneOf matcher matching", async () => {
    const resource = mockAccessControlledResource(
      createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [[ACP.accessControl, [DEFAULT_DOMAIN.concat("ac1")]]],
        ],
        [
          DEFAULT_DOMAIN.concat("ac1"),
          [[ACP.apply, [DEFAULT_DOMAIN.concat("p1")]]],
        ],
        [
          DEFAULT_DOMAIN.concat("p1"),
          [
            [ACP.noneOf, [DEFAULT_DOMAIN.concat("m1")]],
            [ACP.allow, [ACL.Read]],
          ],
        ],
        [
          DEFAULT_DOMAIN.concat("m1"),
          [[ACP.agent, [DEFAULT_DOMAIN.concat("bob")]]],
        ],
      ])
    );

    expect(await getAgentAccessAll(resource)).toStrictEqual({
      [DEFAULT_DOMAIN.concat("bob")]: {
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      },
    });
  });

  it("doesn't match if there is no matchers", async () => {
    const resource = mockAccessControlledResource(
      createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [[ACP.accessControl, [DEFAULT_DOMAIN.concat("ac1")]]],
        ],
        [
          DEFAULT_DOMAIN.concat("ac1"),
          [[ACP.apply, [DEFAULT_DOMAIN.concat("p1")]]],
        ],
        [DEFAULT_DOMAIN.concat("p1"), [[ACP.allow, [ACL.Read]]]],
      ])
    );

    expect(await getAgentAccessAll(resource)).toStrictEqual({});
  });
});
