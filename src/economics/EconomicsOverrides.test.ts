import { describe, expect, it } from 'vitest'
import source from '../data/ayden-resource-defaults.json'
import { applicationResourceDefaults } from './ApplicationResourceDefaults'
import { defaultEconomicsSettings, resolveEconomicsSettings, type EconomicsOverrides } from './EconomicsSettings'
import { ECONOMICS_SETTINGS_KEY, loadEconomicsOverrides, saveEconomicsOverrides } from './EconomicsSettingsRepository'
import { DefaultCostCalculator } from './DefaultCostCalculator'
import { getEffectiveResourceValue, calculateResourceAcquisitionCosts } from './ResourceValuationService'
import { calculateResourceValuation } from './ResourceValuation'
import { calculateBlueprintCost } from './BlueprintCostService'
import { getEconomicResourceDefinitions } from './EconomicResourceCatalog'
import { testResourceEconomics } from './testResourceEconomics'
import { ingredientItems } from '../features/blueprints/IngredientCatalog'
import { allBlueprints } from '../features/blueprints/blueprints'
import { valueShoppingList } from '../features/shopping/ShoppingListService'
import type { ItemCrafting } from '../features/blueprints/ItemCrafting'
import type { ResourceEconomics } from './ResourceEconomics'

const value = (id: number, overrides: EconomicsOverrides = {}) => getEffectiveResourceValue(id, new DefaultCostCalculator(overrides))
const recipe: ItemCrafting = { id: 1, craftingMindCost: 5, craftingTimeInMinute: 10,
  craftingResolveCost: null, craftingZone: null, craftingSkills: null, craftingFinalProducts: [],
  craftingComponents: [{ id: 1, amount: 4, acceptsExpiredItemWithinDays: 0,
    component: { id: 3868, name: 'Rare Scrap', grade: '', kind: '' } }] }
function storage(initial?: unknown) {
  let raw: string | null = initial === undefined ? null : JSON.stringify(initial)
  return { getItem: () => raw, setItem: (_key: string, next: string) => { raw = next } }
}

