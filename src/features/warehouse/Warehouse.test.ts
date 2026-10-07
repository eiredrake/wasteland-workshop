import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { emptyWarehouse } from './Warehouse'
import { inventoryCatalog, inventoryItemById } from './InventoryCatalog'
import { addInventoryQuantity, changeCredits, quantityOnHand, setInventoryQuantity, subtractInventoryQuantity } from './WarehouseService'
import { loadWarehouse, saveWarehouse, WAREHOUSE_STORAGE_KEY } from './WarehouseRepository'
import { blueprintCraftability } from './CraftabilityService'
import WarehouseView from './WarehouseView'
import type { ItemCrafting } from '../blueprints/ItemCrafting'
import { ingredientItems } from '../blueprints/IngredientCatalog'
import { allBlueprints } from '../blueprints/blueprints'
import { addBuild } from '../builds/BuildQueueService'
import { resolveEconomicsSettings } from '../../economics/EconomicsSettings'
import { addBlueprintComponents } from '../shopping/ShoppingListService'
const scrap=3868, metal=3873, stone=3878
const recipe=(components: {id:number;amount:number}[]): ItemCrafting => ({id:1,craftingMindCost:0,craftingTimeInMinute:1,craftingResolveCost:0,craftingZone:null,craftingSkills:null,craftingFinalProducts:[],
  craftingComponents:components.map((c,i)=>({id:i+1,amount:c.amount,acceptsExpiredItemWithinDays:0,component:ingredientItems.get(c.id)!}))})
