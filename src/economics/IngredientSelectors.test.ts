import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { allBlueprints } from '../features/blueprints/blueprints'
import { ingredientItems, isSelectorId } from '../features/blueprints/IngredientCatalog'
import { concreteIngredients, ingredientRequirement, type IngredientItem } from '../features/blueprints/IngredientRequirement'
import { getEconomicResourceDefinitions } from './EconomicResourceCatalog'
import { DefaultCostCalculator } from './DefaultCostCalculator'
import { calculateBlueprintCost } from './BlueprintCostService'
import { resolveEconomicsSettings, sanitizeEconomicsOverrides } from './EconomicsSettings'
import { loadEconomicsOverrides, saveEconomicsOverrides } from './EconomicsSettingsRepository'
import EconomicsSettingsView from '../features/settings/EconomicsSettingsView'
import BlueprintDetails from '../features/blueprints/BlueprintDetails'
import { addBlueprintComponents, getResourceCatalog, valueShoppingList } from '../features/shopping/ShoppingListService'
import { exportShoppingList, loadShoppingLists, parseShoppingListImport, saveShoppingLists } from '../features/shopping/ShoppingListRepository'
import type { ShoppingList } from '../features/shopping/ShoppingList'
import { addBuild, buildCalculator } from '../features/builds/BuildQueueService'
import { createIdleCraftTimer } from '../features/timer/CraftTimerState'
const selectors = [...ingredientItems.values()].filter(item => isSelectorId(item.id))
const definitions = getEconomicResourceDefinitions(allBlueprints)
const selector = ingredientItems.get(3902)!
const blueprint = allBlueprints.find(b => b.itemCraftings?.some(r => r.craftingComponents.some(c => c.component.id === selector.id)))!
const recipe = blueprint.itemCraftings!.find(r => r.craftingComponents.some(c => c.component.id === selector.id))!
const component = recipe.craftingComponents.find(c => c.component.id === selector.id)!
const list: ShoppingList = {id:'test',name:'Test',items:[]}
function storage() {let raw: string | null = null; return {getItem: () => raw, setItem: (_key: string,value: string) => {raw=value}}}
describe('Concrete ingredients and structured selectors', () => {
  it.each(['Any Herb','Any Produce','Anise or Geranium','Anise or Rosemary'])('%s is absent from Settings and resource picker', name => {
    expect(definitions.some(item => item.name === name)).toBe(false)
    expect(getResourceCatalog(allBlueprints,[]).some(item => item.name === name)).toBe(false)
    const html = renderToStaticMarkup(createElement(EconomicsSettingsView,{currentOverrides:{},onSave:vi.fn()}))
    expect(html).not.toContain(name)
  })
  it('excludes all 38 structured taxonomy identities, including categories without Any/or names', () => {
    expect(selectors).toHaveLength(38)
    for (const item of selectors) {
      expect(definitions.some(resource => resource.itemId === item.id)).toBe(false)
      expect(new DefaultCostCalculator({resourceValues:{[item.id]:123}}).getEffectiveResourceValue(item.id)).toBeUndefined()
    }
    expect(selectors.find(item => item.name === 'Local Currency')).toBeTruthy()
  })
  it.each([[3811,'Anise'],[3819,'Geranium'],[3820,'Rosemary']])('maps separate concrete item %i (%s) to its actual Ayden value', (id,name) => {
    expect(definitions.find(item => item.itemId === id)).toMatchObject({name,defaultValue:7,source:'ayden'})
    expect(new DefaultCostCalculator({resourceValues:{[id]:9}}).getEffectiveResourceValue(id)).toBe(9)
  })
  it('retains two structured options, rather than parsing the selector name or inventing IDs', () => {
    expect(ingredientRequirement(selector)).toMatchObject({kind:'choice',selectorId:3902,label:'Anise or Geranium',options:[{id:3811,name:'Anise'},{id:3819,name:'Geranium'}]})
    expect(ingredientRequirement({...selector,name:'Choose an ingredient'})).toMatchObject({kind:'choice',options:[{id:3811},{id:3819}]})
    expect(ingredientRequirement({id:1,name:'Ordinary or Fancy',kind:'gizmo'}).kind).toBe('concrete')
  })
  it('handles nested taxonomies, duplicate leaves, missing children and cycles conservatively', () => {
    const leaf: IngredientItem = {id:1,name:'Herb',kind:'named_herb'}
    const nested: IngredientItem = {id:2,name:'Group',kind:'taxonomy',childItemClassifications:[{childItem:leaf}]}
    const root: IngredientItem = {id:3,name:'Choice',kind:'taxonomy',childItemClassifications:[{childItem:nested},{childItem:leaf}]}
    nested.childItemClassifications!.push({childItem:root})
    expect(concreteIngredients(root)).toEqual([leaf])
    expect(concreteIngredients({id:4,name:'Missing',kind:'taxonomy'})).toEqual([])
  })
  it('keeps all selector text and amount on the Blueprint, with unresolved cost even if an override was stored', () => {
    const cost = calculateBlueprintCost(recipe,new DefaultCostCalculator({resourceValues:{3902:999}}))
    expect(cost.components.find(c => c.itemId === 3902)).toMatchObject({name:'Anise or Geranium',quantity:component.amount,unitCost:undefined,totalCost:undefined})
    expect(cost.productionCost).toBeUndefined()
    const html = renderToStaticMarkup(createElement(BlueprintDetails,{blueprint,mode:'catalog',calculator:new DefaultCostCalculator(),defaultMarkupPercent:25,
      activeCollection:undefined,craftTimer:createIdleCraftTimer(),onAddBuild:vi.fn(),onCraftBlueprint:vi.fn(),onOpenCraftTimer:vi.fn(),onUpdateCollectionEntry:vi.fn(),
      shopping:{lists:[],onAddComponents:vi.fn(),onOpenLists:vi.fn()}}))
    expect(html).toContain('Anise or Geranium')
    expect(html).toContain('Unknown')
  })
  it('ignores fake prices even in existing captured Build snapshots', () => {
    const build = addBuild([],blueprint,resolveEconomicsSettings(),false,1000,'build')[0]
    build.economicSnapshot.resourceValues[3902]=999
    expect(buildCalculator(build).getEffectiveResourceValue(3902)).toBeUndefined()
  })
  it('discards legacy selector overrides while preserving real resource prices and unknown IDs', () => {
    expect(sanitizeEconomicsOverrides({resourceValues:{3902:999,3939:5.4,3811:11,999999:2}}).resourceValues).toEqual({3811:11,999999:2})
    const saved=storage(); saveEconomicsOverrides({resourceValues:{3902:999,3811:11}},saved)
    expect(loadEconomicsOverrides(saved).resourceValues).toEqual({3811:11})
  })
  it.each([[3866,3],[3868,7],[3873,21]])('keeps existing concrete resource %i unchanged', (id,value) => {
    expect(new DefaultCostCalculator().getEffectiveResourceValue(id)).toBe(value)
  })
  it('keeps unvalued concrete currency Unknown instead of copying the Local Currency price', () => {
    expect(definitions.find(item => item.itemId === 5557)).toMatchObject({name:'Gold Standard',defaultValue:undefined,source:'unknown'})
    expect(new DefaultCostCalculator().getEffectiveResourceValue(5557)).toBeUndefined()
  })
})
describe('Unresolved Shopping List ingredients', () => {
  it('stores the selector explicitly as one unresolved requirement, not two resources to buy', () => {
    const next = addBlueprintComponents(list,[component])
    expect(next.items).toHaveLength(1)
    expect(next.items[0]).toMatchObject({kind:'requirement',name:'Anise or Geranium',quantity:component.amount,requirement:{kind:'choice',options:[{id:3811},{id:3819}]}})
    expect(valueShoppingList(next,new DefaultCostCalculator({resourceValues:{3902:999}}))).toMatchObject({remainingValue:0,unknownNeeded:1})
  })
  it('persists, exports and imports the requirement and merges only matching requirements', () => {
    const once=addBlueprintComponents(list,[component]), twice=addBlueprintComponents(once,[component])
    expect(twice.items[0].quantity).toBe(2*component.amount)
    const saved=storage(); saveShoppingLists({lists:[twice],activeListId:'test'},saved)
    expect(loadShoppingLists(saved).lists[0]).toEqual(twice)
    expect(parseShoppingListImport(exportShoppingList(twice)).items).toEqual(twice.items)
  })
  it('migrates legacy resource rows by structured ID without losing quantity or acquired state', () => {
    const saved=storage(); saveShoppingLists({lists:[{...list,items:[{kind:'resource',resourceId:3902,name:'Anise or Geranium',quantity:3,acquired:true}]}]},saved)
    expect(loadShoppingLists(saved).lists[0].items[0]).toMatchObject({kind:'requirement',quantity:3,acquired:true,requirement:{options:[{id:3811},{id:3819}]}})
  })
  it('keeps concrete shopping rows independently valued', () => {
    const concrete={...component,component:ingredientItems.get(3811)!}
    const next=addBlueprintComponents(list,[concrete])
    expect(next.items[0].kind).toBe('resource')
    expect(valueShoppingList(next,new DefaultCostCalculator()).items[0].unitValue).toBe(7)
  })
})
