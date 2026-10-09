import React from 'react';
import { SuperpowersMenu } from './components/superpowers/SuperpowersMenu';
import { QuickRepliesBar } from './components/superpowers/QuickRepliesBar';
import { DirectMessageModal } from './components/superpowers/DirectMessageModal';
import { ExportModal } from './components/superpowers/ExportModal';
import { SettingsModal } from './components/superpowers/SettingsModal';
import { KanbanModal } from './components/superpowers/KanbanModal';
import { HeaderStageBadge } from './components/superpowers/HeaderStageBadge';
import { applyPrivacyStyles, getContactName, getContactPhone } from './utils/whatsapp';
import {
  debug,
  labelService,
  noteService,
  scanNativeTagRows,
  scanChatList,
  openChatByPhone,
  findAllLabelPills,
  logBridgeHealth,
  type ScanStatus,
} from './adapters/whatsapp';
import type { PrivacySettings, QuickReply, Contact, Note, Tag, ContactTag, AppSettings, PipelineStage } from './types';
import { defaultPrivacy, defaultSettings, defaultQuickReplies } from './hooks/useStorage';
import {
  CRMStoreDataSchema,
  safeParseStorageData,
  type ValidatedCRMStoreData,
} from './schemas';
import { uiManager } from './services/ui/uiManager';
import { hotkeysManager } from './services/ui/hotkeysManager';
import { isValidSecureEnvelope, createSecureEnvelope } from './utils/security';
import './index.css';

const CRM_ID = 'whatscrm-sidebar';
const MENU_CONTAINER_ID = 'whatscrm-menu-root';
const QUICK_REPLIES_CONTAINER_ID = 'whatscrm-quick-replies-root';
const MODALS_CONTAINER_ID = 'whatscrm-modals-root';
const STAGE_BADGE_ID = 'whatscrm-stage-badge-root';

let currentPhone = '';
let currentName = '';
let isSidebarOpen = false;

let appSettingsState: AppSettings = defaultSettings;
let quickRepliesState: QuickReply[] = defaultQuickReplies;

let contactsState: Contact[] = [];
let notesState: Note[] = [];
let tagsState: Tag[] = [];
let contactTagsState: ContactTag[] = [];

let isDirectMsgOpen = false;
let isExportOpen = false;
let isSettingsOpen = false;
let isKanbanOpen = false;

let isScanning = false;
let lastScanTime = 0;
let hasAutoOpenedSettings = false;
let isFullScan = false;
let noteSyncTimer: ReturnType<typeof setTimeout> | null = null;
let mutationThrottleTimer: ReturnType<typeof setTimeout> | null = null;

// ============================================================================
// Storage & Sincronização
// ============================================================================

function loadStorage() {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(null, (res: Record<string, any>) => {
      const validated: ValidatedCRMStoreData = safeParseStorageData(
        CRMStoreDataSchema,
        {
          contacts: res.contacts || [],
          notes: res.notes || [],
          tags: res.tags || [],
          contactTags: res.contactTags || [],
          tasks: res.tasks || [],
          quickReplies: res.quickReplies || defaultQuickReplies,
          privacy: res.privacy || defaultPrivacy,
          settings: res.settings || defaultSettings,
        },
        {
          contacts: [],
          notes: [],
          tags: [],
          contactTags: [],
          tasks: [],
          quickReplies: defaultQuickReplies,
          privacy: defaultPrivacy,
          settings: defaultSettings,
        }
      );

      appSettingsState = validated.settings as AppSettings;
      applyPrivacyStyles(appSettingsState.privacy);

      quickRepliesState = validated.quickReplies as QuickReply[];
      contactsState = validated.contacts as Contact[];
      notesState = validated.notes as Note[];
      tagsState = validated.tags as Tag[];
      contactTagsState = validated.contactTags as ContactTag[];

      renderAll();
      autoOpenSettings();
    });
  } else {
    setTimeout(autoOpenSettings, 500);
  }
}

function autoOpenSettings() {
  if (hasAutoOpenedSettings) return;
  hasAutoOpenedSettings = true;
  isSettingsOpen = true;
  renderModals();
}

