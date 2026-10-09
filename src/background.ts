chrome.runtime.onInstalled.addListener(() => {
  console.log('WhatsCRM Preview installed');
});

// Injeta o bridge no MAIN WORLD via chrome.scripting.executeScript.
// Diferente de <script src> ou inline, o executeScript NÃO está sujeito à
// Content-Security-Policy da página — é a forma confiável de acessar os
// módulos internos do WhatsApp Web (importNamespace/require).
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'INJECT_BRIDGE') {
    const tabId = sender?.tab?.id;
    if (typeof tabId !== 'number') {
      sendResponse({ ok: false, reason: 'no_tab_id' });
      return;
    }
    chrome.scripting
      .executeScript({
        target: { tabId },
        files: ['bridge.js'],
        world: 'MAIN',
      })
      .then(() => sendResponse({ ok: true }))
      .catch((err) => {
        console.error('[WhatsCRM] executeScript bridge falhou:', err);
        sendResponse({ ok: false, reason: String(err) });
      });
    return true; // resposta assíncrona
  }
  return undefined;
});
