import { isSelectorId } from '../features/blueprints/IngredientCatalog'
import source from '../data/ayden-resource-defaults.json'
import { applicationResourceDefaults } from './ApplicationResourceDefaults'

export const defaultEconomicsSettings = Object.freeze({
  ...source.globalDefaults,
  defaultMarkupPercent: 25,
})

export type EconomicSetting = keyof typeof defaultEconomicsSettings
export type EconomicsOverrides = Partial<Record<EconomicSetting, number>> & {
  resourceValues?: Record<number, number>
}
export type EconomicsSettings = Record<EconomicSetting, number> & {
  resourceValues: Record<number, number>
}

export function validEconomicValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER
}

export function sanitizeEconomicsOverrides(value: unknown): EconomicsOverrides {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const source = value as Record<string, unknown>
  const result: EconomicsOverrides = {}
  for (const key of Object.keys(defaultEconomicsSettings) as EconomicSetting[]) {
    if (validEconomicValue(source[key])) result[key] = source[key]
  }
  if (source.resourceValues && typeof source.resourceValues === 'object' && !Array.isArray(source.resourceValues)) {
    const resources: Record<number, number> = {}
    for (const [id, amount] of Object.entries(source.resourceValues)) {
      if (Number.isSafeInteger(Number(id)) && Number(id) > 0 && !isSelectorId(Number(id)) && validEconomicValue(amount)) resources[Number(id)] = amount
    }
    if (Object.keys(resources).length) result.resourceValues = resources
  }
  return result
}

// Return a fresh effective snapshot without changing application defaults or persisted overrides.
export function resolveEconomicsSettings(overrides: EconomicsOverrides = {}): EconomicsSettings {
  const global = sanitizeEconomicsOverrides(overrides)
  return { ...defaultEconomicsSettings, ...global,
    resourceValues: { ...applicationResourceDefaults, ...global.resourceValues } }
}
