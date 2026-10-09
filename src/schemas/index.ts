import { z } from 'zod';

export const PipelineStageSchema = z.enum([
  'Lead',
  'Contato Inicial',
  'Em Negociação',
  'Proposta Enviada',
  'Fechado',
  'Perdido',
]);

export const ContactSchema = z.object({
  id: z.string().min(1),
  phone: z.string().min(1),
  name: z.string(),
  company: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  value: z.number().optional(),
  pipeline: z.string(),
  created_at: z.string(),
});

export const NoteSchema = z.object({
  id: z.string().min(1),
  contact_id: z.string().min(1),
  description: z.string(),
  created_at: z.string(),
});

export const TagSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().optional(),
  pipelineStage: PipelineStageSchema.optional(),
});

export const ContactTagSchema = z.object({
  contact_id: z.string().min(1),
  tag_id: z.string().min(1),
});

export const TaskSchema = z.object({
  id: z.string().min(1),
  contact_id: z.string().min(1),
  description: z.string(),
  due_date: z.string().optional(),
  completed: z.boolean(),
});

export const QuickReplySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  message: z.string(),
  category: z.string().optional(),
});

export const PrivacySettingsSchema = z.object({
  blurMessages: z.boolean().default(false),
  blurNames: z.boolean().default(false),
  blurPhotos: z.boolean().default(false),
  blurMedia: z.boolean().default(false),
});

export const SyncSettingsSchema = z.object({
  mode: z.enum(['local', 'remote']).default('local'),
  remoteApiUrl: z.string().optional(),
  apiKey: z.string().optional(),
  autoSync: z.boolean().default(false),
  lastSyncedAt: z.string().optional(),
});

export const AppSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  showFilters: z.boolean().default(true),
  showQuickReplies: z.boolean().default(true),
  showSidebar: z.boolean().default(false),
  privacy: PrivacySettingsSchema.default({
    blurMessages: false,
    blurNames: false,
    blurPhotos: false,
    blurMedia: false,
  }),
  sync: SyncSettingsSchema.optional(),
});

export const CRMStoreDataSchema = z.object({
  contacts: z.array(ContactSchema).default([]),
  notes: z.array(NoteSchema).default([]),
  tags: z.array(TagSchema).default([]),
  contactTags: z.array(ContactTagSchema).default([]),
  tasks: z.array(TaskSchema).default([]),
  quickReplies: z.array(QuickReplySchema).default([]),
  privacy: PrivacySettingsSchema.default({
    blurMessages: false,
    blurNames: false,
    blurPhotos: false,
    blurMedia: false,
  }),
  settings: AppSettingsSchema.default({
    enabled: true,
    showFilters: true,
    showQuickReplies: true,
    showSidebar: false,
    privacy: {
      blurMessages: false,
      blurNames: false,
      blurPhotos: false,
      blurMedia: false,
    },
    sync: {
      mode: 'local',
      autoSync: false,
    },
  }),
});

/**
 * Função utilitária para validar e sanitizar dados de forma segura com fallback.
 */
export function safeParseStorageData<T>(schema: z.ZodType<T>, rawData: unknown, fallback: T): T {
  const result = schema.safeParse(rawData);
  if (result.success) {
    return result.data;
  }
  console.warn('[WhatsCRM] Validation warning:', result.error.format());
  return fallback;
}

export type ValidatedContact = z.infer<typeof ContactSchema>;
export type ValidatedNote = z.infer<typeof NoteSchema>;
export type ValidatedTag = z.infer<typeof TagSchema>;
export type ValidatedContactTag = z.infer<typeof ContactTagSchema>;
export type ValidatedTask = z.infer<typeof TaskSchema>;
export type ValidatedQuickReply = z.infer<typeof QuickReplySchema>;
export type ValidatedPrivacySettings = z.infer<typeof PrivacySettingsSchema>;
export type ValidatedAppSettings = z.infer<typeof AppSettingsSchema>;
export type ValidatedSyncSettings = z.infer<typeof SyncSettingsSchema>;
export type ValidatedCRMStoreData = z.infer<typeof CRMStoreDataSchema>;
