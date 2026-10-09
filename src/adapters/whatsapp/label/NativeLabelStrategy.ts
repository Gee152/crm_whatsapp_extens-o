import { applyNativeLabelToChat, createNativeLabel, getNativeLabels } from '../requestBridge';

export interface LabelStrategyResult {
  ok: boolean;
  reason?: string;
  applied?: boolean;
}

export interface LabelStrategy {
  readonly name: string;
  create(name: string, color?: string, chatId?: string): Promise<LabelStrategyResult>;
}

/**
 * Estratégia nativa: usa os módulos internos do WhatsApp (LabelStore /
 * labelAddAction) via bridge no main world.
 */
export class NativeLabelStrategy implements LabelStrategy {
  readonly name = 'native';

  async create(name: string, color?: string, chatId?: string): Promise<LabelStrategyResult> {
    const trimmed = (name || '').trim();

    const existing = await getNativeLabels();
    if (existing.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      if (chatId) {
        const applied = await applyNativeLabelToChat(trimmed, chatId);
        return { ok: true, applied: applied.ok };
      }
      return { ok: true, applied: false };
    }

    const r = await createNativeLabel(trimmed, color);
    if (!r.ok) {
      return { ok: false, reason: r.reason || 'create_failed' };
    }

    let applied = false;
    if (chatId) {
      const a = await applyNativeLabelToChat(trimmed, chatId);
      applied = a.ok;
    }
    return { ok: true, applied };
  }
}
