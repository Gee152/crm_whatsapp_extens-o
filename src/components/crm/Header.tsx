import React, { memo } from 'react';
import { Mail, DollarSign, Building } from 'lucide-react';

interface HeaderProps {
  name: string;
  phone: string;
  company?: string;
  email?: string;
  value?: number;
  onCompanyChange: (company: string) => void;
  onEmailChange: (email: string) => void;
  onValueChange: (value: number) => void;
}

export const Header = memo(({
  name,
  phone,
  company,
  email,
  value,
  onCompanyChange,
  onEmailChange,
  onValueChange,
}: HeaderProps) => {
  return (
    <div className="px-5 py-3 border-b border-[#313d45] bg-[#111b21] space-y-2 text-xs">
      <div>
        <h1 className="text-xl font-bold text-[#e9edef] truncate">
          {name || 'Contato Sem Nome'}
        </h1>
        <div className="text-[#8696a0] text-[11px] font-mono mt-0.5">
          {phone ? `+${phone}` : 'Sem número'}
        </div>
      </div>

      <div className="space-y-1.5 pt-1">
        {/* Empresa */}
        <div className="flex items-center gap-2 bg-[#202c33] px-2.5 py-1 rounded border border-[#313d45]">
          <Building size={13} className="text-[#8696a0] shrink-0" />
          <input
            type="text"
            placeholder="Nome da Empresa..."
            value={company || ''}
            onChange={(e) => onCompanyChange(e.target.value)}
            className="w-full bg-transparent text-[#e9edef] placeholder-[#8696a0] outline-none text-xs"
          />
        </div>

        {/* E-mail */}
        <div className="flex items-center gap-2 bg-[#202c33] px-2.5 py-1 rounded border border-[#313d45]">
          <Mail size={13} className="text-[#8696a0] shrink-0" />
          <input
            type="email"
            placeholder="E-mail do lead..."
            value={email || ''}
            onChange={(e) => onEmailChange(e.target.value)}
            className="w-full bg-transparent text-[#e9edef] placeholder-[#8696a0] outline-none text-xs"
          />
        </div>

        {/* Valor Negociado */}
        <div className="flex items-center gap-2 bg-[#202c33] px-2.5 py-1 rounded border border-[#313d45]">
          <DollarSign size={13} className="text-[#00a884] shrink-0" />
          <input
            type="number"
            placeholder="Valor da proposta (R$)..."
            value={value ?? ''}
            onChange={(e) => onValueChange(parseFloat(e.target.value) || 0)}
            className="w-full bg-transparent text-[#00a884] font-semibold placeholder-[#8696a0] outline-none text-xs"
          />
        </div>
      </div>
    </div>
  );
});
