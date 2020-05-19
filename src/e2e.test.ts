import {
  fetchLitDataset,
  setThing,
  getThingOne,
  getStringUnlocalizedOne,
  setDatetime,
  setStringUnlocalized,
  saveLitDatasetAt,
} from "./index";
import { foaf, schema } from "rdf-namespaces";
import { unstable_fetchLitDatasetWithAcl } from "./litDataset";
// TODO: Import these from ./index:
import {
  unstable_getAgentAccessModesOne,
  unstable_setAgentResourceAccessModes,
  unstable_removeAgentResourceAccessModes,
} from "./acl/agent";
// TODO: Import these from ./index:
import {
  unstable_hasResourceAcl,
  unstable_getResourceAcl,
  unstable_setResourceAcl,
  unstable_getFallbackAcl,
} from "./acl";

describe("End-to-end tests", () => {
  it("should be able to read and update data in a Pod", async () => {
    const randomNick = "Random nick " + Math.random();

    const dataset = await fetchLitDataset(
      "https://lit-e2e-test.inrupt.net/public/lit-solid-core-test.ttl"
    );
    const existingThing = getThingOne(
      dataset,
      "https://lit-e2e-test.inrupt.net/public/lit-solid-core-test.ttl#thing1"
    );

    expect(getStringUnlocalizedOne(existingThing, foaf.name)).toBe(
      "Thing for first end-to-end test"
    );

    let updatedThing = setDatetime(
      existingThing,
      schema.dateModified,
      new Date()
    );
    updatedThing = setStringUnlocalized(updatedThing, foaf.nick, randomNick);

    const updatedDataset = setThing(dataset, updatedThing);
    const savedDataset = await saveLitDatasetAt(
      "https://lit-e2e-test.inrupt.net/public/lit-solid-core-test.ttl",
      updatedDataset
    );

    const savedThing = getThingOne(
      savedDataset,
      "https://lit-e2e-test.inrupt.net/public/lit-solid-core-test.ttl#thing1"
    );
    expect(getStringUnlocalizedOne(savedThing, foaf.name)).toBe(
      "Thing for first end-to-end test"
    );
    expect(getStringUnlocalizedOne(savedThing, foaf.nick)).toBe(randomNick);
  });

  it("should be able to read and update ACLs", async () => {
    const fakeWebId =
      "https://example.com/fake-webid#" +
      Date.now().toString() +
      Math.random().toString();

    const datasetWithAcl = await unstable_fetchLitDatasetWithAcl(
      "https://lit-e2e-test.inrupt.net/public/lit-solid-core-acl-test/passthrough-container/resource-with-acl.ttl"
    );
    const datasetWithoutAcl = await unstable_fetchLitDatasetWithAcl(
      "https://lit-e2e-test.inrupt.net/public/lit-solid-core-acl-test/passthrough-container/resource-without-acl.ttl"
    );

    expect(unstable_hasResourceAcl(datasetWithAcl)).toBe(true);
    expect(unstable_hasResourceAcl(datasetWithoutAcl)).toBe(false);
    expect(
      unstable_getAgentAccessModesOne(
        datasetWithAcl,
        "https://vincentt.inrupt.net/profile/card#me"
      )
    ).toEqual({
      read: true,
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
    expect(fallbackAclForDatasetWithoutAcl.accessTo).toBe(
      "https://lit-e2e-test.inrupt.net/public/lit-solid-core-acl-test/"
    );

    if (unstable_hasResourceAcl(datasetWithAcl)) {
      const acl = unstable_getResourceAcl(datasetWithAcl);
      const updatedAcl = unstable_setAgentResourceAccessModes(acl, fakeWebId, {
        read: true,
        append: false,
        write: false,
        control: false,
      });
      const updatedDataset = unstable_setResourceAcl(
        datasetWithAcl,
        updatedAcl
      );
      await saveLitDatasetAt(
        "https://lit-e2e-test.inrupt.net/public/lit-solid-core-acl-test/passthrough-container/resource-with-acl.ttl",
        updatedDataset
      );

      const savedDatasetWithAcl = await unstable_fetchLitDatasetWithAcl(
        "https://lit-e2e-test.inrupt.net/public/lit-solid-core-acl-test/passthrough-container/resource-with-acl.ttl"
      );
      const savedAcl = unstable_getResourceAcl(savedDatasetWithAcl);
      const fakeWebIdAccess = unstable_getAgentAccessModesOne(
        savedDatasetWithAcl,
        fakeWebId
      );
      expect(fakeWebIdAccess).toEqual({
        read: true,
        append: false,
        write: false,
        control: false,
      });

      // Cleanup
      const cleanedAcl = unstable_removeAgentResourceAccessModes(
        savedAcl!,
        fakeWebId
      );
      const cleanedDataset = unstable_setResourceAcl(
        savedDatasetWithAcl,
        cleanedAcl
      );
      await saveLitDatasetAt(
        "https://lit-e2e-test.inrupt.net/public/lit-solid-core-acl-test/passthrough-container/resource-with-acl.ttl",
        cleanedDataset
      );
    }
  });
});