describe('Ayden configured defaults', () => {
  it('values every canonical currency at one credit except Trade Notes and preserves overrides', () => {
    const currencies = [...ingredientItems.values()].filter(item => item.kind === 'currency')
    expect(currencies.length).toBeGreaterThan(0)
    for (const item of currencies) expect(value(item.id)).toBe(item.id === 5558 ? 5 : 1)
    expect(value(5596, { resourceValues: { 5596: 2 } })).toBe(2)
  })
  it('uses the supplied global assumptions and one card price', () => {
    expect(defaultEconomicsSettings).toEqual({ mindCostPerPoint: 0.4, timeCostPerMinute: 0.1,
      resolveCostPerPoint: 15, foragingCardCost: 4, defaultMarkupPercent: 25 })
    expect(Object.keys(defaultEconomicsSettings).filter(key => /foraging/i.test(key))).toEqual(['foragingCardCost'])
  })
  it.each([[3866, 3], [3867, 5], [3868, 7], [3873, 21], [3872, 21], [3878, 4.4], [3886, 19]])(
    'uses direct configured value for item %i: %s credits', (id, expected) => expect(value(id)).toBe(expected))
  it('imports all matched resources with provenance, not just the check values', () => {
    expect(source.acquisitionRows).toHaveLength(122)
    expect(source.entries).toHaveLength(96)
    expect(new Set(source.entries.map(entry => entry.itemId)).size).toBe(96)
    for (const entry of source.entries) {
      expect(value(entry.itemId)).toBe(entry.value)
      expect(entry.sourceName).toBeTruthy()
      expect(entry.sourceCell).toBeTruthy()
    }
    expect(value(3807)).toBe(3) // Basic Herb
    expect(value(3808)).toBe(5)
    expect(value(3809)).toBe(7)
    expect(value(3843)).toBe(7) // Cannabis
    expect(value(3857)).toBe(13.8) // Acid Compounds
    expect(value(3899)).toBe(45) // Mortis Extract
    expect(value(3882)).toBe(12) // Reviewed Machined Component(s) spelling
    expect(value(3939)).toBeUndefined() // Category input prices are not resource prices.
  })
  it('preserves the confirmed zero for Corpse without inventing a Juno mapping', () => {
    expect(source.dependencyValues.find(entry => entry.name === 'Corpse')?.values).toEqual([0])
    expect(source.unmappedDependencies.find(entry => entry.name === 'Corpse')?.values).toEqual([0])
    expect(source.entries.find(entry => entry.sourceName === 'Corpse')).toBeUndefined()
  })
  it('uses a zero user value without falling back to a default or acquisition cost', () => {
    const calculator = new DefaultCostCalculator({ resourceValues: { 3868: 0 } })
    expect(getEffectiveResourceValue(3868, calculator)).toBe(0)
    expect(calculateBlueprintCost(recipe, calculator).materialCost).toBe(0)
  })
  it('has immutable defaults and creates independent effective snapshots', () => {
    const overrides = { mindCostPerPoint: 1, resourceValues: { 3868: 10 } }
    const effective = resolveEconomicsSettings(overrides)
    effective.resourceValues[3868] = 20
    expect(overrides.resourceValues[3868]).toBe(10)
    expect(applicationResourceDefaults[3868]).toBe(7)
    expect(defaultEconomicsSettings.mindCostPerPoint).toBe(0.4)
  })
  it('uses an override everywhere and restores the application default when cleared', () => {
    expect(value(3868, { resourceValues: { 3868: 10 } })).toBe(10)
    expect(value(3868, { resourceValues: {} })).toBe(7)
    expect(resolveEconomicsSettings({ mindCostPerPoint: 1 }).mindCostPerPoint).toBe(1)
    expect(resolveEconomicsSettings({}).mindCostPerPoint).toBe(0.4)
  })
  it('never changes configured prices when labor, card, or another resource price changes', () => {
    const overrides = { mindCostPerPoint: 20, timeCostPerMinute: 30, foragingCardCost: 100,
      resolveCostPerPoint: 50, resourceValues: { 3866: 100 } }
    expect(value(3867, overrides)).toBe(5)
    expect(value(3868, overrides)).toBe(7)
    expect(value(3873, overrides)).toBe(21)
    expect(value(3878, overrides)).toBe(4.4)
  })
  it('keeps unknown and alternative-resource IDs unknown instead of guessing a price', () => {
    expect(value(999999)).toBeUndefined()
    expect(value(3902)).toBeUndefined() // Anise or Geranium has no direct configured price.
    const unknown = { ...recipe, craftingComponents: [{ ...recipe.craftingComponents[0],
      component: { ...recipe.craftingComponents[0].component, id: 3902 } }] }
    expect(calculateBlueprintCost(unknown, new DefaultCostCalculator()).productionCost).toBeUndefined()
    expect(calculateBlueprintCost(unknown, new DefaultCostCalculator({ resourceValues: { 3902: 7 } })).materialCost).toBe(0)
  })
})

