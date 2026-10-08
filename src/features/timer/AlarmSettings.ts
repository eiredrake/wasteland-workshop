import { userStorage } from '../backup/UserStorage'
export type AlarmSettings = { sound: boolean; vibration: boolean }
export const defaultAlarmSettings: AlarmSettings = { sound: true, vibration: true }
export const ALARM_SETTINGS_KEY = 'wasteland-workshop-alarm-settings'

export function loadAlarmSettings(storage: Pick<Storage, 'getItem'> = userStorage): AlarmSettings {
  try {
    const saved = JSON.parse(storage.getItem(ALARM_SETTINGS_KEY) ?? '{}')
    return {
      sound: typeof saved?.sound === 'boolean' ? saved.sound : true,
      vibration: typeof saved?.vibration === 'boolean' ? saved.vibration : true,
    }
  } catch {
    return { ...defaultAlarmSettings }
  }
}

export function saveAlarmSettings(settings: AlarmSettings, storage: Pick<Storage, 'setItem'> = userStorage) {
  storage.setItem(ALARM_SETTINGS_KEY, JSON.stringify(settings))
}
