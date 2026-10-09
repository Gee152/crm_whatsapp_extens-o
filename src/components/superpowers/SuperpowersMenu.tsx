import React, { useState } from 'react';
import { 
  EyeOff, Eye, Send, Download, Zap, Shield, ChevronDown, Check, PanelRight, Settings, Columns, RefreshCw, Search
} from 'lucide-react';
import type { PrivacySettings } from '../../types';

interface SuperpowersMenuProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  privacy: PrivacySettings;
  onUpdatePrivacy: (privacy: PrivacySettings) => void;
  onOpenDirectMessage: () => void;
  onExportLeads: () => void;
  onOpenSettings: () => void;
  onOpenKanban: () => void;
  onScanTags?: () => void;
  onScanAll?: (tagIds?: string[]) => void;
}

export const SuperpowersMenu: React.FC<SuperpowersMenuProps> = ({
  onToggleSidebar,
  isSidebarOpen,
  privacy,
  onUpdatePrivacy,
  onOpenDirectMessage,
  onExportLeads,
  onOpenSettings,
  onOpenKanban,
  onScanTags,
  onScanAll,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const togglePrivacyOption = (key: keyof PrivacySettings) => {
    onUpdatePrivacy({
      ...privacy,
      [key]: !privacy[key],
    });
  };

  const hasAnyPrivacy = Object.values(privacy).some(Boolean);

  return (
    <div className="relative inline-flex items-center gap-1 shrink-0">
      {/* Botão Principal WhatsCRM Superpoderes */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00a884]/15 hover:bg-[#00a884]/25 text-[#00a884] border border-[#00a884]/30 rounded-full font-semibold text-xs transition-all shadow-sm active:scale-95 shrink-0"
        title="Menu de Superpoderes WhatsCRM"
      >
        <Zap size={14} className="fill-[#00a884] animate-pulse shrink-0" />
        <span>WhatsCRM</span>
        <ChevronDown size={12} className={`transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Botão de Engrenagem (Configurações Gerais) */}
      <button
        onClick={onOpenSettings}
        className="p-2 rounded-full text-[#8696a0] hover:bg-[#2a3942] hover:text-[#e9edef] transition-colors shrink-0"
        title="Abrir Painel de Configurações"
      >
        <Settings size={17} />
      </button>

      {/* Botão Scan All */}
      <button
        onClick={onScanAll}
        className="p-2 rounded-full text-[#8696a0] hover:bg-[#2a3942] hover:text-[#f59e0b] transition-colors shrink-0"
        title="Escanear todos os contatos (incluindo arquivados)"
      >
        <Search size={17} />
      </button>

      {/* Botão de Toggle Rápido do Sidebar / Ativar CRM */}
      <button
        onClick={onOpenKanban}
        className={`p-2 rounded-full transition-colors shrink-0 ${
          isSidebarOpen ? 'bg-[#00a884]/20 text-[#00a884]' : 'text-[#8696a0] hover:bg-[#2a3942] hover:text-[#e9edef]'
        }`}
        title="Abrir Quadro Kanban CRM"
      >
        <PanelRight size={17} />
      </button>

      {/* Menu Dropdown de Superpoderes */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[2147483640]" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-11 z-[2147483645] w-72 bg-[#202c33] border border-[#313d45] rounded-xl shadow-2xl overflow-hidden text-[#e9edef] animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecalho do Menu */}
            <div className="px-4 py-2.5 bg-[#111b21] border-b border-[#313d45] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-[#00a884]" />
                <span className="font-bold text-xs tracking-wider text-[#00a884] uppercase">
                  Superpoderes WhatsCRM
                </span>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenSettings();
                }}
                className="p-1 hover:bg-[#2a3942] rounded text-[#8696a0] hover:text-[#00a884]"
                title="Configurações Gerais"
              >
                <Settings size={14} />
              </button>
            </div>

            <div className="p-2 space-y-1 text-xs">
              {/* Opção: Quadro Kanban do CRM */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenKanban();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#2a3942] text-left transition-colors"
              >
                <Columns size={15} className="text-[#00a884]" />
                <div>
                  <div className="font-medium text-[#e9edef]">Quadro Kanban do CRM</div>
                  <div className="text-[10px] text-[#8696a0]">Ver fluxo de vendas e contatos</div>
                </div>
              </button>

              {/* Opção: Escanear Tags */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onScanTags?.();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#2a3942] text-left transition-colors"
              >
                <RefreshCw size={15} className="text-[#f59e0b]" />
                <div>
                  <div className="font-medium text-[#e9edef]">Escanear Etiquetas</div>
                  <div className="text-[10px] text-[#8696a0]">Detectar etiquetas nativas do WhatsApp</div>
                </div>
              </button>

              {/* Opção: Configurações Gerais */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenSettings();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#2a3942] text-left transition-colors"
              >
                <Settings size={15} className="text-[#34b7f1]" />
                <div>
                  <div className="font-medium text-[#e9edef]">Painel de Configurações</div>
                  <div className="text-[10px] text-[#8696a0]">Ativar/Desativar recursos e módulos</div>
                </div>
              </button>

              {/* Opção: Mensagem Direta */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenDirectMessage();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#2a3942] text-left transition-colors"
              >
                <Send size={15} className="text-[#f59e0b]" />
                <div>
                  <div className="font-medium text-[#e9edef]">Enviar Mensagem Direta</div>
                  <div className="text-[10px] text-[#8696a0]">Conversar sem salvar o número</div>
                </div>
              </button>

              {/* Opção: Exportar Leads */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onExportLeads();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#2a3942] text-left transition-colors"
              >
                <Download size={15} className="text-[#22d3ee]" />
                <div>
                  <div className="font-medium text-[#e9edef]">Exportar Leads (CSV)</div>
                  <div className="text-[10px] text-[#8696a0]">Baixar relatório de contatos do CRM</div>
                </div>
              </button>

              <div className="my-1 border-t border-[#313d45]" />

              {/* Seção Privacidade (Blur) */}
              <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-[#8696a0] font-bold flex items-center gap-1">
                <Shield size={12} className={hasAnyPrivacy ? 'text-[#00a884]' : 'text-[#8696a0]'} />
                Modo Privacidade (Blur)
              </div>

              <div className="space-y-0.5">
                <button
                  onClick={() => togglePrivacyOption('blurMessages')}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-[#2a3942] text-left"
                >
                  <div className="flex items-center gap-2 text-[#e9edef]">
                    {privacy.blurMessages ? <EyeOff size={13} className="text-[#00a884]" /> : <Eye size={13} className="text-[#8696a0]" />}
                    <span>Desfocar Mensagens</span>
                  </div>
                  {privacy.blurMessages && <Check size={14} className="text-[#00a884]" />}
                </button>

                <button
                  onClick={() => togglePrivacyOption('blurNames')}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-[#2a3942] text-left"
                >
                  <div className="flex items-center gap-2 text-[#e9edef]">
                    {privacy.blurNames ? <EyeOff size={13} className="text-[#00a884]" /> : <Eye size={13} className="text-[#8696a0]" />}
                    <span>Desfocar Nomes e Números</span>
                  </div>
                  {privacy.blurNames && <Check size={14} className="text-[#00a884]" />}
                </button>

                <button
                  onClick={() => togglePrivacyOption('blurPhotos')}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-[#2a3942] text-left"
                >
                  <div className="flex items-center gap-2 text-[#e9edef]">
                    {privacy.blurPhotos ? <EyeOff size={13} className="text-[#00a884]" /> : <Eye size={13} className="text-[#8696a0]" />}
                    <span>Desfocar Fotos de Perfil</span>
                  </div>
                  {privacy.blurPhotos && <Check size={14} className="text-[#00a884]" />}
                </button>

                <button
                  onClick={() => togglePrivacyOption('blurMedia')}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-[#2a3942] text-left"
                >
                  <div className="flex items-center gap-2 text-[#e9edef]">
                    {privacy.blurMedia ? <EyeOff size={13} className="text-[#00a884]" /> : <Eye size={13} className="text-[#8696a0]" />}
                    <span>Desfocar Imagens/Vídeos</span>
                  </div>
                  {privacy.blurMedia && <Check size={14} className="text-[#00a884]" />}
                </button>
              </div>
            </div>

            {/* Rodapé do Menu */}
            <div className="px-3 py-2 bg-[#111b21] border-t border-[#313d45] text-center">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onToggleSidebar();
                }}
                className="w-full py-1.5 bg-[#00a884] hover:bg-[#029071] text-white font-bold rounded text-xs transition-colors"
              >
                {isSidebarOpen ? 'Fechar Painel CRM' : 'Abrir Painel CRM'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
