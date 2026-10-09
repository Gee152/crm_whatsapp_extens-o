import { addNativeNote } from '../requestBridge';

export interface NoteStrategyResult {
  ok: boolean;
  reason?: string;
}

export interface NoteStrategy {
  readonly name: string;
  write(chatId: string, text: string): Promise<NoteStrategyResult>;
}

/**
 * Estratégia nativa: usa o método interno do modelo de chat
 * `addOrEditCustomerNote(text)` via bridge no main world.
 */
export class NativeNoteStrategy implements NoteStrategy {
  readonly name = 'native';

  async write(chatId: string, text: string): Promise<NoteStrategyResult> {
    const r = await addNativeNote(chatId, text);
    return r.ok ? { ok: true } : { ok: false, reason: r.reason || 'native_note_failed' };
  }
}
