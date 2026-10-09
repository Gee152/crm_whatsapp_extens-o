import React, { memo } from 'react';
import type { PipelineStage } from '../../types';

const stages: { label: PipelineStage; color: string }[] = [
  { label: 'Lead', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { label: 'Contato Inicial', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  { label: 'Em Negociação', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { label: 'Proposta Enviada', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  { label: 'Fechado', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold' },
  { label: 'Perdido', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
];

export const PipelineSelector = memo(({ status, onChange }: { status: string; onChange: (s: string) => void }) => {
  return (
    <div className="px-5 py-3 border-b border-[#313d45]">
      <label className="text-[10px] font-bold text-[#8696a0] uppercase tracking-wider mb-2 block">
        Estágio do Funil de Vendas
      </label>
      <div className="grid grid-cols-2 gap-1.5">
        {stages.map(({ label, color }) => {
          const isSelected = status === label;
          return (
            <button
              key={label}
              onClick={() => onChange(label)}
              className={`py-1.5 px-2.5 rounded text-xs text-left transition-all border ${
                isSelected
                  ? color + ' shadow-sm scale-[1.02]'
                  : 'bg-[#202c33] text-[#8696a0] border-[#313d45] hover:bg-[#2a3942] hover:text-[#e9edef]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
});
