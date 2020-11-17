const {
  createThing,
  thingAsMarkdown,
  getSolidDataset,
  solidDatasetAsMarkdown,
} = require("@inrupt/solid-client");

const thing = createThing();
console.log(thingAsMarkdown(thing));

getSolidDataset("https://vincentt.inrupt.net/profile/card#me").then(
  (profileDoc) => {
    console.log(solidDatasetAsMarkdown(profileDoc));
  }
);
