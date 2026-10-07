import data from '../../data/wasteland-blueprints.json'
import type { IngredientItem } from './IngredientRequirement'
import { isIngredientSelector } from './IngredientRequirement'
const items = new Map<number,IngredientItem>()
function collect(item: IngredientItem, visited = new Set<number>()) {
  if (visited.has(item.id)) return
  if (!items.has(item.id) || item.childItemClassifications?.length) items.set(item.id,item)
  const next = new Set(visited); next.add(item.id)
  for (const child of item.childItemClassifications ?? []) collect(child.childItem,next)
}
for (const blueprint of data.blueprints) for (const recipe of blueprint.itemCraftings ?? []) {
  for (const component of recipe.craftingComponents) collect(component.component)
}
export const ingredientItems: ReadonlyMap<number,IngredientItem> = items
export function isSelectorId(id: number): boolean {
  const item = items.get(id)
  return !!item && isIngredientSelector(item)
}
