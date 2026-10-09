import { debug } from '../debug';
import {
  findElementByText,
  pressEscape,
  setInputValue,
  triggerClick,
  waitElement,
  waitForText,
} from '../waitElement';
import type { NoteStrategy, NoteStrategyResult } from './NativeNoteStrategy';

const I18N_NOTE = /nota do cliente|customer note|notiz|customer note/i;
const I18N_EDIT = /editar|edit/i;

/**
 * Estratégia de fallback por automação da UI: painel de dados do contato →
 * seção de nota → editar → digitar → salvar. Best effort.
 */
export class UiNoteStrategy implements NoteStrategy {
  readonly name = 'ui';

  async write(_chatId: string, text: string): Promise<NoteStrategyResult> {
    try {
      if (!document.querySelector('#main')) {
        return { ok: false, reason: 'no_open_chat' };
      }

      const panelOpened = await this.openContactInfo();
      if (!panelOpened) return { ok: false, reason: 'contact_info_not_opened' };

      const editClicked = await this.clickEditNote();
      if (!editClicked) return { ok: false, reason: 'note_edit_not_found' };

      const typed = await this.typeNote(text);
      this.close();
      if (!typed) return { ok: false, reason: 'note_input_not_found' };

      debug.ui('nota escrita via UI');
      return { ok: true };
    } catch (err) {
      debug.ui('falha no fallback de nota por UI', err);
      this.close();
      return { ok: false, reason: 'ui_exception' };
    }
  }

  private async openContactInfo(): Promise<boolean> {
    const selectors = [
      '#main header span[dir="auto"]',
      '[data-testid="conversation-info-header"]',
      '#main header div[title]',
    ];
    const { element } = await waitElement(selectors, { timeout: 6000, visible: true });
    if (!element) return false;
    triggerClick(element);
    await new Promise((r) => setTimeout(r, 900));
    return !!document.querySelector('div[role="complementary"]') || true;
  }

  private async clickEditNote(): Promise<boolean> {
    const { element } = await waitForText(I18N_NOTE, { timeout: 4000 });
    if (!element) return false;

    const section =
      element.closest('section, [role="region"], [data-testid]') ||
      element.parentElement ||
      element;

    const pencil =
      section.querySelector<HTMLElement>('[data-icon="edit"]') ||
      findElementByText(section, I18N_EDIT, '[role="button"], button, div[role="button"]');

    if (pencil) {
      triggerClick(pencil);
      return true;
    }

    // Fallback: pencil em qualquer lugar do painel direito
    const panelPencil = document.querySelector<HTMLElement>(
      'div[role="complementary"] [data-icon="edit"]'
    );
    if (panelPencil) {
      triggerClick(panelPencil);
      return true;
    }
    return false;
  }

  private async typeNote(text: string): Promise<boolean> {
    const inputSel = await waitElement(
      [
        'div[role="complementary"] textarea',
        'div[role="complementary"] input[type="text"]',
        'div[role="complementary"] div[contenteditable="true"]',
        'div[role="dialog"] textarea',
        'div[role="dialog"] div[contenteditable="true"]',
      ],
      { timeout: 4000 }
    );
    if (!inputSel.element) return false;

    const el = inputSel.element;
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      setInputValue(el as HTMLInputElement, text);
    } else {
      el.focus();
      try {
        document.execCommand('insertText', false, text);
      } catch (_e) {
        el.textContent = text;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));
      }
    }

    const save =
      document.querySelector<HTMLElement>('div[role="complementary"] [data-icon="check"]') ||
      document.querySelector<HTMLElement>('div[role="dialog"] [data-icon="check"]') ||
      findElementByText(document, /salvar|save/i, 'button, [role="button"]');
    if (save) {
      triggerClick(save);
      await new Promise((r) => setTimeout(r, 300));
    }
    return true;
  }

  private close(): void {
    pressEscape();
  }
}
