import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { formatCreditAmount, formatCredits, roundCredits } from './Credits'
import { DefaultCostCalculator } from './DefaultCostCalculator'
import { valueShoppingList } from '../features/shopping/ShoppingListService'
import type { ShoppingList } from '../features/shopping/ShoppingList'
import ShoppingListsView from '../features/shopping/ShoppingListsView'
import WarehouseView from '../features/warehouse/WarehouseView'
import { calculateBlueprintCost } from './BlueprintCostService'
import { testBlueprints } from '../features/blueprints/testBlueprints'
import { blueprintShareCard } from '../features/blueprints/BlueprintShareCard'
import { credits as buildCredits } from '../features/builds/BuildFormatting'

describe('whole credit valuations', () => {
 it.each([[179.8,180],[179.1,180],[179,179],[.2,1],[0,0]])('rounds %s upward to %s', (raw,whole) => {
  expect(roundCredits(raw)).toBe(whole)
  expect(formatCredits(raw)).toBe(`${whole}cr`)
  expect(formatCreditAmount(raw)).toBe(String(whole))
  expect(buildCredits(raw)).toBe(`${whole}cr`)
 })
 it('preserves unknown costs', () => { expect(formatCredits(undefined)).toBe('Unknown') })
 const calculator = new DefaultCostCalculator({ resourceValues: {3807:.2,3866:.2} })
 const list: ShoppingList = {id:'round', name:'Round', items:[3807,3866].map(resourceId=>({kind:'resource',resourceId,name:'Resource',quantity:1,acquired:false}))}
 it('aggregates unrounded lines before rounding once', () => {
  const valued=valueShoppingList(list,calculator)
  expect(valued.remainingValue).toBeCloseTo(.4)
  expect(formatCredits(valued.remainingValue)).toBe('1cr')
  expect(valued.items.map(item=>item.totalValue)).toEqual([.2,.2])
 })
 it('does not round a unit value before multiplying quantity', () => {
  const valued=valueShoppingList({...list,items:[{...list.items[0],quantity:3}]},calculator)
  expect(valued.remainingValue).toBeCloseTo(.6)
  expect(formatCredits(valued.remainingValue)).toBe('1cr')
 })
 it('renders fractional shopping estimates as whole credits', () => {
  const expensive=new DefaultCostCalculator({resourceValues:{3807:179.8}})
  const html=renderToStaticMarkup(<ShoppingListsView state={{lists:[{...list,items:[list.items[0]]}],activeListId:list.id}} calculator={expensive} activeCollection={undefined} onChange={()=>true} onUpdateBlueprint={()=>{}} notify={()=>{}}/>)
  expect(html).toContain('Estimated remaining: 180cr')
  expect(html).not.toContain('179.8cr')
 })
 it('renders a legacy fractional warehouse balance without changing it', () => {
  const warehouse={entries:[],credits:179.8}
  expect(renderToStaticMarkup(<WarehouseView warehouse={warehouse} apply={()=>true} error=""/>)).toContain('180cr')
  expect(warehouse.credits).toBe(179.8)
 })
 it('preserves fractional labor, materials and markup inputs', () => {
  const calc=new DefaultCostCalculator({mindCostPerPoint:.2,timeCostPerMinute:.2})
  const production=calc.calculateProductionCost({mind:1,minutes:1,resolve:0,materialCost:.2})
  expect(production).toBeCloseTo(.6)
  expect(formatCredits(production)).toBe('1cr')
  expect(calc.calculateSellingPrice(production,25)).toBe(1)
  expect(calc.calculateSellingPrice(roundCredits(production),25)).toBe(2)
 })
 it('keeps Blueprint totals precise and rounds the shared/print valuation', () => {
  const blueprint=testBlueprints.find(b=>b.id===5890)!
  const recipe=blueprint.itemCraftings![0]
  const values=Object.fromEntries(recipe.craftingComponents.map(c=>[c.component.id,.2]))
  const calc=new DefaultCostCalculator({mindCostPerPoint:.2,timeCostPerMinute:.2,resourceValues:values})
  const cost=calculateBlueprintCost(recipe,calc)
  expect(cost.materialCost).toBeCloseTo(recipe.craftingComponents.reduce((sum,c)=>sum+c.amount*.2,0))
  expect(blueprintShareCard(blueprint,calc).sections.find(s=>s.label==='Production Cost')?.text).toBe(formatCredits(cost.productionCost))
 })
})
