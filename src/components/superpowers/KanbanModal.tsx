import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Tag as TagIcon, AlertCircle, Save, ExternalLink, ArrowLeft, MessageCircle } from 'lucide-react';
import type { Contact, Note, Tag, ContactTag, PipelineStage } from '../../types';

interface KanbanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat?: (phone: string) => void;
  contacts: Contact[];
  notes: Note[];
  tags: Tag[];
  contactTags: ContactTag[];
  onUpdateContact: (contact: Contact) => void;
  onAddNote: (contactId: string, text: string) => void;
  onUpdateStage: (contactId: string, stage: PipelineStage) => void;
  onUpdateContactTags?: (contactId: string, tagIds: string[]) => void;
  onCreateTag?: (tag: Tag) => void;
}

const STAGES: { label: PipelineStage; color: string; borderColor: string }[] = [
  { label: 'Lead', color: '#60a5fa', borderColor: 'rgba(59,130,246,0.25)' },
  { label: 'Contato Inicial', color: '#c084fc', borderColor: 'rgba(168,85,247,0.25)' },
  { label: 'Em Negociação', color: '#fbbf24', borderColor: 'rgba(245,158,11,0.25)' },
  { label: 'Proposta Enviada', color: '#22d3ee', borderColor: 'rgba(6,182,212,0.25)' },
  { label: 'Fechado', color: '#34d399', borderColor: 'rgba(16,185,129,0.3)' },
  { label: 'Perdido', color: '#fb7185', borderColor: 'rgba(244,63,94,0.25)' },
];

const REVIEW_COLUMN = {
  label: '📋 Revisar Tags' as PipelineStage,
  color: '#00a884',
  borderColor: 'rgba(0,168,132,0.3)',
};

const PRESET_COLORS = [
  '#00a884', '#009CFE', '#6793FF', '#8b5cf6',
  '#ec4899', '#e74c3c', '#f59e0b', '#eab308',
  '#14b8a6', '#34d399', '#60a5fa', '#c084fc',
];

