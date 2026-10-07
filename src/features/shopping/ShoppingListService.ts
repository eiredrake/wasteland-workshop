import type { Blueprint } from '../blueprints/Blueprint'
import type { BlueprintCollection } from '../blueprints/BlueprintCollection'
import type { CraftingComponent } from '../blueprints/CraftingComponent'
import type { CostCalculator } from '../../economics/CostCalculator'
import type { ResourceEconomics } from '../../economics/ResourceEconomics'
import { calculateResourceValuations, findResourceEconomics } from '../../economics/ResourceValuationService'
import { newShoppingListId, type BlueprintAcquisitionItem, type ResourceShoppingItem, type ShoppingList, type ShoppingListState } from './ShoppingList'

export function validQuantity(quantity: number): boolean {
  return Number.isFinite(quantity) && quantity > 0 && quantity <= Number.MAX_SAFE_INTEGER
}

export function requireName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 200) throw new Error('Enter a name of 1–200 characters.')
  return trimmed
}

export function addShoppingList(state: ShoppingListState, name: string, items: ResourceShoppingItem[] = [], id = newShoppingListId()): ShoppingListState {
  if (state.lists.some(list => list.id === id)) throw new Error('Shopping list ID already exists.')
  const list = { id, name: requireName(name), items }
  return { lists: [...state.lists, list], activeListId: state.lists.length === 0 ? id : state.activeListId }
}

export function renameShoppingList(state: ShoppingListState, id: string, name: string): ShoppingListState {
  const trimmed = requireName(name)
  return { ...state, lists: state.lists.map(list => list.id === id ? { ...list, name: trimmed } : list) }
}

export function deleteShoppingList(state: ShoppingListState, id: string): ShoppingListState {
  return { lists: state.lists.filter(list => list.id !== id), activeListId: state.activeListId === id ? undefined : state.activeListId }
}

export function selectShoppingList(state: ShoppingListState, id: string): ShoppingListState {
  if (!state.lists.some(list => list.id === id)) throw new Error('Shopping list no longer exists.')
  return { ...state, activeListId: id }
}

export function addResources(list: ShoppingList, resources: { resourceId: number; name: string; quantity: number }[]): ShoppingList {
  const items = list.items.map(item => ({ ...item }))
  for (const resource of resources) {
    if (!Number.isSafeInteger(resource.resourceId) || resource.resourceId <= 0 || !validQuantity(resource.quantity)) {
      throw new Error('Choose a resource and enter a positive quantity.')
    }
    const name = requireName(resource.name)
    const existing = items.find(item => item.resourceId === resource.resourceId)
    if (existing) {
      if (!validQuantity(existing.quantity + resource.quantity)) throw new Error('Quantity is too large.')
      existing.quantity += resource.quantity
      // New demand reopens an acquired row; partial acquisitions are future work.
      existing.acquired = false
    } else {
      items.push({ kind: 'resource', ...resource, name, acquired: false })
    }
  }
  return { ...list, items }
}

// Warehouse "missing components" can later supply an adjusted set here.
export function addBlueprintComponents(list: ShoppingList, components: CraftingComponent[]): ShoppingList {
  return addResources(list, components.map(component => ({
    resourceId: component.component.id, name: component.component.name, quantity: component.amount,
  })))
}

export function toggleResource(list: ShoppingList, resourceId: number): ShoppingList {
  return { ...list, items: list.items.map(item => item.resourceId === resourceId ? { ...item, acquired: !item.acquired } : item) }
}

export function removeResource(list: ShoppingList, resourceId: number): ShoppingList {
  return { ...list, items: list.items.filter(item => item.resourceId !== resourceId) }
}

export function replaceShoppingList(state: ShoppingListState, list: ShoppingList): ShoppingListState {
  if (!state.lists.some(existing => existing.id === list.id)) throw new Error('Shopping list no longer exists.')
  return { ...state, lists: state.lists.map(existing => existing.id === list.id ? list : existing) }
}

export function getBlueprintAcquisitions(collection: BlueprintCollection | undefined, blueprints: Blueprint[]): BlueprintAcquisitionItem[] {
  if (!collection) return []
  return [...new Set(collection.entries.filter(entry => entry.status === 'to-acquire').map(entry => entry.blueprintId))]
    .map(blueprintId => ({ kind: 'blueprint', blueprintId, collectionId: collection.id,
      name: blueprints.find(blueprint => blueprint.id === blueprintId)?.name ?? `Unknown blueprint #${blueprintId}` }))
}

export type ValuedResource = ResourceShoppingItem & { unitValue?: number; totalValue?: number }
export function valueShoppingList(list: ShoppingList, resources: ResourceEconomics[], calculator: CostCalculator) {
  let remainingValue = 0
  let unknownNeeded = 0
  const items: ValuedResource[] = list.items.map(item => {
    const economics = findResourceEconomics(item.resourceId, resources)
    // Same first acquisition method as BlueprintCostService, no new pricing rule.
    const unitValue = economics ? calculateResourceValuations(economics, calculator, resources)[0]?.calculatedCost : undefined
    const totalValue = unitValue === undefined ? undefined : unitValue * item.quantity
    if (!item.acquired) {
      if (totalValue === undefined) unknownNeeded++
      else remainingValue += totalValue
    }
    return { ...item, unitValue, totalValue }
  })
  return { items, remainingValue, unknownNeeded }
}

export type ResourceOption = { resourceId: number; name: string }
export function getResourceCatalog(blueprints: Blueprint[], resources: ResourceEconomics[]): ResourceOption[] {
  const names = new Map<number, string>()
  const componentIds = new Set<number>()
  for (const blueprint of blueprints) {
    for (const crafting of blueprint.itemCraftings ?? []) {
      for (const component of crafting.craftingComponents) {
        names.set(component.component.id, component.component.name)
        componentIds.add(component.component.id)
      }
      for (const product of crafting.craftingFinalProducts) names.set(product.finalProduct.id, product.finalProduct.name)
    }
  }
  const ids = new Set([...componentIds, ...resources.map(resource => resource.itemId)])
  return [...ids].map(resourceId => ({ resourceId, name: names.get(resourceId) ?? `Resource #${resourceId}` }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
