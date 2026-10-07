import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadBlueprintCollections } from '../blueprints/BlueprintCollectionRepository'
import { loadShoppingLists } from '../shopping/ShoppingListRepository'
import { loadEconomicsOverrides } from '../../economics/EconomicsSettingsRepository'
import { loadWarehouse } from '../warehouse/WarehouseRepository'

// Investigation evidence: these are legacy loader behaviors, not backup validation contracts.
// Replace these characterization checks when strict backup readers are introduced.
afterEach(() => vi.unstubAllGlobals())
describe('Portable-data persistence investigation', () => {
  it('finds that the collection loader accepts an invalid record without validation', () => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify([{ id: 'a', name: 'Test', entries: 'invalid' }]) })
    expect(loadBlueprintCollections()).toEqual([{ id: 'a', name: 'Test', entries: 'invalid' }])
  })
  it('finds that corrupt shopping storage becomes an empty state instead of an error', () => {
    const raw = '{broken'
    const storage = { getItem: () => raw }
    expect(loadShoppingLists(storage)).toEqual({ lists: [] })
    expect(storage.getItem()).toBe(raw)
  })
  it('finds that an unsupported economics schema becomes empty overrides', () => {
    const storage = { getItem: () => JSON.stringify({ version: 99, overrides: { mindCostPerPoint: 9 } }), setItem: vi.fn() }
    expect(loadEconomicsOverrides(storage)).toEqual({})
    expect(storage.setItem).not.toHaveBeenCalled()
  })
  it('finds that stale Warehouse references prevent loading rather than preserving an unresolved row', () => {
    const raw = JSON.stringify({ version: 2, credits: 0, entries: [{ itemId: 999999999, quantity: 2 }] })
    const storage = { getItem: () => raw }
    expect(() => loadWarehouse(storage)).toThrow('invalid or unsupported')
    expect(storage.getItem()).toBe(raw)
  })
})