export const KanbanModal: React.FC<KanbanModalProps> = ({
  isOpen, onClose, onOpenChat, contacts, notes, tags, contactTags,
  onUpdateContact, onAddNote, onUpdateStage, onUpdateContactTags, onCreateTag,
}) => {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [editingContact, setEditingContact] = useState<{ id: string; name: string; company: string; email: string; value: string } | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#00a884');
  const [conversationView, setConversationView] = useState(false);

  // Empurra #app > div p/ esquerda + outline azul no #main durante Conversation View
  useEffect(() => {
    if (!conversationView || !selectedContact) {
      const appDiv = document.querySelector<HTMLElement>('#app > div');
      if (appDiv) {
        appDiv.style.transition = 'margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        appDiv.style.marginRight = '';
      }
      const main = document.querySelector<HTMLElement>('#main');
      if (main) {
        main.style.outline = '';
        main.style.outlineOffset = '';
        main.style.borderRadius = '';
      }
      return;
    }
    const appDiv = document.querySelector<HTMLElement>('#app > div');
    if (appDiv) {
      appDiv.style.transition = 'margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      appDiv.style.marginRight = '340px';
    }
    const main = document.querySelector<HTMLElement>('#main');
    if (main) {
      main.style.outline = '2px solid #009CFE';
      main.style.outlineOffset = '-2px';
      main.style.borderRadius = '4px';
    }
    return () => {
      if (appDiv) {
        appDiv.style.transition = 'margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        appDiv.style.marginRight = '';
      }
      if (main) {
        main.style.outline = '';
        main.style.outlineOffset = '';
        main.style.borderRadius = '';
      }
    };
  }, [conversationView, selectedContact]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (conversationView) {
          setConversationView(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, conversationView]);

  useEffect(() => {
    if (!isOpen) {
      setConversationView(false);
      setSelectedContact(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getContactTags = (contactId: string) =>
    contactTags
      .filter(ct => ct.contact_id === contactId)
      .map(ct => tags.find(t => t.id === ct.tag_id))
      .filter(Boolean) as Tag[];

  const getContactNotes = (contactId: string) =>
    notes.filter(n => n.contact_id === contactId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const contactsWithTags = contacts.filter(c =>
    contactTags.some(ct => ct.contact_id === c.id),
  );

  const handleSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setEditingContact({
      id: contact.id, name: contact.name,
      company: contact.company || '', email: contact.email || '',
      value: contact.value?.toString() || '',
    });
    setNewNoteText('');
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact || !selectedContact) return;
    const updated: Contact = {
      ...selectedContact,
      name: editingContact.name, company: editingContact.company,
      email: editingContact.email,
      value: editingContact.value ? parseFloat(editingContact.value) : undefined,
    };
    onUpdateContact(updated);
    setSelectedContact(updated);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !selectedContact) return;
    onAddNote(selectedContact.id, newNoteText.trim());
    setNewNoteText('');
  };

  const enterConversationView = (contact: Contact) => {
    handleSelect(contact);
    setConversationView(true);
    onOpenChat?.(contact.phone);
  };

  const renderCard = (contact: Contact) => {
    const contactTagsList = getContactTags(contact.id);
    const contactNotes = getContactNotes(contact.id);
    const latestNote = contactNotes[0];
    const contactTagNames = contactTagsList.map(t => t.name).join(', ');

    return (
      <div
        key={contact.id}
        onClick={() => enterConversationView(contact)}
        style={{
          backgroundColor: '#202c33', border: '1px solid #313d45',
          borderRadius: '12px', padding: '12px', cursor: 'pointer',
          transition: 'all 0.18s ease', display: 'flex', flexDirection: 'column', gap: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = '#00a884';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,168,132,0.15)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = '#313d45';
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        }}
        title="Clique para abrir conversa"
      >
        {/* Header do card: nome + indicador de chat */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 600, fontSize: '13px', color: '#e9edef' }}>{contact.name}</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '3px',
            fontSize: '9px', color: '#00a884', fontWeight: 600,
            background: 'rgba(0,168,132,0.08)', borderRadius: '8px', padding: '2px 6px',
          }}>
            <MessageCircle size={9} />
            Conversar
          </div>
        </div>

        {/* Telefone */}
        <div style={{
          fontSize: '11px', color: '#8696a0',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          {contact.phone}
          <ExternalLink size={9} />
        </div>

        {contact.company && (
          <div style={{ fontSize: '11px', color: '#8696a0', fontStyle: 'italic' }}>💼 {contact.company}</div>
        )}

        {/* Preview da última nota */}
        {latestNote ? (
          <div style={{
            fontSize: '11px', color: '#a0abb8', lineHeight: '1.4',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', background: 'rgba(0,168,132,0.05)',
            borderLeft: '2px solid rgba(0,168,132,0.4)',
            borderRadius: '0 6px 6px 0', padding: '4px 8px', marginTop: '2px',
          }}>
            {latestNote.description}
          </div>
        ) : contactTagNames ? (
          <div style={{
            fontSize: '10px', color: '#00a884', fontStyle: 'italic', opacity: 0.7,
          }}>
            Tags: {contactTagNames}
          </div>
        ) : null}

        {/* Tags */}
        {contactTagsList.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '2px' }}>
            {contactTagsList.slice(0, 3).map(tag => (
              <span key={tag.id} style={{
                fontSize: '9px', padding: '2px 6px', borderRadius: '8px',
                backgroundColor: tag.color ? `${tag.color}20` : 'rgba(0,168,132,0.1)',
                color: tag.color || '#00a884', fontWeight: 600,
                border: `1px solid ${tag.color ? `${tag.color}35` : 'rgba(0,168,132,0.2)'}`,
              }}>
                {tag.name}
              </span>
            ))}
            {contactTagsList.length > 3 && (
              <span style={{ fontSize: '9px', color: '#8696a0', fontWeight: 600 }}>
                +{contactTagsList.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer: contadores + dropdown de estágio */}
        <div
          style={{
            borderTop: '1px solid #313d45', paddingTop: '6px', marginTop: '2px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: '10px', color: '#8696a0',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <MessageSquare size={11} />
            <span>{contactNotes.length}</span>
            {contactTagsList.length > 0 && (
              <>
                <span style={{ marginLeft: '6px' }}>🏷️</span>
                <span>{contactTagsList.length}</span>
              </>
            )}
          </div>
          <select
            value={contact.pipeline || 'Lead'}
            onChange={e => { onUpdateStage(contact.id, e.target.value as PipelineStage); }}
            style={{
              backgroundColor: '#111b21', border: '1px solid #313d45', borderRadius: '6px',
              color: '#e9edef', fontSize: '9px', padding: '2px 4px', cursor: 'pointer',
            }}
          >
            {STAGES.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
          </select>
        </div>
      </div>
    );
  };

  const renderColumn = (
    column: typeof STAGES[0] | typeof REVIEW_COLUMN,
    columnContacts: Contact[],
    isEmptyMsg: string,
  ) => (
    <div key={column.label} style={{
      flex: '1 0 260px', backgroundColor: '#111b21',
      borderRadius: '16px', border: `1px solid ${column.borderColor}`,
      display: 'flex', flexDirection: 'column', maxHeight: '100%', overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px', backgroundColor: 'rgba(17,27,33,0.9)',
        borderBottom: '1px solid #313d45',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: column.color }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: column.color }}>{column.label}</span>
        </div>
        <span style={{
          fontSize: '11px', fontWeight: 700, backgroundColor: '#202c33',
          color: '#8696a0', padding: '2px 8px', borderRadius: '10px',
        }}>
          {columnContacts.length}
        </span>
      </div>
      <div style={{ padding: '10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {columnContacts.length === 0 ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px 10px', color: '#667781', fontSize: '12px', textAlign: 'center',
            border: '1px dashed #222d34', borderRadius: '10px',
          }}>
            {isEmptyMsg}
          </div>
        ) : (
          columnContacts.map(renderCard)
        )}
      </div>
    </div>
  );

  const renderInfoPanel = (contact: Contact) => (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <form onSubmit={handleSaveContact} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '10px', color: '#8696a0', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Nome</label>
          <input type="text" value={editingContact!.name}
            onChange={e => setEditingContact({ ...editingContact!, name: e.target.value })}
            style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #313d45', backgroundColor: '#202c33', color: '#e9edef', fontSize: '12px', outline: 'none' }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '10px', color: '#8696a0', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Empresa</label>
            <input type="text" value={editingContact!.company}
              onChange={e => setEditingContact({ ...editingContact!, company: e.target.value })}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #313d45', backgroundColor: '#202c33', color: '#e9edef', fontSize: '12px', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '10px', color: '#8696a0', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Valor (R$)</label>
            <input type="number" value={editingContact!.value}
              onChange={e => setEditingContact({ ...editingContact!, value: e.target.value })}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #313d45', backgroundColor: '#202c33', color: '#e9edef', fontSize: '12px', outline: 'none' }}
            />
          </div>
        </div>
        <div>
          <label style={{ fontSize: '10px', color: '#8696a0', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>E-mail</label>
          <input type="email" value={editingContact!.email}
            onChange={e => setEditingContact({ ...editingContact!, email: e.target.value })}
            style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #313d45', backgroundColor: '#202c33', color: '#e9edef', fontSize: '12px', outline: 'none' }}
          />
        </div>
        <button type="submit" style={{
          padding: '8px', backgroundColor: '#00a884', border: 'none',
          borderRadius: '8px', color: 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
        }}>
          <Save size={13} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Salvar
        </button>
      </form>

      <div style={{ height: '1px', backgroundColor: '#313d45' }} />

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '10px', color: '#8696a0', fontWeight: 700, textTransform: 'uppercase' }}>Tags</span>
          <button onClick={() => setShowTagManager(!showTagManager)} style={{
            padding: '3px 8px', borderRadius: '6px',
            border: '1px solid rgba(0,168,132,0.3)',
            backgroundColor: showTagManager ? 'rgba(0,168,132,0.15)' : 'transparent',
            color: '#00a884', fontSize: '10px', fontWeight: 600, cursor: 'pointer',
          }}>
            {showTagManager ? 'Fechar' : 'Gerenciar'}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: showTagManager ? '8px' : '0' }}>
          {getContactTags(contact.id).length === 0 ? (
            <span style={{ fontSize: '11px', color: '#667781' }}>Nenhuma tag</span>
          ) : getContactTags(contact.id).map(tag => (
            <span key={tag.id} style={{
              fontSize: '10px', padding: '2px 7px', borderRadius: '8px',
              backgroundColor: tag.color ? `${tag.color}20` : 'rgba(0,168,132,0.1)',
              color: tag.color || '#00a884', fontWeight: 600,
              border: `1px solid ${tag.color ? `${tag.color}35` : 'rgba(0,168,132,0.2)'}`,
              display: 'inline-flex', alignItems: 'center', gap: '3px',
            }}>
              {tag.name}
              {showTagManager && onUpdateContactTags && (
                <button onClick={() => {
                  const ids = contactTags.filter(ct => ct.contact_id === contact.id).map(ct => ct.tag_id);
                  onUpdateContactTags!(contact.id, ids.filter(id => id !== tag.id));
                }} style={{
                  background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: '0', fontSize: '11px', lineHeight: '1',
                }}>✕</button>
              )}
            </span>
          ))}
        </div>
        {showTagManager && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {tags.filter(t => !contactTags.some(ct => ct.contact_id === contact.id && ct.tag_id === t.id)).map(tag => (
                <button key={tag.id} onClick={() => {
                  const ids = contactTags.filter(ct => ct.contact_id === contact.id).map(ct => ct.tag_id);
                  onUpdateContactTags?.(contact.id, [...ids, tag.id]);
                }} style={{
                  fontSize: '10px', padding: '2px 7px', borderRadius: '8px',
                  backgroundColor: tag.color ? `${tag.color}15` : 'rgba(0,168,132,0.08)',
                  color: tag.color || '#00a884',
                  border: `1px solid ${tag.color ? `${tag.color}30` : 'rgba(0,168,132,0.15)'}`,
                  cursor: 'pointer', fontWeight: 500,
                }}>
                  + {tag.name}
                </button>
              ))}
            </div>
            {onCreateTag && (
              <form onSubmit={e => {
                e.preventDefault();
                if (!newTagName.trim()) return;
                const t: Tag = { id: Date.now().toString(), name: newTagName.trim(), color: newTagColor };
                onCreateTag(t);
                const ids = contactTags.filter(ct => ct.contact_id === contact.id).map(ct => ct.tag_id);
                onUpdateContactTags?.(contact.id, [...ids, t.id]);
                setNewTagName('');
                setNewTagColor('#00a884');
              }} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input type="text" value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    placeholder="Nova tag..."
                    style={{ flex: 1, padding: '5px 8px', borderRadius: '6px', border: '1px solid #313d45', backgroundColor: '#202c33', color: '#e9edef', fontSize: '10px', outline: 'none' }}
                  />
                  <button type="submit" disabled={!newTagName.trim()} style={{
                    padding: '5px 10px', borderRadius: '6px', border: 'none',
                    backgroundColor: newTagName.trim() ? newTagColor : '#2a3942',
                    color: newTagName.trim() ? 'white' : '#8696a0',
                    fontSize: '10px', fontWeight: 700, cursor: newTagName.trim() ? 'pointer' : 'not-allowed',
                  }}>Criar</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                  {PRESET_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setNewTagColor(c)} style={{
                      width: '18px', height: '18px', borderRadius: '50%', backgroundColor: c,
                      border: c === newTagColor ? '2px solid white' : '2px solid transparent',
                      cursor: 'pointer', padding: 0, outline: 'none',
                      boxShadow: c === newTagColor ? '0 0 0 1px #313d45' : 'none',
                    }} />
                  ))}
                  <input type="color" value={newTagColor}
                    onChange={e => setNewTagColor(e.target.value)}
                    style={{ width: '18px', height: '18px', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0, background: 'none' }}
                    title="Personalizar cor"
                  />
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      <div style={{ height: '1px', backgroundColor: '#313d45' }} />

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '10px', color: '#8696a0', fontWeight: 700, textTransform: 'uppercase' }}>
            Histórico / Notas
          </span>
          <span style={{ fontSize: '10px', color: '#00a884', fontWeight: 600 }}>
            {getContactNotes(contact.id).length} registros
          </span>
        </div>
        <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
          <textarea placeholder="Nota de acompanhamento..."
            value={newNoteText} onChange={e => setNewNoteText(e.target.value)}
            rows={2}
            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #313d45', backgroundColor: '#202c33', color: '#e9edef', fontSize: '11px', resize: 'none', outline: 'none' }}
          />
          <button type="submit" disabled={!newNoteText.trim()} style={{
            padding: '6px', backgroundColor: newNoteText.trim() ? 'rgba(0,168,132,0.2)' : '#2a3942',
            border: newNoteText.trim() ? '1px solid rgba(0,168,132,0.4)' : '1px solid transparent',
            borderRadius: '8px', color: newNoteText.trim() ? '#00a884' : '#8696a0',
            fontSize: '10px', fontWeight: 700, cursor: newNoteText.trim() ? 'pointer' : 'not-allowed',
          }}>
            Registrar Nota
          </button>
        </form>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {getContactNotes(contact.id).length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '12px', color: '#667781', fontSize: '11px', justifyContent: 'center', border: '1px dashed #313d45', borderRadius: '8px' }}>
              <AlertCircle size={13} /> Sem notas
            </div>
          ) : getContactNotes(contact.id).map(note => (
            <div key={note.id} style={{ backgroundColor: '#202c33', border: '1px solid #313d45', borderRadius: '8px', padding: '8px', fontSize: '11px' }}>
              <div style={{ color: '#e9edef', whiteSpace: 'pre-wrap', lineHeight: '1.3' }}>{note.description}</div>
              <div style={{ fontSize: '9px', color: '#8696a0', textAlign: 'right', marginTop: '4px' }}>
                {new Date(note.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Conversation View: painel lateral flutuante à direita da conversa, sem cobrir o #main
  if (conversationView && selectedContact && editingContact) {
    // O painel CRM ocupa os últimos 340px da tela (à direita do #main via marginRight no useEffect)
    const panelWidth = 340;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: `${panelWidth}px`,
        height: '100vh',
        zIndex: 2147483645,
        backgroundColor: '#111b21',
        borderLeft: '2px solid rgba(0,156,254,0.35)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#e9edef',
        // Garante que o #main não seja coberto empurrando seu margin
        // (a borda azul no #main sinaliza que está ativo)
      }}>
        {/* Header do painel */}
        <div style={{
          padding: '12px 14px',
          borderBottom: '1px solid #313d45',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#202c33',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setConversationView(false)}
              style={{
                padding: '4px 6px', background: 'rgba(0,168,132,0.1)',
                border: '1px solid rgba(0,168,132,0.3)',
                borderRadius: '6px', color: '#00a884', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: 600,
              }}
            >
              <ArrowLeft size={12} /> Kanban
            </button>
            <div>
              <div style={{ fontWeight: 700, fontSize: '12px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedContact.name}
              </div>
              <div style={{ fontSize: '10px', color: '#8696a0' }}>{selectedContact.phone}</div>
            </div>
          </div>
          <button
            onClick={() => setConversationView(false)}
            style={{ border: 'none', background: 'transparent', color: '#8696a0', cursor: 'pointer', padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Botão Abrir Conversa */}
        <div style={{ padding: '8px 14px', borderBottom: '1px solid #222d34', flexShrink: 0 }}>
          <button
            onClick={() => onOpenChat?.(selectedContact.phone)}
            style={{
              width: '100%', padding: '7px', backgroundColor: 'rgba(0,168,132,0.12)',
              border: '1px solid rgba(0,168,132,0.35)', borderRadius: '8px',
              color: '#00a884', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
            }}
          >
            <MessageCircle size={13} /> Abrir Conversa
          </button>
        </div>

        {renderInfoPanel(selectedContact)}
      </div>
    );
  }

  // Board View: overlay fullscreen com quadro Kanban
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2147483645,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex', flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#e9edef',
    }}>
      <div style={{
        padding: '14px 24px', backgroundColor: '#111b21',
        borderBottom: '1px solid #313d45',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '34px', height: '34px', backgroundColor: 'rgba(0,168,132,0.15)',
            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00a884',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Kanban CRM</h2>
            <p style={{ fontSize: '11px', color: '#8696a0', margin: '1px 0 0 0' }}>
              {contactsWithTags.length} contatos com tags • {contacts.length} total
            </p>
          </div>
        </div>
        <button onClick={onClose} style={{
          padding: '8px', background: 'transparent', border: 'none',
          borderRadius: '8px', color: '#8696a0', cursor: 'pointer',
        }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{
          display: 'flex', flex: 1, overflowX: 'auto',
          padding: '16px', gap: '12px', alignItems: 'flex-start',
        }}>
          {renderColumn(REVIEW_COLUMN, contactsWithTags, 'Nenhum contato com tags')}

          {STAGES.map(stage => {
            const stageContacts = contacts.filter(c =>
              (c.pipeline || 'Lead') === stage.label &&
              !contactsWithTags.some(wt => wt.id === c.id),
            );
            return renderColumn(stage, stageContacts, 'Nenhum lead aqui');
          })}
        </div>

        {selectedContact && editingContact && (
          <div style={{
            width: '380px', borderLeft: '1px solid #313d45',
            backgroundColor: '#111b21', display: 'flex', flexDirection: 'column',
            height: '100%', flexShrink: 0,
          }}>
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid #313d45',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: '#202c33',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TagIcon size={15} style={{ color: '#00a884' }} />
                <span style={{ fontWeight: 700, fontSize: '13px' }}>Detalhes</span>
              </div>
              <button onClick={() => setSelectedContact(null)} style={{
                border: 'none', background: 'transparent', color: '#8696a0', cursor: 'pointer',
              }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '6px', padding: '10px 16px', borderBottom: '1px solid #313d45' }}>
              <button onClick={() => enterConversationView(selectedContact)} style={{
                flex: 1, padding: '7px', backgroundColor: 'rgba(0,168,132,0.1)',
                border: '1px solid rgba(0,168,132,0.3)', borderRadius: '8px',
                color: '#00a884', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              }}>
                <MessageCircle size={13} /> Abrir Conversa
              </button>
            </div>

            {renderInfoPanel(selectedContact)}
          </div>
        )}
      </div>
    </div>
  );
};
