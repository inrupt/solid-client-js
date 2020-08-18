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
  getFile,
  getFileWithAcl,
  deleteFile,
  saveFileInContainer,
  overwriteFile,
  createSolidDataset,
  getSolidDataset,
  fetchResourceInfoWithAcl,
  isContainer,
  isRawData,
  getContentType,
  getSourceUrl,
  getSourceIri,
  saveSolidDatasetAt,
  createContainerAt,
  saveSolidDatasetInContainer,
  createContainerInContainer,
  saveAclFor,
  deleteAclFor,
  getThing,
  getThingAll,
  setThing,
  removeThing,
  createThing,
  isThing,
  asUrl,
  asIri,
  getUrl,
  getIri,
  getBoolean,
  getDatetime,
  getDecimal,
  getInteger,
  getStringWithLocale,
  getStringNoLocale,
  getUrlAll,
  getIriAll,
  getBooleanAll,
  getDatetimeAll,
  getDecimalAll,
  getIntegerAll,
  getStringWithLocaleAll,
  getStringNoLocaleAll,
  getLiteral,
  getNamedNode,
  getLiteralAll,
  getNamedNodeAll,
  addUrl,
  addIri,
  addBoolean,
  addDatetime,
  addDecimal,
  addInteger,
  addStringWithLocale,
  addStringNoLocale,
  addLiteral,
  addNamedNode,
  setUrl,
  setIri,
  setBoolean,
  setDatetime,
  setDecimal,
  setInteger,
  setStringWithLocale,
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
  removeStringWithLocale,
  removeStringNoLocale,
  removeLiteral,
  removeNamedNode,
  getSolidDatasetWithAcl,
  hasFallbackAcl,
  getFallbackAcl,
  hasResourceAcl,
  getResourceAcl,
  createAcl,
  createAclFromFallbackAcl,
  getAgentAccess,
  getAgentAccessAll,
  getAgentResourceAccess,
  getAgentResourceAccessAll,
  setAgentResourceAccess,
  getAgentDefaultAccess,
  getAgentDefaultAccessAll,
  setAgentDefaultAccess,
  getPublicAccess,
  getPublicResourceAccess,
  getPublicDefaultAccess,
  setPublicResourceAccess,
  setPublicDefaultAccess,
  hasResourceInfo,
  hasAccessibleAcl,
  getGroupAccess,
  getGroupAccessAll,
  getGroupResourceAccess,
  getGroupResourceAccessAll,
  getGroupDefaultAccess,
  getGroupDefaultAccessAll,
  mockSolidDatasetFrom,
  mockContainerFrom,
  mockFileFrom,
  mockThingFrom,
  addMockResourceAclTo,
  addMockFallbackAclTo,
  // Deprecated functions still exported for backwards compatibility:
  getStringUnlocalizedOne,
  getStringUnlocalizedAll,
  addStringUnlocalized,
  setStringUnlocalized,
  removeStringUnlocalized,
  getStringInLocaleOne,
  getStringInLocaleAll,
  addStringInLocale,
  setStringInLocale,
  removeStringInLocale,
  unstable_fetchFile,
  unstable_deleteFile,
  unstable_saveFileInContainer,
  unstable_overwriteFile,
  unstable_fetchResourceInfoWithAcl,
  unstable_saveAclFor,
  unstable_deleteAclFor,
  unstable_fetchLitDatasetWithAcl,
  unstable_hasFallbackAcl,
  unstable_getFallbackAcl,
  unstable_hasResourceAcl,
  unstable_getResourceAcl,
  unstable_createAcl,
  unstable_createAclFromFallbackAcl,
  unstable_getAgentAccessOne,
  unstable_getAgentAccessAll,
  unstable_getAgentResourceAccessOne,
  unstable_getAgentResourceAccessAll,
  unstable_setAgentResourceAccess,
  unstable_getAgentDefaultAccessOne,
  unstable_getAgentDefaultAccessAll,
  unstable_setAgentDefaultAccess,
  unstable_getPublicAccess,
  unstable_getPublicResourceAccess,
  unstable_getPublicDefaultAccess,
  unstable_setPublicResourceAccess,
  unstable_setPublicDefaultAccess,
  unstable_hasAccessibleAcl,
  unstable_getGroupAccessOne,
  unstable_getGroupAccessAll,
  unstable_getGroupResourceAccessOne,
  unstable_getGroupResourceAccessAll,
  unstable_getGroupDefaultAccessOne,
  unstable_getGroupDefaultAccessAll,
  createLitDataset,
  fetchLitDataset,
  fetchLitDatasetWithAcl,
  isLitDataset,
  saveLitDatasetAt,
  saveLitDatasetInContainer,
  getFetchedFrom,
} from "./index";

