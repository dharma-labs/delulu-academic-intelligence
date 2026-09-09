'use client';

// IndexedDB blob storage for the Delulu file manager.
// Metadata (names, folders, structure) lives in zustand/localStorage;
// binary content lives here so PDFs and screenshots don't blow the
// localStorage 5MB limit.

const DB_NAME = 'delulu-files';
const DB_VERSION = 1;
const STORE = 'blobs';

export interface StoredFileBlob {
  id: string;
  blob: Blob;
}

// In-memory fallback when IndexedDB is unavailable (private browsing, etc.)
const memoryFallback = new Map<string, Blob>();
let idbAvailable: boolean | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

async function ensureAvailability(): Promise<boolean> {
  if (idbAvailable !== null) return idbAvailable;
  try {
    const db = await openDB();
    db.close();
    idbAvailable = true;
  } catch {
    idbAvailable = false;
  }
  return idbAvailable;
}

export async function putFileBlob(id: string, blob: Blob): Promise<void> {
  const ok = await ensureAvailability();
  if (!ok) {
    memoryFallback.set(id, blob);
    return;
  }
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ id, blob });
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to store file'));
    };
  });
}

export async function getFileBlob(id: string): Promise<Blob | undefined> {
  const ok = await ensureAvailability();
  if (!ok) return memoryFallback.get(id);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => {
      db.close();
      resolve(req.result?.blob as Blob | undefined);
    };
    req.onerror = () => {
      db.close();
      reject(req.error ?? new Error('Failed to read file'));
    };
  });
}

export async function deleteFileBlob(id: string): Promise<void> {
  const ok = await ensureAvailability();
  if (!ok) {
    memoryFallback.delete(id);
    return;
  }
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to delete file'));
    };
  });
}

export function isIndexedDBAvailable(): boolean {
  return idbAvailable !== false;
}

// Classify a file by its mime type / extension for icon selection.
export function classifyFile(mimeType: string, name: string): 'image' | 'pdf' | 'document' | 'video' | 'audio' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) return 'pdf';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (
    mimeType.startsWith('text/') ||
    mimeType.includes('word') ||
    mimeType.includes('document') ||
    mimeType.includes('presentation') ||
    mimeType.includes('sheet') ||
    /\.(docx?|xlsx?|pptx?|txt|md|csv)$/i.test(name)
  ) {
    return 'document';
  }
  return 'other';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