function persistToStorage(key: string, value: any) {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.set({ [key]: value });
  }
}

// ============================================================================
// Integração Nativa WhatsApp (Labels e Notas)
// ============================================================================

function syncNewTagsToNativeLabels(tags: Tag[]) {
  for (const tag of tags) {
    if (!tag.name || tag.id.startsWith('native_')) continue;
    const chatId = currentPhone ? `${currentPhone}@c.us` : undefined;
    labelService.create(tag.name, tag.color, chatId).then((result) => {
      if (result.ok) {
        uiManager.showToast(`Etiqueta criada no WhatsApp: "${tag.name}"`, 'success');
      } else {
        console.warn(`[WhatsCRM] Falha ao criar etiqueta nativa: "${tag.name}"`, result.reason);
        uiManager.showToast(`Falha ao criar etiqueta "${tag.name}" no WhatsApp`, 'error');
        logBridgeHealth();
      }
    });
  }
}

function buildNativeNoteText(contact: Contact | undefined, notes: Note[]): string {
  const lines: string[] = [];
  if (contact?.company) lines.push(`Empresa: ${contact.company}`);
  if (contact?.email) lines.push(`E-mail: ${contact.email}`);
  if (contact?.value != null && !isNaN(Number(contact.value))) {
    lines.push(
      `Valor: R$ ${Number(contact.value).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    );
  }
  const contactNotes = contact
    ? notes
        .filter((n) => n.contact_id === contact.id)
        .map((n) => n.description.trim())
        .filter(Boolean)
    : [];
  if (contactNotes.length > 0) lines.push(contactNotes.join('\n'));
  return lines.join('\n\n');
}

function syncNativeNote(source: 'change' | 'chat_open' = 'change') {
  if (!currentPhone) return;
  const contact = contactsState.find((c) => c.phone === currentPhone);
  const text = buildNativeNoteText(contact, notesState);
  if (!text) return;
  const chatId = `${currentPhone}@c.us`;
  noteService.write(chatId, text).then((result) => {
    if (result.ok) {
      if (source === 'change') {
        uiManager.showToast('Nota sincronizada no WhatsApp', 'success');
      }
    } else {
      console.warn('[WhatsCRM] Falha ao gravar nota nativa:', result.reason);
      uiManager.showToast('Falha ao gravar a nota no WhatsApp', 'error');
      logBridgeHealth();
    }
  });
}

function scheduleNativeNoteSync() {
  if (noteSyncTimer) clearTimeout(noteSyncTimer);
  noteSyncTimer = setTimeout(() => syncNativeNote('change'), 600);
}

// ============================================================================
// Listeners e Mensagens
// ============================================================================

if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    if (changes.contacts) {
      contactsState = (changes.contacts.newValue || []) as Contact[];
      scheduleNativeNoteSync();
    }
    if (changes.notes) {
      notesState = (changes.notes.newValue || []) as Note[];
      scheduleNativeNoteSync();
    }
    if (changes.tags) {
      const oldTags = (changes.tags.oldValue || []) as Tag[];
      tagsState = (changes.tags.newValue || []) as Tag[];
      const oldIds = new Set(oldTags.map((t) => t.id));
      const addedTags = tagsState.filter((t) => !oldIds.has(t.id));
      syncNewTagsToNativeLabels(addedTags);
    }
    if (changes.contactTags) contactTagsState = (changes.contactTags.newValue || []) as ContactTag[];
    if (changes.settings) {
      appSettingsState = (changes.settings.newValue || defaultSettings) as AppSettings;
      applyPrivacyStyles(appSettingsState.privacy);
    }
    if (changes.quickReplies) quickRepliesState = (changes.quickReplies.newValue || defaultQuickReplies) as QuickReply[];
    if (changes.privacy && changes.privacy.newValue) {
      appSettingsState.privacy = changes.privacy.newValue as PrivacySettings;
      applyPrivacyStyles(appSettingsState.privacy);
    }
    renderAll();
  });
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'OPEN_SETTINGS') {
      isSettingsOpen = true;
      isKanbanOpen = false;
      renderModals();
    } else if (msg.type === 'OPEN_KANBAN') {
      isKanbanOpen = true;
      isSettingsOpen = false;
      renderModals();
      scanAndImportNativeTags(true);
    } else if (msg.type === 'SCAN_TAGS') {
      scanAndImportNativeTags(true);
    } else if (msg.type === 'UPDATE_SETTINGS') {
      if (msg.settings) {
        appSettingsState = msg.settings;
        applyPrivacyStyles(appSettingsState.privacy);
        renderAll();
      }
    }
  });
}

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin && !event.origin.startsWith('chrome-extension://')) {
    return;
  }
  if (event.data?.type === 'SCAN_ALL' || (isValidSecureEnvelope(event.data) && event.data.type === 'SCAN_ALL')) {
    scanAllChats();
  }
});

function getIframe(): HTMLIFrameElement | null {
  return document.querySelector<HTMLIFrameElement>(`#${CRM_ID} iframe`);
}

function sendContactToIframe(phone: string, name: string) {
  const iframe = getIframe();
  if (iframe?.contentWindow) {
    const envelope = createSecureEnvelope('WHATSAPP_CONTACT', { phone, name });
    iframe.contentWindow.postMessage({ type: 'WHATSAPP_CONTACT', phone, name, envelope }, '*');
  }
}

function detectChatChange() {
  const name = getContactName();
  const phone = getContactPhone();

  if (phone && (phone !== currentPhone || name !== currentName)) {
    currentPhone = phone;
    currentName = name;
    sendContactToIframe(phone, name);
    syncNativeNote('chat_open');
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById(CRM_ID);
  if (!sidebar) return;

  isSidebarOpen = !isSidebarOpen;
  sidebar.style.transform = isSidebarOpen ? 'translateX(0%)' : 'translateX(100%)';

  const appContainer = document.querySelector<HTMLElement>('#app > div');
  if (appContainer) {
    appContainer.style.transition = 'margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    appContainer.style.marginRight = isSidebarOpen ? '380px' : '0px';
  }

  if (isSidebarOpen) {
    detectChatChange();
  }
  renderMenu();
}

function injectSidebar() {
  if (document.getElementById(CRM_ID)) return;
  const sidebar = document.createElement('div');
  sidebar.id = CRM_ID;
  sidebar.style.cssText = `
    position: fixed; top: 0; right: 0; width: 380px; height: 100vh;
    z-index: 2147483646; border: none; background: #111b21;
    transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: -4px 0 24px rgba(0,0,0,0.5);
    display: flex; flex-direction: column;
  `;

  const iframe = document.createElement('iframe');
  iframe.src = typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL('crm.html') : 'crm.html';
  iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
  sidebar.appendChild(iframe);

  document.body.appendChild(sidebar);
}

// ============================================================================
// Varredura de Tags e Chats com Throttling
// ============================================================================

function scanAndImportNativeTags(isManual = false) {
  const now = Date.now();
  if (!isManual && now - lastScanTime < 2000) return;
  if (!appSettingsState.enabled || isScanning) return;
  isScanning = true;
  lastScanTime = now;

  try {
    const rows = scanNativeTagRows();
    debug.sync(
      `scanAndImportNativeTags: ${rows.length} contato(s) com tag | estado: ${contactsState.length} contatos, ${tagsState.length} tags, ${contactTagsState.length} vínculos`
    );
    const processedPhones = new Set<string>();
    const processedTags = new Set<string>();
    let hasNewTags = false;
    let hasNewContactTags = false;
    let hasContactUpdates = false;

    rows.forEach((row) => {
      processedPhones.add(row.phone);
      row.tags.forEach((t) => processedTags.add(t.toLowerCase()));

      for (const tagName of row.tags) {
        let existingTag = tagsState.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
        if (!existingTag) {
          existingTag = {
            id: 'native_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
            name: tagName,
            color: '#00a884',
          };
          tagsState = [...tagsState, existingTag];
          hasNewTags = true;
        }

        let contact = contactsState.find((c) => c.phone === row.phone);
        if (!contact) {
          contact = {
            id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
            phone: row.phone,
            name: row.name,
            pipeline: 'Lead',
            created_at: new Date().toISOString(),
          };
          contactsState = [...contactsState, contact];
          hasContactUpdates = true;
        }

        const isAssociated = contactTagsState.some(
          (ct) => ct.contact_id === contact!.id && ct.tag_id === existingTag!.id
        );
        if (!isAssociated) {
          contactTagsState = [...contactTagsState, { contact_id: contact.id, tag_id: existingTag.id }];
          hasNewContactTags = true;
        }
      }
    });

    if (hasNewTags) persistToStorage('tags', tagsState);
    if (hasNewContactTags) persistToStorage('contactTags', contactTagsState);
    if (hasContactUpdates) {
      persistToStorage('contacts', contactsState);
      sendContactToIframe(currentPhone, currentName);
    }

    if (hasNewTags || hasNewContactTags || hasContactUpdates) {
      renderAll();
      uiManager.showToast(`✅ ${processedTags.size} tag(s) em ${processedPhones.size} contato(s)`, 'success');
    } else if (isManual) {
      const totalPills = findAllLabelPills().length;
      uiManager.showToast(`🔍 ${totalPills} etiqueta(s) encontradas — já mapeadas no CRM`, 'info');
    }
  } catch (err) {
    console.error('[WhatsCRM] Erro ao escanear tags nativas:', err);
    if (isManual) uiManager.showToast('❌ Erro ao escanear tags. Veja o console (F12)', 'error');
  } finally {
    isScanning = false;
  }
}

async function scanAllChats(tagIds?: string[]) {
  if (isScanning) return;
  isScanning = true;
  isFullScan = !tagIds;

  const renderStatus = (s: ScanStatus) => {
    if (s.overlay) uiManager.updateFullScanLoading(s.message, s.detail, s.progress);
    else uiManager.showLoadingToast(s.message);
  };

  if (isFullScan) {
    uiManager.showFullScanLoading();
    uiManager.updateFullScanLoading('Aguardando WhatsApp Web carregar...', 'Preparando varredura completa', 3);
  } else {
    uiManager.showLoadingToast('Escaneando conversas...');
  }

  try {
    const result = await scanChatList({ tagIds, onStatus: renderStatus });

    const groupSet = new Set(result.groupPhones);
    const removedGroups = contactsState.filter((c) => groupSet.has(c.phone));
    if (removedGroups.length > 0) {
      const removedIds = new Set(removedGroups.map((c) => c.id));
      contactsState = contactsState.filter((c) => !removedIds.has(c.id));
      contactTagsState = contactTagsState.filter((ct) => !removedIds.has(ct.contact_id));
      persistToStorage('contacts', contactsState);
      persistToStorage('contactTags', contactTagsState);
    }

    let hasContactUpdates = false;
    let hasTagUpdates = false;
    let hasContactTagUpdates = false;

    for (const row of result.contacts) {
      let contact = contactsState.find((c) => c.phone === row.phone);
      if (!contact) {
        contact = {
          id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
          phone: row.phone,
          name: row.name,
          pipeline: 'Lead',
          created_at: new Date().toISOString(),
        };
        contactsState = [...contactsState, contact];
        hasContactUpdates = true;
        if (tagIds && tagIds.length > 0) {
          for (const tagId of tagIds) {
            if (!contactTagsState.some((ct) => ct.contact_id === contact!.id && ct.tag_id === tagId)) {
              contactTagsState = [...contactTagsState, { contact_id: contact.id, tag_id: tagId }];
              hasContactTagUpdates = true;
            }
          }
        }
      }
      const contactId = contact.id;
      for (const tagName of row.tags) {
        let tag = tagsState.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
        if (!tag) {
          tag = {
            id: 'native_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
            name: tagName,
            color: '#00a884',
          };
          tagsState = [...tagsState, tag];
          hasTagUpdates = true;
        }
        if (!contactTagsState.some((ct) => ct.contact_id === contactId && ct.tag_id === tag!.id)) {
          contactTagsState = [...contactTagsState, { contact_id: contactId, tag_id: tag.id }];
          hasContactTagUpdates = true;
        }
      }
    }

    if (hasContactUpdates) {
      persistToStorage('contacts', contactsState);
      sendContactToIframe(currentPhone, currentName);
    }
    if (hasTagUpdates) persistToStorage('tags', tagsState);
    if (hasContactTagUpdates) persistToStorage('contactTags', contactTagsState);

    uiManager.hideLoadingToast();
    if (isFullScan) uiManager.hideFullScanLoading();
    renderAll();
    uiManager.showToast(`📋 ${contactsState.length} contato(s) no CRM · ${result.contacts.length} lido(s)`, 'success');
  } catch (err) {
    console.error('[WhatsCRM] Erro ao escanear chats:', err);
    uiManager.hideLoadingToast();
    if (isFullScan) uiManager.hideFullScanLoading();
    renderAll();
  } finally {
    isScanning = false;
  }
}

// ============================================================================
// Renderização de Componentes via UIManager (Safe React Roots)
// ============================================================================

function renderMenu() {
  if (!appSettingsState.enabled) {
    uiManager.safeUnmountRoot(MENU_CONTAINER_ID);
    const existing = document.getElementById(MENU_CONTAINER_ID);
    if (existing) existing.style.display = 'none';
    return;
  }

  const headers = document.querySelectorAll('header');
  let targetHeader: HTMLElement | null = null;

  for (let i = 0; i < headers.length; i++) {
    if (headers[i].querySelector('[data-icon]') || headers[i].children.length > 0) {
      targetHeader = headers[i] as HTMLElement;
      break;
    }
  }

  if (!targetHeader) return;

  let container = document.getElementById(MENU_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = MENU_CONTAINER_ID;
    container.style.cssText = `
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      gap: 4px;
      margin-left: auto;
      z-index: 100;
      flex-shrink: 0;
    `;

    const iconsBox = targetHeader.querySelector('div:last-child') || targetHeader;
    iconsBox.appendChild(container);
  } else {
    container.style.display = 'flex';
  }

  uiManager.safeMountRoot(
    MENU_CONTAINER_ID,
    container,
    <SuperpowersMenu
      onToggleSidebar={toggleSidebar}
      isSidebarOpen={isSidebarOpen}
      privacy={appSettingsState.privacy}
      onUpdatePrivacy={(newPrivacy) => {
        appSettingsState = { ...appSettingsState, privacy: newPrivacy };
        applyPrivacyStyles(newPrivacy);
        persistToStorage('privacy', newPrivacy);
        persistToStorage('settings', appSettingsState);
        renderMenu();
      }}
      onOpenDirectMessage={() => {
        isDirectMsgOpen = true;
        renderModals();
      }}
      onExportLeads={() => {
        isExportOpen = true;
        renderModals();
      }}
      onOpenSettings={() => {
        isSettingsOpen = true;
        isKanbanOpen = false;
        renderModals();
      }}
      onOpenKanban={() => {
        isKanbanOpen = true;
        isSettingsOpen = false;
        renderModals();
        scanAndImportNativeTags(true);
      }}
      onScanTags={() => scanAndImportNativeTags(true)}
      onScanAll={() => scanAllChats()}
    />
  );
}

function renderStageBadge() {
  if (!appSettingsState.enabled || !currentPhone) {
    uiManager.safeUnmountRoot(STAGE_BADGE_ID);
    const existing = document.getElementById(STAGE_BADGE_ID);
    if (existing) existing.style.display = 'none';
    return;
  }

  const mainPanel = document.getElementById('main');
  if (!mainPanel) return;

  const mainHeader = mainPanel.querySelector('header');
  if (!mainHeader) return;

  let container = document.getElementById(STAGE_BADGE_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = STAGE_BADGE_ID;
    container.style.cssText = `
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
      z-index: 10;
    `;

    const headerInner = mainHeader.querySelector('div > div > div') || mainHeader;
    headerInner.appendChild(container);
  } else {
    container.style.display = 'inline-flex';
  }

  const contact = contactsState.find((c) => c.phone === currentPhone);
  const currentContactTags = contact
    ? (contactTagsState
        .filter((ct) => ct.contact_id === contact.id)
        .map((ct) => tagsState.find((t) => t.id === ct.tag_id))
        .filter(Boolean) as Tag[])
    : [];

  uiManager.safeMountRoot(
    STAGE_BADGE_ID,
    container,
    <HeaderStageBadge
      currentStage={contact?.pipeline || 'Lead'}
      contactTags={currentContactTags}
      onStageChange={(stage: PipelineStage) => {
        if (!contact) {
          const newContact: Contact = {
            id: Date.now().toString(),
            phone: currentPhone,
            name: currentName || 'Novo Lead',
            pipeline: stage,
            created_at: new Date().toISOString(),
          };
          contactsState = [...contactsState, newContact];
          persistToStorage('contacts', contactsState);
        } else {
          contactsState = contactsState.map((c) => (c.id === contact.id ? { ...c, pipeline: stage } : c));
          persistToStorage('contacts', contactsState);
        }

        sendContactToIframe(currentPhone, currentName);
        renderStageBadge();
      }}
    />
  );
}

function renderQuickReplies() {
  const footer = document.querySelector('footer, #main footer');
  const containerExists = document.getElementById(QUICK_REPLIES_CONTAINER_ID);

  if (!appSettingsState.enabled || !appSettingsState.showQuickReplies) {
    uiManager.safeUnmountRoot(QUICK_REPLIES_CONTAINER_ID);
    if (containerExists) containerExists.style.display = 'none';
    return;
  }

  if (!footer) return;

  let container = containerExists;
  if (!container) {
    container = document.createElement('div');
    container.id = QUICK_REPLIES_CONTAINER_ID;
    container.style.cssText = 'width: 100%; display: block; flex-shrink: 0;';
    footer.parentElement?.insertBefore(container, footer);
  } else {
    container.style.display = 'block';
  }

  uiManager.safeMountRoot(
    QUICK_REPLIES_CONTAINER_ID,
    container,
    <QuickRepliesBar
      quickReplies={quickRepliesState}
      onAddQuickReply={(newReply) => {
        quickRepliesState = [...quickRepliesState, newReply];
        persistToStorage('quickReplies', quickRepliesState);
        renderQuickReplies();
      }}
    />
  );
}

function renderModals() {
  let container = document.getElementById(MODALS_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = MODALS_CONTAINER_ID;
    document.body.appendChild(container);
  }

  uiManager.safeMountRoot(
    MODALS_CONTAINER_ID,
    container,
    <>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          isSettingsOpen = false;
          renderModals();
        }}
        settings={appSettingsState}
        onUpdateSettings={(newSettings) => {
          appSettingsState = newSettings;
          applyPrivacyStyles(newSettings.privacy);
          persistToStorage('settings', newSettings);
          persistToStorage('privacy', newSettings.privacy);
          renderModals();
          renderAll();
        }}
        tags={tagsState}
        onUpdateTag={(updatedTag) => {
          tagsState = tagsState.map((t) => (t.id === updatedTag.id ? updatedTag : t));
          persistToStorage('tags', tagsState);
          renderModals();
          renderAll();
        }}
        onOpenKanban={() => {
          isSettingsOpen = false;
          isKanbanOpen = true;
          renderModals();
        }}
        onScanAll={(tagIds) => scanAllChats(tagIds)}
      />
      <DirectMessageModal
        isOpen={isDirectMsgOpen}
        onClose={() => {
          isDirectMsgOpen = false;
          renderModals();
        }}
      />
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => {
          isExportOpen = false;
          renderModals();
        }}
        contacts={contactsState}
        notes={notesState}
        tags={tagsState}
        contactTags={contactTagsState}
      />
      <KanbanModal
        isOpen={isKanbanOpen}
        onClose={() => {
          isKanbanOpen = false;
          renderModals();
        }}
        onOpenChat={(phone) => {
          openChatByPhone(phone);
        }}
        contacts={contactsState}
        notes={notesState}
        tags={tagsState}
        contactTags={contactTagsState}
        onUpdateContact={(updatedContact) => {
          contactsState = contactsState.map((c) => (c.id === updatedContact.id ? updatedContact : c));
          persistToStorage('contacts', contactsState);
          sendContactToIframe(currentPhone, currentName);
          renderModals();
          renderAll();
        }}
        onAddNote={(contactId, text) => {
          const newNote: Note = {
            id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
            contact_id: contactId,
            description: text,
            created_at: new Date().toISOString(),
          };
          notesState = [...notesState, newNote];
          persistToStorage('notes', notesState);
          renderModals();
          renderAll();
        }}
        onUpdateStage={(contactId, stage) => {
          contactsState = contactsState.map((c) =>
            c.id === contactId ? { ...c, pipeline: stage } : c
          );
          persistToStorage('contacts', contactsState);
          sendContactToIframe(currentPhone, currentName);
          renderModals();
          renderAll();
        }}
        onUpdateContactTags={(contactId, tagIds) => {
          const others = contactTagsState.filter((ct) => ct.contact_id !== contactId);
          const news: ContactTag[] = tagIds.map((tag_id) => ({ contact_id: contactId, tag_id }));
          contactTagsState = [...others, ...news];
          persistToStorage('contactTags', contactTagsState);
          renderModals();
          renderAll();
        }}
        onCreateTag={(tag) => {
          tagsState = [...tagsState, tag];
          persistToStorage('tags', tagsState);
          renderModals();
          renderAll();
        }}
      />
    </>
  );
}

