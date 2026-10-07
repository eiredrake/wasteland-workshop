import source from '../data/ayden-resource-defaults.json'

// Fixed valuations imported from Ayden's sheet, not live acquisition formulas.
export const applicationResourceDefaults = Object.freeze(
  Object.fromEntries(source.entries.map(resource => [resource.itemId, resource.value]))
) as Readonly<Record<number, number>>

export const applicationResourceDefinitions = source.entries
export const resourceValuationSource = source.source
