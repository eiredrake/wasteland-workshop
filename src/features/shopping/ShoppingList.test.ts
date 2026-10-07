import { describe, expect, it } from 'vitest'
import type { BlueprintCollection } from '../blueprints/BlueprintCollection'
import type { ShoppingList, ShoppingListState } from './ShoppingList'
import { addBlueprintComponents, addResources, addShoppingList, deleteShoppingList, getBlueprintAcquisitions, getResourceCatalog, removeResource, renameShoppingList, replaceShoppingList, selectShoppingList, toggleResource, valueShoppingList } from './ShoppingListService'
import { exportShoppingList, loadShoppingLists, parseShoppingListImport, saveShoppingLists, SHOPPING_FORMAT, SHOPPING_STORAGE_KEY } from './ShoppingListRepository'
import { DefaultCostCalculator } from '../../economics/DefaultCostCalculator'
import { defaultEconomicsSettings } from '../../economics/EconomicsSettings'
import { testResourceEconomics } from '../../economics/testResourceEconomics'
import { allBlueprints } from '../blueprints/blueprints'
import { calculateBlueprintCost } from '../../economics/BlueprintCostService'

const empty: ShoppingList = { id: 'first', name: 'Merchant Run', items: [] }
const basic = { resourceId: 3866, name: 'Basic Scrap', quantity: 2 }
const calculator = new DefaultCostCalculator()
const storage = () => {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
}

describe('shopping list management', () => {
  it('creates named lists and activates only the first automatically', () => {
    let state = addShoppingList({ lists: [] }, '  Merchant Run  ', [], 'first')
    expect(state.activeListId).toBe('first')
    expect(state.lists[0].name).toBe('Merchant Run')
    state = addShoppingList(state, 'Second', [], 'second')
    expect(state.lists).toHaveLength(2)
    expect(state.activeListId).toBe('first')
  })
  it('renames without changing contents or IDs', () => {
    const state = renameShoppingList({ lists: [addResources(empty, [basic])], activeListId: 'first' }, 'first', 'New Name')
    expect(state.lists[0]).toMatchObject({ id: 'first', name: 'New Name' })
    expect(state.lists[0].items[0].quantity).toBe(2)
    expect(() => renameShoppingList(state, 'first', ' ')).toThrow()
  })
  it('selects a list and rejects unknown IDs', () => {
    const state = addShoppingList({ lists: [empty], activeListId: 'first' }, 'Second', [], 'second')
    expect(selectShoppingList(state, 'second').activeListId).toBe('second')
    expect(() => selectShoppingList(state, 'missing')).toThrow()
  })
  it('deletes lists, clears a deleted active ID and reactivates a new first list', () => {
    let state = addShoppingList({ lists: [empty], activeListId: 'first' }, 'Second', [], 'second')
    state = deleteShoppingList(state, 'second')
    expect(state.activeListId).toBe('first')
    state = deleteShoppingList(state, 'first')
    expect(state).toEqual({ lists: [], activeListId: undefined })
    expect(addShoppingList(state, 'New', [], 'new').activeListId).toBe('new')
  })
  it('persists lists and active selection together, including acquired state', () => {
    const store = storage()
    const state = { lists: [toggleResource(addResources(empty, [basic]), basic.resourceId)], activeListId: 'first' }
    saveShoppingLists(state, store)
    expect(loadShoppingLists(store)).toEqual(state)
    expect(JSON.parse(store.getItem(SHOPPING_STORAGE_KEY)!)).toMatchObject({ version: 1 })
  })
  it('clears stale active selections and safely loads malformed storage', () => {
    const store = storage()
    saveShoppingLists({ lists: [empty], activeListId: 'missing' }, store)
    expect(loadShoppingLists(store)).toEqual({ lists: [empty], activeListId: undefined })
    for (const value of ['not json', '{}', 'null', '{"version":99,"lists":[]}']) {
      store.setItem(SHOPPING_STORAGE_KEY, value)
      expect(loadShoppingLists(store)).toEqual({ lists: [] })
    }
  })
})

