import { describe, expect, it, vi, afterEach } from 'vitest'
import { BACKUP_FORMAT, parseBackup, prepareRestore, migrateBackup } from './Backup'
import { createBackup, restoreBackup, serializeBackup } from './BackupRepository'
import { commitReplacement, initializeUserStorage, recoverRestore, JOURNAL_KEY, USER_KEYS, userStorage, withRestoreLock, type UserStorage } from './UserStorage'
import { addBuild } from '../builds/BuildQueueService'
import { resolveEconomicsSettings } from '../../economics/EconomicsSettings'
import { allBlueprints } from '../blueprints/blueprints'
import { loadWarehouse } from '../warehouse/WarehouseRepository'
import { inventoryItemById } from '../warehouse/InventoryCatalog'
import { ingredientItems } from '../blueprints/IngredientCatalog'
import { ingredientRequirement } from '../blueprints/IngredientRequirement'
const time=Date.parse('2026-10-08T12:00:00Z')
function memory() {
  const values=new Map<string,string>()
  return {values,getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value)},removeItem:(key:string)=>{values.delete(key)}}
}
function populated() {
  const store=memory(),[collections,active,shopping,warehouse,economics,alarm,warning,builds]=USER_KEYS
  const blueprint=allBlueprints.find(blueprint=>blueprint.itemCraftings?.[0]?.craftingTimeInMinute)! 
  store.setItem(collections,JSON.stringify([{id:'collection-a',name:'My collection',entries:[{blueprintId:blueprint.id,status:'sell'},{blueprintId:99999999,status:'to-acquire'}]}]))
  store.setItem(active,'collection-a')
  const choice=[...ingredientItems.values()].find(item=>ingredientRequirement(item).kind==='choice')!
  store.setItem(shopping,JSON.stringify({version:1,lists:[{id:'list-a',name:'My list',items:[{kind:'resource',resourceId:3868,name:'Rare Scrap',quantity:5,acquired:false},{kind:'requirement',resourceId:choice.id,name:choice.name,quantity:1,acquired:true,requirement:ingredientRequirement(choice)}]},{id:'empty',name:'Empty list',items:[]}],activeListId:'list-a'}))
  store.setItem(warehouse,JSON.stringify({version:2,credits:0,entries:[{itemId:3868,quantity:5,expirationDate:'2027-10-08'},{itemId:3868,quantity:2,expirationDate:'2028-10-08'},{itemId:99999999,quantity:3}]}))
  store.setItem(economics,JSON.stringify({version:1,overrides:{mindCostPerPoint:0,resourceValues:{3868:9,99999999:4}}}))
  store.setItem(alarm,JSON.stringify({sound:false,vibration:false}))
  store.setItem(warning,JSON.stringify({version:1,expirationWarningDays:0}))
  const queue=addBuild([],blueprint,resolveEconomicsSettings({mindCostPerPoint:2}),true,time,'build-a')
  queue[0].notes='Keep my notes';queue[0].overrides={timeCostPerMinute:0}
  store.setItem(builds,JSON.stringify({version:1,builds:queue}))
  return store
}
afterEach(()=>vi.unstubAllGlobals())
describe('Full portable backup',()=>{
  it('exports every persisted domain, preferences and active IDs with explicit metadata',()=>{
    const store=populated(),before=[...store.values],backup=createBackup(store,new Date(time+1000))
    expect(backup).toMatchObject({format:BACKUP_FORMAT,schemaVersion:2,appVersion:expect.any(String),exportedAt:'2026-10-08T12:00:01.000Z'})
    expect(backup.data.settings).toMatchObject({economicsOverrides:{mindCostPerPoint:0},alarm:{sound:false,vibration:false},warehouse:{expirationWarningDays:0}})
    expect(backup.data.blueprintCollections.activeCollectionId).toBe('collection-a')
    expect(backup.data.shoppingLists.activeListId).toBe('list-a')
    expect(backup.data.buildQueue.builds[0]).toMatchObject({status:'Paused',notes:'Keep my notes',overrides:{timeCostPerMinute:0}})
    expect(backup.data.buildQueue.builds[0].timer.endTimeMs).toBeUndefined()
    expect([...store.values]).toEqual(before)
    expect(JSON.parse(serializeBackup(backup))).toEqual(backup)
  })
  it('round trips to a clean device, survives reload and can be re-exported without data loss',()=>{
    const backup=createBackup(populated(),new Date(time+1000)),destination=memory()
    restoreBackup(parseBackup(serializeBackup(backup)),destination)
    recoverRestore(destination)
    expect(createBackup(destination,new Date(time+500000)).data).toEqual(backup.data)
    expect(loadWarehouse(destination).entries.find(entry=>entry.itemId===99999999)?.quantity).toBe(3)
    expect(destination.getItem(JOURNAL_KEY)).toBeNull()
  })
  it('replaces rather than adds to existing quantities or collections',()=>{
    const destination=populated();destination.setItem(USER_KEYS[3],JSON.stringify({version:2,credits:237,entries:[{itemId:3868,quantity:123}]}))
    const backup=createBackup(memory(),new Date(time));restoreBackup(backup,destination)
    expect(createBackup(destination,new Date(time)).data).toEqual(backup.data)
  })
  it('excludes Master catalogs and shipped defaults; restoration leaves current catalogs unchanged',()=>{
    const catalog=JSON.stringify(allBlueprints),defaults=resolveEconomicsSettings(),backup=createBackup(memory(),new Date(time))
    expect(backup.data.settings.economicsOverrides).toEqual({})
    expect(Object.keys(backup.data)).toEqual(['blueprintReadHistory','blueprintCollections','shoppingLists','warehouse','settings','buildQueue'])
    restoreBackup(backup,memory());expect(JSON.stringify(allBlueprints)).toBe(catalog);expect(resolveEconomicsSettings()).toEqual(defaults)
  })
  it('keeps unresolved IDs and warns, then resolves saved inventory after catalog availability changes',()=>{
    const backup=createBackup(populated(),new Date(time)),destination=memory()
    expect(prepareRestore(backup).warnings.some(warning=>warning.includes('99999999'))).toBe(true)
    restoreBackup(backup,destination)
    const catalog=inventoryItemById as Map<number,{itemId:number;name:string;kind:string;category:'Items'}>
    try{catalog.set(99999999,{itemId:99999999,name:'New item',kind:'brew',category:'Items'});expect(loadWarehouse(destination).entries.find(entry=>entry.itemId===99999999)?.quantity).toBe(3)}finally{catalog.delete(99999999)}
  })
  it('completes an elapsed timer at export but never advances a paused copy during delayed import',()=>{
    const source=populated(),original=JSON.parse(source.getItem(USER_KEYS[7])!).builds[0]
    const active=createBackup(source,new Date(time+1000)),remaining=active.data.buildQueue.builds[0].timer.remainingMs
    const destination=memory();restoreBackup(active,destination);expect(createBackup(destination,new Date(time+86400000)).data.buildQueue.builds[0].timer.remainingMs).toBe(remaining)
    const expired=createBackup(source,new Date(original.timer.endTimeMs+1));expect(expired.data.buildQueue.builds[0]).toMatchObject({status:'Completed',completedAt:original.timer.endTimeMs,timer:{remainingMs:0,status:'complete'}})
  })
  it('clears invalid active selections explicitly while preserving their records',()=>{
    const backup=createBackup(populated(),new Date(time));backup.data.blueprintCollections.activeCollectionId='missing';backup.data.shoppingLists.activeListId='missing'
    const prepared=prepareRestore(backup);expect(prepared.data.blueprintCollections.activeCollectionId).toBeNull();expect(prepared.data.shoppingLists.activeListId).toBeUndefined();expect(prepared.warnings.filter(w=>w.includes('selection cleared'))).toHaveLength(2)
  })
  it('passes v1 through the migration boundary and rejects unknown sections and future versions',()=>{
    const backup=createBackup(memory(),new Date(time));expect(migrateBackup(backup)).toEqual(backup)
    expect(()=>migrateBackup({...backup,schemaVersion:3})).toThrow('Unsupported')
    expect(()=>migrateBackup({...backup,data:{...backup.data,futureData:[]}})).toThrow('Unrecognized')
  })
  it.each(['{bad','{}','[]','{"format":"other","schemaVersion":1}'])('rejects invalid files before changing storage: %s',json=>{
    const destination=populated(),before=[...destination.values];expect(()=>restoreBackup(parseBackup(json),destination)).toThrow();expect(Object.fromEntries(destination.values)).toEqual(Object.fromEntries(before))
  })
  it.each(['collection','shopping','warehouse','settings','build'])('rejects malformed %s records without any replacement writes',domain=>{
    const backup=createBackup(populated(),new Date(time)),destination=populated(),before=[...destination.values]
    if(domain==='collection')backup.data.blueprintCollections.collections[0].entries[0].blueprintId=-1
    if(domain==='shopping')backup.data.shoppingLists.lists[0].items[0].acquired='yes' as unknown as boolean
    if(domain==='warehouse')backup.data.warehouse.entries[0].quantity=-1
    if(domain==='settings')backup.data.settings.alarm.sound='yes' as unknown as boolean
    if(domain==='build')backup.data.buildQueue.builds[0].recipe.craftingFinalProducts[0].finalProduct.id=-1
    expect(()=>restoreBackup(backup,destination)).toThrow();expect(Object.fromEntries(destination.values)).toEqual(Object.fromEntries(before))
  })
  it('fails export on corrupt or unsupported stored data instead of exporting empty defaults',()=>{
    for(const key of USER_KEYS.filter(key=>!key.includes('active-blueprint'))) {const source=memory();source.setItem(key,'{bad');expect(()=>createBackup(source)).toThrow()}
    const source=memory();source.setItem(USER_KEYS[4],JSON.stringify({version:99,overrides:{}}));expect(()=>createBackup(source)).toThrow('Unsupported')
  })
})
describe('Additional compatibility coverage',()=>{
  it.each([0,-1,1.5,Number.MAX_SAFE_INTEGER+1,'3868'])('rejects malformed canonical ID %s',id=>{
    const backup=createBackup(memory());backup.data.warehouse.entries=[{itemId:id as number,quantity:1}]
    expect(()=>prepareRestore(backup)).toThrow()
  })
  it('preserves unknown shopping choices and unknown Build references through stored reload',()=>{
    const backup=createBackup(populated(),new Date(time))
    backup.data.shoppingLists.lists[0].items.push({kind:'requirement',resourceId:99999998,name:'Old choice',quantity:2,acquired:false,requirement:{kind:'choice',selectorId:99999998,label:'Old choice',options:[{id:99999997,name:'Old herb',kind:'named_herb'}]}})
    backup.data.buildQueue.builds[0].blueprintId=99999999
    const destination=memory();restoreBackup(backup,destination)
    expect(createBackup(destination).data).toEqual(backup.data)
  })
  it('preserves enqueued and completed history together with paused work and captured economics',()=>{
    const backup=createBackup(populated(),new Date(time)),paused=backup.data.buildQueue.builds[0]
    backup.data.buildQueue.builds.push({...structuredClone(paused),id:'enqueued',status:'Enqueued',timer:{originalDurationMs:10,remainingMs:10,status:'idle'}}, {...structuredClone(paused),id:'completed',status:'Completed',completedAt:time,timer:{originalDurationMs:10,remainingMs:0,status:'complete'}})
    const destination=memory();restoreBackup(backup,destination);expect(createBackup(destination).data).toEqual(backup.data)
  })
  it('uses the shared exclusive restore lock when supported',async()=>{
    const request=vi.fn(async(_name:string,operation:()=>number)=>operation())
    vi.stubGlobal('navigator',{locks:{request}})
    expect(await withRestoreLock(()=>37)).toBe(37);expect(request).toHaveBeenCalledWith('wasteland-workshop-restore',expect.any(Function))
  })
})
describe('Restore transaction recovery',()=>{
  it('rolls back a write failure with exact previous values',()=>{
    const destination=populated(),before=[...destination.values];let failed=false
    const failing:UserStorage={...destination,setItem:(key,value)=>{if(key===USER_KEYS[3]&&!failed){failed=true;throw new Error('Quota')}destination.setItem(key,value)}}
    expect(()=>restoreBackup(createBackup(memory()),failing)).toThrow('Quota')
    expect(Object.fromEntries(destination.values)).toEqual(Object.fromEntries(before))
  })
  it('keeps a failed recovery journal and completes rollback on next startup',()=>{
    const destination=populated(),before=[...destination.values];let unavailable=true
    const failing:UserStorage={...destination,setItem:(key,value)=>{if(key===USER_KEYS[3]&&unavailable)throw new Error('Quota');destination.setItem(key,value)}}
    expect(()=>restoreBackup(createBackup(memory()),failing)).toThrow('recovery could not finish')
    expect(destination.getItem(JOURNAL_KEY)).not.toBeNull();unavailable=false;recoverRestore(failing);expect(Object.fromEntries(destination.values)).toEqual(Object.fromEntries(before))
  })
  it('recognizes a committed restore even when journal cleanup failed',()=>{
    const destination=populated(),backup=createBackup(memory()),failing:UserStorage={...destination,removeItem:key=>{if(key===JOURNAL_KEY)throw new Error('Cleanup');destination.removeItem(key)}}
    restoreBackup(backup,failing);expect(destination.getItem(JOURNAL_KEY)).not.toBeNull();recoverRestore(destination);expect(createBackup(destination).data).toEqual(backup.data)
  })
  it('blocks stale tab writes after another tab restores and blocks edits during recovery',()=>{
    const storage=memory();vi.stubGlobal('localStorage',storage);initializeUserStorage(storage)
    restoreBackup(createBackup(memory()),storage)
    expect(()=>userStorage.setItem(USER_KEYS[0],'[]')).toThrow('another tab')
    initializeUserStorage(storage);userStorage.setItem(USER_KEYS[0],'[]');storage.setItem(JOURNAL_KEY,'pending');expect(()=>userStorage.setItem(USER_KEYS[0],'[]')).toThrow('recovery')
  })
  it('does not write domain data if the initial recovery journal cannot be saved',()=>{
    const destination=populated(),before=[...destination.values]
    const failing:UserStorage={...destination,setItem:()=>{throw new Error('Full')}}
    expect(()=>commitReplacement(Object.fromEntries(USER_KEYS.map(key=>[key,null])),failing)).toThrow('Full');expect(Object.fromEntries(destination.values)).toEqual(Object.fromEntries(before))
  })
})
