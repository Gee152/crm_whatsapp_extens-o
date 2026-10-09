import { debug } from '../debug';

// ============================================================================
// Helpers de scroll e espera da lista de conversas.
// ============================================================================

export interface ProgressReporter {
  (step: 'waiting' | 'scrolling', message: string, detail: string, progress: number): void;
}

/** Aguarda a lista de chats carregar (40s máx). */
export async function waitForChatListReady(onProgress?: ProgressReporter): Promise<void> {
  let attempts = 0;
  const maxAttempts = 40;
  while (attempts < maxAttempts) {
    const rows = document.querySelectorAll<HTMLElement>(
      '[data-testid="cell-frame-container"], [data-id]'
    );
    if (rows.length > 0) {
      debug.dom('Chat list pronto para scan completo');
      return;
    }
    attempts++;
    await new Promise((r) => setTimeout(r, 1000));
    if (onProgress) {
      onProgress('waiting', 'Aguardando WhatsApp Web carregar...', `Tentativa ${attempts}/${maxAttempts}`, 3 + attempts * 2);
    }
  }
  debug.dom('Chat list não carregou, prosseguindo mesmo assim');
}

/** Encontra o container scrollável da lista de conversas. */
export function findScrollContainer(): HTMLElement | null {
  const paneSide = document.querySelector('#pane-side');
  const strategies: Array<() => HTMLElement | null> = [
    () => (paneSide as HTMLElement) || null,
    () => (paneSide?.querySelector<HTMLElement>('div[tabindex="-1"]') as HTMLElement) || null,
    () => (paneSide?.querySelector<HTMLElement>('div[tabindex="0"]') as HTMLElement) || null,
    () => document.querySelector<HTMLElement>('[data-testid="chat-list"]'),
    () => document.querySelector<HTMLElement>('[role="listbox"]'),
    () => document.querySelector<HTMLElement>('[aria-label="Chat list"]'),
    () => {
      const rows = document.querySelectorAll('[data-testid="cell-frame-container"]');
      if (rows.length > 0) {
        let el = rows[0].parentElement;
        while (el) {
          if (el.scrollHeight > el.clientHeight + 50) return el;
          el = el.parentElement;
        }
      }
      return null;
    },
    () => {
      const divs = document.querySelectorAll<HTMLElement>('div');
      for (const d of divs) {
        if (d.offsetParent !== null && d.scrollHeight > d.clientHeight + 80 && d.offsetHeight > 50) {
          return d;
        }
      }
      return null;
    },
  ];
  for (const s of strategies) {
    const el = s();
    if (el instanceof HTMLElement && el.scrollHeight > el.clientHeight + 50) {
      return el;
    }
  }
  return null;
}

export interface ScrollOptions {
  onProgress?: (progressPct: number, rowsCount: number) => void;
}

/** Rolagem progressiva para carregar conversas virtualizadas. */
export async function scrollContainerToLoadAll(
  container: HTMLElement,
  options: ScrollOptions = {},
  processRowCallback?: (row: Element) => void
): Promise<void> {
  const step = 200;
  const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
  const totalSteps = Math.max(1, Math.ceil(maxScroll / step));
  const waitMs = 300;

  debug.dom(
    `Scroll progressivo: ${totalSteps} passos de ${step}px, maxScroll ${maxScroll}px, clientHeight ${container.clientHeight}`
  );

  async function scrollPass(fromTop: boolean) {
    const baseProgress = fromTop ? 0 : 50;
    for (let i = 0; i < totalSteps; i++) {
      const target = fromTop
        ? Math.min(step * (i + 1), maxScroll)
        : Math.max(0, maxScroll - step * (i + 1));
      container.scrollTop = target;
      await new Promise((r) => setTimeout(r, waitMs));

      if (processRowCallback) {
        const rows = document.querySelectorAll<HTMLElement>(
          '[data-testid="cell-frame-container"], [data-id]'
        );
        rows.forEach(processRowCallback);
      }

      const progress = baseProgress + Math.round(((i + 1) / totalSteps) * 50);
      const rowsCount = document.querySelectorAll('[data-testid="cell-frame-container"]').length;

      if (options.onProgress) {
        options.onProgress(progress, rowsCount);
      }
    }
  }

  container.scrollTop = 0;
  await new Promise((r) => setTimeout(r, 500));
  await scrollPass(true);

  container.scrollTop = maxScroll;
  debug.dom('Scroll finalizado.');
}
