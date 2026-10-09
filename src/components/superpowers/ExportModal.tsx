import React from 'react';
import { Download, FileSpreadsheet, X } from 'lucide-react';
import type { Contact, Note, Tag, ContactTag } from '../../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  notes: Note[];
  tags: Tag[];
  contactTags: ContactTag[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  contacts,
  notes,
  tags,
  contactTags,
}) => {
  if (!isOpen) return null;

  const handleExportCSV = () => {
    if (contacts.length === 0) {
      alert('Nenhum contato encontrado no CRM para exportar.');
      return;
    }

    const headers = ['ID', 'Nome', 'Telefone', 'Empresa', 'E-mail', 'Valor R$', 'Estágio Pipeline', 'Tags', 'Data de Criação'];
    const rows = contacts.map(c => {
      const cTags = contactTags
        .filter(ct => ct.contact_id === c.id)
        .map(ct => tags.find(t => t.id === ct.tag_id)?.name)
        .filter(Boolean)
        .join('; ');

      return [
        `"${c.id}"`,
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.phone}"`,
        `"${(c.company || '').replace(/"/g, '""')}"`,
        `"${(c.email || '').replace(/"/g, '""')}"`,
        `"${c.value || 0}"`,
        `"${c.pipeline}"`,
        `"${cTags}"`,
        `"${new Date(c.created_at).toLocaleString()}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `whatscrm_leads_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onClose();
  };

  const overlayStyle: React.CSSProperties = {
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
  };

  const cardStyle: React.CSSProperties = {
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
  };

  const headerStyle: React.CSSProperties = {
    padding: '16px 24px',
    backgroundColor: '#111b21',
    borderBottom: '1px solid #313d45',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const statCardStyle: React.CSSProperties = {
    padding: '16px',
    backgroundColor: '#111b21',
    borderRadius: '12px',
    border: '1px solid #313d45',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', backgroundColor: 'rgba(52,183,241,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34b7f1', flexShrink: 0 }}>
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '16px', color: '#e9edef', margin: 0 }}>Exportar Leads (CSV / Excel)</h3>
              <p style={{ fontSize: '12px', color: '#8696a0', margin: '2px 0 0 0' }}>Baixar relatório dos contatos e funil de vendas</p>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: '8px', background: 'transparent', border: 'none', borderRadius: '8px', color: '#8696a0', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={statCardStyle}>
            <span style={{ color: '#8696a0', fontSize: '14px' }}>Total de Contatos Cadastrados:</span>
            <span style={{ fontWeight: 700, color: '#00a884', fontSize: '18px' }}>{contacts.length}</span>
          </div>

          <div style={statCardStyle}>
            <span style={{ color: '#8696a0', fontSize: '14px' }}>Total de Anotações Salvas:</span>
            <span style={{ fontWeight: 700, color: '#34b7f1', fontSize: '18px' }}>{notes.length}</span>
          </div>

          <p style={{ fontSize: '12px', color: '#8696a0', lineHeight: '1.5', margin: 0 }}>
            💡 O arquivo <code>.csv</code> inclui Nome, Telefone, Empresa, E-mail, Valor (R$), Estágio no Funil e Etiquetas. Compatível com Excel, Google Sheets ou CRM externo.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid #313d45' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '10px 20px', backgroundColor: '#2a3942', border: 'none', borderRadius: '12px', fontSize: '12px', fontWeight: 700, color: '#e9edef', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleExportCSV}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', backgroundColor: '#34b7f1', border: 'none', borderRadius: '12px', fontSize: '12px', fontWeight: 700, color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(52,183,241,0.3)' }}
            >
              <Download size={15} /> Gerar Planilha CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
