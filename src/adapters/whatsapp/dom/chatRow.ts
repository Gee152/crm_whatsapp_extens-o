import { debug } from '../debug';

// ============================================================================
// Leitura do DOM das linhas de chat do WhatsApp Web (isolated world).
// Funções puras: só leem o DOM e devolvem dados.
// ============================================================================

export function isGroupRow(row: Element): boolean {
  const groupIcon = row.querySelector(
    '[data-icon="group"], [data-testid="conversation-icon-group"], span[data-icon="group"], [data-icon="community"], [data-testid="conversation-icon-community"]'
  );
  const dataId = row.closest('[data-id]')?.getAttribute('data-id') || '';
  const isGroupId = dataId.includes('@g.us') || dataId.includes('@broadcast');
  return !!(groupIcon || isGroupId);
}

export function extractPhoneFromRow(row: Element): string | null {
  // Estratégia 1: data-id no próprio elemento ou em pai
  const rowWithDataId = row.closest('[data-id]') || row.querySelector('[data-id]');
  if (rowWithDataId) {
    const dataId = rowWithDataId.getAttribute('data-id');
    if (dataId) {
      const m = dataId.match(/(\d{7,15})/);
      if (m) return m[1];
    }
  }

  // Estratégia 2: Avatar img com JID / número de telefone na URL
  const avatarImgs = row.querySelectorAll<HTMLImageElement>(
    'img[src*="c.us"], img[src*="%40c.us"], img[src*="s.whatsapp.net"], img[src*="u="]'
  );
  for (const img of Array.from(avatarImgs)) {
    const src = img.src || '';
    const decoded = decodeURIComponent(src);
    const m = decoded.match(/(\d{8,15})(@c\.us|@s\.whatsapp\.net|%40c\.us)/) || decoded.match(/[?&]u=(\d{8,15})/);
    if (m) return m[1];
  }

  // Estratégia 3: span com title contendo telefone (formato "+55 81 XXXX-XXXX" ou dígitos)
  const titleSpan = row.querySelector<HTMLElement>('[data-testid="cell-frame-title"] span[title], span[title*="+"], span[title*="tel"]');
  if (titleSpan) {
    const title = titleSpan.getAttribute('title') || titleSpan.textContent || '';
    const digits = title.replace(/\D/g, '');
    if (digits.length >= 10) return digits;
  }

  // Estratégia 4: textContent do cell-frame-title
  const titleCell = row.querySelector<HTMLElement>('[data-testid="cell-frame-title"]');
  if (titleCell) {
    const text = titleCell.textContent || '';
    const digits = text.replace(/\D/g, '');
    if (digits.length >= 10) return digits;
  }

  // Estratégia 5: link tel/phone
  const link = row.querySelector<HTMLAnchorElement>('a[href*="tel:"], a[href*="phone:"]');
  if (link) {
    const m = link.href.match(/(\d{7,15})/);
    if (m) return m[1];
  }

  // Estratégia 6: Contato salvo sem telefone explícito no DOM -> extrai identificador baseado no nome
  const contactName = extractNameFromRow(row);
  if (contactName && contactName !== 'Contato CRM') {
    const cleanId = contactName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 30);
    if (cleanId.length >= 2) {
      return `saved_${cleanId}`;
    }
  }

  return null;
}

export function extractNameFromRow(row: Element): string {
  const titleSpan = row.querySelector<HTMLElement>(
    '[data-testid="cell-frame-title"] span[title], [data-testid="cell-frame-title"] span[dir="auto"], [role="gridcell"] span[title]'
  );
  let name = titleSpan?.getAttribute('title') || titleSpan?.textContent || '';
  if (!name) {
    const fallbackSpan = row.querySelector<HTMLElement>('span[title], span[dir="auto"]');
    name = fallbackSpan?.getAttribute('title') || fallbackSpan?.textContent || '';
  }
  // Limpa sufixo "(você)" se presente
  name = name.replace(/\s*\(você\)\s*$/i, '').trim();
  return name || 'Contato CRM';
}

const LABEL_PILL_SELECTORS = [
  '[data-testid="list-icon"]',
  '[data-testid^="label-pill"]',
];

/** Encontra todas as pills de etiqueta nativa (com fallback de seletores). */
export function findAllLabelPills(root: ParentNode = document): HTMLElement[] {
  const pills: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();
  for (const selector of LABEL_PILL_SELECTORS) {
    root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      pills.push(el);
    });
  }
  return pills;
}

