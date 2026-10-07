import { describe,expect,it } from 'vitest'
import { addInventoryQuantity,changeInventoryExpiration,lotQuantity,quantityOnHand,setInventoryQuantity,subtractInventoryQuantity } from './WarehouseService'
import { emptyWarehouse } from './Warehouse'
import { expirationStatus,daysUntilExpiration,validExpirationDate,localDate } from './Expiration'
import { loadWarehouse,saveWarehouse } from './WarehouseRepository'
import { loadExpirationWarningDays,saveExpirationWarningDays,DEFAULT_EXPIRATION_WARNING_DAYS } from '../settings/WarehouseSettings'
import { blueprintCraftability } from './CraftabilityService'
import { ingredientItems } from '../blueprints/IngredientCatalog'
import type { ItemCrafting } from '../blueprints/ItemCrafting'
const today='2026-10-07',id=3868
function storage(initial?:unknown){let raw=initial===undefined?null:JSON.stringify(initial);return {getItem:()=>raw,setItem:(_key:string,value:string)=>{raw=value}}}
describe('Dated inventory lots',()=>{
  it('merges matching dates but keeps the same item with different dates separate',()=>{
    let warehouse=addInventoryQuantity(emptyWarehouse(),id,1,'2026-11-01')
    warehouse=addInventoryQuantity(warehouse,id,1,'2026-11-01')
    warehouse=addInventoryQuantity(warehouse,id,1,'2026-12-01')
    expect(warehouse.entries).toHaveLength(2)
    expect(lotQuantity(warehouse,id,'2026-11-01')).toBe(2)
    expect(quantityOnHand(warehouse,id)).toBe(3)
  })
  it('edits/removes/subtracts only the chosen lot and merges date edits',()=>{
    let w=addInventoryQuantity(emptyWarehouse(),id,2,'2026-11-01');w=addInventoryQuantity(w,id,3,'2026-12-01')
    w=subtractInventoryQuantity(w,id,1,'2026-11-01')
    expect(lotQuantity(w,id,'2026-12-01')).toBe(3)
    w=changeInventoryExpiration(w,id,'2026-11-01','2026-12-01')
    expect(w.entries).toEqual([{itemId:id,quantity:4,expirationDate:'2026-12-01'}])
    expect(setInventoryQuantity(w,id,0,'2026-12-01').entries).toEqual([])
  })
  it('rejects invalid dates and expiration on currency',()=>{
    for(const date of ['2026-02-30','10/7/2026','bad',''])expect(()=>addInventoryQuantity(emptyWarehouse(),id,1,date)).toThrow()
    expect(()=>addInventoryQuantity(emptyWarehouse(),5557,1,'2026-11-01')).toThrow()
  })
  it('preserves dated lots through persistence and migrates undated version 1',()=>{
    const old={version:1,credits:237,entries:[{itemId:id,quantity:7}]}
    expect(loadWarehouse(storage(old))).toEqual({credits:237,entries:old.entries})
    const saved=storage(),w=addInventoryQuantity(loadWarehouse(storage(old)),id,2,'2026-11-01')
    saveWarehouse(w,saved);expect(loadWarehouse(saved)).toEqual(w)
    expect(expirationStatus(id,w.entries[0].expirationDate,7,today)).toBe('unknown')
  })
  it('rejects duplicate lot identities and malformed dates while allowing different dates',()=>{
    const entries=[{itemId:id,quantity:1,expirationDate:'2026-11-01'},{itemId:id,quantity:1,expirationDate:'2026-12-01'}]
    expect(loadWarehouse(storage({version:2,credits:0,entries})).entries).toHaveLength(2)
    expect(()=>loadWarehouse(storage({version:2,credits:0,entries:[entries[0],entries[0]]}))).toThrow()
    expect(()=>loadWarehouse(storage({version:2,credits:0,entries:[{...entries[0],expirationDate:'2026-02-30'}]}))).toThrow()
  })
})
describe('Expiration statuses and warning days',()=>{
  it('marks good, expiring, expired and undated stock including exact warning boundary',()=>{
    expect(expirationStatus(id,'2026-10-15',7,today)).toBe('good')
    expect(expirationStatus(id,'2026-10-14',7,today)).toBe('expiring')
    expect(expirationStatus(id,today,0,today)).toBe('expiring')
    expect(expirationStatus(id,'2026-10-06',7,today)).toBe('expired')
    expect(expirationStatus(id,undefined,7,today)).toBe('unknown')
    expect(expirationStatus(5557,undefined,7,today)).toBe('currency')
  })
  it('uses calendar days without daylight-saving-hour drift and validates leap days',()=>{
    expect(daysUntilExpiration('2026-11-02','2026-10-31')).toBe(2)
    expect(validExpirationDate('2028-02-29')).toBe(true)
    expect(validExpirationDate('2026-02-29')).toBe(false)
    expect(localDate(new Date(2026,9,7,23,59))).toBe(today)
  })
  it('persists global warning window independently and supports zero',()=>{
    expect(DEFAULT_EXPIRATION_WARNING_DAYS).toBe(30);const saved=storage();expect(loadExpirationWarningDays(saved)).toBe(DEFAULT_EXPIRATION_WARNING_DAYS)
    saveExpirationWarningDays(14,saved);expect(loadExpirationWarningDays(saved)).toBe(14)
    expect(expirationStatus(id,'2026-10-15',14,today)).toBe('expiring')
    saveExpirationWarningDays(0,saved);expect(loadExpirationWarningDays(saved)).toBe(0)
    for(const days of [-1,1.5,Infinity,3651])expect(()=>saveExpirationWarningDays(days,saved)).toThrow()
  })
})
describe('Expiration-aware crafting',()=>{
  const recipe=(accepts=0):ItemCrafting=>({id:1,craftingTimeInMinute:1,craftingMindCost:0,craftingResolveCost:0,craftingSkills:null,craftingZone:null,craftingFinalProducts:[],craftingComponents:[{id:1,amount:1,acceptsExpiredItemWithinDays:accepts,component:ingredientItems.get(id)!}]})
  it('excludes expired and undated stock while combining valid dated lots',()=>{
    const entries=[{itemId:id,quantity:10,expirationDate:'2026-10-06'},{itemId:id,quantity:10},{itemId:id,quantity:2,expirationDate:today},{itemId:id,quantity:3,expirationDate:'2026-11-01'}]
    expect(blueprintCraftability(recipe(),{credits:0,entries},today).maxCopies).toBe(5)
    expect(blueprintCraftability(recipe(),{credits:0,entries:entries.slice(0,2)},today).materialsAvailable).toBe(false)
  })
  it('honors explicit recipe expired-item grace at the boundary without making old stock generally usable',()=>{
    const warehouse={credits:0,entries:[{itemId:id,quantity:1,expirationDate:'2026-10-06'}]}
    expect(blueprintCraftability(recipe(1),warehouse,today).maxCopies).toBe(1)
    expect(blueprintCraftability(recipe(),warehouse,today).maxCopies).toBe(0)
    expect(blueprintCraftability(recipe(1),warehouse,'2026-10-08').maxCopies).toBe(0)
  })
})
