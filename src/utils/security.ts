/**
 * Utilitários de Segurança e Sanitização - WhatsCRM
 */

export const MESSAGE_SOURCE = 'WHAT_S_CRM_SECURE_CHANNEL' as const;
export const PROTOCOL_VERSION = '1.1.0' as const;

export interface SecureEnvelope<T = unknown> {
  source: typeof MESSAGE_SOURCE;
  version: typeof PROTOCOL_VERSION;
  nonce: string;
  type: string;
  payload: T;
}

/**
 * Cria um envelope seguro com assinatura e nonce para comunicação entre contextos (Main <-> Content script <-> Iframe).
 */
export function createSecureEnvelope<T>(type: string, payload: T): SecureEnvelope<T> {
  return {
    source: MESSAGE_SOURCE,
    version: PROTOCOL_VERSION,
    nonce: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type,
    payload,
  };
}

/**
 * Valida se um evento message originou-se do canal seguro esperado.
 */
export function isValidSecureEnvelope<T = unknown>(data: unknown): data is SecureEnvelope<T> {
  if (!data || typeof data !== 'object') return false;
  const env = data as Partial<SecureEnvelope>;
  return env.source === MESSAGE_SOURCE && env.version === PROTOCOL_VERSION && typeof env.type === 'string';
}

/**
 * Mascara dados sensíveis de identificação pessoal (PII) para segurança de exibição.
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return '***';
  const visibleStart = phone.slice(0, 4);
  const visibleEnd = phone.slice(-2);
  const maskedLength = Math.max(phone.length - 6, 2);
  return `${visibleStart}${'*'.repeat(maskedLength)}${visibleEnd}`;
}

export function maskName(name: string): string {
  if (!name || name.trim().length === 0) return '***';
  const parts = name.trim().split(/\s+/);
  return parts.map(p => p[0] + '*'.repeat(Math.max(p.length - 1, 1))).join(' ');
}

/**
 * Cria nós DOM de forma segura sem risco de injeção XSS por innerHTML.
 */
export function createSafeElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options?: {
    className?: string;
    id?: string;
    text?: string;
    style?: Partial<CSSStyleDeclaration>;
    children?: (HTMLElement | string)[];
  }
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tagName);
  if (options?.className) el.className = options.className;
  if (options?.id) el.id = options.id;
  if (options?.text) el.textContent = options.text;
  if (options?.style) {
    Object.assign(el.style, options.style);
  }
  if (options?.children) {
    for (const child of options.children) {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else {
        el.appendChild(child);
      }
    }
  }
  return el;
}