describe('override storage', () => {
  it('persists only explicit overrides, including zero, and resetting survives reload', () => {
    const store = storage()
    const overrides = { mindCostPerPoint: 1, resourceValues: { 3868: 10, 3866: 0 } }
    expect(saveEconomicsOverrides(overrides, store)).toBe(true)
    expect(loadEconomicsOverrides(store)).toEqual(overrides)
    expect(JSON.parse(store.getItem()!)).toEqual({ version: 1, overrides })
    expect(resolveEconomicsSettings(loadEconomicsOverrides(store)).resourceValues[3868]).toBe(10)
    saveEconomicsOverrides({}, store)
    expect(loadEconomicsOverrides(store)).toEqual({})
    expect(resolveEconomicsSettings(loadEconomicsOverrides(store)).resourceValues[3868]).toBe(7)
    expect(ECONOMICS_SETTINGS_KEY).toBe('wasteland-workshop-economics-settings')
  })
  it('preserves explicit versioned user overrides when application defaults change', () => {
    const store = storage({ version: 1, overrides: { mindCostPerPoint: 0.8, resolveCostPerPoint: 25,
      foragingCardCost: 7, resourceValues: { 3868: 92 } } })
    expect(loadEconomicsOverrides(store)).toEqual({ mindCostPerPoint: 0.8, resolveCostPerPoint: 25,
      foragingCardCost: 7, resourceValues: { 3868: 92 } })
  })
  it('migrates old full settings against historical defaults so unchanged values adopt Ayden', () => {
    const migrated = loadEconomicsOverrides(storage({ mindCostPerPoint: 0.8, timeCostPerMinute: 0.1,
      defaultMarkupPercent: 25, basicForagingCardCost: 2, proficientForagingCardCost: 5, masterForagingCardCost: 9 }))
    expect(migrated).toEqual({})
    expect(resolveEconomicsSettings(migrated).mindCostPerPoint).toBe(0.4)
    expect(loadEconomicsOverrides(storage({ mindCostPerPoint: 1, defaultMarkupPercent: 35 })))
      .toEqual({ mindCostPerPoint: 1, defaultMarkupPercent: 35 })
  })
  it.each([null, [], 'invalid', { version: 99, overrides: { foragingCardCost: 20 } }])('handles unsupported saved data %j', saved => {
    expect(loadEconomicsOverrides(storage(saved))).toEqual({})
  })
  it('handles corrupt JSON and denied storage without applying unsaved overrides', () => {
    expect(loadEconomicsOverrides({ getItem: () => '{', setItem: () => {} })).toEqual({})
    const denied = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('full') } }
    expect(loadEconomicsOverrides(denied)).toEqual({})
    expect(saveEconomicsOverrides({}, denied)).toBe(false)
  })
  it('rejects invalid values without manufacturing defaults for unknown IDs', () => {
    const resolved = resolveEconomicsSettings(JSON.parse('{"mindCostPerPoint":-1,"foragingCardCost":"8","resourceValues":{"3868":0,"x":5,"-1":7,"999999":-2}}'))
    expect(resolved.mindCostPerPoint).toBe(0.4)
    expect(resolved.foragingCardCost).toBe(4)
    expect(resolved.resourceValues[3868]).toBe(0)
    expect(resolved.resourceValues[999999]).toBeUndefined()
    expect(resolveEconomicsSettings({ timeCostPerMinute: Infinity }).timeCostPerMinute).toBe(0.1)
  })
})

describe('configured-value consumers', () => {
  it('uses four Rare Scrap at its direct configured value', () => {
    expect(calculateBlueprintCost(recipe, new DefaultCostCalculator()).materialCost).toBe(28)
    expect(calculateBlueprintCost(recipe, new DefaultCostCalculator({ resourceValues: { 3868: 10 } })).materialCost).toBe(40)
  })
  it('regresses SoSweet Smashstick against its actual Juno components', () => {
    const actual = allBlueprints.find(blueprint => blueprint.name.toLowerCase() === 'sosweet smashstick')!.itemCraftings![0]
    const cost = calculateBlueprintCost(actual, new DefaultCostCalculator())
    expect(cost.components.map(component => [component.name, component.quantity, component.unitCost, component.totalCost]))
      .toEqual([['Rare Scrap', 4, 7, 28], ['Soft Metal', 1, 21, 21], ['Synthetic Fibers', 1, 19, 19], ['Craftable Stone', 2, 4.4, 8.8]])
    expect(cost.materialCost).toBeCloseTo(76.8)
    expect(cost.laborCost).toBe(8)
    expect(cost.productionCost).toBeCloseTo(84.8)
  })
  it('shares effective prices with Shopping Lists, preserving fractional and zero values', () => {
    const calculator = new DefaultCostCalculator({ resourceValues: { 3868: 10, 3878: 0 } })
    const list = { id: 'one', name: 'Build', items: [
      { kind: 'resource' as const, resourceId: 3868, name: 'Rare Scrap', quantity: 4, acquired: false },
      { kind: 'resource' as const, resourceId: 3878, name: 'Craftable Stone', quantity: 2, acquired: false },
    ] }
    const shopping = valueShoppingList(list, calculator)
    expect(shopping.remainingValue).toBe(calculateBlueprintCost(recipe, calculator).materialCost)
    expect(shopping.items[1].unitValue).toBe(0)
    expect(valueShoppingList({ ...list, items: [list.items[1]] }, new DefaultCostCalculator()).remainingValue).toBe(8.8)
  })
  it('reports partial Shopping List estimates for unknown values', () => {
    const shopping = valueShoppingList({ id: 'one', name: 'Unknown', items: [
      { kind: 'resource', resourceId: 3868, name: 'Rare Scrap', quantity: 4, acquired: false },
      { kind: 'resource', resourceId: 999999, name: 'Unknown', quantity: 1, acquired: false },
    ] }, new DefaultCostCalculator())
    expect(shopping.remainingValue).toBe(28)
    expect(shopping.unknownNeeded).toBe(1)
  })
  it('keeps Mind, Time, and Resolve consumption independent of configured material values', () => {
    const calculator = new DefaultCostCalculator({ mindCostPerPoint: 1, timeCostPerMinute: 0.25, resolveCostPerPoint: 20 })
    const cost = calculateBlueprintCost({ ...recipe, craftingResolveCost: 2 }, calculator)
    expect(cost.laborCost).toBe(7.5)
    expect(cost.resolveCost).toBe(40)
    expect(cost.materialCost).toBe(28)
    expect(cost.productionCost).toBe(75.5)
    expect(calculateBlueprintCost(recipe, calculator).resolveCost).toBe(0)
  })
  it('uses actual Juno Resolve costs at the supplied default of 15', () => {
    const actual = allBlueprints.flatMap(blueprint => blueprint.itemCraftings ?? []).find(recipe => (recipe.craftingResolveCost ?? 0) > 0)!
    expect(calculateBlueprintCost(actual, new DefaultCostCalculator()).resolveCost).toBe(15)
  })
  it('exposes every mapped default and keeps unpriced ingredients visible as unknown', () => {
    const definitions = getEconomicResourceDefinitions(allBlueprints)
    for (const entry of source.entries) expect(definitions.find(resource => resource.itemId === entry.itemId)?.defaultValue).toBe(entry.value)
    expect(definitions.find(resource => resource.itemId === 3873)?.defaultValue).toBe(21)
    expect(definitions.find(resource => resource.itemId === 3902)?.defaultValue).toBeUndefined()
  })
})

