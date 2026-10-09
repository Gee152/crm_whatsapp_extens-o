import { getBridgeSource } from './bridge';
import { debug } from './debug';

// ============================================================================
// Cliente do bridge (isolated world).
// Injeta o script no main world e troca mensagens via window.postMessage,
// com roteamento de resposta por id + timeout.
//
// IMPORTANTE (CSP): o WhatsApp Web bloqueia scripts INLINE via
// Content-Security-Policy ("Executing inline script violates..."). Por isso o
// bridge é injetado preferencialmente via chrome.scripting.executeScript com
// world: 'MAIN' (executado pelo service worker do background, fora da CSP da
// página). Fallbacks: script externo chrome-extension://…/bridge.js (origem
// permitida pela CSP) e, por último, injeção inline.
// ============================================================================

interface PendingRequest {
  resolve: (value: any) => void;
}

export interface BridgeResult {
  ok: boolean;
  reason?: string;
  method?: string;
}

let bridgeInjected = false;
let listenerAttached = false;
let bridgeReady = false;
const readyWaiters: Array<() => void> = [];
let requestSeq = 0;
const pending = new Map<string, PendingRequest>();

const MAX_INJECTION_ATTEMPTS = 3;

function attachBridgeListener(): void {
  if (listenerAttached) return;
  listenerAttached = true;
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data) return;
    if (data.type === 'WHATS_CRM_BRIDGE_READY') {
      bridgeReady = true;
      readyWaiters.splice(0).forEach((fn) => fn());
      return;
    }
    let value: any = null;
    if (
      data.type === 'WHATS_CRM_LABEL_RESULT' ||
      data.type === 'WHATS_CRM_APPLY_LABEL_RESULT' ||
      data.type === 'WHATS_CRM_NOTE_RESULT'
    ) {
      value = {
        ok: !!data.ok,
        reason: data.reason || undefined,
        method: data.method || undefined,
      } as BridgeResult;
    } else if (data.type === 'WHATS_CRM_LABELS_RESULT') {
      value = Array.isArray(data.names) ? data.names : [];
    } else if (data.type === 'WHATS_CRM_CHATS_RESULT') {
      value = Array.isArray(data.chats) ? data.chats : [];
    } else if (data.type === 'WHATS_CRM_HEALTH_RESULT') {
      value = data.health || null;
    } else {
      return;
    }
    const req = pending.get(data.id);
    if (!req) return;
    pending.delete(data.id);
    req.resolve(value);
  });
}

function ensureBridge(): void {
  attachBridgeListener();
  if (!bridgeInjected) {
    bridgeInjected = true;
    injectBridge(1);
  }
}

/**
 * Tenta injetar o bridge no main world. Na 1ª tentativa prioriza o background
 * (chrome.scripting.executeScript world MAIN — fora da CSP). Em retries tenta
 * o script externo <script src> diretamente: se o executeScript falhou em
 * silêncio (o bridge nunca posta READY), o script externo ainda pode funcionar.
 */
function injectBridge(attempt: number): void {
  debug.bridge('injeção de bridge, tentativa', attempt);
  try {
    if (attempt === 1) {
      if (!injectViaBackground()) {
        injectViaExternalScript();
      }
    } else {
      injectViaExternalScript();
    }
  } catch (err) {
    console.error('[WhatsCRM] Falha ao injetar bridge:', err);
    injectViaExternalScript();
  }
}

/** Solicita ao background a injeção do bridge no MAIN world (sem passar pela CSP). */
function injectViaBackground(): boolean {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return false;
  try {
    chrome.runtime.sendMessage({ type: 'INJECT_BRIDGE' }, (resp) => {
      if (chrome.runtime.lastError || !resp?.ok) {
        console.error(
          '[WhatsCRM] Injeção via background falhou, tentando script externo:',
          chrome.runtime.lastError?.message || resp?.reason
        );
        injectViaExternalScript();
      }
    });
    return true;
  } catch (err) {
    console.error('[WhatsCRM] Falha ao enviar INJECT_BRIDGE:', err);
    return false;
  }
}

/** Fallback: script externo chrome-extension://…/bridge.js (permitido pela CSP). */
function injectViaExternalScript(): void {
  try {
    const url =
      typeof chrome !== 'undefined' && chrome.runtime?.getURL
        ? chrome.runtime.getURL('bridge.js')
        : '';
    if (url) {
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => script.remove();
      script.onerror = () => {
        console.error('[WhatsCRM] Falha ao carregar bridge.js, tentando inline...');
        injectInline();
      };
      (document.head || document.documentElement).appendChild(script);
    } else {
      injectInline();
    }
  } catch (err) {
    console.error('[WhatsCRM] Falha ao injetar script externo:', err);
    injectInline();
  }
}

