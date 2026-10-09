import type { PrivacySettings } from '../types';

export function waitForApp(): Promise<void> {
  return new Promise(resolve => {
    const check = () => {
      if (document.querySelector('#app') || document.getElementById('app')) {
        resolve();
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  });
}

export function findChatHeader(): HTMLElement | null {
  const selectors = [
    'header',
    '[data-testid="conversation-header"]',
    'header div[role="button"]',
  ];
  const main = document.querySelector('#app') || document.body;
  for (const sel of selectors) {
    const el = main.querySelector<HTMLElement>(sel);
    if (el) return el.closest('header') || el;
  }
  return main.querySelector<HTMLElement>('header');
}

export function findActionsContainer(header: HTMLElement): HTMLElement | null {
  const lastChild = header.lastElementChild;
  if (!lastChild) return null;
  const btns = lastChild.querySelectorAll<HTMLElement>('[role="button"]');
  if (btns.length >= 2) return lastChild as HTMLElement;
  if (header.children.length >= 2) {
    const candidate = header.children[header.children.length - 1] as HTMLElement;
    if (candidate.querySelector('[role="button"]')) return candidate;
  }
  return null;
}

export function getContactName(): string {
  const nameSpan = document.querySelector<HTMLElement>(
    'header span[dir="auto"], [data-testid="conversation-header"] span[dir="auto"]'
  );
  if (nameSpan?.textContent?.trim()) return nameSpan.textContent.trim();
  const title = document.title.replace('WhatsApp', '').trim();
  if (title) return title;
  return 'Desconhecido';
}

export function getContactPhone(): string {
  const selected = document.querySelector<HTMLElement>(
    '[aria-selected="true"], [data-testid="conversation-info-header"]'
  );
  const jidEl = selected?.closest('[data-id]') || document.querySelector<HTMLElement>('[data-id^="true_"]');
  const dataId = jidEl?.getAttribute('data-id');
  if (dataId) {
    const match = dataId.match(/(\d+)/);
    if (match) return match[1];
  }
  const subtitle = document.querySelector<HTMLElement>(
    'header div[title] span, [data-testid="conversation-header"] div[title]'
  );
  if (subtitle?.textContent) {
    const digits = subtitle.textContent.replace(/\D/g, '');
    if (digits.length >= 10) return digits;
  }
  return '';
}

/**
 * Injeta o texto na caixa de mensagem ativa do WhatsApp Web
 */
export function injectTextMessageIntoChatInput(text: string): boolean {
  const inputSelectors = [
    'footer div[contenteditable="true"]',
    '#main footer [contenteditable="true"]',
    '[data-testid="conversation-compose-box-input"]',
    'div[contenteditable="true"][data-tab="10"]',
    'div[contenteditable="true"]',
  ];

  let inputEl: HTMLElement | null = null;
  for (const sel of inputSelectors) {
    const found = document.querySelector<HTMLElement>(sel);
    if (found) {
      inputEl = found;
      break;
    }
  }

  if (!inputEl) {
    console.warn('[WhatsCRM] Input de mensagem não encontrado.');
    return false;
  }

  inputEl.focus();

  // Tenta execCommand para emular digitação do usuário nativa
  const successful = document.execCommand('insertText', false, text);
  if (!successful) {
    // Fallback: altera innerText e dispara os eventos do DOM
    inputEl.innerText = text;
    const event = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      data: text,
    });
    inputEl.dispatchEvent(event);
  }

  return true;
}

/**
 * Abre conversa com um número não salvo
 */
export function openDirectChat(phone: string): void {
  const cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return;
  
  // Tenta utilizar a API interna ou link do WhatsApp Web
  const link = document.createElement('a');
  link.href = `https://web.whatsapp.com/send?phone=${cleaned}`;
  link.setAttribute('data-action', 'open-direct-chat');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

let blurObserver: MutationObserver | null = null;

function markLastReceivedMessage() {
  document.querySelectorAll('[data-whatscrm-noblur]').forEach(el => {
    el.removeAttribute('data-whatscrm-noblur');
  });
  const received = document.querySelectorAll<HTMLElement>('.message-in');
  if (received.length > 0) {
    received[received.length - 1].setAttribute('data-whatscrm-noblur', 'true');
  }
}

function setupBlurObserver() {
  if (blurObserver) blurObserver.disconnect();
  const container = document.querySelector<HTMLElement>(
    '[data-testid="conversation-panel-messages"], [data-testid^="conversation-panel-"], div[role="region"]',
  ) || document.querySelector('#app > div');
  if (!container) return;
  blurObserver = new MutationObserver(() => markLastReceivedMessage());
  blurObserver.observe(container, { childList: true, subtree: true });
}

function teardownBlurObserver() {
  if (blurObserver) {
    blurObserver.disconnect();
    blurObserver = null;
  }
  document.querySelectorAll('[data-whatscrm-noblur]').forEach(el => {
    el.removeAttribute('data-whatscrm-noblur');
  });
}

/**
 * Aplica/Atualiza estilos de privacidade (Blur) na página
 * Para blurMessages: todas as mensagens são borradas exceto a última mensagem recebida,
 * permitindo que o usuário veja a resposta mais recente e possa responder sem expor
 * o histórico anterior.
 */
export function applyPrivacyStyles(settings: PrivacySettings): void {
  const STYLE_ID = 'whatscrm-privacy-styles';
  let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);
  }

  let css = '';

  if (settings.blurMessages) {
    css += `
      div[data-id] .message-in:not([data-whatscrm-noblur]) span,
      div[data-id] .message-out span,
      [data-testid="msg-container"]:not([data-whatscrm-noblur]) {
        filter: blur(6px) !important;
        transition: filter 0.2s ease !important;
        cursor: pointer !important;
      }
      div[data-id] .message-in:not([data-whatscrm-noblur]):hover span,
      div[data-id] .message-out:hover span,
      [data-testid="msg-container"]:not([data-whatscrm-noblur]):hover {
        filter: blur(0px) !important;
      }
    `;
  }

  if (settings.blurNames) {
    css += `
      #pane-side span[dir="auto"],
      header span[dir="auto"] {
        filter: blur(5px) !important;
        transition: filter 0.2s ease !important;
      }
      #pane-side span[dir="auto"]:hover,
      header span[dir="auto"]:hover {
        filter: blur(0px) !important;
      }
    `;
  }

  if (settings.blurPhotos) {
    css += `
      #pane-side img,
      header img,
      div[role="button"] img {
        filter: blur(8px) !important;
        transition: filter 0.2s ease !important;
      }
      #pane-side img:hover,
      header img:hover,
      div[role="button"] img:hover {
        filter: blur(0px) !important;
      }
    `;
  }

  if (settings.blurMedia) {
    css += `
      [data-testid="msg-container"] img,
      [data-testid="msg-container"] video {
        filter: blur(12px) !important;
        transition: filter 0.2s ease !important;
      }
      [data-testid="msg-container"] img:hover,
      [data-testid="msg-container"] video:hover {
        filter: blur(0px) !important;
      }
    `;
  }

  styleEl.textContent = css;

  if (settings.blurMessages) {
    markLastReceivedMessage();
    setupBlurObserver();
  } else {
    teardownBlurObserver();
  }
}

export function observeChatChanges(onChange: () => void): MutationObserver {
  const target = document.querySelector('#app') || document.body;
  const observer = new MutationObserver(() => {
    onChange();
  });
  observer.observe(target, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  });
  return observer;
}
