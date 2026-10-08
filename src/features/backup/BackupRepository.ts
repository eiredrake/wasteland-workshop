import { BACKUP_FORMAT, migrateBackup, normalizeTimers, object, prepareRestore, type Backup, type BackupData } from './Backup'
import { commitReplacement, USER_KEYS, userStorage, type UserStorage } from './UserStorage'
import { defaultAlarmSettings } from '../timer/AlarmSettings'
import { DEFAULT_EXPIRATION_WARNING_DAYS } from '../settings/WarehouseSettings'
import { loadEconomicsOverrides } from '../../economics/EconomicsSettingsRepository'
import { ingredientItems } from '../blueprints/IngredientCatalog'
import { ingredientRequirement } from '../blueprints/IngredientRequirement'
import packageInfo from '../../../package.json'
function read(storage:UserStorage,key:string) {
  const raw=storage.getItem(key)
  if(raw===null)return undefined
  try{return JSON.parse(raw) as unknown}catch{throw new Error(`Saved data cannot be backed up because ${key} is unreadable. Existing data has been kept.`)}
}
function version(value:unknown,versions:number[],domain:string) {
  const record=object(value)
  if(!versions.includes(record.version as number))throw new Error(`Unsupported saved ${domain} version. No data has been changed.`)
  return record
}
export function snapshotUserData(storage:UserStorage=userStorage):BackupData {
  const [collectionsKey,activeKey,shoppingKey,warehouseKey,economicsKey,alarmKey,warningKey,buildKey]=USER_KEYS
  const collections=read(storage,collectionsKey)??[],shoppingRaw=read(storage,shoppingKey),warehouseRaw=read(storage,warehouseKey),economicsRaw=read(storage,economicsKey),alarm=read(storage,alarmKey)??{...defaultAlarmSettings},warningRaw=read(storage,warningKey),buildRaw=read(storage,buildKey)
  let economicsOverrides: unknown={}
  if(economicsRaw!==undefined) {
    const saved=object(economicsRaw)
    if(saved.version===1)economicsOverrides=saved.overrides
    else if('version' in saved)throw new Error('Unsupported saved Economics Settings version.')
    else economicsOverrides=loadEconomicsOverrides(storage)
  }
  const shopping=shoppingRaw===undefined?{lists:[]}:version(shoppingRaw,[1],'Shopping Lists')
  const lists=structuredClone(shopping.lists) as BackupData['shoppingLists']['lists']
  // Explicit local-schema migration for legacy selector rows, without merging quantities.
  for(const list of lists)for(const row of list.items){const item=ingredientItems.get(row.resourceId),requirement=item?ingredientRequirement(item):undefined;if(requirement?.kind==='choice'){row.kind='requirement';row.requirement??=requirement}}
  const warehouse=warehouseRaw===undefined?{credits:0,entries:[]}:version(warehouseRaw,[1,2],'Warehouse')
  const warning=warningRaw===undefined?DEFAULT_EXPIRATION_WARNING_DAYS:version(warningRaw,[1],'Warehouse Settings').expirationWarningDays
  const queue=buildRaw===undefined?[]:version(buildRaw,[1],'Build Queue').builds
  const data={blueprintCollections:{collections,activeCollectionId:storage.getItem(activeKey)},shoppingLists:{lists,...(shopping.activeListId===undefined?{}:{activeListId:shopping.activeListId})},warehouse:{credits:warehouse.credits,entries:warehouse.entries},settings:{economicsOverrides,alarm,warehouse:{expirationWarningDays:warning}},buildQueue:{builds:queue}}
  return migrateBackup({format:BACKUP_FORMAT,schemaVersion:1,appVersion:packageInfo.version,exportedAt:new Date().toISOString(),data}).data
}
export function createBackup(storage:UserStorage=userStorage,now=new Date()):Backup {
  const exportedAt=now.toISOString(),data=normalizeTimers(snapshotUserData(storage),exportedAt)
  return migrateBackup({format:BACKUP_FORMAT,schemaVersion:1,appVersion:packageInfo.version,exportedAt,data})
}
export function serializeBackup(backup:Backup) {return JSON.stringify(migrateBackup(backup),null,2)}
export function restoreBackup(backup:Backup,storage:UserStorage=localStorage) {
  const {data}=prepareRestore(backup),[collectionsKey,activeKey,shoppingKey,warehouseKey,economicsKey,alarmKey,warningKey,buildKey]=USER_KEYS
  const values:Record<string,string|null>={
    [collectionsKey]:JSON.stringify(data.blueprintCollections.collections),[activeKey]:data.blueprintCollections.activeCollectionId,
    [shoppingKey]:JSON.stringify({version:1,...data.shoppingLists}),[warehouseKey]:JSON.stringify({version:2,...data.warehouse}),
    [economicsKey]:JSON.stringify({version:1,overrides:data.settings.economicsOverrides}),[alarmKey]:JSON.stringify(data.settings.alarm),
    [warningKey]:JSON.stringify({version:1,...data.settings.warehouse}),[buildKey]:JSON.stringify({version:1,builds:data.buildQueue.builds}),
  }
  commitReplacement(values,storage)
}
