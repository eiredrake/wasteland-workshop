import { userStorage } from '../backup/UserStorage'
import { ingredientItems } from '../blueprints/IngredientCatalog'
import { ingredientRequirement } from '../blueprints/IngredientRequirement'
import type { ResourceShoppingItem, ShoppingList, ShoppingListState } from './ShoppingList'
import { requireName, validQuantity } from './ShoppingListService'

export const SHOPPING_STORAGE_KEY = 'wasteland-workshop-shopping-lists'
export const SHOPPING_FORMAT = 'wasteland-workshop-shopping-list'
type ShoppingExport = { format: typeof SHOPPING_FORMAT; version: 1; name: string; items: ResourceShoppingItem[] }

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid shopping list data.')
  return value as Record<string, unknown>
}

function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid shopping list name.')
  return requireName(value)
}

function parseItems(value: unknown): ResourceShoppingItem[] {
  if (!Array.isArray(value)) throw new Error('Invalid shopping list items.')
  const items: ResourceShoppingItem[] = []
  for (const entry of value) {
    const item = record(entry)
    if ((item.kind !== 'resource' && item.kind !== 'requirement') || typeof item.resourceId !== 'number' || !Number.isSafeInteger(item.resourceId) || item.resourceId <= 0 ||
      typeof item.quantity !== 'number' || !validQuantity(item.quantity) || typeof item.acquired !== 'boolean') {
      throw new Error('Invalid shopping list resource or quantity.')
    }
    const name = text(item.name)
    const existing = items.find(row => row.resourceId === item.resourceId)
    if (existing) {
      const quantity = existing.quantity + item.quantity
      if (!validQuantity(quantity)) throw new Error('Imported quantity is too large.')
      existing.quantity = quantity
      existing.acquired = existing.acquired && item.acquired
    } else {
      // Reclassify legacy rows by Juno ID; keep quantities and acquired status.
      const known = ingredientItems.get(item.resourceId)
      const requirement = known ? ingredientRequirement(known) : undefined
      const storedChoice = item.kind === 'requirement' && !known ? item.requirement as ResourceShoppingItem['requirement'] : undefined
      if (item.kind === 'requirement' && requirement?.kind !== 'choice' && (!storedChoice || storedChoice.kind !== 'choice' || storedChoice.selectorId !== item.resourceId || !Array.isArray(storedChoice.options))) throw new Error('Unknown ingredient requirement.')
      items.push({ kind: requirement?.kind === 'choice' || storedChoice ? 'requirement' : 'resource',
        ...(requirement?.kind === 'choice' ? {requirement} : storedChoice ? {requirement:storedChoice} : {}), resourceId: item.resourceId, name, quantity: item.quantity, acquired: item.acquired })
    }
  }
  return items
}

export function parseShoppingListImport(json: string): ShoppingExport {
  const data = record(JSON.parse(json))
  if (data.format !== SHOPPING_FORMAT || data.version !== 1) throw new Error('Not a supported Wasteland Workshop shopping list file.')
  return { format: SHOPPING_FORMAT, version: 1, name: text(data.name), items: parseItems(data.items) }
}

export function exportShoppingList(list: ShoppingList): string {
  return JSON.stringify({ format: SHOPPING_FORMAT, version: 1, name: list.name, items: list.items }, null, 2)
}

export function loadShoppingLists(storage: Pick<Storage, 'getItem'> = userStorage): ShoppingListState {
  try {
    const saved = storage.getItem(SHOPPING_STORAGE_KEY)
    if (!saved) return { lists: [] }
    const data = record(JSON.parse(saved))
    if (data.version !== 1 || !Array.isArray(data.lists)) throw new Error('Invalid shopping lists.')
    const lists: ShoppingList[] = data.lists.map(value => {
      const list = record(value)
      return { id: text(list.id), name: text(list.name), items: parseItems(list.items) }
    })
    if (new Set(lists.map(list => list.id)).size !== lists.length) throw new Error('Duplicate shopping list IDs.')
    const activeListId = typeof data.activeListId === 'string' && lists.some(list => list.id === data.activeListId) ? data.activeListId : undefined
    return { lists, activeListId }
  } catch {
    return { lists: [] }
  }
}

export function saveShoppingLists(state: ShoppingListState, storage: Pick<Storage, 'setItem'> = userStorage): void {
  // One write keeps list changes and active selection consistent.
  storage.setItem(SHOPPING_STORAGE_KEY, JSON.stringify({ version: 1, ...state }))
}
