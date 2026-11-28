export type OfflineCommand<T = unknown> = {
  id: string;
  idempotencyKey: string;
  kind: string;
  payload: T;
  createdAt: string;
  attempts: number;
  lastError?: string;
};

const DB_NAME = 'renea-erp-offline';
const STORE_NAME = 'commands';
const MEMORY_KEY = 'renea_offline_queue_fallback';

const fallbackRead = (): OfflineCommand[] => {
  try {
    return JSON.parse(localStorage.getItem(MEMORY_KEY) || '[]') as OfflineCommand[];
  } catch {
    return [];
  }
};

const fallbackWrite = (items: OfflineCommand[]) => {
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn('A fila offline não pôde usar a cache local; a operação continuará em memória.', error);
  }
};

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  if (!('indexedDB' in window)) {
    reject(new Error('IndexedDB indisponível'));
    return;
  }
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE_NAME)) {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('Falha ao abrir fila offline'));
});

const stableSerialize = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`).join(',')}}`;
};

export const createIdempotencyKey = (kind: string, payload: unknown) => {
  const raw = `${kind}|${stableSerialize(payload)}`;
  let hashA = 2166136261;
  let hashB = 5381;
  for (let index = 0; index < raw.length; index += 1) {
    const code = raw.charCodeAt(index);
    hashA ^= code;
    hashA = Math.imul(hashA, 16777619);
    hashB = Math.imul(hashB, 33) ^ code;
  }
  return `${kind}-${(hashA >>> 0).toString(16)}-${(hashB >>> 0).toString(16)}`;
};

export const listOfflineCommands = async (): Promise<OfflineCommand[]> => {
  try {
    const database = await openDatabase();
    return await new Promise<OfflineCommand[]>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve((request.result || []) as OfflineCommand[]);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return fallbackRead();
  }
};

const persistOfflineCommand = async <T>(command: OfflineCommand<T>) => {
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(command);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    fallbackWrite([...fallbackRead().filter(item => item.id !== command.id), command]);
  }
};

export const enqueueOfflineCommand = async <T>(kind: string, payload: T) => {
  const idempotencyKey = createIdempotencyKey(kind, payload);
  const existing = (await listOfflineCommands()).find(item => item.idempotencyKey === idempotencyKey);
  if (existing) return existing as OfflineCommand<T>;
  const command: OfflineCommand<T> = {
    id: idempotencyKey,
    idempotencyKey,
    kind,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  await persistOfflineCommand(command);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('renea-offline-queue-change'));
  }
  return command;
};

export const removeOfflineCommand = async (id: string) => {
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    fallbackWrite(fallbackRead().filter(item => item.id !== id));
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('renea-offline-queue-change'));
  }
};

export const flushOfflineCommands = async (
  handlers: Record<string, (command: OfflineCommand) => Promise<void>>
) => {
  const commands = (await listOfflineCommands())
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const result = { processed: 0, failed: 0, pending: commands.length };
  for (const command of commands) {
    const handler = handlers[command.kind];
    if (!handler) continue;
    try {
      await handler(command);
      await removeOfflineCommand(command.id);
      result.processed += 1;
      result.pending -= 1;
    } catch (error) {
      result.failed += 1;
      const lastError = error instanceof Error ? error.message : String(error || 'Falha ao sincronizar comando offline.');
      await persistOfflineCommand({
        ...command,
        attempts: (command.attempts || 0) + 1,
        lastError,
      });
    }
  }
  return result;
};
