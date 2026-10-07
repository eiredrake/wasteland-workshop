import type { Blueprint } from '../features/blueprints/Blueprint'
import { applicationResourceDefinitions, applicationResourceDefaults } from './ApplicationResourceDefaults'

export type EconomicResourceDefinition = {
  itemId: number
  name: string
  defaultValue: number | undefined
  source: 'ayden' | 'unknown'
}

export function getEconomicResourceDefinitions(blueprints: Blueprint[]): EconomicResourceDefinition[] {
  const names = new Map(applicationResourceDefinitions.map(resource => [resource.itemId, resource.name]))
  for (const blueprint of blueprints) {
    for (const recipe of blueprint.itemCraftings ?? []) {
      for (const ingredient of recipe.craftingComponents) names.set(ingredient.component.id, ingredient.component.name.trim())
    }
  }
  return [...names].map(([itemId, name]) => ({ itemId, name,
    defaultValue: applicationResourceDefaults[itemId],
    source: applicationResourceDefaults[itemId] === undefined ? 'unknown' as const : 'ayden' as const,
  })).sort((a, b) => a.name.localeCompare(b.name))
}
