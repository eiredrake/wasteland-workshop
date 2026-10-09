import { validateTourProgress, type TourProgress } from '../tours/TourProgress'
import { isActionExecution } from '../actions/ActionService'
import type { BlueprintCollection } from '../blueprints/BlueprintCollection'
import type { ShoppingListState } from '../shopping/ShoppingList'
import type { Warehouse } from '../warehouse/Warehouse'
import type { BuildQueue } from '../builds/Build'
import type { EconomicsOverrides } from '../../economics/EconomicsSettings'
import type { AlarmSettings } from '../timer/AlarmSettings'
import { defaultEconomicsSettings, validEconomicValue } from '../../economics/EconomicsSettings'
import { validWarningDays } from '../settings/WarehouseSettings'
import { inventoryItemById } from '../warehouse/InventoryCatalog'
import { isSelectorId } from '../blueprints/IngredientCatalog'
import { lotKey, validExpirationDate } from '../warehouse/Expiration'
import { allBlueprints } from '../blueprints/blueprints'

export const BACKUP_FORMAT = 'wasteland-workshop-backup'
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024
export type BackupData = {
  guidedTours?: TourProgress
  blueprintReadHistory: { readIds: number[] }
  blueprintCollections: { collections: BlueprintCollection[]; activeCollectionId: string | null }
  shoppingLists: ShoppingListState
  warehouse: Warehouse
  settings: { economicsOverrides: EconomicsOverrides; alarm: AlarmSettings; warehouse: { expirationWarningDays: number } }
  buildQueue: { builds: BuildQueue }
}
export type Backup = { format: typeof BACKUP_FORMAT; schemaVersion: 4; appVersion: string; exportedAt: string; data: BackupData }
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a data object.')
  return value as Record<string, unknown>
}
function check(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message) }
function keys(value: Record<string, unknown>, allowed: string[]) { check(Object.keys(value).every(key => allowed.includes(key)), 'Unrecognized backup fields. Update the app before restoring this file.') }
function array(value: unknown): unknown[] { check(Array.isArray(value) && value.length <= 100000, 'Invalid or excessively large list.'); return value }
function text(value: unknown, empty = false): asserts value is string { check(typeof value === 'string' && (empty || value.trim().length > 0), 'Invalid text or record ID.') }
export function validId(value: unknown): value is number { return Number.isSafeInteger(value) && (value as number) > 0 }
function amount(value: unknown) { check(validEconomicValue(value), 'Invalid numeric amount.') }
function unique(values: unknown[]) { check(new Set(values).size === values.length, 'Duplicate record IDs or inventory lots.') }
function overrides(value: unknown, snapshot = false) {
  const data = object(value), globalKeys = Object.keys(defaultEconomicsSettings)
  keys(data, [...globalKeys, 'resourceValues'])
  if (snapshot) check(globalKeys.every(key => key in data) && 'resourceValues' in data, 'Incomplete economic snapshot.')
  for (const key of globalKeys) if (key in data) amount(data[key])
  if ('resourceValues' in data) for (const [key, value] of Object.entries(object(data.resourceValues))) {
    check(/^[1-9]\d*$/.test(key) && validId(Number(key)) && (snapshot || !isSelectorId(Number(key))), 'Invalid resource valuation ID.'); amount(value)
  }
}
function ingredient(value: unknown, depth = 0) {
  check(depth <= 20, 'Ingredient hierarchy is too deep.')
  const item = object(value); check(validId(item.id), 'Malformed ingredient ID.'); text(item.name); text(item.kind, true)
  if ('grade' in item) text(item.grade, true)
  if (item.childItemClassifications !== undefined && item.childItemClassifications !== null) for (const child of array(item.childItemClassifications)) {
    const row = object(child); if ('id' in row) check(validId(row.id), 'Malformed ingredient classification ID.'); ingredient(row.childItem, depth + 1)
  }
}
export function validateActivity(value: unknown) {
  const data = object(value)
  keys(data, ['id','blueprintId','blueprintName','recipe','economicSnapshot','overrides','notes','status','timer','createdAt','startedAt','completedAt','sourceType','sourceId','sourceVersion','actionSnapshot'])
  text(data.id);
  if(data.sourceType==='Action') { check(data.blueprintId===undefined,'Actions cannot have a Blueprint ID.'); check(typeof data.sourceId==='string'&&data.sourceId.length>0&&isActionExecution(data.actionSnapshot),'Malformed Action execution snapshot.'); const execution=data.actionSnapshot as import('../actions/Action').ActionExecution; check(data.sourceId===execution.definition.id&&data.sourceVersion===execution.definition.version,'Action source does not match its snapshot.') }
  else { check(data.sourceType===undefined||data.sourceType==='Blueprint','Unsupported Activity source.'); check(validId(data.blueprintId), 'Malformed Build Blueprint ID.'); if(data.sourceId!==undefined)check(data.sourceId===data.blueprintId,'Blueprint source mismatch.'); check(data.actionSnapshot===undefined,'Blueprint cannot contain an Action snapshot.') }
  if(data.sourceVersion!==undefined)check(typeof data.sourceVersion==='string'||validId(data.sourceVersion),'Invalid source version.'); text(data.blueprintName); text(data.notes, true)
  amount(data.createdAt); for (const key of ['startedAt','completedAt']) if (key in data) amount(data[key])
  overrides(data.overrides); overrides(data.economicSnapshot, true)
  const recipe = object(data.recipe); check(validId(recipe.id), 'Malformed recipe ID.')
  amount(recipe.craftingTimeInMinute); amount(recipe.craftingMindCost)
  if (recipe.craftingResolveCost !== null) amount(recipe.craftingResolveCost)
  for (const key of ['craftingSkills','craftingZone']) if (recipe[key] !== null) text(recipe[key], true)
  for (const component of array(recipe.craftingComponents)) {
    const row = object(component); check(validId(row.id), 'Malformed recipe component ID.'); amount(row.amount); amount(row.acceptsExpiredItemWithinDays); ingredient(row.component)
  }
  for (const product of array(recipe.craftingFinalProducts)) {
    const row = object(product); check(validId(row.id), 'Malformed final-product ID.'); amount(row.stack); ingredient(row.finalProduct)
    const item = object(row.finalProduct)
    if (item.lifetimeAmount !== null) amount(item.lifetimeAmount)
    text(item.lifetimeUnit, true)
    if (item.metadata !== undefined && item.metadata !== null) for (const value of Object.values(object(item.metadata))) check(value === null || typeof value === 'string' || typeof value === 'boolean' || validEconomicValue(value), 'Malformed product metadata.')
  }
  if(data.sourceType==='Action'){const execution=data.actionSnapshot as import('../actions/Action').ActionExecution;check(recipe.craftingMindCost===execution.option.mind&&recipe.craftingTimeInMinute===execution.option.minutes&&recipe.craftingResolveCost===execution.option.resolve,'Resolved Action costs do not match its snapshot.')}
  const timer = object(data.timer); keys(timer, ['label','originalDurationMs','remainingMs','endTimeMs','status'])
  if ('label' in timer) text(timer.label, true)
  amount(timer.originalDurationMs); amount(timer.remainingMs)
  const statuses: Record<string,string> = { Enqueued:'idle', Working:'running', Paused:'paused', Completed:'complete' }
  check(typeof data.status === 'string' && Object.hasOwn(statuses,data.status) && statuses[data.status] === timer.status, 'Invalid Build/timer status.')
  if (data.status === 'Working') { amount(timer.endTimeMs); check(timer.remainingMs !== 0 && data.startedAt !== undefined, 'Invalid Working timer.') }
  else check(timer.endTimeMs === undefined, 'Inactive timer has a running deadline.')
  if (data.status === 'Completed') check(timer.remainingMs === 0 && data.completedAt !== undefined, 'Invalid completed Build.')
  else check(data.completedAt === undefined, 'Unfinished Build has a completion timestamp.')
}
export function validateData(value: unknown): BackupData {
  const data = object(value); keys(data, ['blueprintCollections','shoppingLists','warehouse','settings','buildQueue','blueprintReadHistory','guidedTours'])
  const collectionState = object(data.blueprintCollections); keys(collectionState,['collections','activeCollectionId'])
  const collections = array(collectionState.collections)
  for (const value of collections) {
    const collection = object(value); keys(collection,['id','name','entries']); text(collection.id); text(collection.name)
    const entries = array(collection.entries)
    for (const value of entries) { const entry = object(value); keys(entry,['blueprintId','status']); check(validId(entry.blueprintId), 'Malformed Blueprint ID.'); check(['acquired','to-acquire','sell'].includes(String(entry.status)), 'Invalid Blueprint status.') }
    unique(entries.map(value => object(value).blueprintId))
  }
  unique(collections.map(value => object(value).id))
  check(collectionState.activeCollectionId === null || typeof collectionState.activeCollectionId === 'string', 'Invalid active collection ID.')
  const shopping = object(data.shoppingLists); keys(shopping,['lists','activeListId'])
  const lists = array(shopping.lists)
  for (const value of lists) {
    const list = object(value); keys(list,['id','name','items']); text(list.id); text(list.name)
    const items = array(list.items)
    for (const value of items) {
      const item = object(value); keys(item,['kind','resourceId','name','quantity','acquired','requirement'])
      check(validId(item.resourceId), 'Malformed shopping resource ID.'); text(item.name); amount(item.quantity); check(item.quantity !== 0 && typeof item.acquired === 'boolean', 'Invalid shopping quantity or acquisition status.')
      check(item.kind === 'resource' || item.kind === 'requirement', 'Invalid shopping row kind.')
      if (item.kind === 'resource') check(!isSelectorId(item.resourceId), 'An ingredient selector must be stored as a choice.')
      if (item.kind === 'requirement') {
        const requirement = object(item.requirement); keys(requirement,['kind','selectorId','label','options']); check(requirement.kind === 'choice' && requirement.selectorId === item.resourceId, 'Invalid ingredient choice.'); text(requirement.label)
        for (const option of array(requirement.options)) ingredient(option)
      }
    }
    unique(items.map(value => object(value).resourceId))
  }
  unique(lists.map(value => object(value).id))
  if ('activeListId' in shopping) text(shopping.activeListId)
  const warehouse = object(data.warehouse); keys(warehouse,['credits','entries']); amount(warehouse.credits)
  const entries = array(warehouse.entries)
  for (const value of entries) {
    const entry = object(value); keys(entry,['itemId','quantity','expirationDate'])
    check(validId(entry.itemId) && !isSelectorId(entry.itemId), 'Malformed or non-concrete inventory ID.'); amount(entry.quantity); check(entry.quantity !== 0, 'Inventory lots must have a positive quantity.')
    if ('expirationDate' in entry) check(validExpirationDate(entry.expirationDate) && inventoryItemById.get(entry.itemId)?.kind !== 'currency', 'Invalid inventory expiration date.')
  }
  unique(entries.map(value => {const entry=object(value);return lotKey(entry.itemId as number,entry.expirationDate as string|undefined)}))
  const settings = object(data.settings); keys(settings,['economicsOverrides','alarm','warehouse']); overrides(settings.economicsOverrides)
  const alarm = object(settings.alarm); keys(alarm,['sound','vibration']); check(typeof alarm.sound === 'boolean' && typeof alarm.vibration === 'boolean', 'Invalid alarm preferences.')
  const warehouseSettings = object(settings.warehouse); keys(warehouseSettings,['expirationWarningDays']); check(validWarningDays(warehouseSettings.expirationWarningDays), 'Invalid expiration warning days.')
  const queue = object(data.buildQueue); keys(queue,['builds']); const builds = array(queue.builds); builds.forEach(validateActivity); unique(builds.map(value => object(value).id))
  check(builds.filter(value => object(value).status === 'Working').length <= 1, 'More than one Working Build.')
  const history=object(data.blueprintReadHistory); keys(history,['readIds']); const readIds=array(history.readIds); check(readIds.every(validId),'Invalid Read Blueprint IDs.'); unique(readIds)
  if ('guidedTours' in data) validateTourProgress(data.guidedTours)
  return structuredClone(data) as BackupData
}
// Explicit migration boundary; v1 migrates to v2. Future versions migrate here before validation.
export function migrateBackup(value: unknown): Backup {
  const backup = object(value); keys(backup,['format','schemaVersion','appVersion','exportedAt','data'])
  check(backup.format === BACKUP_FORMAT, 'This is not a full Wasteland Workshop backup.')
  check(backup.schemaVersion === 1 || backup.schemaVersion === 2 || backup.schemaVersion === 3 || backup.schemaVersion === 4, 'Unsupported backup version. Update Wasteland Workshop before restoring it.')
  text(backup.appVersion); text(backup.exportedAt)
  check(/^\d{4}-\d{2}-\d{2}T/.test(backup.exportedAt) && Number.isFinite(Date.parse(backup.exportedAt)), 'Invalid backup timestamp.')
  const data=object(backup.data)
  let migrated=data
  if(backup.schemaVersion===1){keys(data,['blueprintCollections','shoppingLists','warehouse','settings','buildQueue']);migrated={...data,blueprintReadHistory:{readIds:[]}}}
  const validated=validateData(migrated)
  validated.buildQueue.builds=validated.buildQueue.builds.map(activity=>activity.sourceType?activity:{...activity,sourceType:'Blueprint',sourceId:activity.blueprintId})
  return {...backup,schemaVersion:4,data:validated} as Backup
}
export function parseBackup(json: string): Backup {
  check(new Blob([json]).size <= MAX_BACKUP_BYTES, 'Backup is too large (maximum 20 MB).')
  let parsed: unknown
  try { parsed = JSON.parse(json) } catch { throw new Error('The selected file is not valid JSON.') }
  return migrateBackup(parsed)
}
export function normalizeTimers(data: BackupData, exportedAt: string): BackupData {
  const result = structuredClone(data), time = Date.parse(exportedAt)
  result.buildQueue.builds = result.buildQueue.builds.map(build => {
    if (build.status !== 'Working') return build
    const remainingMs = Math.max(0,build.timer.endTimeMs! - time), completedAt = build.timer.endTimeMs
    const {endTimeMs: _deadline,...timer} = build.timer
    void _deadline
    return {...build,status:remainingMs > 0 ? 'Paused' : 'Completed', timer:{...timer,remainingMs,status:remainingMs > 0 ? 'paused' : 'complete'},...(remainingMs === 0 ? {completedAt} : {})}
  })
  return result
}
export function prepareRestore(backup: Backup) {
  const validated = migrateBackup(backup), data = normalizeTimers(validated.data,validated.exportedAt), warnings = new Set<string>()
  const blueprintIds = new Set(allBlueprints.map(blueprint=>blueprint.id))
  for (const collection of data.blueprintCollections.collections) for (const entry of collection.entries) if (!blueprintIds.has(entry.blueprintId)) warnings.add(`Unknown Blueprint #${entry.blueprintId}: preserved.`)
  for (const entry of data.warehouse.entries) if (!inventoryItemById.has(entry.itemId)) warnings.add(`Unknown Item #${entry.itemId}: preserved.`)
  for (const list of data.shoppingLists.lists) for (const item of list.items) if (!inventoryItemById.has(item.resourceId) && !isSelectorId(item.resourceId)) warnings.add(`Unknown Resource #${item.resourceId}: preserved.`)
  for (const build of data.buildQueue.builds) if (build.sourceType!=='Action' && !blueprintIds.has(build.blueprintId!)) warnings.add(`Build references unavailable Blueprint #${build.blueprintId}; history preserved.`)
  if (data.blueprintCollections.activeCollectionId && !data.blueprintCollections.collections.some(collection=>collection.id===data.blueprintCollections.activeCollectionId)) {data.blueprintCollections.activeCollectionId=null;warnings.add('Unavailable active collection selection cleared.')}
  if (data.shoppingLists.activeListId && !data.shoppingLists.lists.some(list=>list.id===data.shoppingLists.activeListId)) {delete data.shoppingLists.activeListId;warnings.add('Unavailable active shopping list selection cleared.')}
  return {data,warnings:[...warnings]}
}
