/**
 * Camada de Sincronização Extensível (Local-First por padrão + Cloud Sync Opcional)
 */

import type { CRMStoreDataSchema } from '../../schemas';
import { z } from 'zod';

export type CRMData = z.infer<typeof CRMStoreDataSchema>;

export interface SyncResult {
  success: boolean;
  syncedAt?: string;
  error?: string;
}

export interface ISyncAdapter {
  pull(): Promise<Partial<CRMData> | null>;
  push(data: CRMData): Promise<SyncResult>;
}

/**
 * Adapter Local-First (Custo R$ 0,00)
 * Os dados são gerenciados 100% no dispositivo do usuário.
 */
export class LocalSyncAdapter implements ISyncAdapter {
  async pull(): Promise<Partial<CRMData> | null> {
    return null; // Local-First já consome storage local diretamente
  }

  async push(_data: CRMData): Promise<SyncResult> {
    return { success: true, syncedAt: new Date().toISOString() };
  }
}

/**
 * Adapter Remoto / Cloud Sync (Para equipes e planos corporativos)
 * Permite sincronizar com qualquer backend REST / Supabase / Webhook
 */
export class RemoteRestSyncAdapter implements ISyncAdapter {
  constructor(
    private apiUrl: string,
    private apiKey?: string
  ) {}

  async pull(): Promise<Partial<CRMData> | null> {
    if (!this.apiUrl) return null;
    try {
      const response = await fetch(`${this.apiUrl}/sync`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Falha no pull remoto: ${response.statusText}`);
      }

      return (await response.json()) as Partial<CRMData>;
    } catch (err: any) {
      console.warn('[WhatsCRM Sync] Erro no pull remoto:', err);
      return null;
    }
  }

  async push(data: CRMData): Promise<SyncResult> {
    if (!this.apiUrl) {
      return { success: false, error: 'URL da API remota não configurada' };
    }
    try {
      const response = await fetch(`${this.apiUrl}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Falha no push remoto: ${response.statusText}`);
      }

      return { success: true, syncedAt: new Date().toISOString() };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro desconhecido ao sincronizar' };
    }
  }
}

export function createSyncAdapter(settings?: { mode?: 'local' | 'remote'; remoteApiUrl?: string; apiKey?: string }): ISyncAdapter {
  if (settings?.mode === 'remote' && settings.remoteApiUrl) {
    return new RemoteRestSyncAdapter(settings.remoteApiUrl, settings.apiKey);
  }
  return new LocalSyncAdapter();
}
