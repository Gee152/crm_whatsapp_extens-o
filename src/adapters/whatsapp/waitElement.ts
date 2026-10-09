import { debug } from './debug';

export interface WaitResult<T extends Element> {
  element: T | null;
  timedOut: boolean;
}

const DEFAULTS = { timeout: 8000, interval: 200 };

export interface WaitElementOptions {
  timeout?: number;
  interval?: number;
  /** Se true, valida que o elemento está visível (offsetParent != null). */
  visible?: boolean;
  /** Devolve um resultado combinado (AND) de todos os seletores, na ordem. */
  all?: string[];
}

/**
 * Aguarda um elemento aparecer no DOM usando MutationObserver + polling leve.
 * Substitui polling manual com setTimeout.
 */
export function waitElement(
  selectors: string | string[],
  options: WaitElementOptions = {}
): Promise<WaitResult<HTMLElement>> {
  const timeout = options.timeout ?? DEFAULTS.timeout;
  const interval = options.interval ?? DEFAULTS.interval;
  const selectorsList = Array.isArray(selectors) ? selectors : [selectors];

  const find = (): HTMLElement | null => {
    for (const sel of selectorsList) {
      try {
        const el = document.querySelector<HTMLElement>(sel);
        if (!el) continue;
        if (options.visible && el.offsetParent === null) continue;
        return el;
      } catch (_e) {
        /* seletor inválido: ignora */
      }
    }
    return null;
  };

  const found = find();
  if (found) return Promise.resolve({ element: found, timedOut: false });

  return new Promise((resolve) => {
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const finish = (element: HTMLElement | null, timedOut: boolean) => {
      if (timer) clearTimeout(timer);
      if (observer) observer.disconnect();
      resolve({ element, timedOut });
    };

    const check = () => {
      if (Date.now() - startedAt >= timeout) {
        finish(null, true);
        return;
      }
      const el = find();
      if (el) finish(el, false);
      else timer = setTimeout(check, interval);
    };

    let observer: MutationObserver | null = null;
    try {
      observer = new MutationObserver(() => {
        const el = find();
        if (el) finish(el, false);
      });
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (_e) {
      /* MutationObserver indisponível: mantém polling */
    }

    timer = setTimeout(check, interval);
  });
}

/** Clica no primeiro elemento que aparecer (com fallback de tempo). */
export async function clickFirst(
  selectors: string | string[],
  options: WaitElementOptions = {}
): Promise<boolean> {
  const { element, timedOut } = await waitElement(selectors, options);
  if (!element || timedOut) {
    debug.ui('clickFirst: elemento não encontrado', selectors);
    return false;
  }
  triggerClick(element);
  return true;
}

/** Dispara clique de forma compatível com React (mousedown/mouseup/click). */
export function triggerClick(el: HTMLElement): void {
  try {
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    el.click();
  } catch (_e) {
    el.click();
  }
}

/** Atribui valor a um input/contenteditable disparando o evento certo para o React. */
export function setInputValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLElement, value: string): boolean {
  if (!el) return false;
  const proto = 'value' in el ? el.constructor.prototype : null;
  if (proto && Object.getOwnPropertyDescriptor(proto, 'value')) {
    try {
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, value);
      else (el as HTMLInputElement).value = value;
    } catch (_e) {
      (el as HTMLInputElement).value = value;
    }
  } else {
    (el as HTMLInputElement).value = value;
  }

  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value } as any));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

/** Pressiona Enter no elemento (para confirmar criação de etiqueta/nota). */
export function pressEnter(el: Element): void {
  const opts = { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13, which: 13 } as KeyboardEventInit;
  el.dispatchEvent(new KeyboardEvent('keydown', opts));
  el.dispatchEvent(new KeyboardEvent('keypress', opts));
  el.dispatchEvent(new KeyboardEvent('keyup', opts));
}

/** Busca um elemento por texto (case-insensitive, i18n). */
export function findElementByText(
  root: ParentNode,
  textPatterns: RegExp,
  selector = 'div, span, li, button, a, [role="button"], [role="menuitem"], [role="option"]'
): HTMLElement | null {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector));
  for (const el of nodes) {
    const text =
      el.getAttribute('aria-label') ||
      el.getAttribute('title') ||
      el.textContent ||
      '';
    if (textPatterns.test(text.trim())) {
      if (el.offsetParent !== null || el.closest('[role="dialog"], [role="menu"], [role="listbox"]')) {
        return el;
      }
    }
  }
  return null;
}

/** Espera até um texto aparecer em algum diálogo/popup. */
export async function waitForText(
  textPatterns: RegExp,
  options: WaitElementOptions = {}
): Promise<WaitResult<HTMLElement>> {
  const timeout = options.timeout ?? DEFAULTS.timeout;
  const interval = options.interval ?? DEFAULTS.interval;
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const check = () => {
      const el = findElementByText(document.body, textPatterns);
      if (el) {
        if (observer) observer.disconnect();
        resolve({ element: el, timedOut: false });
        return;
      }
      if (Date.now() - startedAt >= timeout) {
        if (observer) observer.disconnect();
        resolve({ element: null, timedOut: true });
        return;
      }
      setTimeout(check, interval);
    };
    let observer: MutationObserver | null = null;
    try {
      observer = new MutationObserver(() => {
        const el = findElementByText(document.body, textPatterns);
        if (el) {
          if (observer) observer.disconnect();
          resolve({ element: el, timedOut: false });
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (_e) {}
    setTimeout(check, interval);
  });
}

/** Pressiona ESC no body (fecha popups/dialogs). */
export function pressEscape(): void {
  document.body.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape', code: 'Escape', keyCode: 27 })
  );
  document.body.dispatchEvent(
    new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: 'Escape', code: 'Escape', keyCode: 27 })
  );
}
