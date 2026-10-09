import { debug } from '../debug';
import { NativeNoteStrategy } from './NativeNoteStrategy';
import { UiNoteStrategy } from './UiNoteStrategy';

export interface NoteWriteResult {
  ok: boolean;
  reason?: string;
  strategy: 'native' | 'ui' | 'none';
}

/**
 * Facade de notas nativas do cliente. O resto do sistema não sabe qual
 * estratégia foi usada: Native → UI → erro.
 */
export class NoteService {
  private readonly strategies = [new NativeNoteStrategy(), new UiNoteStrategy()];

  async write(chatId: string, text: string): Promise<NoteWriteResult> {
    const trimmed = (text || '').trim();
    if (!trimmed) return { ok: false, reason: 'empty_text', strategy: 'none' };

    for (const s of this.strategies) {
      const r = await s.write(chatId, trimmed);
      if (r.ok) {
        debug.sync(`nota escrita via "${s.name}"`);
        return { ok: true, strategy: s.name as 'native' | 'ui' };
      }
      debug.sync(`estratégia "${s.name}" falhou para nota`, r.reason);
    }

    return { ok: false, reason: 'all_strategies_failed', strategy: 'none' };
  }
}

export const noteService = new NoteService();
