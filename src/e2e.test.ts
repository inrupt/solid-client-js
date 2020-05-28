import { foaf, schema } from "rdf-namespaces";
import {
  fetchLitDataset,
  setThing,
  getThingOne,
  getStringUnlocalizedOne,
  setDatetime,
  setStringUnlocalized,
  saveLitDatasetAt,
} from "./index";

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
});