describe('resources and economics', () => {
  it('adds resources, merges by ID and does not mutate the original list', () => {
    const first = addResources(empty, [basic])
    const merged = addResources(first, [{ ...basic, quantity: 3 }, { resourceId: 3807, name: 'Basic Herb', quantity: 1 }])
    expect(merged.items).toHaveLength(2)
    expect(merged.items[0].quantity).toBe(5)
    expect(first.items[0].quantity).toBe(2)
    expect(empty.items).toEqual([])
  })
  it('toggles needed/acquired and explicitly removes resources', () => {
    const first = addResources(empty, [basic])
    const acquired = toggleResource(first, basic.resourceId)
    expect(acquired.items[0].acquired).toBe(true)
    expect(toggleResource(acquired, basic.resourceId).items[0].acquired).toBe(false)
    expect(removeResource(acquired, basic.resourceId).items).toEqual([])
  })
  it('reopens acquired rows when more demand is added', () => {
    const acquired = toggleResource(addResources(empty, [basic]), basic.resourceId)
    expect(addResources(acquired, [basic]).items[0]).toMatchObject({ quantity: 4, acquired: false })
  })
  it.each([0, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects invalid quantity %s atomically', quantity => {
    expect(() => addResources(empty, [basic, { ...basic, quantity }])).toThrow()
    expect(empty.items).toEqual([])
  })
  it('rejects overflow on merge', () => {
    expect(() => addResources(addResources(empty, [{ ...basic, quantity: Number.MAX_SAFE_INTEGER }]), [basic])).toThrow()
  })
  it('uses existing valuations and excludes acquired rows from remaining value', () => {
    const list = addResources(empty, [basic])
    const value = valueShoppingList(list, testResourceEconomics, calculator)
    expect(value.items[0].unitValue).toBe(3)
    expect(value.remainingValue).toBe(6)
    const acquired = valueShoppingList(toggleResource(list, basic.resourceId), testResourceEconomics, calculator)
    expect(acquired.items).toHaveLength(1)
    expect(acquired.items[0].totalValue).toBe(6)
    expect(acquired.remainingValue).toBe(0)
  })
  it('retains unknown resources and reports a partial estimate honestly', () => {
    const list = addResources(empty, [basic, { resourceId: 999999, name: 'Unknown Component', quantity: 3 }])
    const value = valueShoppingList(list, testResourceEconomics, calculator)
    expect(value.items[1].unitValue).toBeUndefined()
    expect(value.unknownNeeded).toBe(1)
    expect(value.remainingValue).toBe(6)
    expect(valueShoppingList(toggleResource(list, 999999), testResourceEconomics, calculator).unknownNeeded).toBe(0)
  })
  it('reflects current Economics Settings without storing prices', () => {
    const list = addResources(empty, [basic])
    const changed = new DefaultCostCalculator({ ...defaultEconomicsSettings, basicForagingCardCost: 100 })
    expect(valueShoppingList(list, testResourceEconomics, changed).remainingValue).toBeGreaterThan(6)
  })
  it('derives the catalog from existing components/economics, with no duplicated catalog', () => {
    const catalog = getResourceCatalog(allBlueprints, testResourceEconomics)
    expect(catalog.find(item => item.resourceId === 3866)?.name).toBe('Basic Scrap')
    expect(catalog.find(item => item.resourceId === 3881)?.name).toBe('Psionic Crystal')
    expect(new Set(catalog.map(item => item.resourceId)).size).toBe(catalog.length)
    expect(testResourceEconomics.every(resource => catalog.some(item => item.resourceId === resource.itemId))).toBe(true)
  })
})

