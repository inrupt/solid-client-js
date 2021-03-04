import {
  getSolidDataset,
  getThing,
  getStringNoLocale,
} from "@inrupt/solid-client";
import { foaf } from "rdf-namespaces";

getSolidDataset("https://codesandbox-demo.inrupt.net/profile/card").then(
  (profileDoc) => {
    if (profileDoc) {
      const profile = getThing(
        profileDoc,
        "https://codesandbox-demo.inrupt.net/profile/card#me"
      );
      const name = getStringNoLocale(profile, foaf.name);
      if (name) {
        document.getElementById(
          "app"
        )!.textContent = `The following is fetched from a Pod: ${name}.`;
      }
    }
  }
);
