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
  isLitDataset,
  getFetchedFrom,
  getContentType,
  fetchResourceInfoWithAcl,
  // Aliases for deprecated exports to preserve backwards compatibility:
  /** @deprecated See [[fetchResourceInfoWithAcl]] */
  fetchResourceInfoWithAcl as unstable_fetchResourceInfoWithAcl,
} from "./resource/resource";
export {
  fetchFile,
  deleteFile,
  saveFileInContainer,
  overwriteFile,
  // Aliases for deprecated exports to preserve backwards compatibility:
  /** @deprecated See [[fetchFile]] */
  fetchFile as unstable_fetchFile,
  /** @deprecated See [[deleteFile]] */
  deleteFile as unstable_deleteFile,
  /** @deprecated See [[saveFileContainer]] */
  saveFileInContainer as unstable_saveFileInContainer,
  /** @deprecated See [[overwriteFile]] */
  overwriteFile as unstable_overwriteFile,
} from "./resource/nonRdfData";
export {
  createLitDataset,
  fetchLitDataset,
  saveLitDatasetAt,
  saveLitDatasetInContainer,
  fetchLitDatasetWithAcl,
  // Aliases for deprecated exports to preserve backwards compatibility:
  /** @deprecated See [[fetchLitDatasetWithAcl]] */
  fetchLitDatasetWithAcl as unstable_fetchLitDatasetWithAcl,
} from "./resource/litDataset";
export {
  getThingOne,
  getThingAll,
  setThing,
  removeThing,
  createThing,
  asUrl,
  asIri,
} from "./thing/thing";
export {
  getUrlOne,
  getIriOne,
  getBooleanOne,
  getDatetimeOne,
  getDecimalOne,
  getIntegerOne,
  getStringWithLocaleOne,
  getStringNoLocaleOne,
  getUrlAll,
  getIriAll,
  getBooleanAll,
  getDatetimeAll,
  getDecimalAll,
  getIntegerAll,
  getStringWithLocaleAll,
  getStringNoLocaleAll,
  getLiteralOne,
  getNamedNodeOne,
  getLiteralAll,
  getNamedNodeAll,
  // Aliases for deprecated exports to preserve backwards compatibility:
  /** @deprecated See [[getStringNoLocaleOne]] */
  getStringNoLocaleOne as getStringUnlocalizedOne,
  /** @deprecated See [[getStringNoLocaleAll]] */
  getStringNoLocaleAll as getStringUnlocalizedAll,
  /** @deprecated See [[getStringWithLocaleOne]] */
  getStringWithLocaleOne as getStringInLocaleOne,
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
  getAgentAccessOne,
  getAgentAccessAll,
  getAgentResourceAccessOne,
  getAgentResourceAccessAll,
  setAgentResourceAccess,
  getAgentDefaultAccessOne,
  getAgentDefaultAccessAll,
  setAgentDefaultAccess,
  // Aliases for deprecated exports to preserve backwards compatibility:
  /** @deprecated See [[AgentAccess]] */
  AgentAccess as unstable_AgentAccess,
  /** @deprecated See [[getAgentAccessOne]] */
  getAgentAccessOne as unstable_getAgentAccessOne,
  /** @deprecated See [[getAgentAccessAll]] */
  getAgentAccessAll as unstable_getAgentAccessAll,
  /** @deprecated See [[getAgentResourceAccessOne]] */
  getAgentResourceAccessOne as unstable_getAgentResourceAccessOne,
  /** @deprecated See [[getAgentResourceAccessAll]] */
  getAgentResourceAccessAll as unstable_getAgentResourceAccessAll,
  /** @deprecated See [[setAgentResourceAccess]] */
  setAgentResourceAccess as unstable_setAgentResourceAccess,
  /** @deprecated See [[getAgentDefaultAccessOne]] */
  getAgentDefaultAccessOne as unstable_getAgentDefaultAccessOne,
  /** @deprecated See [[getAgentDefaultAccessAll]] */
  getAgentDefaultAccessAll as unstable_getAgentDefaultAccessAll,
  /** @deprecated See [[setAgentResourceAccess]] */
  setAgentDefaultAccess as unstable_setAgentDefaultAccess,
} from "./acl/agent";
export {
  getGroupAccessOne,
  getGroupAccessAll,
  getGroupResourceAccessOne,
  getGroupResourceAccessAll,
  getGroupDefaultAccessOne,
  getGroupDefaultAccessAll,
  // Aliases for deprecated exports to preserve backwards compatibility:
  /** @deprecated See [[getGroupAccessOne]] */
  getGroupAccessOne as unstable_getGroupAccessOne,
  /** @deprecated See [[getGroupAccessAll]] */
  getGroupAccessAll as unstable_getGroupAccessAll,
  /** @deprecated See [[getGroupResourceAccessOne]] */
  getGroupResourceAccessOne as unstable_getGroupResourceAccessOne,
  /** @deprecated See [[getGroupResourceAccessAll]] */
  getGroupResourceAccessAll as unstable_getGroupResourceAccessAll,
  /** @deprecated See [[getGroupDefaultAccessOne]] */
  getGroupDefaultAccessOne as unstable_getGroupDefaultAccessOne,
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
export {
  Url,
  Iri,
  UrlString,
  IriString,
  WebId,
  LitDataset,
  Thing,
  ThingPersisted,
  ThingLocal,
  LocalNode,
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
} from "./interfaces";
