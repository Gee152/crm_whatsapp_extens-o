import React, { useState } from 'react';
import { Settings, X, Eye, EyeOff, MessageSquare, Filter, PanelRight, ShieldCheck, Zap, Columns, Tag as TagIcon, Check, Search } from 'lucide-react';
import type { AppSettings, PrivacySettings, Tag, PipelineStage } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  tags?: Tag[];
  onUpdateTag?: (tag: Tag) => void;
  onOpenKanban?: () => void;
  onScanAll?: (tagIds?: string[]) => void;
}

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const STAGES: PipelineStage[] = [
  'Lead',
  'Contato Inicial',
  'Em Negociação',
  'Proposta Enviada',
  'Fechado',
  'Perdido',
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  tags = [],
  onUpdateTag,
  onOpenKanban,
  onScanAll,
}) => {
  if (!isOpen) return null;

  const [selectedScanTags, setSelectedScanTags] = useState<string[]>([]);

  const toggleScanTag = (tagId: string) => {
    setSelectedScanTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleScanAll = () => {
    onScanAll?.(selectedScanTags.length > 0 ? selectedScanTags : undefined);
  };

  const toggleMaster = () => {
    onUpdateSettings({ ...settings, enabled: !settings.enabled });
  };

  const toggleFeature = (key: keyof Omit<AppSettings, 'privacy'>) => {
    onUpdateSettings({ ...settings, [key]: !settings[key] });
  };

  const togglePrivacy = (key: keyof PrivacySettings) => {
    onUpdateSettings({
      ...settings,
      privacy: { ...settings.privacy, [key]: !settings.privacy[key] },
    });
  };

  const toggleBtnStyle = (active: boolean, accentColor = '#00a884'): React.CSSProperties => ({
    padding: '6px 16px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: 700,
    border: active ? `1px solid ${accentColor}66` : '1px solid transparent',
    backgroundColor: active ? `${accentColor}30` : '#2a3942',
    color: active ? accentColor : '#8696a0',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    flexShrink: 0,
  });

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#8696a0',
    margin: '0 0 4px 4px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const rowStyle: React.CSSProperties = {
    backgroundColor: 'rgba(17,27,33,0.9)',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1px solid #313d45',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const privacyBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '14px 16px',
    borderRadius: '12px',
    border: active ? '1px solid rgba(0,168,132,0.4)' : '1px solid #313d45',
    backgroundColor: active ? 'rgba(0,168,132,0.15)' : 'rgba(17,27,33,0.9)',
    color: active ? '#e9edef' : '#8696a0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    textAlign: 'left' as const,
    transition: 'all 0.15s ease',
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483647,
        backgroundColor: 'rgba(17, 27, 33, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          width: '640px',
          maxWidth: '94vw',
          maxHeight: '90vh',
          backgroundColor: '#202c33',
          border: '1px solid #313d45',
          borderRadius: '20px',
          boxShadow: '0 32px 64px -16px rgba(0, 0, 0, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#e9edef',
          fontSize: '14px',
          lineHeight: '1.5',
        }}
      >
        {/* === HEADER === */}
        <div
          style={{
            padding: '20px 28px',
            backgroundColor: '#111b21',
            borderBottom: '1px solid #313d45',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                backgroundColor: 'rgba(0,168,132,0.2)',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00a884',
                flexShrink: 0,
              }}
            >
              <Settings size={24} />
            </div>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: '18px', color: '#e9edef', margin: 0, letterSpacing: '0.01em' }}>
                Configurações WhatsCRM
              </h2>
              <p style={{ fontSize: '13px', color: '#8696a0', margin: '3px 0 0 0' }}>
                Gerencie os módulos, privacidade e mapeamento de etiquetas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ padding: '10px', background: 'transparent', border: 'none', borderRadius: '10px', color: '#8696a0', cursor: 'pointer' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* === BODY (scrollable) === */}
        <div style={{ padding: '28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Botão de Destaque: Kanban Board */}
          {onOpenKanban && (
            <button
              onClick={onOpenKanban}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                width: '100%',
                padding: '14px 20px',
                backgroundColor: 'rgba(0,168,132,0.15)',
                border: '1px solid rgba(0,168,132,0.4)',
                borderRadius: '14px',
                color: '#00a884',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0,168,132,0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0,168,132,0.15)';
              }}
            >
              <Columns size={18} />
              <span>Abrir Quadro Kanban do CRM</span>
            </button>
          )}

          {/* Escanear Contatos com seletor de tags */}
          {onScanAll && (
            <div style={{
              background: 'rgba(17,27,33,0.9)',
              padding: '16px',
              borderRadius: '14px',
              border: '1px solid #313d45',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Search size={18} style={{ color: '#f59e0b' }} />
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#e9edef' }}>Escanear Contatos</span>
              </div>
              {tags.length > 0 && (
                <>
                  <div style={{ fontSize: '11px', color: '#8696a0', marginBottom: '8px' }}>
                    Tags para associar aos novos contatos (opcional):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                    {tags.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => toggleScanTag(tag.id)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: `1px solid ${tag.color || '#00a884'}40`,
                          backgroundColor: selectedScanTags.includes(tag.id)
                            ? `${tag.color || '#00a884'}30`
                            : 'transparent',
                          color: tag.color || '#00a884',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <button
                onClick={handleScanAll}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px',
                  backgroundColor: 'rgba(245,158,11,0.15)',
                  border: '1px solid rgba(245,158,11,0.35)',
                  borderRadius: '10px',
                  color: '#f59e0b',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.15)'; }}
              >
                <Search size={16} />
                <span>Escanear Agora</span>
              </button>
            </div>
          )}

          {/* Chave Mestra */}
          <div
            style={{
              background: 'linear-gradient(135deg, #111b21 0%, #1a2930 100%)',
              padding: '18px 20px',
              borderRadius: '16px',
              border: '1px solid #313d45',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <Zap
                size={24}
                style={{ color: settings.enabled ? '#00a884' : '#8696a0', fill: settings.enabled ? '#00a884' : 'none' }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#e9edef' }}>Superpoderes WhatsCRM</div>
                <div style={{ fontSize: '12px', color: '#8696a0', marginTop: '2px' }}>Ativar/Desativar todas as ferramentas</div>
              </div>
            </div>
            <button
              onClick={toggleMaster}
              style={{
                padding: '8px 24px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 800,
                border: 'none',
                backgroundColor: settings.enabled ? '#00a884' : '#2a3942',
                color: settings.enabled ? 'white' : '#8696a0',
                cursor: 'pointer',
                boxShadow: settings.enabled ? '0 4px 14px rgba(0,168,132,0.3)' : 'none',
                transition: 'all 0.2s ease',
                letterSpacing: '0.03em',
              }}
            >
              {settings.enabled ? 'ATIVO' : 'DESATIVO'}
            </button>
          </div>

          {/* Módulos Principais */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={sectionTitleStyle}>Módulos de Interface</div>

            <div
              onClick={onOpenKanban}
              style={{ ...rowStyle, cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 600, fontSize: '14px' }}>
                <PanelRight size={20} style={{ color: '#00a884' }} />
                <span>Painel CRM Lateral</span>
              </div>
              <div style={toggleBtnStyle(settings.showSidebar)}>
                {settings.showSidebar ? 'Ativo' : 'Desativo'}
              </div>
            </div>

            <div style={rowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 600, fontSize: '14px' }}>
                <Filter size={20} style={{ color: '#34b7f1' }} />
                <span>Abas de Filtros de Conversa</span>
              </div>
              <button onClick={() => toggleFeature('showFilters')} style={toggleBtnStyle(settings.showFilters, '#34b7f1')}>
                {settings.showFilters ? 'Ativo' : 'Desativo'}
              </button>
            </div>

            <div style={rowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 600, fontSize: '14px' }}>
                <MessageSquare size={20} style={{ color: '#f59e0b' }} />
                <span>Barra de Respostas Rápidas</span>
              </div>
              <button onClick={() => toggleFeature('showQuickReplies')} style={toggleBtnStyle(settings.showQuickReplies, '#f59e0b')}>
                {settings.showQuickReplies ? 'Ativo' : 'Desativo'}
              </button>
            </div>
          </div>

          {/* Modo Privacidade */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={sectionTitleStyle}>
              <ShieldCheck size={16} /> Modo Privacidade (Desfocar Conteúdo)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={() => togglePrivacy('blurMessages')} style={privacyBtnStyle(settings.privacy.blurMessages)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {settings.privacy.blurMessages
                    ? <EyeOff size={18} style={{ color: '#00a884' }} />
                    : <Eye size={18} />
                  }
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>Mensagens</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700 }}>{settings.privacy.blurMessages ? 'ATIVO' : 'DESATIVO'}</span>
              </button>

              <button onClick={() => togglePrivacy('blurNames')} style={privacyBtnStyle(settings.privacy.blurNames)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {settings.privacy.blurNames
                    ? <EyeOff size={18} style={{ color: '#00a884' }} />
                    : <Eye size={18} />
                  }
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>Nomes</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700 }}>{settings.privacy.blurNames ? 'ATIVO' : 'DESATIVO'}</span>
              </button>

              <button onClick={() => togglePrivacy('blurPhotos')} style={privacyBtnStyle(settings.privacy.blurPhotos)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {settings.privacy.blurPhotos
                    ? <EyeOff size={18} style={{ color: '#00a884' }} />
                    : <Eye size={18} />
                  }
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>Fotos Perfil</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700 }}>{settings.privacy.blurPhotos ? 'ATIVO' : 'DESATIVO'}</span>
              </button>

              <button onClick={() => togglePrivacy('blurMedia')} style={privacyBtnStyle(settings.privacy.blurMedia)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {settings.privacy.blurMedia
                    ? <EyeOff size={18} style={{ color: '#00a884' }} />
                    : <Eye size={18} />
                  }
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>Vídeos/Fotos</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700 }}>{settings.privacy.blurMedia ? 'ATIVO' : 'DESATIVO'}</span>
              </button>
            </div>
          </div>

          {/* Mapeamento de Tags Nativas/Existentes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={sectionTitleStyle}>
              <TagIcon size={16} /> Mapeamento de Etiquetas Nativas (WhatsApp ➔ CRM)
            </div>
            <div style={{ backgroundColor: 'rgba(17,27,33,0.9)', padding: '16px', borderRadius: '16px', border: '1px solid #313d45', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '12px', color: '#8696a0', margin: '0 0 4px 0' }}>
                Associe as etiquetas nativas do WhatsApp Web ou tags do CRM a estágios do funil. Contatos que possuírem estas tags serão movidos automaticamente para o estágio selecionado.
              </p>

              {tags.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#667781', textAlign: 'center', padding: '12px' }}>
                  Nenhuma tag identificada para mapeamento.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                  {tags.map(tag => (
                    <div
                      key={tag.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        backgroundColor: '#202c33',
                        borderRadius: '10px',
                        border: '1px solid #313d45',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: tag.color || '#00a884' }} />
                        <span style={{ fontWeight: 600, fontSize: '12px' }}>{tag.name}</span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '10px', color: '#8696a0' }}>Direcionar para:</span>
                        <select
                          value={tag.pipelineStage || ''}
                          onChange={(e) => {
                            if (onUpdateTag) {
                              onUpdateTag({
                                ...tag,
                                pipelineStage: (e.target.value as PipelineStage) || undefined,
                              });
                            }
                          }}
                          style={{
                            backgroundColor: '#111b21',
                            border: '1px solid #313d45',
                            borderRadius: '8px',
                            color: '#e9edef',
                            fontSize: '12px',
                            padding: '4px 8px',
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="">Nenhum (Sem desvio)</option>
                          {STAGES.map(stage => (
                            <option key={stage} value={stage}>{stage}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === FOOTER === */}
        <div
          style={{
            padding: '16px 28px',
            backgroundColor: '#111b21',
            borderTop: '1px solid #313d45',
            display: 'flex',
            justifyContent: 'flex-end',
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 28px',
              backgroundColor: '#00a884',
              border: 'none',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              color: 'white',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,168,132,0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};
