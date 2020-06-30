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

import { foaf, schema } from "rdf-namespaces";
import {
  fetchLitDataset,
  setThing,
  getThingOne,
  getStringNoLocaleOne,
  setDatetime,
  setStringNoLocale,
  saveLitDatasetAt,
  unstable_fetchLitDatasetWithAcl,
  unstable_hasResourceAcl,
  unstable_getPublicAccessModes,
  unstable_getAgentAccessModesOne,
  unstable_getFallbackAcl,
  unstable_getResourceAcl,
  unstable_getAgentResourceAccessModesOne,
  unstable_setAgentResourceAccessModes,
  unstable_saveAclFor,
} from "./index";

describe("End-to-end tests", () => {
  it("should be able to read and update data in a Pod", async () => {
    const randomNick = "Random nick " + Math.random();

    const dataset = await fetchLitDataset(
      "https://lit-e2e-test.inrupt.net/public/lit-pod-test.ttl"
    );
    const existingThing = getThingOne(
      dataset,
      "https://lit-e2e-test.inrupt.net/public/lit-pod-test.ttl#thing1"
    );

    expect(getStringNoLocaleOne(existingThing, foaf.name)).toBe(
      "Thing for first end-to-end test"
    );

    let updatedThing = setDatetime(
      existingThing,
      schema.dateModified,
      new Date()
    );
    updatedThing = setStringNoLocale(updatedThing, foaf.nick, randomNick);

    const updatedDataset = setThing(dataset, updatedThing);
    const savedDataset = await saveLitDatasetAt(
      "https://lit-e2e-test.inrupt.net/public/lit-pod-test.ttl",
      updatedDataset
    );

    const savedThing = getThingOne(
      savedDataset,
      "https://lit-e2e-test.inrupt.net/public/lit-pod-test.ttl#thing1"
    );
    expect(getStringNoLocaleOne(savedThing, foaf.name)).toBe(
      "Thing for first end-to-end test"
    );
    expect(getStringNoLocaleOne(savedThing, foaf.nick)).toBe(randomNick);
  });

  it("should be able to read and update ACLs", async () => {
    const fakeWebId =
      "https://example.com/fake-webid#" +
      Date.now().toString() +
      Math.random().toString();

    const datasetWithAcl = await unstable_fetchLitDatasetWithAcl(
      "https://lit-e2e-test.inrupt.net/public/lit-pod-acl-test/passthrough-container/resource-with-acl.ttl"
    );
    const datasetWithoutAcl = await unstable_fetchLitDatasetWithAcl(
      "https://lit-e2e-test.inrupt.net/public/lit-pod-acl-test/passthrough-container/resource-without-acl.ttl"
    );

    expect(unstable_hasResourceAcl(datasetWithAcl)).toBe(true);
    expect(unstable_hasResourceAcl(datasetWithoutAcl)).toBe(false);
    expect(unstable_getPublicAccessModes(datasetWithAcl)).toEqual({
      read: true,
      append: true,
      write: true,
      control: true,
    });
    expect(
      unstable_getAgentAccessModesOne(
        datasetWithAcl,
        "https://vincentt.inrupt.net/profile/card#me"
      )
    ).toEqual({
      read: false,
      append: true,
      write: false,
      control: false,
    });
    expect(
      unstable_getAgentAccessModesOne(
        datasetWithoutAcl,
        "https://vincentt.inrupt.net/profile/card#me"
      )
    ).toEqual({
      read: true,
      append: false,
      write: false,
      control: false,
    });
    const fallbackAclForDatasetWithoutAcl = unstable_getFallbackAcl(
      datasetWithoutAcl
    );
    expect(fallbackAclForDatasetWithoutAcl?.accessTo).toBe(
      "https://lit-e2e-test.inrupt.net/public/lit-pod-acl-test/"
    );

    if (unstable_hasResourceAcl(datasetWithAcl)) {
      const acl = unstable_getResourceAcl(datasetWithAcl);
      const updatedAcl = unstable_setAgentResourceAccessModes(acl, fakeWebId, {
        read: true,
        append: false,
        write: false,
        control: false,
      });
      const savedAcl = await unstable_saveAclFor(datasetWithAcl, updatedAcl);
      const fakeWebIdAccess = unstable_getAgentResourceAccessModesOne(
        savedAcl,
        fakeWebId
      );
      expect(fakeWebIdAccess).toEqual({
        read: true,
        append: false,
        write: false,
        control: false,
      });

      // Cleanup
      const cleanedAcl = unstable_setAgentResourceAccessModes(
        savedAcl,
        fakeWebId,
        {
          read: false,
          append: false,
          write: false,
          control: false,
        }
      );
      await unstable_saveAclFor(datasetWithAcl, cleanedAcl);
    }
  });
});
