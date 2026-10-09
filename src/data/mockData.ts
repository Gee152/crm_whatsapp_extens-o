import { Contact, Note, Tag, ContactTag, Task } from '../types';

export const mockContacts: Contact[] = [
  { id: '1', phone: '5511999999991', name: 'João Silva', company: 'Tech Corp', pipeline: 'Negociação', created_at: new Date().toISOString() },
  { id: '2', phone: '5511999999992', name: 'Maria Souza', pipeline: 'Lead', created_at: new Date().toISOString() },
];

export const mockNotes: Note[] = [
  { id: '1', contact_id: '1', description: 'Cliente interessado no plano anual.', created_at: new Date(Date.now() - 86400000).toISOString() },
];

export const mockTags: Tag[] = [
  { id: '1', name: 'Site' },
  { id: '2', name: 'Quente' },
  { id: '3', name: 'Indicação' },
];

export const mockContactTags: ContactTag[] = [
  { contact_id: '1', tag_id: '2' },
];

export const mockTasks: Task[] = [
  { id: '1', contact_id: '1', description: 'Enviar proposta comercial', due_date: new Date(Date.now() + 86400000).toISOString(), completed: false },
];
