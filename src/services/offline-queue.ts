import type { FieldReportDraft, SyncStatus } from '../domain/types'

const DB_NAME = 'ner-sentinel'; const STORE = 'field-reports'; const VERSION = 1

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION)
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'localReportId' }) }
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

async function transaction<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database()
  return new Promise((resolve, reject) => { const request = work(db.transaction(STORE, mode).objectStore(STORE)); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
}

export const offlineQueue = {
  save: (report: FieldReportDraft) => transaction('readwrite', (store) => store.put(report)),
  all: () => transaction<FieldReportDraft[]>('readonly', (store) => store.getAll()),
  async byStatus(...statuses: SyncStatus[]) { return (await this.all()).filter((report) => statuses.includes(report.syncStatus)) },
  async pendingCount() { return (await this.byStatus('QUEUED_OFFLINE', 'FAILED', 'SYNCING')).length },
  async update(id: string, patch: Partial<FieldReportDraft>) { const report = await transaction<FieldReportDraft | undefined>('readonly', (store) => store.get(id)); if (!report) return; return this.save({ ...report, ...patch }) },
}
