import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { loadReadHistory, saveReadHistory, markBlueprintRead, markBlueprintsRead, READ_HISTORY_KEY } from './BlueprintReadHistory'
import { BlueprintReadContext } from './useBlueprintReadHistory'
import BlueprintName from '../../components/BlueprintName/BlueprintName'
import BlueprintDetails from './BlueprintDetails'
import { allBlueprints } from './blueprints'
import { createBackup, restoreBackup } from '../backup/BackupRepository'
import { migrateBackup } from '../backup/Backup'
import { commitReplacement, USER_KEYS } from '../backup/UserStorage'
import { DefaultCostCalculator } from '../../economics/DefaultCostCalculator'
import { createIdleCraftTimer } from '../timer/CraftTimerState'
function memory() { const values=new Map<string,string>(); return {values,getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value)},removeItem:(key:string)=>{values.delete(key)}} }
const blueprint=allBlueprints.find(b=>b.id===4403)!
describe('Blueprint read history', () => {
 it('starts empty, deduplicates and preserves valid IDs absent from the catalog', () => {
  const storage=memory(); expect(loadReadHistory(storage)).toEqual([])
  saveReadHistory([4403,4403,99999999],storage)
  expect(loadReadHistory(storage)).toEqual([4403,99999999])
  expect(loadReadHistory(storage).includes(4439)).toBe(false)
 })
 it.each(['{bad','{"version":99,"readIds":[]}','{"version":1,"readIds":[0]}','{"version":1,"readIds":["4403"]}'])('preserves malformed stored data: %s',raw => {
  const storage=memory(); storage.setItem(READ_HISTORY_KEY,raw)
  expect(()=>loadReadHistory(storage)).toThrow(); expect(storage.getItem(READ_HISTORY_KEY)).toBe(raw)
 })
 it('marks only the selected ID, persists once, and leaves input untouched', () => {
  const storage=memory(), setItem=vi.spyOn(storage,'setItem'), input=[4439]
  const next=markBlueprintRead(input,4403,storage)
  expect(next).toEqual([4439,4403]); expect(input).toEqual([4439])
  expect(markBlueprintRead(next,4403,storage)).toBe(next); expect(setItem).toHaveBeenCalledOnce()
  expect(loadReadHistory(storage)).toEqual(next)
 })
 it('marks a current catalog snapshot in one write, preserving history and future unread IDs', () => {
  const storage=memory(), write=vi.spyOn(storage,'setItem'), original=[99999999,4403]
  const updated=markBlueprintsRead(original,[4403,4439,4447],storage)
  expect(updated).toEqual([99999999,4403,4439,4447]); expect(original).toEqual([99999999,4403])
  expect(write).toHaveBeenCalledOnce(); expect(loadReadHistory(storage)).toEqual(updated)
  expect(updated.includes(55555555)).toBe(false)
  expect(markBlueprintsRead(updated,[4403,4439,4447],storage)).toBe(updated)
  expect(write).toHaveBeenCalledOnce()
 })
 it('bulk marking does not change history when saving fails', () => {
  const original=[4403], storage={...memory(),setItem:()=>{throw new Error('Quota')}}
  expect(()=>markBlueprintsRead(original,[4439],storage)).toThrow('Quota')
  expect(original).toEqual([4403])
 })
 it('reports failed persistence and does not change the input history', () => {
  const input=[4439], storage={...memory(),setItem:()=>{throw new Error('Quota')}}
  expect(()=>markBlueprintRead(input,4403,storage)).toThrow('Quota'); expect(input).toEqual([4439])
 })
 it('changes only the name weight, preserves badges, and lists do not mark read', () => {
  const markRead=vi.fn()
  for (const readIds of [[],[blueprint.id]]) {
   const html=renderToStaticMarkup(createElement(BlueprintReadContext.Provider,{value:{readIds,markRead}},createElement(BlueprintName,{blueprint})))
   expect(html).toContain(readIds.length?'blueprint-name-read':'blueprint-name-unread')
   expect(html).toContain('Lineage: Townie')
  }
  expect(markRead).not.toHaveBeenCalled()
 })
 it('does not mark read while merely rendering a Details element on the server', () => {
  const markRead=vi.fn()
  const props={blueprint,mode:'catalog' as const,calculator:new DefaultCostCalculator(),defaultMarkupPercent:25,craftTimer:createIdleCraftTimer(),activeCollection:undefined,shopping:{lists:[],onAddComponents:vi.fn(),onOpenLists:vi.fn()},onUpdateCollectionEntry:vi.fn(),onCraftBlueprint:vi.fn(),onAddBuild:vi.fn(),onOpenCraftTimer:vi.fn()}
  renderToStaticMarkup(createElement(BlueprintReadContext.Provider,{value:{readIds:[],markRead}},createElement(BlueprintDetails,props)))
  expect(markRead).not.toHaveBeenCalled(); expect(props.onUpdateCollectionEntry).not.toHaveBeenCalled()
 })
 it('exports and restores read history with replacement rather than merging', () => {
  const source=memory(), destination=memory(); saveReadHistory([4403,99999999],source); saveReadHistory([4439],destination)
  const backup=createBackup(source)
  expect(backup.schemaVersion).toBe(4); expect(backup.data.blueprintReadHistory.readIds).toEqual([4403,99999999])
  restoreBackup(backup,destination); expect(loadReadHistory(destination)).toEqual([4403,99999999])
 })
 it('migrates legacy backups to empty history and clears destination history', () => {
  const current=createBackup(memory()), legacy={...current,schemaVersion:1,data:{...current.data} as Record<string,unknown>}
  delete legacy.data.guidedTours; delete legacy.data.blueprintReadHistory
  const migrated=migrateBackup(legacy); expect(migrated.data.blueprintReadHistory.readIds).toEqual([])
  const destination=memory();saveReadHistory([4403],destination);restoreBackup(migrated,destination)
  expect(loadReadHistory(destination)).toEqual([])
 })
 it('rejects malformed new backups without relaxing unrelated schema validation', () => {
  const backup=createBackup(memory())
  expect(()=>migrateBackup({...backup,data:{...backup.data,blueprintReadHistory:{readIds:[-1]}}})).toThrow()
  expect(()=>migrateBackup({...backup,data:{...backup.data,blueprintReadHistory:{readIds:[1,1]}}})).toThrow()
  expect(()=>migrateBackup({...backup,data:{...backup.data,unexpected:true}})).toThrow()
 })
 it('includes history in rollback when replacement fails', () => {
  const destination=memory();saveReadHistory([4403],destination)
  const before=[...destination.values];let failed=false
  const failing={...destination,setItem:(key:string,value:string)=>{if(key===READ_HISTORY_KEY&&!failed){failed=true;throw new Error('Quota')}destination.setItem(key,value)}}
  const replacement:Record<string,string|null>=Object.fromEntries(USER_KEYS.map(key=>[key,null]));replacement[READ_HISTORY_KEY]='{"version":1,"readIds":[4439]}'
  expect(()=>commitReplacement(replacement,failing)).toThrow('Quota')
  expect([...destination.values]).toEqual(before)
 })
})
