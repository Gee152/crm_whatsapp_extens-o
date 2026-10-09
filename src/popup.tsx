import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useCRMStorage, defaultSettings } from './hooks/useStorage';
import { Settings, Zap, PanelRight, Filter, MessageSquare, ShieldCheck, ExternalLink, Eye, EyeOff, Columns } from 'lucide-react';
import type { AppSettings, PrivacySettings } from './types';
import './index.css';

function PopupSettings() {
  const store = useCRMStorage();

  const settings: AppSettings = store.settings || defaultSettings;

  const notifyActiveTab = (newSettings: AppSettings) => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'UPDATE_SETTINGS', settings: newSettings });
        }
      });
    }
  };

  const openSettingsOnPage = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'OPEN_SETTINGS' });
          window.close();
        }
      });
    }
  };

  const openKanbanOnPage = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'OPEN_KANBAN' });
          window.close();
        }
      });
    }
  };

  const updateSetting = (key: keyof AppSettings, value: any) => {
    const updated: AppSettings = { ...settings, [key]: value };
    store.persist('settings', updated);
    notifyActiveTab(updated);
  };

  const togglePrivacy = (key: keyof PrivacySettings) => {
    const updatedPrivacy = {
      ...settings.privacy,
      [key]: !settings.privacy[key],
    };
    const updated: AppSettings = {
      ...settings,
      privacy: updatedPrivacy,
    };
    store.persist('settings', updated);
    store.persist('privacy', updatedPrivacy);
    notifyActiveTab(updated);
  };

  if (!store.ready) {
    return (
      <div className="w-[380px] h-[520px] bg-[#111b21] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#00a884]/30 border-t-[#00a884] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-[380px] bg-[#111b21] text-[#e9edef] font-sans flex flex-col p-4 space-y-4">
      {/* Cabeçalho */}
      <div className="bg-[#202c33] p-3.5 rounded-2xl border border-[#313d45] flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#00a884] rounded-xl flex items-center justify-center font-extrabold text-white text-sm shadow">
            W
          </div>
          <div>
            <h1 className="font-bold text-sm text-[#e9edef] tracking-wide">WhatsCRM Superpoderes</h1>
            <p className="text-[10px] text-[#8696a0]">Configurações da Extensão</p>
          </div>
        </div>
        <span className="text-[10px] font-mono bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded-full font-bold">
          v1.2
        </span>
      </div>

      {/* Botões Rápidos */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={openKanbanOnPage}
          className="py-2.5 px-3 bg-[#00a884]/25 hover:bg-[#00a884]/45 text-[#00a884] border border-[#00a884]/30 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-95 shadow"
        >
          <Columns size={14} />
          <span>Ver Kanban CRM</span>
        </button>

        <button
          onClick={openSettingsOnPage}
          className="py-2.5 px-3 bg-[#00a884] hover:bg-[#029071] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-95 shadow"
        >
          <Settings size={14} />
          <span>Configuração Completa</span>
        </button>
      </div>

      {/* Chave Mestra */}
      <div className="bg-[#202c33] p-3.5 rounded-xl border border-[#313d45] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Zap size={16} className={settings.enabled ? 'text-[#00a884] fill-[#00a884]' : 'text-[#8696a0]'} />
          <span className="font-semibold text-xs text-[#e9edef]">Superpoderes WhatsCRM</span>
        </div>
        <button
          onClick={() => updateSetting('enabled', !settings.enabled)}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
            settings.enabled ? 'bg-[#00a884] text-white' : 'bg-[#2a3942] text-[#8696a0]'
          }`}
        >
          {settings.enabled ? 'ATIVO' : 'DESATIVO'}
        </button>
      </div>

      {/* Toggles de Recursos */}
      <div className="space-y-2 text-xs">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#8696a0] px-1">
          Módulos de Interface
        </div>

        {/* Sidebar CRM */}
        <div className="bg-[#202c33]/80 p-2.5 rounded-xl border border-[#313d45] flex items-center justify-between cursor-pointer" onClick={openKanbanOnPage}>
          <div className="flex items-center gap-2">
            <PanelRight size={15} className="text-[#00a884]" />
            <span>Painel CRM Lateral</span>
          </div>
          <div className={`px-3 py-1 rounded-lg text-[11px] font-bold ${
            settings.showSidebar ? 'bg-[#00a884]/25 text-[#00a884] border border-[#00a884]/40' : 'bg-[#2a3942] text-[#8696a0]'
          }`}>
            {settings.showSidebar ? 'Ativo' : 'Desativo'}
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-[#202c33]/80 p-2.5 rounded-xl border border-[#313d45] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-[#34b7f1]" />
            <span>Abas de Filtros de Conversa</span>
          </div>
          <button
            onClick={() => updateSetting('showFilters', !settings.showFilters)}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
              settings.showFilters ? 'bg-[#34b7f1]/25 text-[#34b7f1] border border-[#34b7f1]/40' : 'bg-[#2a3942] text-[#8696a0]'
            }`}
          >
            {settings.showFilters ? 'Ativo' : 'Desativo'}
          </button>
        </div>

        {/* Respostas Rápidas */}
        <div className="bg-[#202c33]/80 p-2.5 rounded-xl border border-[#313d45] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={15} className="text-amber-400" />
            <span>Barra de Respostas Rápidas</span>
          </div>
          <button
            onClick={() => updateSetting('showQuickReplies', !settings.showQuickReplies)}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
              settings.showQuickReplies ? 'bg-amber-400/25 text-amber-400 border border-amber-400/40' : 'bg-[#2a3942] text-[#8696a0]'
            }`}
          >
            {settings.showQuickReplies ? 'Ativo' : 'Desativo'}
          </button>
        </div>
      </div>

      {/* Seção Privacidade */}
      <div className="space-y-2 text-xs">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#8696a0] px-1 flex items-center gap-1">
          <ShieldCheck size={12} /> Modo Privacidade (Desfocar Conteúdo)
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Mensagens */}
          <button
            onClick={() => togglePrivacy('blurMessages')}
            className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
              settings.privacy?.blurMessages ? 'bg-[#00a884]/20 border-[#00a884]/45 text-[#e9edef]' : 'bg-[#202c33] border-[#313d45] text-[#8696a0]'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold">
              {settings.privacy?.blurMessages ? <EyeOff size={13} className="text-[#00a884]" /> : <Eye size={13} />}
              <span>Mensagens</span>
            </div>
            <span className="text-[9px] font-bold">{settings.privacy?.blurMessages ? 'ATIVO' : 'DESATIVO'}</span>
          </button>

          {/* Nomes */}
          <button
            onClick={() => togglePrivacy('blurNames')}
            className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
              settings.privacy?.blurNames ? 'bg-[#00a884]/20 border-[#00a884]/45 text-[#e9edef]' : 'bg-[#202c33] border-[#313d45] text-[#8696a0]'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold">
              {settings.privacy?.blurNames ? <EyeOff size={13} className="text-[#00a884]" /> : <Eye size={13} />}
              <span>Nomes</span>
            </div>
            <span className="text-[9px] font-bold">{settings.privacy?.blurNames ? 'ATIVO' : 'DESATIVO'}</span>
          </button>

          {/* Fotos Perfil */}
          <button
            onClick={() => togglePrivacy('blurPhotos')}
            className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
              settings.privacy?.blurPhotos ? 'bg-[#00a884]/20 border-[#00a884]/45 text-[#e9edef]' : 'bg-[#202c33] border-[#313d45] text-[#8696a0]'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold">
              {settings.privacy?.blurPhotos ? <EyeOff size={13} className="text-[#00a884]" /> : <Eye size={13} />}
              <span>Fotos Perfil</span>
            </div>
            <span className="text-[9px] font-bold">{settings.privacy?.blurPhotos ? 'ATIVO' : 'DESATIVO'}</span>
          </button>

          {/* Vídeos/Fotos */}
          <button
            onClick={() => togglePrivacy('blurMedia')}
            className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
              settings.privacy?.blurMedia ? 'bg-[#00a884]/20 border-[#00a884]/45 text-[#e9edef]' : 'bg-[#202c33] border-[#313d45] text-[#8696a0]'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold">
              {settings.privacy?.blurMedia ? <EyeOff size={13} className="text-[#00a884]" /> : <Eye size={13} />}
              <span>Vídeos/Fotos</span>
            </div>
            <span className="text-[9px] font-bold">{settings.privacy?.blurMedia ? 'ATIVO' : 'DESATIVO'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PopupSettings />
  </StrictMode>
);