describe('intentional acquisition calculations', () => {
  it('keeps recursive acquisition estimates separate from configured values and overrides', () => {
    const rare = testResourceEconomics.find(resource => resource.itemId === 3868)!
    const calculator = new DefaultCostCalculator({ resourceValues: { 3868: 10, 3866: 100 } })
    const costs = calculateResourceAcquisitionCosts(rare, calculator, testResourceEconomics)
    expect(costs[0].calculatedCost).toBe(57) // Existing recursive Artisan route, not the configured 7 or override 10.
    expect(costs.find(cost => cost.acquisitionMethod.name === 'Helscape Mine')?.calculatedCost).toBe(7)
    expect(getEffectiveResourceValue(3868, calculator)).toBe(10)
  })
  it.each([[3866, 3], [3867, 5], [3868, 7]])('retains Mine acquisition for item %i at %s', (id, expected) => {
    const resource = testResourceEconomics.find(resource => resource.itemId === id)!
    expect(calculateResourceAcquisitionCosts(resource, new DefaultCostCalculator(), testResourceEconomics)
      .find(cost => cost.acquisitionMethod.name === 'Helscape Mine')?.calculatedCost).toBe(expected)
  })
  it('retains distinct tier yields and charges the same Foraging Card value', () => {
    const values = (['basic', 'proficient', 'master'] as const).map((foragingTier, i) =>
      calculateResourceValuation(1, { name: foragingTier, mind: 0, minutes: 0, resolve: 0,
        materialCost: 0, foragingTier, yieldQuantity: i + 1 }, new DefaultCostCalculator()).calculatedCost)
    expect(values).toEqual([4, 2, 2])
  })
  it.each([0, -1, NaN, Infinity])('handles invalid yield %s gracefully', yieldQuantity => {
    expect(calculateResourceValuation(1, { name: 'Invalid', mind: 0, minutes: 0, resolve: 0,
      materialCost: 0, foragingTier: 'basic', yieldQuantity }, new DefaultCostCalculator()).calculatedCost).toBeUndefined()
  })
  it('handles acquisition cycles even when the ID has a configured valuation', () => {
    const resource: ResourceEconomics = { itemId: 3868, acquisitionMethods: [{ name: 'Cycle', mind: 0,
      minutes: 0, materialCost: 0, resolve: 0, resources: [{ itemId: 3868, quantity: 1 }] }] }
    expect(calculateResourceAcquisitionCosts(resource, new DefaultCostCalculator(), [resource])[0].calculatedCost).toBeUndefined()
    expect(value(3868)).toBe(7)
  })
})