function renderAll() {
  detectChatChange();
  renderMenu();
  renderQuickReplies();
  renderStageBadge();
  renderModals();
}

// ============================================================================
// Configuração de Hotkeys Globais
// ============================================================================

function setupHotkeys() {
  // Alt + K: Abrir/Fechar Kanban
  hotkeysManager.register('alt+k', () => {
    isKanbanOpen = !isKanbanOpen;
    if (isKanbanOpen) isSettingsOpen = false;
    renderModals();
    if (isKanbanOpen) scanAndImportNativeTags(true);
  });

  // Alt + S: Abrir/Fechar Configurações
  hotkeysManager.register('alt+s', () => {
    isSettingsOpen = !isSettingsOpen;
    if (isSettingsOpen) isKanbanOpen = false;
    renderModals();
  });

  // Alt + Q: Alternar Sidebar
  hotkeysManager.register('alt+q', () => {
    toggleSidebar();
  });

  // Escape: Fechar qualquer modal ativo
  hotkeysManager.register('escape', () => {
    if (isKanbanOpen || isSettingsOpen || isDirectMsgOpen || isExportOpen) {
      isKanbanOpen = false;
      isSettingsOpen = false;
      isDirectMsgOpen = false;
      isExportOpen = false;
      renderModals();
    }
  });

  hotkeysManager.start();
}

// ============================================================================
// Inicialização do Ciclo de Vida
// ============================================================================

let isFirstScanDone = false;

function init() {
  setupHotkeys();
  loadStorage();
  injectSidebar();
  renderAll();

  if (!isFirstScanDone) {
    isFirstScanDone = true;
    scanAllChats();
  }

  // Intervalo leve de sincronização de tags (3s)
  setInterval(() => {
    scanAndImportNativeTags();
  }, 3000);

  // Observer com Throttling (250ms) usando requestIdleCallback/setTimeout
  const throttledScanAndRender = () => {
    if (mutationThrottleTimer) return;
    mutationThrottleTimer = setTimeout(() => {
      mutationThrottleTimer = null;
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => {
          renderAll();
          scanAndImportNativeTags();
        });
      } else {
        renderAll();
        scanAndImportNativeTags();
      }
    }, 250);
  };

  const paneSide = document.querySelector('#pane-side');
  if (paneSide) {
    paneSide.addEventListener('scroll', throttledScanAndRender, { passive: true });
  }

  const observer = new MutationObserver(throttledScanAndRender);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
