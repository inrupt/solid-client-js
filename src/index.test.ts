import {
  unstable_fetchFile,
  unstable_deleteFile,
  createLitDataset,
  fetchLitDataset,
  saveLitDatasetAt,
  saveLitDatasetInContainer,
  getThingOne,
  getThingAll,
  setThing,
  removeThing,
  createThing,
  asUrl,
  asIri,
  getUrlOne,
  getIriOne,
  getBooleanOne,
  getDatetimeOne,
  getDecimalOne,
  getIntegerOne,
  getStringInLocaleOne,
  getStringUnlocalizedOne,
  getUrlAll,
  getIriAll,
  getBooleanAll,
  getDatetimeAll,
  getDecimalAll,
  getIntegerAll,
  getStringInLocaleAll,
  getStringUnlocalizedAll,
  getLiteralOne,
  getNamedNodeOne,
  getLiteralAll,
  getNamedNodeAll,
  addUrl,
  addIri,
  addBoolean,
  addDatetime,
  addDecimal,
  addInteger,
  addStringInLocale,
  addStringUnlocalized,
  addLiteral,
  addNamedNode,
  setUrl,
  setIri,
  setBoolean,
  setDatetime,
  setDecimal,
  setInteger,
  setStringInLocale,
  setStringUnlocalized,
  setLiteral,
  setNamedNode,
  removeAll,
  removeUrl,
  removeIri,
  removeBoolean,
  removeDatetime,
  removeDecimal,
  removeInteger,
  removeStringInLocale,
  removeStringUnlocalized,
  removeLiteral,
  removeNamedNode,
  unstable_fetchLitDatasetWithAcl,
  unstable_hasFallbackAcl,
  unstable_getFallbackAcl,
  unstable_hasResourceAcl,
  unstable_getResourceAcl,
  unstable_getAgentAccessModesOne,
  unstable_getAgentAccessModesAll,
  unstable_getAgentResourceAccessModesOne,
  unstable_getAgentResourceAccessModesAll,
  unstable_getAgentDefaultAccessModesOne,
  unstable_getAgentDefaultAccessModesAll,
} from "./index";

// These tests aren't too useful in preventing bugs, but they work around this issue:
// https://github.com/facebook/jest/issues/10032
it("exports the public API from the entry file", () => {
  expect(unstable_fetchFile).toBeDefined();
  expect(unstable_deleteFile).toBeDefined();
  expect(createLitDataset).toBeDefined();
  expect(fetchLitDataset).toBeDefined();
  expect(saveLitDatasetAt).toBeDefined();
  expect(saveLitDatasetInContainer).toBeDefined();
  expect(getThingOne).toBeDefined();
  expect(getThingAll).toBeDefined();
  expect(setThing).toBeDefined();
  expect(removeThing).toBeDefined();
  expect(createThing).toBeDefined();
  expect(asUrl).toBeDefined();
  expect(asIri).toBeDefined();
  expect(getUrlOne).toBeDefined();
  expect(getIriOne).toBeDefined();
  expect(getBooleanOne).toBeDefined();
  expect(getDatetimeOne).toBeDefined();
  expect(getDecimalOne).toBeDefined();
  expect(getIntegerOne).toBeDefined();
  expect(getStringInLocaleOne).toBeDefined();
  expect(getStringUnlocalizedOne).toBeDefined();
  expect(getUrlAll).toBeDefined();
  expect(getIriAll).toBeDefined();
  expect(getBooleanAll).toBeDefined();
  expect(getDatetimeAll).toBeDefined();
  expect(getDecimalAll).toBeDefined();
  expect(getIntegerAll).toBeDefined();
  expect(getStringInLocaleAll).toBeDefined();
  expect(getStringUnlocalizedAll).toBeDefined();
  expect(getLiteralOne).toBeDefined();
  expect(getNamedNodeOne).toBeDefined();
  expect(getLiteralAll).toBeDefined();
  expect(getNamedNodeAll).toBeDefined();
  expect(addUrl).toBeDefined();
  expect(addIri).toBeDefined();
  expect(addBoolean).toBeDefined();
  expect(addDatetime).toBeDefined();
  expect(addDecimal).toBeDefined();
  expect(addInteger).toBeDefined();
  expect(addStringInLocale).toBeDefined();
  expect(addStringUnlocalized).toBeDefined();
  expect(addLiteral).toBeDefined();
  expect(addNamedNode).toBeDefined();
  expect(setUrl).toBeDefined();
  expect(setIri).toBeDefined();
  expect(setBoolean).toBeDefined();
  expect(setDatetime).toBeDefined();
  expect(setDecimal).toBeDefined();
  expect(setInteger).toBeDefined();
  expect(setStringInLocale).toBeDefined();
  expect(setStringUnlocalized).toBeDefined();
  expect(setLiteral).toBeDefined();
  expect(setNamedNode).toBeDefined();
  expect(removeAll).toBeDefined();
  expect(removeUrl).toBeDefined();
  expect(removeIri).toBeDefined();
  expect(removeBoolean).toBeDefined();
  expect(removeDatetime).toBeDefined();
  expect(removeDecimal).toBeDefined();
  expect(removeInteger).toBeDefined();
  expect(removeStringInLocale).toBeDefined();
  expect(removeStringUnlocalized).toBeDefined();
  expect(removeLiteral).toBeDefined();
  expect(removeNamedNode).toBeDefined();
  expect(unstable_fetchLitDatasetWithAcl).toBeDefined();
  expect(unstable_hasFallbackAcl).toBeDefined();
  expect(unstable_getFallbackAcl).toBeDefined();
  expect(unstable_hasResourceAcl).toBeDefined();
  expect(unstable_getResourceAcl).toBeDefined();
  expect(unstable_getAgentAccessModesOne).toBeDefined();
  expect(unstable_getAgentAccessModesAll).toBeDefined();
  expect(unstable_getAgentResourceAccessModesOne).toBeDefined();
  expect(unstable_getAgentResourceAccessModesAll).toBeDefined();
  expect(unstable_getAgentDefaultAccessModesOne).toBeDefined();
  expect(unstable_getAgentDefaultAccessModesAll).toBeDefined();
});
