import { allBlueprints } from '../blueprints/blueprints'
import { ingredientItems } from '../blueprints/IngredientCatalog'
import { concreteIngredients, isIngredientSelector, type IngredientItem } from '../blueprints/IngredientRequirement'
export type InventoryItem = { itemId: number; name: string; kind: string; category: 'Resources' | 'Items' }
const resourceKinds = new Set(['unnamed_scrap','trade_resource','natural_resource','crafting_resource','metal','produce','unnamed_herb','named_herb','necrology_resource'])
export function createInventoryCatalog(): InventoryItem[] {
  const items = new Map<number,IngredientItem>()
  for (const item of ingredientItems.values()) for (const concrete of concreteIngredients(item)) items.set(concrete.id,concrete)
  for (const blueprint of allBlueprints) for (const recipe of blueprint.itemCraftings ?? []) {
    for (const product of recipe.craftingFinalProducts) if (!isIngredientSelector(product.finalProduct)) items.set(product.finalProduct.id,product.finalProduct)
  }
  return [...items.values()].filter(item => !isIngredientSelector(item)).map(item => ({itemId:item.id,name:item.name.trim(),kind:item.kind,
    category: resourceKinds.has(item.kind) ? 'Resources' as const : 'Items' as const})).sort((a,b) => a.name.localeCompare(b.name))
}
export const inventoryCatalog = createInventoryCatalog()
export const inventoryItemById: ReadonlyMap<number,InventoryItem> = new Map(inventoryCatalog.map(item => [item.itemId,item]))
