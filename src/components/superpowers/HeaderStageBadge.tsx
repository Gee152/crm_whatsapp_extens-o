import React, { useState } from 'react';
import { ChevronDown, Check, Tag as TagIcon, X } from 'lucide-react';
import type { PipelineStage, Tag } from '../../types';

interface HeaderStageBadgeProps {
  currentStage?: string;
  onStageChange: (stage: PipelineStage) => void;
  contactTags?: Tag[];
}

const stages: { label: PipelineStage; dotColor: string; textColor: string; bgColor: string; borderColor: string }[] = [
  { label: 'Lead', dotColor: '#3b82f6', textColor: '#60a5fa', bgColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.35)' },
  { label: 'Contato Inicial', dotColor: '#a855f7', textColor: '#c084fc', bgColor: 'rgba(168,85,247,0.15)', borderColor: 'rgba(168,85,247,0.35)' },
  { label: 'Em Negociação', dotColor: '#f59e0b', textColor: '#fbbf24', bgColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.35)' },
  { label: 'Proposta Enviada', dotColor: '#06b6d4', textColor: '#22d3ee', bgColor: 'rgba(6,182,212,0.15)', borderColor: 'rgba(6,182,212,0.35)' },
  { label: 'Fechado', dotColor: '#10b981', textColor: '#34d399', bgColor: 'rgba(16,185,129,0.2)', borderColor: 'rgba(16,185,129,0.45)' },
  { label: 'Perdido', dotColor: '#f43f5e', textColor: '#fb7185', bgColor: 'rgba(244,63,94,0.15)', borderColor: 'rgba(244,63,94,0.35)' },
];

export const HeaderStageBadge: React.FC<HeaderStageBadgeProps> = ({
  currentStage = 'Lead',
  onStageChange,
  contactTags = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const matched = stages.find(s => s.label === currentStage) || stages[0];

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        marginLeft: '8px',
        zIndex: 20,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Badge de Estágio do CRM */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '20px',
          border: `1px solid ${matched.borderColor}`,
          backgroundColor: matched.bgColor,
          color: matched.textColor,
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          lineHeight: '1.3',
          whiteSpace: 'nowrap',
        }}
        title="Clique para alterar o estágio do lead no CRM"
      >
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: matched.dotColor, flexShrink: 0 }} />
        <span>{currentStage}</span>
        <ChevronDown size={12} style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {/* Tags do contato ao lado do badge de stage */}
      {contactTags.slice(0, 3).map(tag => (
        <span
          key={tag.id}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            padding: '3px 8px',
            borderRadius: '12px',
            backgroundColor: tag.color ? `${tag.color}25` : 'rgba(0,168,132,0.15)',
            color: tag.color || '#00a884',
            border: `1px solid ${tag.color ? `${tag.color}40` : 'rgba(0,168,132,0.3)'}`,
            fontSize: '10px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          <TagIcon size={9} />
          {tag.name}
        </span>
      ))}
      {contactTags.length > 3 && (
        <span style={{ fontSize: '10px', color: '#8696a0', fontWeight: 600, whiteSpace: 'nowrap' }}>
          +{contactTags.length - 3}
        </span>
      )}

      {/* Dropdown para selecionar estágio */}
      {isOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 2147483640 }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '32px',
              zIndex: 2147483645,
              width: '200px',
              backgroundColor: '#202c33',
              border: '1px solid #313d45',
              borderRadius: '12px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              color: '#e9edef',
              padding: '4px',
            }}
          >
            <div style={{ padding: '8px 12px 6px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8696a0', borderBottom: '1px solid #313d45' }}>
              Estágio do Funil (CRM)
            </div>
            {stages.map(s => {
              const isSelected = currentStage === s.label;
              return (
                <button
                  key={s.label}
                  onClick={() => {
                    onStageChange(s.label);
                    setIsOpen(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    border: 'none',
                    background: isSelected ? '#2a3942' : 'transparent',
                    color: isSelected ? '#00a884' : '#e9edef',
                    fontWeight: isSelected ? 700 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: s.dotColor, flexShrink: 0 }} />
                    <span style={{ color: s.textColor }}>{s.label}</span>
                  </div>
                  {isSelected && <Check size={14} style={{ color: '#00a884' }} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