function injectInline(): void {
  try {
    const script = document.createElement('script');
    script.textContent = getBridgeSource();
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  } catch (err) {
    console.error('[WhatsCRM] Falha ao injetar bridge inline:', err);
  }
}

function waitBridgeReady(timeout = 4000): Promise<void> {
  if (bridgeReady) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(), timeout);
    readyWaiters.push(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function requestBridge<T>(type: string, payload: Record<string, unknown>, timeout = 15000): Promise<T | null> {
  attachBridgeListener();

  // Injeta (e re-injeta) até o bridge anunciar prontidão. Antes, se a injeção
  // falhasse em silêncio, o `bridgeInjected` ficava true para sempre e nunca
  // havia retry — era a causa do bridge_timeout com health null.
  for (let attempt = 1; attempt <= MAX_INJECTION_ATTEMPTS; attempt++) {
    if (!bridgeInjected) {
      bridgeInjected = true;
      injectBridge(attempt);
    }
    await waitBridgeReady(attempt === 1 ? 4000 : 2500);
    if (bridgeReady) break;
    if (attempt < MAX_INJECTION_ATTEMPTS) {
      debug.bridge(`bridge não ficou pronto (tentativa ${attempt}/${MAX_INJECTION_ATTEMPTS}); re-injetando...`);
      bridgeInjected = false;
    }
  }

  if (!bridgeReady) {
    debug.bridge(`bridge indisponível após ${MAX_INJECTION_ATTEMPTS} tentativas`);
    return null;
  }

  return new Promise<T | null>((resolve) => {
    const id = `wcr_${Date.now()}_${++requestSeq}`;
    pending.set(id, { resolve });
    const timer = setTimeout(() => {
      if (pending.delete(id)) resolve(null);
    }, timeout);
    try {
      window.postMessage({ type, id, ...payload }, '*');
    } catch (_e) {
      pending.delete(id);
      clearTimeout(timer);
      resolve(null);
    }
  });
}

/** Busca os nomes das etiquetas nativas já existentes. */
export function getNativeLabels(): Promise<string[]> {
  return requestBridge<string[]>('WHATS_CRM_GET_LABELS', {}).then((names) => names || []);
}

/** Cria uma etiqueta nativa (retorna ok/reason). */
export function createNativeLabel(name: string, color?: string): Promise<BridgeResult> {
  return requestBridge<BridgeResult>('WHATS_CRM_CREATE_LABEL', {
    name,
    color: color || '#00a884',
  }).then((r) => r || { ok: false, reason: 'bridge_timeout' });
}

/** Aplica a etiqueta a uma conversa (best effort). */
export function applyNativeLabelToChat(labelName: string, chatId: string): Promise<BridgeResult> {
  return requestBridge<BridgeResult>('WHATS_CRM_APPLY_LABEL_TO_CHAT', {
    name: labelName,
    chatId,
  }).then((r) => r || { ok: false, reason: 'bridge_timeout' });
}

/** Escreve/atualiza a nota nativa do cliente. */
export function addNativeNote(chatId: string, text: string): Promise<BridgeResult> {
  return requestBridge<BridgeResult>('WHATS_CRM_ADD_NOTE', { chatId, text }).then(
    (r) => r || { ok: false, reason: 'bridge_timeout' }
  );
}

/** Busca todos os chats carregados no WhatsApp (salvos e não salvos) diretamente da memória via bridge. */
export function requestAllChatsFromBridge(): Promise<
  Array<{ id: string; phone: string; name: string; isGroup: boolean; tags: string[] }> | null
> {
  return requestBridge<Array<{ id: string; phone: string; name: string; isGroup: boolean; tags: string[] }>>(
    'WHATS_CRM_GET_ALL_CHATS',
    {},
    8000
  );
}

/** Relatório de saúde do bridge (para diagnóstico). */
export function getBridgeHealth(): Promise<Record<string, unknown> | null> {
  return requestBridge<Record<string, unknown>>('WHATS_CRM_HEALTH', {});
}

/** Loga o health no console para depuração. */
export async function logBridgeHealth(): Promise<void> {
  const h = await getBridgeHealth();
  debug.bridge('health', h);
  console.log('[WhatsCRM] Bridge health:', h);
}
