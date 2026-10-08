// Private transaction metadata; never part of the portable backup format.
export const REVISION_KEY = 'wasteland-workshop-data-revision'
export const JOURNAL_KEY = 'wasteland-workshop-restore-journal'
export const USER_KEYS = [
  'wasteland-workshop-blueprint-collections','wasteland-workshop-active-blueprint-collection',
  'wasteland-workshop-shopping-lists','wasteland-workshop-warehouse','wasteland-workshop-economics-settings',
  'wasteland-workshop-alarm-settings','wasteland-workshop-warehouse-settings','wasteland-workshop-build-queue',
  'wasteland-workshop-blueprint-read-history',
] as const
export type UserStorage = Pick<Storage,'getItem'|'setItem'|'removeItem'>
let loadedRevision: string | null = null
function write(storage: UserStorage,key: string,value: string|null) { if(value===null)storage.removeItem(key);else storage.setItem(key,value) }
export function recoverRestore(storage: UserStorage = localStorage) {
  const raw=storage.getItem(JOURNAL_KEY)
  if (!raw) return
  const journal=JSON.parse(raw) as {before:Record<string,string|null>;previousRevision:string|null;targetRevision:string}
  if (journal?.before && !('wasteland-workshop-blueprint-read-history' in journal.before)) journal.before['wasteland-workshop-blueprint-read-history'] = storage.getItem('wasteland-workshop-blueprint-read-history')
  if (!journal || (journal.previousRevision!==null && typeof journal.previousRevision!=='string') || typeof journal.targetRevision!=='string' || !journal.before || !USER_KEYS.every(key=>typeof journal.before[key]==='string'||journal.before[key]===null)) throw new Error('Restore recovery data is unreadable. Stored data has been preserved.')
  // The revision pointer is the commit marker. Otherwise roll every key back before App mounts.
  if (storage.getItem(REVISION_KEY)!==journal.targetRevision) {
    for (const key of USER_KEYS) write(storage,key,journal.before[key])
    write(storage,REVISION_KEY,journal.previousRevision)
  }
  storage.removeItem(JOURNAL_KEY)
}
export function initializeUserStorage(storage: UserStorage = localStorage) { recoverRestore(storage);loadedRevision=storage.getItem(REVISION_KEY) }
function ensureCurrent() {
  if (localStorage.getItem(JOURNAL_KEY)) throw new Error('A restore is pending recovery. Reload the app before making changes.')
  if (localStorage.getItem(REVISION_KEY)!==loadedRevision) throw new Error('Data was restored in another tab. Reload before making changes.')
}
export const userStorage: UserStorage = {
  getItem: key=>{ensureCurrent();return localStorage.getItem(key)},
  setItem: (key,value)=>{ensureCurrent();localStorage.setItem(key,value)},
  removeItem: key=>{ensureCurrent();localStorage.removeItem(key)},
}
export function commitReplacement(values: Record<string,string|null>,storage:UserStorage=localStorage) {
  if (!USER_KEYS.every(key => Object.hasOwn(values,key) && (values[key] === null || typeof values[key] === 'string'))) throw new Error('Incomplete replacement state.')
  if(storage.getItem(JOURNAL_KEY))throw new Error('An earlier restore needs recovery. Reload before restoring again.')
  const before=Object.fromEntries(USER_KEYS.map(key=>[key,storage.getItem(key)])),previousRevision=storage.getItem(REVISION_KEY)
  const targetRevision=globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random()}`
  const journal={before,previousRevision,targetRevision}
  storage.setItem(JOURNAL_KEY,JSON.stringify(journal))
  try {
    for(const key of USER_KEYS)write(storage,key,values[key])
    storage.setItem(REVISION_KEY,targetRevision)
  } catch(error) {
    try {recoverRestore(storage)} catch {throw new Error('Restore failed and recovery could not finish. Reload to recover; do not make edits. Your previous data is saved in the recovery journal.')}
    throw error
  }
  // Once committed, an uncleared journal is harmless: startup recognizes the commit marker.
  try {storage.removeItem(JOURNAL_KEY)} catch { /* cleanup is retried before mounting App */ }
}

// Serialize restore/recovery between tabs where Web Locks are available (HTTPS/localhost).
export async function withRestoreLock<T>(operation:()=>T):Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) return navigator.locks.request('wasteland-workshop-restore',operation)
  return operation()
}