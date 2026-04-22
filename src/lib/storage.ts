// IndexedDB persistence for map sessions

import type { Scale, Route, SpeedSettings } from '../types';

export const DB_NAME = 'arkyvist-map-tool';
export const STORE_NAME = 'session';
export const DB_VERSION = 1;

export interface StoredSession {
  mapBlob: Blob;
  mapMeta: { filename: string; width: number; height: number };
  scale: Scale;
  routes: Route[];
  activeRouteId: string;
  speedSettings: SpeedSettings;
}

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export async function saveSession(data: StoredSession): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(data, 'current');

    request.onsuccess = () => {
      db.close();
      resolve();
    };

    request.onerror = (event) => {
      db.close();
      reject((event.target as IDBRequest).error);
    };
  });
}

export async function loadSession(): Promise<StoredSession | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get('current');

    request.onsuccess = (event) => {
      db.close();
      const result = (event.target as IDBRequest).result;
      resolve(result ?? null);
    };

    request.onerror = (event) => {
      db.close();
      reject((event.target as IDBRequest).error);
    };
  });
}

export async function clearSession(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete('current');

    request.onsuccess = () => {
      db.close();
      resolve();
    };

    request.onerror = (event) => {
      db.close();
      reject((event.target as IDBRequest).error);
    };
  });
}