// These tests aren't too useful in preventing bugs, but they work around this issue:
// https://github.com/facebook/jest/issues/10032
it("exports the public API from the entry file", () => {
  expect(getFile).toBeDefined();
  expect(getFileWithAcl).toBeDefined();
  expect(deleteFile).toBeDefined();
  expect(saveFileInContainer).toBeDefined();
  expect(overwriteFile).toBeDefined();
  expect(createSolidDataset).toBeDefined();
  expect(getSolidDataset).toBeDefined();
  expect(fetchResourceInfoWithAcl).toBeDefined();
  expect(isContainer).toBeDefined();
  expect(isRawData).toBeDefined();
  expect(getContentType).toBeDefined();
  expect(getSourceUrl).toBeDefined();
  expect(getSourceIri).toBeDefined();
  expect(saveSolidDatasetAt).toBeDefined();
  expect(createContainerAt).toBeDefined();
  expect(saveSolidDatasetInContainer).toBeDefined();
  expect(createContainerInContainer).toBeDefined();
  expect(saveAclFor).toBeDefined();
  expect(deleteAclFor).toBeDefined();
  expect(getThing).toBeDefined();
  expect(getThingAll).toBeDefined();
  expect(setThing).toBeDefined();
  expect(removeThing).toBeDefined();
  expect(createThing).toBeDefined();
  expect(isThing).toBeDefined();
  expect(asUrl).toBeDefined();
  expect(asIri).toBeDefined();
  expect(getUrl).toBeDefined();
  expect(getIri).toBeDefined();
  expect(getBoolean).toBeDefined();
  expect(getDatetime).toBeDefined();
  expect(getDecimal).toBeDefined();
  expect(getInteger).toBeDefined();
  expect(getStringWithLocale).toBeDefined();
  expect(getStringNoLocale).toBeDefined();
  expect(getUrlAll).toBeDefined();
  expect(getIriAll).toBeDefined();
  expect(getBooleanAll).toBeDefined();
  expect(getDatetimeAll).toBeDefined();
  expect(getDecimalAll).toBeDefined();
  expect(getIntegerAll).toBeDefined();
  expect(getStringWithLocaleAll).toBeDefined();
  expect(getStringNoLocaleAll).toBeDefined();
  expect(getLiteral).toBeDefined();
  expect(getNamedNode).toBeDefined();
  expect(getLiteralAll).toBeDefined();
  expect(getNamedNodeAll).toBeDefined();
  expect(addUrl).toBeDefined();
  expect(addIri).toBeDefined();
  expect(addBoolean).toBeDefined();
  expect(addDatetime).toBeDefined();
  expect(addDecimal).toBeDefined();
  expect(addInteger).toBeDefined();
  expect(addStringWithLocale).toBeDefined();
  expect(addStringNoLocale).toBeDefined();
  expect(addLiteral).toBeDefined();
  expect(addNamedNode).toBeDefined();
  expect(setUrl).toBeDefined();
  expect(setIri).toBeDefined();
  expect(setBoolean).toBeDefined();
  expect(setDatetime).toBeDefined();
  expect(setDecimal).toBeDefined();
  expect(setInteger).toBeDefined();
  expect(setStringWithLocale).toBeDefined();
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
  expect(removeStringWithLocale).toBeDefined();
  expect(removeStringNoLocale).toBeDefined();
  expect(removeLiteral).toBeDefined();
  expect(removeNamedNode).toBeDefined();
  expect(getSolidDatasetWithAcl).toBeDefined();
  expect(hasFallbackAcl).toBeDefined();
  expect(getFallbackAcl).toBeDefined();
  expect(hasResourceAcl).toBeDefined();
  expect(getResourceAcl).toBeDefined();
  expect(createAcl).toBeDefined();
  expect(createAclFromFallbackAcl).toBeDefined();
  expect(getAgentAccess).toBeDefined();
  expect(getAgentAccessAll).toBeDefined();
  expect(getAgentResourceAccess).toBeDefined();
  expect(getAgentResourceAccessAll).toBeDefined();
  expect(setAgentResourceAccess).toBeDefined();
  expect(getAgentDefaultAccess).toBeDefined();
  expect(getAgentDefaultAccessAll).toBeDefined();
  expect(setAgentDefaultAccess).toBeDefined();
  expect(getPublicAccess).toBeDefined();
  expect(getPublicResourceAccess).toBeDefined();
  expect(getPublicDefaultAccess).toBeDefined();
  expect(setPublicResourceAccess).toBeDefined();
  expect(setPublicDefaultAccess).toBeDefined();
  expect(getPublicDefaultAccess).toBeDefined();
  expect(hasResourceInfo).toBeDefined();
  expect(hasAccessibleAcl).toBeDefined();
  expect(getGroupAccess).toBeDefined();
  expect(getGroupAccessAll).toBeDefined();
  expect(getGroupResourceAccess).toBeDefined();
  expect(getGroupResourceAccessAll).toBeDefined();
  expect(getGroupDefaultAccess).toBeDefined();
  expect(getGroupDefaultAccessAll).toBeDefined();
  expect(mockSolidDatasetFrom).toBeDefined();
  expect(mockContainerFrom).toBeDefined();
  expect(mockFileFrom).toBeDefined();
  expect(mockThingFrom).toBeDefined();
  expect(addMockResourceAclTo).toBeDefined();
  expect(addMockFallbackAclTo).toBeDefined();
});

