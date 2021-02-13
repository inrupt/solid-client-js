import {
  getSolidDataset,
  getThing,
  getStringNoLocale,
} from "@inrupt/solid-client";
import { foaf } from "rdf-namespaces";

const webId = "https://codesandbox-demo.inrupt.net/profile/card#me";
getSolidDataset("https://codesandbox-demo.inrupt.net/profile/card").then(
  (profileDoc) => {
    if (profileDoc) {
      const profile = getThing(profileDoc, webId);
      const name = getStringNoLocale(profile!, foaf.name);
      if (name) {
        document.getElementById(
          "app"
        )!.textContent = `The following \`name\` was fetched from the Pod of WebID [${webId}]: [${name}].`;
      }
    }
  }
);
