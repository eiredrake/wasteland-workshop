import { userStorage, type UserStorage } from '../backup/UserStorage'
export const READ_HISTORY_KEY = 'wasteland-workshop-blueprint-read-history'
export function validateReadIds(value: unknown): number[] {
  if (!Array.isArray(value) || value.length > 100000 || !value.every(id => Number.isSafeInteger(id) && id > 0)) throw new Error('Saved Blueprint read history is invalid. Existing data has been kept.')
  return [...new Set(value)]
}
export function loadReadHistory(storage: UserStorage = userStorage): number[] {
  const raw = storage.getItem(READ_HISTORY_KEY)
  if (raw === null) return []
  const data = JSON.parse(raw)
  if (!data || data.version !== 1 || Object.keys(data).some(key=>!['version','readIds'].includes(key))) throw new Error('Saved Blueprint read history is unsupported. Existing data has been kept.')
  return validateReadIds(data.readIds)
}
export function saveReadHistory(ids: number[], storage: UserStorage = userStorage) {
  storage.setItem(READ_HISTORY_KEY,JSON.stringify({version:1,readIds:validateReadIds(ids)}))
}

export function markBlueprintRead(ids: number[], id: number, storage: UserStorage = userStorage): number[] {
  if (ids.includes(id)) return ids
  const next=validateReadIds([...ids,id])
  saveReadHistory(next,storage)
  return next
}

export function markBlueprintsRead(ids: number[], blueprintIds: number[], storage: UserStorage = userStorage): number[] {
  const next=validateReadIds([...ids,...blueprintIds])
  if (next.length===ids.length && next.every((id,index)=>id===ids[index])) return ids
  saveReadHistory(next,storage)
  return next
}
