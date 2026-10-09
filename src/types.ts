export interface Contact {
  id: string;
  phone: string;
  name: string;
  company?: string;
  email?: string;
  value?: number;
  pipeline: string;
  created_at: string;
}

export interface Note {
  id: string;
  contact_id: string;
  description: string;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  pipelineStage?: PipelineStage;
}

export interface ContactTag {
  contact_id: string;
  tag_id: string;
}

export interface Task {
  id: string;
  contact_id: string;
  description: string;
  due_date?: string;
  completed: boolean;
}

export interface QuickReply {
  id: string;
  title: string;
  message: string;
  category?: string;
}

export interface PrivacySettings {
  blurMessages: boolean;
  blurNames: boolean;
  blurPhotos: boolean;
  blurMedia: boolean;
}

export interface SyncSettings {
  mode: 'local' | 'remote';
  remoteApiUrl?: string;
  apiKey?: string;
  autoSync: boolean;
  lastSyncedAt?: string;
}

export interface AppSettings {
  enabled: boolean;
  showFilters: boolean;
  showQuickReplies: boolean;
  showSidebar: boolean;
  privacy: PrivacySettings;
  sync?: SyncSettings;
}

export type PipelineStage = 
  | 'Lead' 
  | 'Contato Inicial' 
  | 'Em Negociação' 
  | 'Proposta Enviada' 
  | 'Fechado' 
  | 'Perdido';
