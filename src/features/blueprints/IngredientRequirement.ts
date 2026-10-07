// Juno taxonomies describe acceptable ingredients, never inventory identities.
export type IngredientItem = {
  id: number; name: string; kind: string; grade?: string
  childItemClassifications?: { id?: number; childItem: IngredientItem }[]
}
export type IngredientRequirement =
  | { kind: 'concrete'; item: IngredientItem }
  | { kind: 'choice'; selectorId: number; label: string; options: IngredientItem[] }
export function isIngredientSelector(item: IngredientItem): boolean { return item.kind === 'taxonomy' }
export function concreteIngredients(item: IngredientItem, visited = new Set<number>()): IngredientItem[] {
  if (!isIngredientSelector(item)) return [item]
  if (visited.has(item.id)) return []
  const next = new Set(visited); next.add(item.id)
  return [...new Map((item.childItemClassifications ?? []).flatMap(child => concreteIngredients(child.childItem,next)).map(child => [child.id,child])).values()]
}
export function ingredientRequirement(item: IngredientItem): IngredientRequirement {
  return isIngredientSelector(item)
    ? { kind: 'choice', selectorId: item.id, label: item.name, options: concreteIngredients(item) }
    : { kind: 'concrete', item }
}
