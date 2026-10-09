import { debug } from '../debug';
import { getNativeLabels } from '../requestBridge';
import { NativeLabelStrategy } from './NativeLabelStrategy';
import { UiLabelStrategy } from './UiLabelStrategy';

export interface LabelCreateResult {
  ok: boolean;
  reason?: string;
  strategy: 'native' | 'ui' | 'none';
  applied: boolean;
}

/**
 * Facade de etiquetas. O resto do sistema não sabe qual estratégia foi usada:
 *   Native → UI → erro.
 */
export class LabelService {
  private readonly strategies = [new NativeLabelStrategy(), new UiLabelStrategy()];

  async create(name: string, color?: string, chatId?: string): Promise<LabelCreateResult> {
    const trimmed = (name || '').trim();
    if (!trimmed) return { ok: false, reason: 'empty_name', strategy: 'none', applied: false };

    for (const s of this.strategies) {
      const r = await s.create(trimmed, color, chatId);
      if (r.ok) {
        debug.sync(`etiqueta criada via "${s.name}"`, trimmed, r.reason);
        return { ok: true, strategy: s.name as 'native' | 'ui', applied: !!r.applied };
      }
      debug.sync(`estratégia "${s.name}" falhou`, trimmed, r.reason);
    }

    return { ok: false, reason: 'all_strategies_failed', strategy: 'none', applied: false };
  }

  async list(): Promise<string[]> {
    return getNativeLabels();
  }
}

export const labelService = new LabelService();