describe('blueprint integration', () => {
  const blueprint = allBlueprints.find(blueprint => blueprint.itemCraftings?.[0]?.craftingComponents.some(item => item.component.id === 3866))!
  const crafting = blueprint.itemCraftings![0]
  it('adds all recipe components and merges existing materials', () => {
    const list = addBlueprintComponents(addResources(empty, [basic]), crafting.craftingComponents)
    const scrap = crafting.craftingComponents.filter(item => item.component.id === 3866).reduce((sum, item) => sum + item.amount, 0)
    expect(list.items.find(item => item.resourceId === 3866)?.quantity).toBe(scrap + 2)
    const twice = addBlueprintComponents(list, crafting.craftingComponents)
    expect(twice.items.find(item => item.resourceId === 3866)?.quantity).toBe(scrap * 2 + 2)
  })
  it('matches Blueprint Details material pricing for the same recipe', () => {
    const list = addBlueprintComponents(empty, crafting.craftingComponents)
    expect(valueShoppingList(list, testResourceEconomics, calculator).remainingValue).toBe(calculateBlueprintCost(crafting, testResourceEconomics, calculator).materialCost)
  })
  it('derives To Acquire prints dynamically, separate from resources', () => {
    const collection: BlueprintCollection = { id: 'collection', name: 'Character', entries: [
      { blueprintId: blueprint.id, status: 'to-acquire' }, { blueprintId: 9999999, status: 'to-acquire' },
    ] }
    const targets = getBlueprintAcquisitions(collection, allBlueprints)
    expect(targets[0]).toEqual({ kind: 'blueprint', blueprintId: blueprint.id, collectionId: 'collection', name: blueprint.name })
    expect(targets[0]).not.toHaveProperty('resourceId')
    expect(targets[0]).not.toHaveProperty('quantity')
    expect(targets[1].name).toContain('Unknown blueprint')
    expect(getBlueprintAcquisitions({ ...collection, entries: [{ blueprintId: blueprint.id, status: 'acquired' }] }, allBlueprints)).toEqual([])
    expect(getBlueprintAcquisitions(undefined, allBlueprints)).toEqual([])
    expect(getBlueprintAcquisitions({ ...collection, entries: [] }, allBlueprints)).toEqual([])
  })
})

describe('import/export', () => {
  const list = toggleResource(addResources(empty, [basic, { resourceId: 999999, name: 'Unknown', quantity: 1 }]), basic.resourceId)
  it('round-trips name, quantities, unknown IDs and statuses in a versioned format', () => {
    expect(parseShoppingListImport(exportShoppingList(list))).toEqual({ format: SHOPPING_FORMAT, version: 1, name: list.name, items: list.items })
  })
  it('imports as a new list without changing unrelated lists or active selection', () => {
    const imported = parseShoppingListImport(exportShoppingList(list))
    const state: ShoppingListState = { lists: [empty], activeListId: 'first' }
    const next = addShoppingList(state, imported.name, imported.items, 'imported')
    expect(next.lists[0]).toEqual(empty)
    expect(next.lists[1].id).toBe('imported')
    expect(next.activeListId).toBe('first')
    expect(addShoppingList({ lists: [] }, imported.name, imported.items, 'imported').activeListId).toBe('imported')
  })
  it('normalizes duplicate imported resources into one row', () => {
    const parsed = parseShoppingListImport(JSON.stringify({ format: SHOPPING_FORMAT, version: 1, name: 'Import', items: [list.items[0], { ...list.items[0], acquired: false }] }))
    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0]).toMatchObject({ quantity: 4, acquired: false })
  })
  it.each([
    'null', '{}', 'bad json',
    JSON.stringify({ format: SHOPPING_FORMAT, version: 2, name: 'Import', items: [] }),
    JSON.stringify({ format: SHOPPING_FORMAT, version: 1, name: ' ', items: [] }),
    JSON.stringify({ format: SHOPPING_FORMAT, version: 1, name: 'Import', items: [{ ...list.items[0], quantity: -1 }] }),
    JSON.stringify({ format: SHOPPING_FORMAT, version: 1, name: 'Import', items: [{ ...list.items[0], acquired: 'yes' }] }),
    JSON.stringify({ format: SHOPPING_FORMAT, version: 1, name: 'Import', items: [{ kind: 'blueprint', blueprintId: 1 }] }),
  ])('rejects malformed/unsupported import without persisting: %s', json => {
    const store = storage()
    saveShoppingLists({ lists: [list], activeListId: 'first' }, store)
    const saved = store.getItem(SHOPPING_STORAGE_KEY)
    expect(() => parseShoppingListImport(json)).toThrow()
    expect(store.getItem(SHOPPING_STORAGE_KEY)).toBe(saved)
  })
  it('updates only the selected shopping list', () => {
    const state = addShoppingList({ lists: [empty], activeListId: 'first' }, 'Second', [], 'second')
    const next = replaceShoppingList(state, addResources(state.lists[1], [basic]))
    expect(next.lists[0].items).toEqual([])
    expect(next.lists[1].items[0].quantity).toBe(2)
  })
})
