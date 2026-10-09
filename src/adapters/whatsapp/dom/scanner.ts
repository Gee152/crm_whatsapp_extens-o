import { debug } from '../debug';
import { requestAllChatsFromBridge } from '../requestBridge';
import {
  extractNameFromRow,
  extractPhoneFromRow,
  extractRowTags,
  findAllChatRows,
  findAllLabelPills,
  isGroupRow,
} from './chatRow';
import { findScrollContainer, scrollContainerToLoadAll, waitForChatListReady } from './scroller';

// ============================================================================
// Scanner do WhatsApp Web (isolated world). Funções puras: leem o DOM e
// devolvem dados estruturados. Estado/persistência/UI ficam no content script.
// ============================================================================

export interface ScannedContact {
  phone: string;
  name: string;
  tags: string[];
}

export interface ScanStatus {
  /** true = usar overlay de varredura completa; false = toast de loading. */
  overlay: boolean;
  message: string;
  detail: string;
  progress: number;
}

export interface ScanChatListOptions {
  tagIds?: string[];
  onStatus?: (status: ScanStatus) => void;
}

export interface ScanChatListResult {
  contacts: ScannedContact[];
  groupPhones: string[];
}

/**
 * Coleta as etiquetas nativas visíveis no DOM (uma entrada por pill).
 * Substitui o núcleo de scanAndImportNativeTags.
 * Varre linha por linha do chat para associar tags corretamente a cada contato.
 */
