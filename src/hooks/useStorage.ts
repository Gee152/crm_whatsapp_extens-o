import { useState, useEffect, useCallback, useRef } from 'react';
import type { Contact, Note, Tag, Task, ContactTag, QuickReply, PrivacySettings, AppSettings } from '../types';
import {
  CRMStoreDataSchema,
  safeParseStorageData,
  type ValidatedCRMStoreData,
} from '../schemas';
import { indexedDbAdapter } from '../services/storage/indexedDb';
import { createSyncAdapter, type ISyncAdapter } from '../services/sync/syncAdapter';

export interface CRMStore {
  contacts: Contact[];
  notes: Note[];
  tags: Tag[];
  contactTags: ContactTag[];
  tasks: Task[];
  quickReplies: QuickReply[];
  privacy: PrivacySettings;
  settings: AppSettings;
  ready: boolean;
  persist: <K extends keyof CRMStoreData>(key: K, value: CRMStoreData[K]) => void;
  syncNow: () => Promise<void>;
}

export type CRMStoreData = Pick<
  CRMStore,
  'contacts' | 'notes' | 'tags' | 'contactTags' | 'tasks' | 'quickReplies' | 'privacy' | 'settings'
>;

export const defaultPrivacy: PrivacySettings = {
  blurMessages: false,
  blurNames: false,
  blurPhotos: false,
  blurMedia: false,
};

export const defaultSettings: AppSettings = {
  enabled: true,
  showFilters: true,
  showQuickReplies: true,
  showSidebar: false,
  privacy: defaultPrivacy,
  sync: {
    mode: 'local',
    autoSync: false,
  },
};

export const defaultQuickReplies: QuickReply[] = [
  {
    id: '1',
    title: '👋 Boas-vindas',
    message: 'Olá! Tudo bem? Como posso te ajudar hoje?',
    category: 'Geral',
  },
  {
    id: '2',
    title: '💰 Preços / Planos',
    message: 'Nossos planos começam a partir de R$ 97/mês com suporte prioritário e todas as funções ativas! Gostaria de uma demonstração?',
    category: 'Vendas',
  },
  {
    id: '3',
    title: '💳 Chave Pix',
    message: 'Segue a nossa chave Pix (CNPJ): 00.000.000/0001-00 (Empresa WhatsCRM). Assim que realizar o pagamento, por gentileza envie o comprovante por aqui!',
    category: 'Financeiro',
  },
  {
    id: '4',
    title: '📅 Agendamento',
    message: 'Perfeito! Qual o melhor dia e horário para agendarmos uma breve reunião online de 15 minutos?',
    category: 'Reuniões',
  },
  {
    id: '5',
    title: '🙏 Agradecimento',
    message: 'Muito obrigado pela confiança! Qualquer dúvida estou à disposição por aqui.',
    category: 'Suporte',
  },
];

const fallbackStoreData: CRMStoreData = {
  contacts: [],
  notes: [],
  tags: [],
  contactTags: [],
  tasks: [],
  quickReplies: defaultQuickReplies,
  privacy: defaultPrivacy,
  settings: defaultSettings,
};

export function useCRMStorage() {
  const [data, setData] = useState<CRMStoreData>(fallbackStoreData);
  const [ready, setReady] = useState(false);
  const persistTimer = useRef<ReturnType<typeof setTimeout>>();
  const syncAdapterRef = useRef<ISyncAdapter>(createSyncAdapter());

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(null, async (result) => {
        const validated: ValidatedCRMStoreData = safeParseStorageData(
          CRMStoreDataSchema,
          {
            contacts: result.contacts || [],
            notes: result.notes || [],
            tags: result.tags || [],
            contactTags: result.contactTags || [],
            tasks: result.tasks || [],
            quickReplies: result.quickReplies || defaultQuickReplies,
            privacy: result.privacy || defaultPrivacy,
            settings: result.settings || defaultSettings,
          },
          fallbackStoreData as ValidatedCRMStoreData
        );

        // Se houver IndexedDB disponível, inicializa espelhamento para suporte a alta performance
        try {
          if (validated.contacts.length > 0) {
            indexedDbAdapter.setAll('contacts', validated.contacts).catch(() => {});
          }
        } catch (_e) {}

        setData(validated as CRMStoreData);
        setReady(true);
      });
    } else {
      setReady(true);
    }
  }, []);

  const persist = useCallback(<K extends keyof CRMStoreData>(key: K, value: CRMStoreData[K]) => {
    setData((prev) => {
      const updated = { ...prev, [key]: value };

      // Espelha no IndexedDB de forma não-bloqueante
      if (['contacts', 'notes', 'tags', 'tasks', 'contactTags'].includes(key as string)) {
        indexedDbAdapter.setAll(key as string, value as any[]).catch(() => {});
      }

      return updated;
    });

    clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({ [key]: value });
      }
    }, 100);
  }, []);

  const syncNow = useCallback(async () => {
    const sync = syncAdapterRef.current;
    if (sync) {
      await sync.push(data as any);
      const remoteData = await sync.pull();
      if (remoteData) {
        setData((prev) => ({ ...prev, ...remoteData }));
      }
    }
  }, [data]);

  return { ...data, ready, persist, syncNow } as CRMStore;
}
