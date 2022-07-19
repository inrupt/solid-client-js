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

import { it, describe, expect } from "@jest/globals";
import { rdf } from "../../constants";
import { ACL, ACP, VC_ACCESS_GRANT } from "../constants";
import {
  DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
  TEST_URL,
} from "../mock/constants";
import { createDatasetFromSubjects } from "../mock/dataset";
import { mockAccessControlledResource } from "../mock/mockAccessControlledResource";
import { setVcAccess } from "./setVcAccess";

describe("setVcAccess", () => {
  it("should not modify the input resource", () => {
    const resource = mockAccessControlledResource();
    const updatedResource = setVcAccess(resource, { read: true });
    expect(updatedResource).not.toBe(resource);
  });

  it("should set the given access mode for the VC policy", () => {
    const resource = mockAccessControlledResource();

    expect(resource.internal_acp.acr.graphs).toStrictEqual({ default: {} });
    const updatedResource = setVcAccess(resource, { read: true });
    expect(updatedResource.internal_acp.acr.graphs.default).toStrictEqual(
      createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [[ACP.accessControl, [TEST_URL.defaultAccessControl]]],
        ],
        [
          TEST_URL.defaultAccessControl,
          [[ACP.apply, [TEST_URL.defaultAccessControlVcPolicy]]],
        ],
        [
          TEST_URL.defaultAccessControlVcPolicy,
          [
            [rdf.type, [ACP.Policy]],
            [ACP.anyOf, [TEST_URL.defaultAccessControlVcMatcher]],
            [ACP.allow, [ACL.Read]],
          ],
        ],
        [
          TEST_URL.defaultAccessControlVcMatcher,
          [
            [rdf.type, [ACP.Matcher]],
            [ACP.vc, [VC_ACCESS_GRANT]],
          ],
        ],
      ]).graphs.default
    );
  });

  it("should override existing access mode for the VC policy with the provided ones", () => {
    const resource = mockAccessControlledResource(
      createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [[ACP.accessControl, [TEST_URL.defaultAccessControl]]],
        ],
        [
          TEST_URL.defaultAccessControl,
          [[ACP.apply, [TEST_URL.defaultAccessControlVcPolicy]]],
        ],
        [
          TEST_URL.defaultAccessControlVcPolicy,
          [
            [rdf.type, [ACP.Policy]],
            [ACP.anyOf, [TEST_URL.defaultAccessControlVcMatcher]],
            // Note that the resource currently has Read access for the VC policy
            [ACP.allow, [ACL.Read]],
          ],
        ],
        [
          TEST_URL.defaultAccessControlVcMatcher,
          [
            [rdf.type, [ACP.Matcher]],
            [ACP.vc, [VC_ACCESS_GRANT]],
          ],
        ],
      ])
    );

    expect(
      setVcAccess(resource, { read: false, write: true }).internal_acp.acr
        .graphs.default
    ).toStrictEqual(
      createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [[ACP.accessControl, [TEST_URL.defaultAccessControl]]],
        ],
        [
          TEST_URL.defaultAccessControl,
          [[ACP.apply, [TEST_URL.defaultAccessControlVcPolicy]]],
        ],
        [
          TEST_URL.defaultAccessControlVcPolicy,
          [
            [rdf.type, [ACP.Policy]],
            [ACP.anyOf, [TEST_URL.defaultAccessControlVcMatcher]],
            // Note that the access mode has been changed.
            [ACP.allow, [ACL.Write]],
          ],
        ],
        [
          TEST_URL.defaultAccessControlVcMatcher,
          [
            [rdf.type, [ACP.Matcher]],
            [ACP.vc, [VC_ACCESS_GRANT]],
          ],
        ],
      ]).graphs.default
    );
  });

  it("should override incomplete ACR elements for VC access control", () => {
    const resource = mockAccessControlledResource(
      createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [[ACP.accessControl, [TEST_URL.defaultAccessControl]]],
        ],
        [
          TEST_URL.defaultAccessControl,
          [[ACP.apply, [TEST_URL.defaultAccessControlVcPolicy]]],
        ],
        [
          TEST_URL.defaultAccessControlVcPolicy,
          [
            [rdf.type, [ACP.Policy]],
            [ACP.anyOf, [TEST_URL.defaultAccessControlVcMatcher]],
            [ACP.allow, [ACL.Read]],
          ],
        ],
        // Note that the VC matcher does not exist
      ])
    );

    expect(
      setVcAccess(resource, { read: false, write: true }).internal_acp.acr
        .graphs.default
    ).toMatchObject(
      createDatasetFromSubjects([
        [
          TEST_URL.defaultAccessControlVcPolicy,
          [[ACP.anyOf, [TEST_URL.defaultAccessControlVcMatcher]]],
        ],
        // Note that the VC matcher has been created.
        [
          TEST_URL.defaultAccessControlVcMatcher,
          [
            [rdf.type, [ACP.Matcher]],
            [ACP.vc, [VC_ACCESS_GRANT]],
          ],
        ],
      ]).graphs.default
    );
  });

  it("should create a default Access Control if not present", () => {
    const resource = mockAccessControlledResource(
      createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [[rdf.type, [ACP.AccessControlResource]]],
        ],
        // Note that the default Access Control does not exist
      ])
    );
    const updatedResource = setVcAccess(resource, { read: false, write: true });
    expect(updatedResource.internal_acp.acr.graphs.default).toMatchObject(
      createDatasetFromSubjects([
        [
          DEFAULT_ACCESS_CONTROL_RESOURCE_URL,
          [[ACP.accessControl, [TEST_URL.defaultAccessControl]]],
        ],
      ]).graphs.default
    );
  });
});
