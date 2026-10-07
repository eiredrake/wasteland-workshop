import source from '../data/ayden-resource-defaults.json'
import { ingredientItems } from '../features/blueprints/IngredientCatalog'

// Fixed valuations imported from Ayden's sheet, not live acquisition formulas.
export const applicationResourceDefaults = Object.freeze(
  { ...Object.fromEntries(source.entries.map(resource => [resource.itemId, resource.value])),
    // Currency denominations supplied by the user; Trade Note is worth five credits.
    ...Object.fromEntries([...ingredientItems.values()].filter(item => item.kind === 'currency')
      .map(item => [item.id, item.id === 5558 ? 5 : 1])) }
) as Readonly<Record<number, number>>

export const applicationResourceDefinitions = source.entries
export const resourceValuationSource = source.source
