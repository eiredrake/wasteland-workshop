import { userStorage } from '../backup/UserStorage'
export const WAREHOUSE_SETTINGS_KEY='wasteland-workshop-warehouse-settings'
export const DEFAULT_EXPIRATION_WARNING_DAYS=30
export function validWarningDays(value:unknown):value is number {return Number.isSafeInteger(value)&&(value as number)>=0&&(value as number)<=3650}
export function loadExpirationWarningDays(storage:Pick<Storage,'getItem'>=userStorage):number {
  try {const raw=storage.getItem(WAREHOUSE_SETTINGS_KEY);if(!raw)return DEFAULT_EXPIRATION_WARNING_DAYS;const data=JSON.parse(raw);return data.version===1&&validWarningDays(data.expirationWarningDays)?data.expirationWarningDays:DEFAULT_EXPIRATION_WARNING_DAYS}
  catch {return DEFAULT_EXPIRATION_WARNING_DAYS}
}
export function saveExpirationWarningDays(days:number,storage:Pick<Storage,'setItem'>=userStorage) {
  if(!validWarningDays(days))throw new Error('Enter whole warning days from 0 to 3650.')
  storage.setItem(WAREHOUSE_SETTINGS_KEY,JSON.stringify({version:1,expirationWarningDays:days}))
}
