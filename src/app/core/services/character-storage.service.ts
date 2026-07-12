import { Injectable } from '@angular/core';
import {
  CharacterListEntry,
  deserializeCharacter,
  serializeCharacter,
  StoredCharacterDocument,
  toListEntry,
} from '../rules';

const DB_NAME = 'modern-chummer-4';
const DB_VERSION = 1;
const STORE_NAME = 'characters';

@Injectable({ providedIn: 'root' })
export class CharacterStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  async listCharacters(): Promise<CharacterListEntry[]> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error ?? new Error('Failed to list characters'));
      request.onsuccess = () => {
        const documents = (request.result as StoredCharacterDocument[]).map(toListEntry);
        documents.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        resolve(documents);
      };
    });
  }

  async loadCharacter(id: string): Promise<StoredCharacterDocument | null> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => reject(request.error ?? new Error('Failed to load character'));
      request.onsuccess = () => resolve((request.result as StoredCharacterDocument | undefined) ?? null);
    });
  }

  async saveCharacter(document: StoredCharacterDocument): Promise<void> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(document);

      request.onerror = () => reject(request.error ?? new Error('Failed to save character'));
      request.onsuccess = () => resolve();
    });
  }

  async deleteCharacter(id: string): Promise<void> {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error ?? new Error('Failed to delete character'));
      request.onsuccess = () => resolve();
    });
  }

  buildDocument(
    character: ReturnType<typeof deserializeCharacter>,
    existing?: StoredCharacterDocument | null,
  ): StoredCharacterDocument {
    const now = new Date().toISOString();
    return serializeCharacter(character, {
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
    });

    return this.dbPromise;
  }
}
