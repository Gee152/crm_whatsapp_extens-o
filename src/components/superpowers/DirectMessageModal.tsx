import React, { useState } from 'react';
import { Send, X, PhoneCall } from 'lucide-react';
import { openDirectChat } from '../../utils/whatsapp';

interface DirectMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DirectMessageModal: React.FC<DirectMessageModalProps> = ({ isOpen, onClose }) => {
  const [phone, setPhone] = useState('');
  const [initialMessage, setInitialMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return;

    openDirectChat(cleanPhone);

    if (initialMessage.trim()) {
      setTimeout(() => {
        const inputSelectors = [
          'footer div[contenteditable="true"]',
          '#main footer [contenteditable="true"]',
          'div[contenteditable="true"]',
        ];
        for (const sel of inputSelectors) {
          const el = document.querySelector<HTMLElement>(sel);
          if (el) {
            el.focus();
            document.execCommand('insertText', false, initialMessage.trim());
            break;
          }
        }
      }, 1500);
    }

    onClose();
    setPhone('');
    setInitialMessage('');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483647,
        backgroundColor: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          width: '520px',
          maxWidth: '92vw',
          backgroundColor: '#202c33',
          border: '1px solid #313d45',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden',
          color: '#e9edef',
          fontSize: '14px',
          lineHeight: '1.5',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 24px', backgroundColor: '#111b21', borderBottom: '1px solid #313d45', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', backgroundColor: 'rgba(0,168,132,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00a884', flexShrink: 0 }}>
              <PhoneCall size={20} />
            </div>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '16px', color: '#e9edef', margin: 0 }}>Mensagem Direta</h3>
              <p style={{ fontSize: '12px', color: '#8696a0', margin: '2px 0 0 0' }}>Enviar mensagem sem salvar o número na agenda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ padding: '8px', background: 'transparent', border: 'none', borderRadius: '8px', color: '#8696a0', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8696a0', marginBottom: '8px' }}>
              Número de Telefone (DDD / DDI)
            </label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Ex: 11999998888 ou 5511999998888"
              required
              autoFocus
              style={{
                width: '100%',
                backgroundColor: '#111b21',
                border: '1px solid #313d45',
                borderRadius: '12px',
                padding: '12px 14px',
                fontSize: '14px',
                color: '#e9edef',
                outline: 'none',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
            />
            <span style={{ display: 'block', fontSize: '11px', color: '#8696a0', marginTop: '6px', lineHeight: '1.4' }}>
              💡 Digite o número com DDD. O WhatsApp abrirá o chat diretamente.
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8696a0', marginBottom: '8px' }}>
              Mensagem Inicial (Opcional)
            </label>
            <textarea
              value={initialMessage}
              onChange={e => setInitialMessage(e.target.value)}
              placeholder="Digite a mensagem para enviar automaticamente..."
              rows={3}
              style={{
                width: '100%',
                backgroundColor: '#111b21',
                border: '1px solid #313d45',
                borderRadius: '12px',
                padding: '12px 14px',
                fontSize: '13px',
                color: '#e9edef',
                outline: 'none',
                resize: 'none',
                lineHeight: '1.5',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid #313d45' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                backgroundColor: '#2a3942',
                border: 'none',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#e9edef',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 24px',
                backgroundColor: '#00a884',
                border: 'none',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 700,
                color: 'white',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,168,132,0.3)',
              }}
            >
              <Send size={15} /> Abrir Chat no WhatsApp
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
