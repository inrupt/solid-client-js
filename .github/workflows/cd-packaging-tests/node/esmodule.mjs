// Verify that imports from the main export work:
import { getSolidDataset, solidDatasetAsMarkdown } from "@inrupt/solid-client";
// Verify that submodule imports work:
import { createThing, thingAsMarkdown } from "@inrupt/solid-client/thing/thing";

const thing = createThing();
console.log(thingAsMarkdown(thing));

getSolidDataset("https://vincentt.inrupt.net/profile/card#me").then(
  (profileDoc) => {
    console.log(solidDatasetAsMarkdown(profileDoc));
  }
);
