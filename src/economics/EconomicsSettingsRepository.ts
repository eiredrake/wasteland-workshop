import { sanitizeEconomicsOverrides, type EconomicsOverrides } from './EconomicsSettings'

export const ECONOMICS_SETTINGS_KEY = 'wasteland-workshop-economics-settings'
type SettingsStorage = Pick<Storage, 'getItem' | 'setItem'>

export function loadEconomicsOverrides(storage: SettingsStorage = localStorage): EconomicsOverrides {
  try {
    const raw = storage.getItem(ECONOMICS_SETTINGS_KEY)
    if (!raw) return {}
    const saved: unknown = JSON.parse(raw)
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {}
    const record = saved as Record<string, unknown>
    if (record.version === 1) return sanitizeEconomicsOverrides(record.overrides)
    if ('version' in record) return {}
    // Old storage saved all effective values. Preserve only non-default compatible settings;
    // the three obsolete card prices cannot be meaningfully converted to one price.
    const migrated = sanitizeEconomicsOverrides(record)
    if (migrated.mindCostPerPoint === 0.8) delete migrated.mindCostPerPoint
    if (migrated.timeCostPerMinute === 0.1) delete migrated.timeCostPerMinute
    if (migrated.defaultMarkupPercent === 25) delete migrated.defaultMarkupPercent
    return migrated
  } catch { return {} }
}

export function saveEconomicsOverrides(overrides: EconomicsOverrides, storage: SettingsStorage = localStorage): boolean {
  try {
    storage.setItem(ECONOMICS_SETTINGS_KEY, JSON.stringify({ version: 1, overrides: sanitizeEconomicsOverrides(overrides) }))
    return true
  } catch { return false }
}
