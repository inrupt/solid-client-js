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

export {
  isContainer,
  isRawData,
  getSourceUrl,
  getSourceIri,
  getContentType,
  fetchResourceInfoWithAcl,
  // Aliases for deprecated exports to preserve backwards compatibility:
  /** @deprecated See [[fetchResourceInfoWithAcl]] */
  fetchResourceInfoWithAcl as unstable_fetchResourceInfoWithAcl,
  /** @deprecated See [[isRawData]] */
  isRawData as isLitDataset,
  /** @deprecated See [[getSourceUrl]] */
  getSourceUrl as getFetchedFrom,
} from "./resource/resource";
export {
  getFile,
  getFileWithAcl,
  deleteFile,
  saveFileInContainer,
  overwriteFile,
  // Aliases for deprecated exports to preserve backwards compatibility:
  /** @deprecated See [[getFile]] */
  getFile as unstable_fetchFile,
  /** @deprecated See [[deleteFile]] */
  deleteFile as unstable_deleteFile,
  /** @deprecated See [[saveFileContainer]] */
  saveFileInContainer as unstable_saveFileInContainer,
  /** @deprecated See [[overwriteFile]] */
  overwriteFile as unstable_overwriteFile,
} from "./resource/nonRdfData";
export {
  createSolidDataset,
  getSolidDataset,
  saveSolidDatasetAt,
  createContainerAt,
  saveSolidDatasetInContainer,
  createContainerInContainer,
  getSolidDatasetWithAcl,
  solidDatasetAsMarkdown,
  changeLogAsMarkdown,
  // Aliases for deprecated exports to preserve backwards compatibility:
  /** @deprecated See [[fetchLitDatasetWithAcl]] */
  getSolidDatasetWithAcl as unstable_fetchLitDatasetWithAcl,
  /** @deprecated See [[createSolidDataset]] */
  createSolidDataset as createLitDataset,
  /** @deprecated See [[getSolidDataset]] */
  getSolidDataset as fetchLitDataset,
  /** @deprecated See [[saveSolidDataset]] */
  saveSolidDatasetAt as saveLitDatasetAt,
  /** @deprecated See [[saveSolidDatasetInContainer]] */
  saveSolidDatasetInContainer as saveLitDatasetInContainer,
  /** @deprecated See [[getSolidDatasetWithAcl]] */
  getSolidDatasetWithAcl as fetchLitDatasetWithAcl,
} from "./resource/solidDataset";
export {
  mockSolidDatasetFrom,
  mockContainerFrom,
  mockFileFrom,
} from "./resource/mock";
export {
  getThing,
  getThingAll,
  setThing,
  removeThing,
  createThing,
  isThing,
  asUrl,
  asIri,
  thingAsMarkdown,
} from "./thing/thing";
export {
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
  getTerm,
  getLiteralAll,
  getNamedNodeAll,
  getTermAll,
  // Aliases for deprecated exports to preserve backwards compatibility:
  /** @deprecated See [[getStringNoLocale]] */
  getStringNoLocale as getStringUnlocalizedOne,
  /** @deprecated See [[getStringNoLocaleAll]] */
  getStringNoLocaleAll as getStringUnlocalizedAll,
  /** @deprecated See [[getStringWithLocale]] */
  getStringWithLocale as getStringInLocaleOne,
  /** @deprecated See [[getStringWithLocaleAll]] */
  getStringWithLocaleAll as getStringInLocaleAll,
} from "./thing/get";
export {
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
  addTerm,
  // Aliases for deprecated exports to preserve backwards compatibility:
  /** @deprecated See [[addStringNoLocale]] */
  addStringNoLocale as addStringUnlocalized,
  /** @deprecated See [[addStringWithLocale]] */
  addStringWithLocale as addStringInLocale,
} from "./thing/add";
export {
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
  setTerm,
  // Aliases for deprecated exports to preserve backwards compatibility:
  /** @deprecated See [[setStringNoLocale]] */
  setStringNoLocale as setStringUnlocalized,
  /** @deprecated See [[setStringWithLocale]] */
  setStringWithLocale as setStringInLocale,
} from "./thing/set";
export {
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
  // Aliases for deprecated exports to preserve backwards compatibility:
  /** @deprecated See [[removeStringNoLocale]] */
  removeStringNoLocale as removeStringUnlocalized,
  /** @deprecated See [[removeStringWithLocale]] */
  removeStringWithLocale as removeStringInLocale,
} from "./thing/remove";
export { mockThingFrom } from "./thing/mock";
export {
  hasFallbackAcl,
  getFallbackAcl,
  hasResourceAcl,
  getResourceAcl,
  createAcl,
  createAclFromFallbackAcl,
  saveAclFor,
  deleteAclFor,
  // Aliases for deprecated exports to preserve backwards compatibility:
  /** @deprecated See [[hasFallbackAcl]] */
  hasFallbackAcl as unstable_hasFallbackAcl,
  /** @deprecated See [[getFallbackAcl]] */
  getFallbackAcl as unstable_getFallbackAcl,
  /** @deprecated See [[hasResourceAcl]] */
  hasResourceAcl as unstable_hasResourceAcl,
  /** @deprecated See [[getResourceAcl]] */
  getResourceAcl as unstable_getResourceAcl,
  /** @deprecated See [[createAcl]] */
  createAcl as unstable_createAcl,
  /** @deprecated See [[createAclFromFallbackAcl]] */
  createAclFromFallbackAcl as unstable_createAclFromFallbackAcl,
  /** @deprecated See [[saveAclFor]] */
  saveAclFor as unstable_saveAclFor,
  /** @deprecated See [[deleteAclFor]] */
  deleteAclFor as unstable_deleteAclFor,
} from "./acl/acl";
export {
  AgentAccess,
  getAgentAccess,
  getAgentAccessAll,
  getAgentResourceAccess,
  getAgentResourceAccessAll,
  setAgentResourceAccess,
  getAgentDefaultAccess,
  getAgentDefaultAccessAll,
  setAgentDefaultAccess,
  // Aliases for deprecated exports to preserve backwards compatibility:
  /** @deprecated See [[AgentAccess]] */
  AgentAccess as unstable_AgentAccess,
  /** @deprecated See [[getAgentAccess]] */
  getAgentAccess as unstable_getAgentAccessOne,
  /** @deprecated See [[getAgentAccessAll]] */
  getAgentAccessAll as unstable_getAgentAccessAll,
  /** @deprecated See [[getAgentResourceAccess]] */
  getAgentResourceAccess as unstable_getAgentResourceAccessOne,
  /** @deprecated See [[getAgentResourceAccessAll]] */
  getAgentResourceAccessAll as unstable_getAgentResourceAccessAll,
  /** @deprecated See [[setAgentResourceAccess]] */
  setAgentResourceAccess as unstable_setAgentResourceAccess,
  /** @deprecated See [[getAgentDefaultAccess]] */
  getAgentDefaultAccess as unstable_getAgentDefaultAccessOne,
  /** @deprecated See [[getAgentDefaultAccessAll]] */
  getAgentDefaultAccessAll as unstable_getAgentDefaultAccessAll,
  /** @deprecated See [[setAgentResourceAccess]] */
  setAgentDefaultAccess as unstable_setAgentDefaultAccess,
} from "./acl/agent";
export {
  getGroupAccess,
  getGroupAccessAll,
  getGroupResourceAccess,
  getGroupResourceAccessAll,
  getGroupDefaultAccess,
  getGroupDefaultAccessAll,
  // Aliases for deprecated exports to preserve backwards compatibility:
  /** @deprecated See [[getGroupAccess]] */
  getGroupAccess as unstable_getGroupAccessOne,
  /** @deprecated See [[getGroupAccessAll]] */
  getGroupAccessAll as unstable_getGroupAccessAll,
  /** @deprecated See [[getGroupResourceAccess]] */
  getGroupResourceAccess as unstable_getGroupResourceAccessOne,
  /** @deprecated See [[getGroupResourceAccessAll]] */
  getGroupResourceAccessAll as unstable_getGroupResourceAccessAll,
  /** @deprecated See [[getGroupDefaultAccess]] */
  getGroupDefaultAccess as unstable_getGroupDefaultAccessOne,
  /** @deprecated See [[getGroupDefaultAccessAll]] */
  getGroupDefaultAccessAll as unstable_getGroupDefaultAccessAll,
} from "./acl/group";
export {
  getPublicAccess,
  getPublicResourceAccess,
  getPublicDefaultAccess,
  setPublicResourceAccess,
  setPublicDefaultAccess,
  // Aliases for deprecated exports to preserve backwards compatibility:
  /** @deprecated See [[getPublicAccess]] */
  getPublicAccess as unstable_getPublicAccess,
  /** @deprecated See [[getPublicResourceAccess]] */
  getPublicResourceAccess as unstable_getPublicResourceAccess,
  /** @deprecated See [[getPublicDefaultAccess] */
  getPublicDefaultAccess as unstable_getPublicDefaultAccess,
  /** @deprecated See [[setPublicResourceAccess] */
  setPublicResourceAccess as unstable_setPublicResourceAccess,
  /** @deprecated See [[setPublicDefaultAccess] */
  setPublicDefaultAccess as unstable_setPublicDefaultAccess,
} from "./acl/class";
export { addMockResourceAclTo, addMockFallbackAclTo } from "./acl/mock";
export {
  Url,
  Iri,
  UrlString,
  IriString,
  WebId,
  SolidDataset,
  Thing,
  ThingPersisted,
  ThingLocal,
  LocalNode,
  hasResourceInfo,
  WithResourceInfo,
  WithChangeLog,
  hasAccessibleAcl,
  WithAccessibleAcl,
  WithAcl,
  WithFallbackAcl,
  WithResourceAcl,
  AclDataset,
  AclRule as internal_AclRule,
  Access,
  UploadRequestInit,
  // Aliases for deprecated exports to preserve backwards compatibility:
  /** @deprecated See [[hasAccessibleAcl]] */
  hasAccessibleAcl as unstable_hasAccessibleAcl,
  /** @deprecated See [[WithAccessibleAcl]] */
  WithAccessibleAcl as unstable_WithAccessibleAcl,
  /** @deprecated See [[WithAcl]] */
  WithAcl as unstable_WithAcl,
  /** @deprecated See [[WithFallbackAcl]] */
  WithFallbackAcl as unstable_WithFallbackAcl,
  /** @deprecated See [[WithResourceAcl]] */
  WithResourceAcl as unstable_WithResourceAcl,
  /** @deprecated See [[AclDataset]] */
  AclDataset as unstable_AclDataset,
  /** @deprecated See [[_AclRule]] */
  AclRule as unstable_AclRule,
  /** @deprecated See [[Access]] */
  Access as unstable_Access,
  /** @deprecated See [[UploadRequestInit]] */
  UploadRequestInit as unstable_UploadRequestInit,
  /** @deprecated See [[SolidDataset]] */
  SolidDataset as LitDataset,
} from "./interfaces";
