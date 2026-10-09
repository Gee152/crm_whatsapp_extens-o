import { debug } from '../debug';
import {
  findElementByText,
  pressEnter,
  pressEscape,
  setInputValue,
  triggerClick,
  waitElement,
  waitForText,
} from '../waitElement';
import type { LabelStrategy, LabelStrategyResult } from './NativeLabelStrategy';

const I18N_LABELS = /etiqueta|label|lista|tag/i;
const I18N_NEW_LABEL = /nova lista|new list|nova etiqueta|new label|crear lista|create list|crear etiqueta|create label/i;
const I18N_DONE = /feito|done|ok|conclu/i;
const ADD_ICON_SELECTORS = [
  '[data-icon="add"]',
  '[data-icon="plus"]',
  'svg title[textContent="ic-add"]',
  'span[aria-hidden="true"] svg title',
];

/**
 * Estratégia de fallback por automação da UI nativa:
 *   menu ⋮ do chat → "Etiquetas" → "Nova etiqueta" → digitar nome → confirmar.
 * Cobre a criação visível mesmo quando os módulos internos mudam de nome.
 */
export class UiLabelStrategy implements LabelStrategy {
  readonly name = 'ui';

  async create(name: string, _color?: string, _chatId?: string): Promise<LabelStrategyResult> {
    try {
      if (!document.querySelector('#main')) {
        return { ok: false, reason: 'no_open_chat' };
      }

      const menuOpened = await this.openChatMenu();
      if (!menuOpened) return { ok: false, reason: 'chat_menu_not_found' };

      const labelsClicked = await this.clickLabelMenuItem();
      if (!labelsClicked) return { ok: false, reason: 'labels_menu_item_not_found' };

      const newLabelClicked = await this.clickNewLabelItem();
      if (!newLabelClicked) return { ok: false, reason: 'new_label_item_not_found' };

      const typed = await this.typeLabelName(name);
      if (!typed) return { ok: false, reason: 'label_input_not_found' };

      await this.ensureChecked(name);
      await this.confirm();
      this.close();

      debug.ui('etiqueta criada via UI', name);
      return { ok: true, applied: true };
    } catch (err) {
      debug.ui('falha no fallback de UI', err);
      this.close();
      return { ok: false, reason: 'ui_exception' };
    }
  }

  private async openChatMenu(): Promise<boolean> {
    const selectors = [
      '#main header [data-testid="menu-bar-conversation"]',
      '#main header div[role="button"][aria-label*="Mais" i]',
      '#main header div[role="button"][aria-label*="Menu" i]',
      '#main header div[role="button"][aria-label*="Opções" i]',
      '#main header div[role="button"][aria-label*="Options" i]',
      '#main header button[aria-label*="Mais" i]',
      '#main header button[aria-label*="Menu" i]',
      '#main header [data-icon="menu-down"]',
      '#main header [data-icon="menu"]',
    ];
    const { element } = await waitElement(selectors, { timeout: 6000, visible: true });
    if (element) {
      triggerClick(element);
      return true;
    }
    const byText = findElementByText(
      document,
      /^(mais|menu|more|opç|opc|options)$/i,
      '#main header button, #main header [role="button"]'
    );
    if (byText) {
      triggerClick(byText);
      return true;
    }
    return false;
  }

  private async clickLabelMenuItem(): Promise<boolean> {
    const { element } = await waitForText(I18N_LABELS, { timeout: 4000 });
    if (!element) return false;
    const clickable =
      element.closest<HTMLElement>('[role="menuitem"], [role="button"], li') || element;
    triggerClick(clickable);
    return true;
  }

  private async clickNewLabelItem(): Promise<boolean> {
    // 1) Busca o texto do botão nativo ("Nova lista" / "New list" / etc.)
    const { element } = await waitForText(I18N_NEW_LABEL, { timeout: 4000 });
    if (element) {
      const clickable =
        element.closest<HTMLElement>('[role="button"], [role="menuitem"], [role="option"]') ||
        element;
      triggerClick(clickable);
      // Se o elemento for texto puro (span/div sem role), garante o clique no container
      if (!clickable.hasAttribute('role') && element.parentElement && element.parentElement !== clickable) {
        triggerClick(element.parentElement);
      }
      return true;
    }

    // 2) Fallback: ícone "+" (ic-add) dentro do popup de etiquetas
    for (const sel of ADD_ICON_SELECTORS) {
      const icon = document.querySelector<HTMLElement>(sel);
      if (!icon) continue;
      const row = icon.closest('[role="button"], [role="menuitem"], [role="option"], div');
      if (row) {
        triggerClick(row as HTMLElement);
        return true;
      }
    }
    return false;
  }

