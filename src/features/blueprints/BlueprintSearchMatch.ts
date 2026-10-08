import type { Blueprint } from './Blueprint'
export function blueprintUsageRequirements(blueprint: Blueprint): string[] {
  return [
    blueprint.metadata?.requirementsToUse,
    ...(blueprint.itemCraftings ?? []).flatMap(recipe => recipe.craftingFinalProducts.map(product => product.finalProduct.metadata?.requirementsToUse)),
  ].filter((field): field is string => typeof field === 'string' && field.trim() !== '')
}
// Keep each view's existing columns/status search, and share usage-restriction search.
export function matchesBlueprintSearch(blueprint: Blueprint, query: string, existingFields: string[]): boolean {
  const requirements = blueprintUsageRequirements(blueprint)
  const normalized = query.trim().toLowerCase()
  return [...existingFields,...requirements].some(field => field?.toLowerCase().includes(normalized))
}
