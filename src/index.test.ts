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

import {
  unstable_fetchFile,
  unstable_deleteFile,
  unstable_saveFileInContainer,
  unstable_overwriteFile,
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
  getStringNoLocaleOne,
  getUrlAll,
  getIriAll,
  getBooleanAll,
  getDatetimeAll,
  getDecimalAll,
  getIntegerAll,
  getStringInLocaleAll,
  getStringNoLocaleAll,
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
  addStringNoLocale,
  addLiteral,
  addNamedNode,
  setUrl,
  setIri,
  setBoolean,
  setDatetime,
  setDecimal,
  setInteger,
  setStringInLocale,
  setStringNoLocale,
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
  removeStringNoLocale,
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
  // Deprecated functions still exported for backwards compatibility:
  getStringUnlocalizedOne,
  getStringUnlocalizedAll,
  addStringUnlocalized,
  setStringUnlocalized,
  removeStringUnlocalized,
} from "./index";

// These tests aren't too useful in preventing bugs, but they work around this issue:
// https://github.com/facebook/jest/issues/10032
it("exports the public API from the entry file", () => {
  expect(unstable_fetchFile).toBeDefined();
  expect(unstable_deleteFile).toBeDefined();
  expect(unstable_saveFileInContainer).toBeDefined();
  expect(unstable_overwriteFile).toBeDefined();
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
  expect(getStringNoLocaleOne).toBeDefined();
  expect(getUrlAll).toBeDefined();
  expect(getIriAll).toBeDefined();
  expect(getBooleanAll).toBeDefined();
  expect(getDatetimeAll).toBeDefined();
  expect(getDecimalAll).toBeDefined();
  expect(getIntegerAll).toBeDefined();
  expect(getStringInLocaleAll).toBeDefined();
  expect(getStringNoLocaleAll).toBeDefined();
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
  expect(addStringNoLocale).toBeDefined();
  expect(addLiteral).toBeDefined();
  expect(addNamedNode).toBeDefined();
  expect(setUrl).toBeDefined();
  expect(setIri).toBeDefined();
  expect(setBoolean).toBeDefined();
  expect(setDatetime).toBeDefined();
  expect(setDecimal).toBeDefined();
  expect(setInteger).toBeDefined();
  expect(setStringInLocale).toBeDefined();
  expect(setStringNoLocale).toBeDefined();
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
  expect(removeStringNoLocale).toBeDefined();
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

it("still exports deprecated methods", () => {
  expect(getStringUnlocalizedOne).toBeDefined();
  expect(getStringUnlocalizedAll).toBeDefined();
  expect(addStringUnlocalized).toBeDefined();
  expect(setStringUnlocalized).toBeDefined();
  expect(removeStringUnlocalized).toBeDefined();
});
