// ============================================================================
// Facade da camada "WhatsApp Adapter".
// Todo o conhecimento sobre o WhatsApp Web (módulos internos, DOM, UI) fica
// isolado nesta pasta. O content script só consome esta API.
// ============================================================================

export { debug } from './debug';
export {
  waitElement,
  clickFirst,
  triggerClick,
  setInputValue,
  pressEnter,
  pressEscape,
  findElementByText,
  waitForText,
} from './waitElement';
export {
  getNativeLabels,
  createNativeLabel,
  applyNativeLabelToChat,
  addNativeNote,
  requestAllChatsFromBridge,
  getBridgeHealth,
  logBridgeHealth,
} from './requestBridge';
export { labelService, LabelService } from './label/LabelService';
export { noteService, NoteService } from './note/NoteService';
export {
  isGroupRow,
  extractPhoneFromRow,
  extractNameFromRow,
  extractRowTags,
  findAllChatRows,
  findAllLabelPills,
  openChatByPhone,
} from './dom/chatRow';
export {
  findScrollContainer,
  scrollContainerToLoadAll,
  waitForChatListReady,
} from './dom/scroller';
export {
  scanNativeTagRows,
  scanChatList,
  type ScannedContact,
  type ScanStatus,
  type ScanChatListResult,
} from './dom/scanner';