const datedStock=(entries:{itemId:number;quantity:number}[])=>({credits:237,entries:entries.map(e=>({...e,expirationDate:'2099-12-31'}))})
const stock=(entries:{itemId:number;quantity:number}[])=>({credits:237,entries})
function storage(initial?:unknown) {let raw=initial===undefined?null:JSON.stringify(initial);return {getItem:()=>raw,setItem:(_key:string,value:string)=>{raw=value},read:()=>raw}}
describe('Unified inventory and canonical identities',()=>{
  it('includes concrete resources, crafted equipment/brews/gizmos and excludes taxonomy',()=>{
    expect(inventoryItemById.get(scrap)?.category).toBe('Resources')
    for(const kind of ['gizmo','recovery_meal','melee_small']) expect(inventoryCatalog.some(item=>item.kind===kind&&item.category==='Items')).toBe(true)
    expect(inventoryCatalog.some(item=>item.kind==='taxonomy')).toBe(false)
    expect(inventoryItemById.has(3902)).toBe(false)
    expect(inventoryItemById.has(3940)).toBe(false)
    expect(new Set(inventoryCatalog.map(item=>item.itemId)).size).toBe(inventoryCatalog.length)
  })
  it('adds, merges, sets, subtracts, removes and queries one inventory',()=>{
    let next=addInventoryQuantity(emptyWarehouse(),scrap,3)
    next=addInventoryQuantity(next,scrap,2)
    expect(next.entries).toEqual([{itemId:scrap,quantity:5}])
    next=subtractInventoryQuantity(next,scrap,1); expect(quantityOnHand(next,scrap)).toBe(4)
    next=setInventoryQuantity(next,scrap,7); expect(quantityOnHand(next,scrap)).toBe(7)
    next=setInventoryQuantity(next,scrap,0); expect(next.entries).toEqual([])
    expect(quantityOnHand(next,scrap)).toBe(0)
  })
  it('tracks an owned crafted item using its canonical final-product ID',()=>{
    const item=inventoryCatalog.find(item=>item.kind==='gizmo')!
    expect(addInventoryQuantity(emptyWarehouse(),item.itemId,3).entries).toEqual([{itemId:item.itemId,quantity:3}])
  })
  it.each([-1,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])('rejects invalid inventory quantity %s',amount=>{
    expect(()=>setInventoryQuantity(emptyWarehouse(),scrap,amount)).toThrow()
  })
  it('rejects selectors, unknown IDs, overdraws and overflow without mutating inventory',()=>{
    const warehouse=stock([{itemId:scrap,quantity:3}]), before=structuredClone(warehouse)
    expect(()=>setInventoryQuantity(warehouse,3902,1)).toThrow('concrete')
    expect(()=>setInventoryQuantity(warehouse,999999,1)).toThrow('concrete')
    expect(()=>subtractInventoryQuantity(warehouse,scrap,4)).toThrow('many')
    expect(()=>addInventoryQuantity(stock([{itemId:scrap,quantity:Number.MAX_SAFE_INTEGER}]),scrap,1)).toThrow()
    expect(warehouse).toEqual(before)
  })
  it('supports fractional quantities without rounding them in storage',()=>{
    expect(setInventoryQuantity(emptyWarehouse(),scrap,.25).entries[0].quantity).toBe(.25)
  })
})
describe('Credits owned are separate from valuation',()=>{
  it('sets, adds and subtracts Credits without changing items',()=>{
    const original=stock([{itemId:scrap,quantity:7}])
    expect(changeCredits(original,'set',300)).toEqual({...original,credits:300})
    expect(changeCredits(original,'add',3).credits).toBe(240)
    expect(changeCredits(original,'subtract',237).credits).toBe(0)
    expect(changeCredits(original,'set',0).credits).toBe(0)
    expect(original.credits).toBe(237)
  })
  it('rejects debt and balance overflow',()=>{
    expect(()=>changeCredits(stock([]),'subtract',238)).toThrow('below zero')
    expect(()=>changeCredits({...emptyWarehouse(),credits:Number.MAX_SAFE_INTEGER},'add',1)).toThrow()
  })
  it.each([-1,NaN,Infinity])('rejects invalid Credits amount %s',amount=>expect(()=>changeCredits(emptyWarehouse(),'set',amount)).toThrow())
  it('adding/removing inventory does not spend/refund Credits',()=>{
    const original=stock([]), added=addInventoryQuantity(original,scrap,7)
    expect(added.credits).toBe(237)
    expect(setInventoryQuantity(added,scrap,0).credits).toBe(237)
  })
})
describe('Warehouse persistence',()=>{
  it('starts empty and round-trips inventory plus Credits in one independent storage key',()=>{
    const saved=storage(); expect(loadWarehouse(saved)).toEqual(emptyWarehouse())
    const warehouse=stock([{itemId:scrap,quantity:7}]); saveWarehouse(warehouse,saved)
    expect(loadWarehouse(saved)).toEqual(warehouse)
    const spy={setItem:vi.fn()}; saveWarehouse(warehouse,spy)
    expect(spy.setItem).toHaveBeenCalledWith(WAREHOUSE_STORAGE_KEY,expect.any(String))
  })
  it.each([
    {version:3,credits:0,entries:[]},{version:1,credits:-1,entries:[]},
    {version:1,credits:0,entries:[{itemId:3902,quantity:1}]},
    {version:1,credits:0,entries:[{itemId:scrap,quantity:-1}]},
    {version:1,credits:0,entries:[{itemId:scrap,quantity:1},{itemId:scrap,quantity:2}]}
  ])('preserves invalid/unsupported stored data and rejects it',data=>{
    const saved=storage(data),raw=saved.read(); expect(()=>loadWarehouse(saved)).toThrow(); expect(saved.read()).toBe(raw)
  })
  it('surfaces storage failures',()=>{
    expect(()=>saveWarehouse(emptyWarehouse(),{setItem:()=>{throw new Error('Full')}})).toThrow('Full')
    expect(()=>loadWarehouse({getItem:()=>'{broken'})).toThrow()
  })
})
describe('Blueprint material availability',()=>{
  const concrete=recipe([{id:scrap,amount:4},{id:metal,amount:1},{id:stone,amount:2}])
  it('reports Materials Available and maximum copies from actual stock',()=>{
    expect(blueprintCraftability(concrete,datedStock([{itemId:scrap,quantity:7},{itemId:metal,quantity:2},{itemId:stone,quantity:10}]))).toEqual({materialsAvailable:true,maxCopies:1,missing:[]})
    expect(blueprintCraftability(concrete,datedStock([{itemId:scrap,quantity:12},{itemId:metal,quantity:8},{itemId:stone,quantity:10}])).maxCopies).toBe(3)
  })
  it('reports exact shortages without changing inventory',()=>{
    const owned=datedStock([{itemId:scrap,quantity:2},{itemId:stone,quantity:2}]), before=structuredClone(owned)
    expect(blueprintCraftability(concrete,owned)).toMatchObject({materialsAvailable:false,maxCopies:0,missing:[{itemId:scrap,quantity:2},{itemId:metal,quantity:1}]})
    expect(owned).toEqual(before)
  })
  it('allows either Anise or Geranium, including a mixture for multiple copies',()=>{
    const alternative=recipe([{id:3902,amount:1}])
    expect(blueprintCraftability(alternative,datedStock([{itemId:3811,quantity:1}])).maxCopies).toBe(1)
    expect(blueprintCraftability(alternative,datedStock([{itemId:3819,quantity:2}])).maxCopies).toBe(2)
    expect(blueprintCraftability(alternative,datedStock([{itemId:3811,quantity:1},{itemId:3819,quantity:2}])).maxCopies).toBe(3)
    expect(blueprintCraftability(alternative,datedStock([{itemId:scrap,quantity:10}])).missing[0]).toMatchObject({choice:true,quantity:1})
  })
  it('does not double-count stock shared between a selector and a concrete requirement',()=>{
    const shared=recipe([{id:3940,amount:1},{id:3811,amount:1}])
    expect(blueprintCraftability(shared,datedStock([{itemId:3811,quantity:1}])).materialsAvailable).toBe(false)
    // Allocation must move Anise from Any Herb to the concrete requirement.
    expect(blueprintCraftability(shared,datedStock([{itemId:3811,quantity:1},{itemId:3819,quantity:1}])).maxCopies).toBe(1)
  })
  it('handles overlapping alternatives and duplicate concrete rows without double counting',()=>{
    const overlap=recipe([{id:3902,amount:1},{id:3903,amount:1}])
    expect(blueprintCraftability(overlap,datedStock([{itemId:3811,quantity:1}])).materialsAvailable).toBe(false)
    expect(blueprintCraftability(overlap,datedStock([{itemId:3819,quantity:1},{itemId:3820,quantity:1}])).maxCopies).toBe(1)
    expect(blueprintCraftability(recipe([{id:scrap,amount:2},{id:scrap,amount:2}]),datedStock([{itemId:scrap,quantity:3}])).materialsAvailable).toBe(false)
  })
  it('handles no material requirements, zero rows and tiny fractional shortages accurately',()=>{
    expect(blueprintCraftability(recipe([]),emptyWarehouse())).toEqual({materialsAvailable:true,maxCopies:null,missing:[]})
    expect(blueprintCraftability(recipe([{id:scrap,amount:0}]),emptyWarehouse()).materialsAvailable).toBe(true)
    expect(blueprintCraftability(recipe([{id:scrap,amount:1e-10}]),emptyWarehouse()).materialsAvailable).toBe(false)
  })
  it('availability and Build/shopping actions never perform inventory transactions',()=>{
    const owned=datedStock([{itemId:scrap,quantity:7}]), before=structuredClone(owned)
    const blueprint=allBlueprints.find(b=>b.name==='Sosweet Smashstick')!
    blueprintCraftability(blueprint.itemCraftings![0],owned)
    addBuild([],blueprint,resolveEconomicsSettings(),false,1000,'test')
    addBlueprintComponents({id:'test',name:'test',items:[]},blueprint.itemCraftings![0].craftingComponents)
    resolveEconomicsSettings({resourceValues:{[scrap]:100}})
    expect(owned).toEqual(before)
  })
})
it('Warehouse screen exposes Credits controls, search, type filters and owned resources/items',()=>{
  const item=inventoryCatalog.find(item=>item.kind==='gizmo')!
  const html=renderToStaticMarkup(createElement(WarehouseView,{warehouse:datedStock([{itemId:scrap,quantity:7},{itemId:item.itemId,quantity:3}]),apply:vi.fn(),error:''}))
  for(const text of ['Credits on hand','237 cr','Set Credits','Add Credits','Subtract Credits','Search inventory','Resources','Items','Rare Scrap',item.name,'Quantity on hand: Rare Scrap']) expect(html).toContain(text)
})
