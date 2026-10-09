/**
 * Adaptador de Armazenamento de Alta Performance via IndexedDB
 * Permite armazenar grandes volumes de contatos, notas, tags e tarefas
 * sem sofrer com as limitações de quota e bloqueio de thread do chrome.storage.local.
 */

const DB_NAME = 'WhatsCRM_DB';
const DB_VERSION = 1;

export interface DBStores {
  contacts: 'id' | 'phone' | 'pipeline';
  notes: 'id' | 'contact_id';
  tags: 'id' | 'name';
  contactTags: 'contact_id' | 'tag_id';
  tasks: 'id' | 'contact_id' | 'completed';
}

class IndexedDBAdapter {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB não é suportado neste ambiente.');
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('contacts')) {
          const contactStore = db.createObjectStore('contacts', { keyPath: 'id' });
          contactStore.createIndex('phone', 'phone', { unique: false });
          contactStore.createIndex('pipeline', 'pipeline', { unique: false });
        }

        if (!db.objectStoreNames.contains('notes')) {
          const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
          noteStore.createIndex('contact_id', 'contact_id', { unique: false });
        }

        if (!db.objectStoreNames.contains('tags')) {
          const tagStore = db.createObjectStore('tags', { keyPath: 'id' });
          tagStore.createIndex('name', 'name', { unique: false });
        }

        if (!db.objectStoreNames.contains('contactTags')) {
          const ctStore = db.createObjectStore('contactTags', { keyPath: ['contact_id', 'tag_id'] });
          ctStore.createIndex('contact_id', 'contact_id', { unique: false });
          ctStore.createIndex('tag_id', 'tag_id', { unique: false });
        }

        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('contact_id', 'contact_id', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.initPromise;
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  async setAll<T extends Record<string, any>>(storeName: string, items: T[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();

      for (const item of items) {
        store.put(item);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async put<T extends Record<string, any>>(storeName: string, item: T): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: IDBValidKey | IDBKeyRange): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const indexedDbAdapter = new IndexedDBAdapter();