export function scanNativeTagRows(): ScannedContact[] {
  const chatRows = findAllChatRows();
  const result: ScannedContact[] = [];
  const seen = new Set<string>();
  let totalTags = 0;

  chatRows.forEach((chatRow) => {
    if (isGroupRow(chatRow)) {
      return;
    }

    const phone = extractPhoneFromRow(chatRow);
    const name = extractNameFromRow(chatRow);
    const contactId = phone || (name && name !== 'Contato CRM' ? `saved_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : null);
    if (!contactId) {
      return;
    }

    const tags = extractRowTags(chatRow);
    if (tags.length === 0) return;

    totalTags += tags.length;

    tags.forEach((tagName) => {
      const key = `${contactId}::${tagName}`;
      if (seen.has(key)) return;
      seen.add(key);
      result.push({ phone: contactId, name: name || 'Contato CRM', tags: [tagName] });
    });
  });

  debug.scanner(
    `scanNativeTagRows: ${result.length} contato(s) com tag de ${chatRows.length} linha(s) (${totalTags} tag(s) total)`,
    result
  );

  return result;
}

/**
 * Varredura completa de conversas (visíveis + arquivadas), com rolagem
 * progressiva. Substitui o núcleo de scanAllChats.
 */
export async function scanChatList(options: ScanChatListOptions = {}): Promise<ScanChatListResult> {
  const { tagIds, onStatus } = options;
  const isFullScan = !tagIds;

  const contacts: ScannedContact[] = [];
  const groupPhones: string[] = [];
  const seenPhones = new Set<string>();
  let scannedCount = 0;
  let rowsSeen = 0;

  const status = (overlay: boolean, message: string, detail: string, progress: number) => {
    if (onStatus) onStatus({ overlay, message, detail, progress });
  };

  const collectRow = (row: Element) => {
    rowsSeen++;
    const name = extractNameFromRow(row);
    const phone = extractPhoneFromRow(row) || (name && name !== 'Contato CRM' ? `saved_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : null);
    if (!phone) {
      return;
    }
    if (isGroupRow(row)) {
      groupPhones.push(phone);
      return;
    }
    if (seenPhones.has(phone)) {
      // Atualiza tags se novas forem encontradas
      const existing = contacts.find((c) => c.phone === phone);
      if (existing) {
        const newTags = extractRowTags(row);
        for (const t of newTags) {
          if (!existing.tags.includes(t)) existing.tags.push(t);
        }
      }
      return;
    }
    seenPhones.add(phone);
    const tags = extractRowTags(row);
    contacts.push({ phone, name: name || 'Contato CRM', tags });
    scannedCount++;
  };

  const scrollProgress = (pct: number, rowsCount: number) => {
    status(
      isFullScan,
      `Escaneando contatos: ${pct}% · ${rowsCount} conversas`,
      '',
      10 + Math.min(35, (pct / 100) * 35)
    );
  };

  if (isFullScan) {
    status(true, 'Aguardando WhatsApp Web carregar...', 'Preparando varredura completa', 3);
    await waitForChatListReady((_step, message, detail, progress) => {
      status(true, message, detail, progress);
    });
  }

  // Tenta primeiro coletar contatos direto da memória do WhatsApp via Bridge (rápido e 100% completo)
  try {
    const bridgeChats = await requestAllChatsFromBridge();
    if (bridgeChats && bridgeChats.length > 0) {
      debug.scanner(`scanChatList: ${bridgeChats.length} chats obtidos via Bridge`);
      for (const bc of bridgeChats) {
        if (bc.isGroup) {
          groupPhones.push(bc.phone);
        } else if (!seenPhones.has(bc.phone)) {
          seenPhones.add(bc.phone);
          contacts.push({
            phone: bc.phone,
            name: bc.name,
            tags: bc.tags || [],
          });
          scannedCount++;
        }
      }
    }
  } catch (err) {
    debug.scanner('Bridge chat list fallback para DOM scanner:', err);
  }

  try {
    // Segurança: se estamos na view de arquivados, volta pra lista principal
    const archiveHeader = Array.from(
      document.querySelectorAll<HTMLElement>('header, [role="banner"], [aria-label][role="region"]')
    ).find((el) => /arquivad/i.test(el.textContent || '') && el.offsetHeight > 0);
    if (archiveHeader) {
      const backBtn = archiveHeader.querySelector<HTMLElement>(
        'div[role="button"][aria-label="Voltar"], ' +
          'div[role="button"][aria-label="Back"], ' +
          '[data-testid="back"], ' +
          'button'
      );
      if (backBtn) {
        debug.dom('Detectado view de arquivados, voltando antes de escanear...');
        backBtn.click();
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    // Pré-limpeza: coleta grupos existentes no DOM
    const allRows = document.querySelectorAll<HTMLElement>(
      '[data-testid="cell-frame-container"], [role="row"], [data-testid^="list-item"], [data-id]'
    );
    allRows.forEach((row) => {
      const phone = extractPhoneFromRow(row);
      if (!phone) return;
      if (isGroupRow(row)) groupPhones.push(phone);
    });

    // 0) Scrolla a lista principal para carregar mais conversas (virtualização)
    if (isFullScan) status(true, 'Rolando lista principal...', 'Carregando mais conversas visíveis', 10);
    await new Promise((r) => setTimeout(r, 1000));
    const mainContainer = findScrollContainer();
    if (mainContainer) {
      await scrollContainerToLoadAll(mainContainer, { onProgress: scrollProgress }, collectRow);
    }

    // 1) Varre todas as linhas visíveis
    if (isFullScan) {
      status(
        true,
        'Escaneando conversas visíveis...',
        `Processando ${document.querySelectorAll('[data-testid="cell-frame-container"], [data-id]').length} conversas carregadas`,
        20
      );
    }
    const visibleRows = findAllChatRows();
    debug.dom('Linhas visíveis encontradas:', visibleRows.length);
    visibleRows.forEach(collectRow);
    if (isFullScan) {
      status(true, 'Conversas visíveis escaneadas', `${scannedCount} contatos encontrados. Acessando arquivados...`, 35);
    } else {
      status(false, `${scannedCount} conversas lidas. Escaneando arquivadas...`, '', 0);
    }

    // 2) Tenta abrir seção de arquivados, scrollar até o fim e escanear
    const archivedRow = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-testid="cell-frame-title"], [role="row"], [data-testid^="list-item"], [data-id]'
      )
    ).find((el) => {
      const span = el.tagName === 'SPAN' ? el : el.querySelector('span, div[role="button"]');
      return span && /arquivad/i.test(span.textContent || '') && el.offsetHeight > 0;
    });

    const archivedFallback =
      !archivedRow &&
      Array.from(
        document.querySelectorAll<HTMLElement>(
          'button, [role="tab"], [role="button"], span, a, div, li'
        )
      ).find((el) => {
        const text = (el.textContent || el.getAttribute('aria-label') || '').trim();
        return /^arquivad/i.test(text) && el.offsetHeight > 0;
      });

    const btn = archivedRow || archivedFallback;
    if (btn) {
      if (isFullScan) status(true, 'Acessando conversas arquivadas...', 'Abrindo seção de arquivados', 40);
      btn.click();
      await new Promise((r) => setTimeout(r, 2000));

      try {
        // Encontra o container scrollável da LISTA DE ARQUIVADOS (overlay)
        let container: HTMLElement | null = null;
        const allDivs = document.querySelectorAll<HTMLElement>(
          '#side > div, #app > div, [role="region"] > div, .x1n2onr6 > div'
        );
        for (const d of allDivs) {
          if (d.id === 'pane-side') continue;
          const hasRow = d.querySelector('[data-testid="cell-frame-container"], [data-id], [role="row"]');
          if (!hasRow) continue;
          if (d.scrollHeight > d.clientHeight + 50 && d.offsetParent !== null) {
            container = d;
            debug.dom('Container arquivados encontrado');
            break;
          }
        }

        if (!container) {
          const divs = document.querySelectorAll<HTMLElement>('div');
          for (const d of divs) {
            if (d === document.querySelector('#pane-side')) continue;
            const hasRow = d.querySelector('[data-testid="cell-frame-container"], [data-id]');
            if (hasRow && d.scrollHeight > d.clientHeight + 50 && d.offsetHeight > 50 && d.offsetParent !== null) {
              container = d;
              debug.dom('Container arquivados encontrado (fallback)');
              break;
            }
          }
        }

        if (container) {
          if (isFullScan) status(true, 'Carregando todas as conversas arquivadas...', 'Rolando até o final', 50);
          await scrollContainerToLoadAll(container, { onProgress: scrollProgress }, collectRow);
        } else {
          debug.dom('Container scrollável de arquivados não encontrado');
        }

        if (isFullScan) status(true, 'Finalizando varredura de arquivados...', 'Processando conversas encontradas', 85);
        const archivedRows = findAllChatRows();
        archivedRows.forEach(collectRow);
        if (isFullScan) {
          status(true, 'Arquivados escaneados', `${archivedRows.length} conversas processadas. Retornando...`, 90);
        } else {
          status(false, `Arquivados: ${archivedRows.length} conversas escaneadas. Voltando...`, '', 0);
        }

        // Volta para lista principal
        const backBtn = document.querySelector<HTMLElement>(
          '[aria-label="Voltar"], ' +
            '[aria-label="Back"], ' +
            '[data-testid="back"], ' +
            'div[role="button"][aria-label="Voltar"], ' +
            'div[role="button"][aria-label="Back"], ' +
            'span[title="Voltar"]'
        );
        if (backBtn) {
          debug.dom('Botão Voltar encontrado, clicando...');
          backBtn.click();
        } else {
          const headerArrow = document.querySelector<HTMLElement>('header div[role="button"], header button');
          if (
            headerArrow &&
            /voltar|back|arquiv/i.test(headerArrow.getAttribute('aria-label') || headerArrow.textContent || '')
          ) {
            debug.dom('Seta de volta encontrada via fallback, clicando...');
            headerArrow.click();
          } else {
            debug.dom('Botão Voltar não encontrado com nenhum seletor');
          }
        }

        await new Promise((r) => setTimeout(r, 1200));
      } catch (e) {
        console.error('[WhatsCRM] Erro ao escanear arquivados:', e);
      }
    } else {
      debug.dom('Botão de arquivados não encontrado, pulando...');
    }

    if (isFullScan) status(true, 'Varredura completa!', `${contacts.length} contatos escaneados`, 100);
    debug.scanner(
      `scanChatList concluído: ${rowsSeen} linhas vistas, ` +
        `${scannedCount} contatos coletados, ${groupPhones.length} grupos`
    );
    return { contacts, groupPhones };
  } catch (err) {
    console.error('[WhatsCRM] Erro ao escanear chats:', err);
    return { contacts, groupPhones };
  }
}
