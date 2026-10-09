/**
 * Gerenciador de Atalhos Globais de Teclado (Hotkeys)
 */

export type HotkeyHandler = (e: KeyboardEvent) => void;

export class HotkeysManager {
  private handlers = new Map<string, HotkeyHandler>();
  private boundListener: (e: KeyboardEvent) => void;
  private isListening = false;

  constructor() {
    this.boundListener = this.handleKeyDown.bind(this);
  }

  start() {
    if (this.isListening) return;
    window.addEventListener('keydown', this.boundListener, true);
    this.isListening = true;
  }

  stop() {
    if (!this.isListening) return;
    window.removeEventListener('keydown', this.boundListener, true);
    this.isListening = false;
  }

  register(combination: string, handler: HotkeyHandler) {
    this.handlers.set(combination.toLowerCase(), handler);
  }

  unregister(combination: string) {
    this.handlers.delete(combination.toLowerCase());
  }

  private handleKeyDown(e: KeyboardEvent) {
    // Ignora se o usuário estiver digitando em inputs normais, a não ser que seja Escape ou atalho com Alt
    const target = e.target as HTMLElement | null;
    const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

    const parts: string[] = [];
    if (e.altKey) parts.push('alt');
    if (e.ctrlKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.metaKey) parts.push('meta');
    parts.push(e.key.toLowerCase());

    const combo = parts.join('+');

    if (this.handlers.has(combo)) {
      if (isInput && !e.altKey && e.key !== 'Escape') {
        return; // Não intercepta digitação normal
      }
      e.preventDefault();
      e.stopPropagation();
      this.handlers.get(combo)?.(e);
    }
  }
}

export const hotkeysManager = new HotkeysManager();