  private async typeLabelName(name: string): Promise<boolean> {
    // Busca o input de etiqueta iterando TODOS os candidatos (querySelectorAll)
    // e pulando composer de chat e campos de busca. Antes, waitElement devolvia
    // só o PRIMEIRO match da lista — no Web o campo de busca vinha antes do
    // input de etiqueta, era rejeitado pelo guard e o fluxo nunca chegava ao
    // input real (label_input_not_found).
    const inputSel = await this.findLabelInput();
    if (!inputSel) {
      debug.ui('input de etiqueta não encontrado', 'label_input_not_found');
      return false;
    }

    const el = inputSel;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      setInputValue(el as HTMLInputElement, name);
    } else {
      el.focus();
      try {
        document.execCommand('insertText', false, name);
      } catch (_e) {
        el.textContent = name;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, data: name }));
      }
    }

    // Confirma no fluxo nativo atual: botão "Criar Lista" / "Create List" / "Criar"
    const createBtn = findElementByText(
      document,
      /criar lista|create list|criar etiqueta|create label|criar|create|salvar|save/i,
      'div[role="dialog"] button, div[role="dialog"] [role="button"], [data-testid="popup-contents"] button, [data-testid="popup-contents"] [role="button"]'
    );
    if (createBtn) {
      triggerClick(createBtn);
    } else {
      // Fallback: Enter + tentativa de check icon
      pressEnter(el);
      const check = document.querySelector<HTMLElement>('[data-icon="check"]');
      if (check) triggerClick(check);
    }

    // Aguarda o input esvaziar/fechar (indica que confirmou) ou sumir
    await new Promise((r) => setTimeout(r, 400));
    return true;
  }

  private async findLabelInput(timeout = 5000): Promise<HTMLElement | null> {
    const selectors = [
      '[data-testid="popup-contents"] input[type="text"]',
      'div[role="dialog"] input[type="text"]',
      '[data-testid*="label"] input[type="text"]',
      'div[role="dialog"] input',
      '[data-testid="popup-contents"] div[contenteditable="true"]',
      'div[role="dialog"] div[contenteditable="true"]',
      '[data-testid="popup-contents"] [contenteditable="true"]',
      'input[type="text"]:not([disabled])',
      'div[contenteditable="true"]',
    ];
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeout) {
      const seen = new Set<HTMLElement>();
      for (const sel of selectors) {
        let nodes: NodeListOf<HTMLElement>;
        try {
          nodes = document.querySelectorAll<HTMLElement>(sel);
        } catch (_e) {
          continue;
        }
        for (const el of Array.from(nodes)) {
          if (seen.has(el)) continue;
          seen.add(el);
          if (this.isChatComposer(el)) continue;
          if (this.isSearchField(el)) continue;
          return el;
        }
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    return null;
  }

  private isSearchField(el: HTMLElement): boolean {
    const label = el.getAttribute('aria-label') || el.getAttribute('placeholder') || '';
    if (/pesquisar|search|buscar|procurar|encontrar|find/i.test(label)) {
      debug.ui('ignorando campo de busca', el);
      return true;
    }
    return false;
  }

  private isChatComposer(el: HTMLElement): boolean {
    // Composer do WhatsApp: contenteditable dentro de footer/#main.
    const contenteditable = el.isContentEditable;
    const inFooter = !!el.closest('footer');
    const inMain = !!el.closest('#main');
    const isTextbox = el.getAttribute('role') === 'textbox';
    const isInLabelPopup =
      !!el.closest('[data-testid="popup-contents"]') ||
      !!el.closest('[data-testid*="label"]');
    // Inputs de texto (não contenteditable) raramente são o composer.
    const looksLikeComposer =
      contenteditable && (inFooter || (inMain && !isInLabelPopup)) || isTextbox;
    if (looksLikeComposer) {
      debug.ui('ignorando composer do chat', el);
      return true;
    }
    return false;
  }

  private async ensureChecked(name: string): Promise<void> {
    try {
      const { element } = await waitForText(new RegExp(escapeRegExp(name), 'i'), { timeout: 2500 });
      if (!element) return;
      const row = element.closest('[role="checkbox"], [role="button"], [data-testid*="label"]') || element;
      const checked = row?.getAttribute('aria-checked');
      if (checked === 'false') triggerClick(row as HTMLElement);
    } catch (_e) {
      /* best effort */
    }
  }

  private async confirm(): Promise<void> {
    const { element } = await waitForText(I18N_DONE, { timeout: 2000 });
    if (element) {
      triggerClick(element);
      await new Promise((r) => setTimeout(r, 300));
      return;
    }
    const check = document.querySelector<HTMLElement>('div[role="dialog"] [data-icon="check"]');
    if (check) triggerClick(check);
  }

  private close(): void {
    pressEscape();
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