it("still exports deprecated methods", () => {
  expect(getStringInLocaleOne).toBeDefined();
  expect(getStringUnlocalizedOne).toBeDefined();
  expect(getStringInLocaleAll).toBeDefined();
  expect(getStringUnlocalizedAll).toBeDefined();
  expect(addStringInLocale).toBeDefined();
  expect(addStringUnlocalized).toBeDefined();
  expect(setStringInLocale).toBeDefined();
  expect(setStringUnlocalized).toBeDefined();
  expect(removeStringInLocale).toBeDefined();
  expect(removeStringUnlocalized).toBeDefined();
  expect(unstable_fetchFile).toBeDefined();
  expect(unstable_deleteFile).toBeDefined();
  expect(unstable_saveFileInContainer).toBeDefined();
  expect(unstable_overwriteFile).toBeDefined();
  expect(unstable_fetchResourceInfoWithAcl).toBeDefined();
  expect(unstable_saveAclFor).toBeDefined();
  expect(unstable_deleteAclFor).toBeDefined();
  expect(unstable_fetchLitDatasetWithAcl).toBeDefined();
  expect(unstable_hasFallbackAcl).toBeDefined();
  expect(unstable_getFallbackAcl).toBeDefined();
  expect(unstable_hasResourceAcl).toBeDefined();
  expect(unstable_getResourceAcl).toBeDefined();
  expect(unstable_createAcl).toBeDefined();
  expect(unstable_createAclFromFallbackAcl).toBeDefined();
  expect(unstable_getAgentAccessOne).toBeDefined();
  expect(unstable_getAgentAccessAll).toBeDefined();
  expect(unstable_getAgentResourceAccessOne).toBeDefined();
  expect(unstable_getAgentResourceAccessAll).toBeDefined();
  expect(unstable_setAgentResourceAccess).toBeDefined();
  expect(unstable_getAgentDefaultAccessOne).toBeDefined();
  expect(unstable_getAgentDefaultAccessAll).toBeDefined();
  expect(unstable_setAgentDefaultAccess).toBeDefined();
  expect(unstable_getPublicAccess).toBeDefined();
  expect(unstable_getPublicResourceAccess).toBeDefined();
  expect(unstable_getPublicDefaultAccess).toBeDefined();
  expect(unstable_setPublicResourceAccess).toBeDefined();
  expect(unstable_setPublicDefaultAccess).toBeDefined();
  expect(unstable_hasAccessibleAcl).toBeDefined();
  expect(unstable_getGroupAccessOne).toBeDefined();
  expect(unstable_getGroupAccessAll).toBeDefined();
  expect(unstable_getGroupResourceAccessOne).toBeDefined();
  expect(unstable_getGroupResourceAccessAll).toBeDefined();
  expect(unstable_getGroupDefaultAccessOne).toBeDefined();
  expect(unstable_getGroupDefaultAccessAll).toBeDefined();
  expect(createLitDataset).toBeDefined();
  expect(fetchLitDataset).toBeDefined();
  expect(isLitDataset).toBeDefined();
  expect(saveLitDatasetAt).toBeDefined();
  expect(saveLitDatasetInContainer).toBeDefined();
  expect(fetchLitDatasetWithAcl).toBeDefined();
  expect(getFetchedFrom).toBeDefined();
});
