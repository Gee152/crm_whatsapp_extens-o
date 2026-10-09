// ============================================================================
// Bridge do WhatsApp Web (main world).
//
// O content script roda em um "isolated world" e não tem acesso às variáveis
// JavaScript da página (importNamespace / require / __debug / módulos internos).
// Este arquivo define uma função autocontida cujo .toString() é injetado como
// <script> no main world. Toda a inteligência de acesso aos módulos internos
// (Registry de módulos no padrão wa-js/WPPConnect) vive AQUI, isolada.
//
// Registry (WhatsAppModules): descoberta por CAPACIDADE — em vez de depender de
// nomes de módulo, procura módulos que expõem o método desejado
// (ex.: addNewLabel), com cache de positivos e negativos.
//
// IMPLEMENTAÇÃO (padrão wa-js src/webpack/index.ts):
//   - __debug() via global.require('__debug').modulesMap
//   - importNamespace(id) embrulhado com ErrorGuard.skipGuardGlobal(true)
//   - filtro de ids /^WA/ antes de carregar (evita junk)
// ============================================================================

export function whatsappBridge(this: void): void {
  const win = window as any;
  if (win.__whatscrmBridge) {
    // Já injetado (ex.: recarga da extensão): apenas anuncia prontidão.
    try {
      win.postMessage({ type: 'WHATS_CRM_BRIDGE_READY' }, '*');
    } catch (_e) {}
    return;
  }

  const moduleCache = new Map<string, any>();
  // Tamanho do modulesMap quando um resultado NEGATIVO foi cacheado. Se o
  // WhatsApp carregar mais módulos depois (inicialização progressiva), o
  // cache negativo é invalidado e a descoberta re-executa.
  const negCacheSize = new Map<string, number>();

  // --------------------------------------------------------------------------
  // WhatsAppModules: Registry de módulos internos
  // --------------------------------------------------------------------------
  const Modules = {
    importNamespace(name: string): any {
      try {
        const eg = win.ErrorGuard;
        if (eg && typeof eg.skipGuardGlobal === 'function') eg.skipGuardGlobal(true);
        return win.importNamespace(name);
      } catch (_e) {
        return undefined;
      }
    },

    loadModule(name: string): any {
      try {
        if (typeof win.importNamespace === 'function') {
          const m = this.importNamespace(name);
          if (m !== undefined && m !== null) return m;
        }
      } catch (_e) {}
      try {
        if (typeof win.require === 'function') return win.require(name);
      } catch (_e) {}
      return undefined;
    },

    debugMap(): any {
      try {
        if (win.require && typeof win.require === 'function') {
          const d = win.require('__debug');
          if (d && d.modulesMap) return d.modulesMap;
        }
      } catch (_e) {}
      return null;
    },

    unwrap(m: any): any {
      if (!m) return m;
      if (m.LabelCollectionImpl && typeof m.LabelCollectionImpl.addNewLabel === 'function') return m.LabelCollectionImpl;
      if (m.LabelCollection && typeof m.LabelCollection.addNewLabel === 'function') return m.LabelCollection;
      if (m.default && typeof m.default.addNewLabel === 'function') return m.default;
      return m;
    },

    /**
     * Descoberta por capacidade. `matcher(module)` decide se é o módulo certo.
     * `hints` (regex opcional) restringe os ids a analisar primeiro.
     */
    findByCapability(matcher: (m: any) => boolean, hints?: RegExp): any {
      const cacheKey = String(matcher);
      if (moduleCache.has(cacheKey)) {
        const cached = moduleCache.get(cacheKey);
        if (cached) return cached;
        // Cache negativo: re-verifica se o WhatsApp carregou mais módulos
        // desde a varredura que falhou (inicialização progressiva).
        const mapNow = this.debugMap();
        const sizeNow = mapNow ? Object.keys(mapNow).length : 0;
        if (negCacheSize.has(cacheKey) && sizeNow <= (negCacheSize.get(cacheKey) || 0)) {
          return null;
        }
        // Invalidou: re-executa a descoberta
      }

      const map = this.debugMap();
      if (map) {
        const ids = Object.keys(map);

        const hinted: string[] = [];
        const rest: string[] = [];
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          if (id.charAt(0) === 'u' && id.charAt(1) === 's' && id.charAt(2) === 'e') continue;
          if (!/^WA/.test(id)) continue;
          if (hints && hints.test(id)) hinted.push(id);
          else rest.push(id);
        }
        const candidates = hinted.concat(rest);

        for (let i = 0; i < candidates.length; i++) {
          const id = candidates[i];
          let m: any;
          try {
            m = this.loadModule(id);
          } catch (_e) {
            continue;
          }
          const u = this.unwrap(m);
          if (u && matcher(u)) {
            moduleCache.set(cacheKey, u);
            negCacheSize.delete(cacheKey);
            return u;
          }
        }
      }

      moduleCache.set(cacheKey, null);
      negCacheSize.set(cacheKey, map ? Object.keys(map).length : 0);
      return null;
    },
  };

  function findLabelStore(): any {
    const strict = (m: any) =>
      typeof m.addNewLabel === 'function' &&
      typeof m.getLabelColorPalette === 'function' &&
      typeof m.addOrRemoveLabels === 'function';
    const relaxed = (m: any) =>
      typeof m.addNewLabel === 'function' && typeof m.addOrRemoveLabels === 'function';
    const loose = (m: any) => typeof m.addNewLabel === 'function';
    const hints = /^WA(?:Web)?Label/;
    return (
      Modules.findByCapability(strict, hints) ||
      Modules.findByCapability(relaxed, hints) ||
      Modules.findByCapability(loose, hints) ||
      Modules.findByCapability(loose)
    );
  }

  function findLabelAddAction(): any {
    return Modules.findByCapability(
      (m: any) => typeof m.labelAddAction === 'function',
      /^WA(?:Web)?Label.*Action/
    );
  }

  function findChatStore(): any {
    return Modules.findByCapability(
      (m: any) =>
        typeof m.get === 'function' &&
        typeof m.getModelsArray === 'function',
      /^WA(?:Web)?ChatCollection/
    );
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  function normalizeHex(c: any): string {
    if (typeof c === 'string') {
      c = c.trim();
      if (/^[0-9a-f]{6}$/i.test(c)) return '#' + c.toLowerCase();
      if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
    }
    return '#00a884';
  }

  function hexToColorIndex(hex: any): number {
    const normalized = normalizeHex(hex);
    try {
      const store = findLabelStore();
      const pal =
        store && typeof store.getLabelColorPalette === 'function'
          ? store.getLabelColorPalette()
          : null;
      if (pal && typeof pal.length === 'number') {
        for (let i = 0; i < pal.length; i++) {
          if (String(pal[i] || '').toLowerCase() === normalized) return i;
        }
      }
    } catch (_e) {}
    return 0;
  }

  function findChat(chatId: string): any {
    try {
      const store = findChatStore();
      if (!store) return null;
      if (typeof store.get === 'function') {
        const c = store.get(chatId);
        if (c) return c;
      }
      if (typeof store.getModelsArray === 'function') {
        const chats = store.getModelsArray();
        for (let i = 0; i < chats.length; i++) {
          const id = chats[i] && chats[i].id;
          if (String(id || '') === chatId) return chats[i];
        }
      }
    } catch (_e) {}
    return null;
  }

  function getModels(store: any): any[] {
    if (!store) return [];
    try {
      if (typeof store.getModelsArray === 'function') return store.getModelsArray();
      if (Array.isArray(store.models)) return store.models;
    } catch (_e) {}
    return [];
  }

  // --------------------------------------------------------------------------
  // Operações
  // --------------------------------------------------------------------------
  function listLabels(): string[] {
    try {
      const store = findLabelStore();
      const models = getModels(store);
      const names: string[] = [];
      for (let i = 0; i < models.length; i++) {
        const n = models[i] && models[i].name;
        if (n) names.push(String(n));
      }
      return names;
    } catch (_e) {
      return [];
    }
  }

  function listAllChats(): any[] {
    try {
      const store = findChatStore();
      const models = getModels(store);
      const labelStore = findLabelStore();
      const labelModels = getModels(labelStore);
      const labelMap = new Map<string, string>();
      for (let i = 0; i < labelModels.length; i++) {
        const lm = labelModels[i];
        if (lm && lm.id && lm.name) {
          labelMap.set(String(lm.id), String(lm.name));
        }
      }

      const chats: any[] = [];
      for (let i = 0; i < models.length; i++) {
        const c = models[i];
        if (!c) continue;
        const rawId = c.id ? (typeof c.id === 'string' ? c.id : c.id._serialized || c.id.user || '') : '';
        const isGroup = !!(c.isGroup || rawId.includes('@g.us') || (c.id && c.id.server === 'g.us'));
        
        // Extrai apenas dígitos do número (ex: 558196577573)
        const digits = rawId.replace(/\D/g, '');
        
        let name = c.formattedTitle || c.name || '';
        if (!name && c.contact) {
          name = c.contact.name || c.contact.pushname || c.contact.formattedName || '';
        }
        if (!name) name = digits || 'Contato';

        const tags: string[] = [];
        if (Array.isArray(c.labels)) {
          for (let j = 0; j < c.labels.length; j++) {
            const l = c.labels[j];
            const tagId = typeof l === 'string' ? l : (l && l.id ? String(l.id) : '');
            const tagName = (l && l.name) || labelMap.get(tagId) || tagId;
            if (tagName) tags.push(tagName);
          }
        }

        chats.push({
          id: rawId,
          phone: digits || rawId,
          name: String(name).trim(),
          isGroup,
          tags,
        });
      }
      return chats;
    } catch (_e) {
      return [];
    }
  }

  function createLabel(name: string, color: any): Promise<{ ok: boolean; reason?: string; method?: string }> {
    type R = { ok: boolean; reason?: string; method?: string };
    return Promise.resolve()
      .then((): R | Promise<R> => {
        const store = findLabelStore();
        if (store) {
          const res = store.addNewLabel(name, normalizeHex(color));
          return Promise.resolve(res).then((): R => ({ ok: true, method: 'addNewLabel' }));
        }
        const action = findLabelAddAction();
        if (action) {
          const res = action(name, hexToColorIndex(color));
          return Promise.resolve(res).then((): R => ({ ok: true, method: 'labelAddAction' }));
        }
        return { ok: false, reason: 'label_store_not_found' };
      })
      .catch((): R => ({ ok: false, reason: 'exception' }));
  }

  function applyLabelToChat(labelName: string, chatId: string): Promise<{ ok: boolean; reason?: string }> {
    return Promise.resolve()
      .then(() => {
        const store = findLabelStore();
        if (!store || typeof store.addOrRemoveLabels !== 'function') {
          return { ok: false, reason: 'no_addOrRemoveLabels' };
        }
        const models = getModels(store);
        let label: any = null;
        for (let i = 0; i < models.length; i++) {
          const n = String((models[i] && models[i].name) || '');
          if (n.toLowerCase() === String(labelName || '').toLowerCase()) {
            label = models[i];
            break;
          }
        }
        if (!label) return { ok: false, reason: 'label_not_found' };
        const chat = findChat(chatId);
        if (!chat) return { ok: false, reason: 'chat_not_found' };
        const res = store.addOrRemoveLabels([{ id: label.id, type: 'add' }], [chat]);
        return Promise.resolve(res).then(() => ({ ok: true }));
      })
      .catch(() => ({ ok: false, reason: 'exception' }));
  }

  function addNativeNote(chatId: string, text: string): Promise<{ ok: boolean; reason?: string }> {
    return Promise.resolve()
      .then(() => {
        const chat = findChat(chatId);
        if (!chat) return { ok: false, reason: 'chat_not_found' };
        const fn = chat.addOrEditCustomerNote;
        if (typeof fn !== 'function') return { ok: false, reason: 'no_addOrEditCustomerNote' };
        const res = fn.call(chat, text);
        return Promise.resolve(res).then(() => ({ ok: true }));
      })
      .catch(() => ({ ok: false, reason: 'exception' }));
  }

  function health(): Record<string, unknown> {
    const store = findLabelStore();
    const methods: Record<string, boolean> = {};
    if (store) {
      ['addNewLabel', 'addOrRemoveLabels', 'getLabelColorPalette', 'getModelsArray'].forEach(
        (k) => (methods[k] = typeof store[k] === 'function')
      );
    }
    let modulesMapSize = 0;
    try {
      const m = Modules.debugMap();
      if (m) modulesMapSize = Object.keys(m).length;
    } catch (_e) {}
    return {
      importNamespace: typeof win.importNamespace === 'function',
      require: typeof win.require === 'function',
      d: typeof win.__d !== 'undefined',
      errorGuard: !!win.ErrorGuard,
      modulesMapSize,
      labelStore: !!store,
      labelAddAction: !!findLabelAddAction(),
      chatStore: !!findChatStore(),
      labelMethods: methods,
    };
  }

  // --------------------------------------------------------------------------
  // Roteamento de mensagens (isolated world <-> main world)
  // --------------------------------------------------------------------------
  function handleRequest(data: any): void {
    if (!data || !data.type || data.type.indexOf('WHATS_CRM_') !== 0) return;
    const post = (type: string, payload: Record<string, unknown>) => {
      try {
        win.postMessage({ type, ...payload }, '*');
      } catch (_e) {}
    };

    if (data.type === 'WHATS_CRM_CREATE_LABEL') {
      createLabel(String(data.name || ''), data.color).then((r) => {
        post('WHATS_CRM_LABEL_RESULT', { id: data.id, ok: r.ok, reason: r.reason || '', method: r.method || '' });
      });
    } else if (data.type === 'WHATS_CRM_GET_LABELS') {
      try {
        post('WHATS_CRM_LABELS_RESULT', { id: data.id, names: listLabels() });
      } catch (_e) {
        post('WHATS_CRM_LABELS_RESULT', { id: data.id, names: [] });
      }
    } else if (data.type === 'WHATS_CRM_GET_ALL_CHATS') {
      try {
        post('WHATS_CRM_CHATS_RESULT', { id: data.id, chats: listAllChats() });
      } catch (_e) {
        post('WHATS_CRM_CHATS_RESULT', { id: data.id, chats: [] });
      }
    } else if (data.type === 'WHATS_CRM_APPLY_LABEL_TO_CHAT') {
      applyLabelToChat(String(data.name || ''), String(data.chatId || '')).then((r) => {
        post('WHATS_CRM_APPLY_LABEL_RESULT', { id: data.id, ok: r.ok, reason: r.reason || '' });
      });
    } else if (data.type === 'WHATS_CRM_ADD_NOTE') {
      addNativeNote(String(data.chatId || ''), String(data.text || '')).then((r) => {
        post('WHATS_CRM_NOTE_RESULT', { id: data.id, ok: r.ok, reason: r.reason || '' });
      });
    } else if (data.type === 'WHATS_CRM_HEALTH') {
      try {
        post('WHATS_CRM_HEALTH_RESULT', { id: data.id, health: health() });
      } catch (_e) {
        post('WHATS_CRM_HEALTH_RESULT', { id: data.id, health: {} });
      }
    }
  }

  win.addEventListener('message', handleRequest);
  win.__whatscrmBridge = {
    createLabel,
    applyLabelToChat,
    addNativeNote,
    listAllChats,
    health,
    modules: Modules,
  };
  try {
    win.postMessage({ type: 'WHATS_CRM_BRIDGE_READY' }, '*');
  } catch (_e) {}
}

export function getBridgeSource(): string {
  return `(${whatsappBridge.toString()})();`;
}


