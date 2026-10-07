import type { IngredientRequirement } from '../blueprints/IngredientRequirement'
export type ResourceShoppingItem = {
  kind: 'resource' | 'requirement'
  requirement?: Extract<IngredientRequirement, {kind: 'choice'}>
  resourceId: number
  name: string
  quantity: number
  acquired: boolean
}

// Derived from Blueprint Collections, never stored as material rows.
export type BlueprintAcquisitionItem = {
  kind: 'blueprint'
  blueprintId: number
  collectionId: string
  name: string
}

export type ShoppingListItem = ResourceShoppingItem | BlueprintAcquisitionItem
export type ShoppingList = { id: string; name: string; items: ResourceShoppingItem[] }
export type ShoppingListState = { lists: ShoppingList[]; activeListId?: string }

export function newShoppingListId(): string {
  // randomUUID is not available on every LAN HTTP origin used for phone testing.
  return globalThis.crypto?.randomUUID?.() ?? `shopping-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}
