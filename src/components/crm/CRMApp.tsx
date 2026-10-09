import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './Header';
import { PipelineSelector } from './PipelineSelector';
import { TagsManager } from './TagsManager';
import { NotesList } from './NotesList';
import { TaskManager } from './TaskManager';
import { Contact, Note, Tag, Task, ContactTag } from '../../types';
import { mockContacts, mockNotes, mockTags, mockContactTags, mockTasks } from '../../data/mockData';
import { X, Save, Search } from 'lucide-react';

interface CRMAppProps {
  activePhone: string;
  activeName: string;
  onClose?: () => void;
  isStandalone?: boolean;
  externalContacts?: Contact[];
  externalNotes?: Note[];
  externalTags?: Tag[];
  externalContactTags?: ContactTag[];
  externalTasks?: Task[];
  onUpsertContact?: (contact: Contact) => void;
  onAddNote?: (note: Note) => void;
  onAddTask?: (task: Task) => void;
  onToggleTask?: (taskId: string) => void;
  onSetContactTags?: (contactId: string, tagIds: string[]) => void;
  onAddTag?: (tag: Tag) => void;
  onScanAll?: () => void;
}

export const CRMApp = ({
  activePhone, activeName, onClose, isStandalone = false,
  externalContacts, externalNotes, externalTags, externalContactTags, externalTasks,
  onUpsertContact, onAddNote, onAddTask, onToggleTask, onSetContactTags, onAddTag, onScanAll,
}: CRMAppProps) => {
  const [contacts, setContacts] = useState<Contact[]>(
    externalContacts ?? mockContacts,
  );
  const [notes, setNotes] = useState<Note[]>(externalNotes ?? mockNotes);
  const [tags, setTags] = useState<Tag[]>(externalTags ?? mockTags);
  const [contactTags, setContactTags] = useState<ContactTag[]>(
    externalContactTags ?? mockContactTags,
  );
  const [tasks, setTasks] = useState<Task[]>(externalTasks ?? mockTasks);

  const [currentContact, setCurrentContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (externalContacts) setContacts(externalContacts);
    if (externalNotes) setNotes(externalNotes);
    if (externalTags) setTags(externalTags);
    if (externalContactTags) setContactTags(externalContactTags);
    if (externalTasks) setTasks(externalTasks);
  }, [externalContacts, externalNotes, externalTags, externalContactTags, externalTasks]);

  useEffect(() => {
    if (!activePhone) { setCurrentContact(null); return; }
    setLoading(true);
    const timer = setTimeout(() => {
      let contact = contacts.find(c => c.phone === activePhone);
      if (!contact) {
        contact = {
          id: Date.now().toString(),
          phone: activePhone,
          name: activeName || 'Novo Lead',
          pipeline: 'Lead',
          created_at: new Date().toISOString(),
        };
        setContacts(prev => [...prev, contact!]);
        onUpsertContact?.(contact);
      }
      setCurrentContact(contact);
      setLoading(false);
      setHasChanges(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [activePhone, activeName]);

  const updateContactField = useCallback((field: keyof Contact, value: any) => {
    if (!currentContact) return;
    setCurrentContact(prev => prev ? { ...prev, [field]: value } : null);
    setHasChanges(true);
  }, [currentContact]);

  const handleSave = () => {
    if (!currentContact) return;
    const updated = contacts.map(c => c.id === currentContact.id ? currentContact : c);
    setContacts(updated);
    onUpsertContact?.(currentContact);
    setHasChanges(false);
  };

  const handleAddNote = useCallback((description: string) => {
    if (!currentContact) return;
    const newNote: Note = {
      id: Date.now().toString(),
      contact_id: currentContact.id,
      description,
      created_at: new Date().toISOString(),
    };
    setNotes(prev => [...prev, newNote]);
    onAddNote?.(newNote);
  }, [currentContact, onAddNote]);

  const handleAddTask = useCallback((description: string, dueDate?: string) => {
    if (!currentContact) return;
    const newTask: Task = {
      id: Date.now().toString(),
      contact_id: currentContact.id,
      description,
      due_date: dueDate,
      completed: false,
    };
    setTasks(prev => [...prev, newTask]);
    onAddTask?.(newTask);
  }, [currentContact, onAddTask]);

  const handleToggleTask = useCallback((taskId: string) => {
    setTasks(prev => {
      const next = prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
      onToggleTask?.(taskId);
      return next;
    });
  }, [onToggleTask]);

  const handleAddTag = useCallback((tagId: string) => {
    if (!currentContact) return;
    const newCt: ContactTag = { contact_id: currentContact.id, tag_id: tagId };
    setContactTags(prev => [...prev, newCt]);
    onSetContactTags?.(currentContact.id, [...contactTags.filter(ct => ct.contact_id === currentContact.id).map(ct => ct.tag_id), tagId]);
  }, [currentContact, contactTags, onSetContactTags]);

  const handleRemoveTag = useCallback((tagId: string) => {
    if (!currentContact) return;
    const next = contactTags.filter(ct => !(ct.contact_id === currentContact.id && ct.tag_id === tagId));
    setContactTags(next);
    onSetContactTags?.(currentContact.id, next.filter(ct => ct.contact_id === currentContact.id).map(ct => ct.tag_id));
  }, [currentContact, contactTags, onSetContactTags]);

  const handleCreateTag = useCallback((name: string) => {
    const newTag: Tag = { id: Date.now().toString(), name };
    setTags(prev => [...prev, newTag]);
    onAddTag?.(newTag);
    handleAddTag(newTag.id);
  }, [handleAddTag, onAddTag]);

  if (!activePhone) {
    return (
      <div className={`flex flex-col h-full bg-[#111b21] text-[#e9edef] ${isStandalone ? 'w-full' : 'w-80 lg:w-[340px] xl:w-[380px] shrink-0'}`}>
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#313d45]">
          <div className="w-7 h-7 bg-[#00a884] rounded flex items-center justify-center text-[10px] font-bold text-white">W</div>
          <span className="font-bold text-xs tracking-widest text-[#00a884] uppercase">WhatsCRM</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <p className="text-[#8696a0] text-sm">Selecione uma conversa para gerenciar o lead.</p>
        </div>
      </div>
    );
  }

  const currentNotes = currentContact ? notes.filter(n => n.contact_id === currentContact.id) : [];
  const currentContactTags = currentContact
    ? contactTags.filter(ct => ct.contact_id === currentContact.id).map(ct => tags.find(t => t.id === ct.tag_id)!).filter(Boolean)
    : [];
  const currentTasks = currentContact ? tasks.filter(t => t.contact_id === currentContact.id) : [];

  return (
    <div className={`flex flex-col h-full bg-[#111b21] text-[#e9edef] relative ${isStandalone ? 'w-full' : 'w-80 lg:w-[340px] xl:w-[380px] shrink-0'}`}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#313d45] shrink-0 bg-[#202c33]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#00a884] rounded flex items-center justify-center text-[9px] font-bold text-white">W</div>
          <span className="font-bold text-[10px] tracking-widest text-[#00a884] uppercase">WhatsCRM</span>
        </div>
        <div className="flex items-center gap-1">
          {onScanAll && (
            <button onClick={onScanAll} className="p-1.5 hover:bg-[#2a3942] rounded text-[#8696a0] hover:text-[#f59e0b] transition-colors" title="Escanear todos os contatos">
              <Search size={14} />
            </button>
          )}
          {hasChanges && (
            <button onClick={handleSave} className="flex items-center gap-1 text-[10px] uppercase font-bold bg-[#00a884]/20 text-[#00a884] px-2.5 py-1 rounded hover:bg-[#00a884]/30 transition-colors">
              <Save size={12} /> Salvar
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-[#2a3942] rounded text-[#8696a0] hover:text-[#e9edef] transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {loading || !currentContact ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#00a884]/30 border-t-[#00a884] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto flex flex-col no-scrollbar">
          <div className="shrink-0">
            <Header
              name={currentContact.name}
              phone={currentContact.phone}
              company={currentContact.company}
              email={currentContact.email}
              value={currentContact.value}
              onCompanyChange={(val) => updateContactField('company', val)}
              onEmailChange={(val) => updateContactField('email', val)}
              onValueChange={(val) => updateContactField('value', val)}
            />
            <PipelineSelector
              status={currentContact.pipeline}
              onChange={(val) => updateContactField('pipeline', val)}
            />
            <TagsManager
              contactTags={currentContactTags}
              allTags={tags}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              onCreateTag={handleCreateTag}
            />
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <NotesList notes={currentNotes} onAddNote={handleAddNote} />
          </div>
          <div className="shrink-0 border-t border-[#313d45]">
            <TaskManager tasks={currentTasks} onAddTask={handleAddTask} onToggleTask={handleToggleTask} />
          </div>
        </div>
      )}
    </div>
  );
};
