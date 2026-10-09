import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { CRMApp } from './components/crm/CRMApp';
import { useCRMStorage } from './hooks/useStorage';
import type { Contact, Note, Tag, Task, ContactTag } from './types';
import './index.css';

function CRMWindow() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const store = useCRMStorage();

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'WHATSAPP_CONTACT') {
        setPhone(event.data.phone || '');
        setName(event.data.name || '');
      }
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: 'CRM_READY' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  if (!store.ready) return null;

  return (
    <CRMApp
      activePhone={phone}
      activeName={name}
      isStandalone
      externalContacts={store.contacts}
      externalNotes={store.notes}
      externalTags={store.tags}
      externalContactTags={store.contactTags}
      externalTasks={store.tasks}
      onUpsertContact={(c: Contact) => {
        const next = [...store.contacts.filter(x => x.id !== c.id), c];
        store.persist('contacts', next);
      }}
      onAddNote={(n: Note) => {
        store.persist('notes', [...store.notes, n]);
      }}
      onAddTask={(t: Task) => {
        store.persist('tasks', [...store.tasks, t]);
      }}
      onToggleTask={(id: string) => {
        store.persist('tasks', store.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
      }}
      onSetContactTags={(contactId: string, tagIds: string[]) => {
        const others = store.contactTags.filter(ct => ct.contact_id !== contactId);
        const news: ContactTag[] = tagIds.map(tag_id => ({ contact_id: contactId, tag_id }));
        store.persist('contactTags', [...others, ...news]);
      }}
      onAddTag={(tag: Tag) => {
        store.persist('tags', [...store.tags, tag]);
      }}
      onScanAll={() => {
        window.parent.postMessage({ type: 'SCAN_ALL' }, '*');
      }}
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><CRMWindow /></StrictMode>,
);