/** Extrai os nomes das etiquetas nativas visíveis em uma linha de chat. */
export function extractRowTags(row: Element): string[] {
  const pills = findAllLabelPills(row);
  const tags: string[] = [];
  const seenTags = new Set<string>();
  pills.forEach((pill) => {
    let tagName = '';
    // Caso 1: pill padrão com texto (label-pill)
    const innerSpan = pill.querySelector('span');
    tagName = innerSpan?.textContent?.trim() || pill.getAttribute('title') || pill.textContent?.trim() || '';
    // Caso 2: list-icon (bolinha colorida) - buscar nome em elemento irmão ou pai
    if (!tagName || tagName.length < 2 || tagName.length > 30) {
      // Tenta achar span com texto próximo ao ícone
      const siblingText = pill.parentElement?.querySelector('span[title], span[dir="auto"], [data-testid="cell-frame-title"] span')?.textContent?.trim();
      if (siblingText && siblingText.length >= 2 && siblingText.length <= 30) {
        tagName = siblingText;
      } else {
        // Fallback: usa aria-label do próprio ícone ou do pai
        tagName = pill.getAttribute('aria-label') || pill.parentElement?.getAttribute('aria-label') || '';
      }
    }
    if (!tagName || tagName.length > 30 || tagName.length < 2) return;
    const key = tagName.toLowerCase();
    if (seenTags.has(key)) return;
    seenTags.add(key);
    tags.push(tagName);
  });
  debug.scanner(`extractRowTags: ${pills.length} pill(s) → ${tags.length} tag(s)`, tags);
  return tags;
}

/** Encontra todas as linhas de chat (global), deduplicadas. */
export function findAllChatRows(): HTMLElement[] {
  const rows = document.querySelectorAll<HTMLElement>(
    '[data-testid="cell-frame-container"], ' +
      '[role="row"], ' +
      '[data-testid^="list-item"], ' +
      '[data-id]'
  );
  const seen = new Set<string>();
  return Array.from(rows).filter((r) => {
    const id = r.getAttribute('data-id') || r.getAttribute('data-testid') || r.innerHTML.substring(0, 50);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * Abre uma conversa por número (usado pelo Kanban).
 * Estratégias: data-id → matching por texto → navegação por URL.
 */
export function openChatByPhone(phone: string): void {
  const cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return;

  const triggerClick = (el: HTMLElement) => {
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    el.click();
  };

  const findAndClick = (dataIdEl: Element) => {
    const target =
      dataIdEl.querySelector<HTMLElement>('[data-testid="cell-frame-container"]') ||
      dataIdEl.querySelector<HTMLElement>('[tabindex="-1"]') ||
      (dataIdEl as HTMLElement);
    triggerClick(target);
    return true;
  };

  // Tenta 1: data-id global (chats visíveis no DOM)
  const dataIdEl = document.querySelector<HTMLElement>(`[data-id*="${cleaned}"]`);
  if (dataIdEl && findAndClick(dataIdEl)) {
    debug.dom('Chat aberto via data-id:', cleaned);
    return;
  }

  // Tenta 2: matching por texto no #pane-side
  const suffixes = [
    cleaned,
    cleaned.slice(-11),
    cleaned.slice(-10),
    cleaned.slice(-9),
    cleaned.slice(-8),
  ].filter((s, i, arr) => s.length >= 8 && arr.indexOf(s) === i);

  const allRows = document.querySelectorAll<HTMLElement>(
    '#pane-side [role="row"], #pane-side [data-testid^="list-item"]'
  );

  for (const matcher of ['endsWith' as const, 'includes' as const]) {
    for (const suffix of suffixes) {
      for (const row of Array.from(allRows)) {
        const textEls = row.querySelectorAll<HTMLElement>(
          'span[title], span[dir="auto"], div[title]'
        );
        for (const el of Array.from(textEls)) {
          const rawText = el.getAttribute('title') || el.textContent || '';
          const digits = rawText.replace(/\D/g, '');
          if (digits.length < 8) continue;
          const match = matcher === 'endsWith' ? digits.endsWith(suffix) : digits.includes(suffix);
          if (match) {
            const clickTarget =
              row.querySelector<HTMLElement>('[data-testid="cell-frame-container"]') ||
              row.querySelector<HTMLElement>('[tabindex="-1"]') ||
              row;
            triggerClick(clickTarget);
            debug.dom(`Chat aberto via ${matcher}: ${rawText}`);
            return;
          }
        }
      }
    }
  }

  // Tenta 3: navegação por URL (funciona para chats arquivados)
  debug.dom('Chat não encontrado no DOM, tentando navegação por URL:', cleaned);
  const link = document.createElement('a');
  link.href = `https://web.whatsapp.com/send?phone=${cleaned}`;
  link.setAttribute('data-action', 'open-direct-chat');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
