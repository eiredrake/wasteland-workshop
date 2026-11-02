import {describe,it,expect} from 'vitest'
import {nextBlueprintCollectionStatus,blueprintCollectionStatusLabel,setCollectionBlueprintStatus} from './BlueprintCollectionService'
import type {BlueprintAccessStatus,BlueprintCollection} from './BlueprintCollection'
import {createBackup,restoreBackup,serializeBackup} from '../backup/BackupRepository'
import {parseBackup} from '../backup/Backup'

const transitions: [BlueprintAccessStatus | undefined, BlueprintAccessStatus | undefined, string][] = [
 [undefined,'acquired','Not Acquired'],['acquired','to-acquire','Acquired'],['to-acquire','sell','To Acquire'],['sell',undefined,'To Sell'],
]
function memory() {
 const values=new Map<string,string>()
 return {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value)},removeItem:(key:string)=>{values.delete(key)}}
}
describe('shared Blueprint collection status cycle (#36)',()=>{
 it.each(transitions)('advances %s to %s and labels it %s',(current,next,label)=>{
  expect(nextBlueprintCollectionStatus(current)).toBe(next)
  expect(blueprintCollectionStatusLabel(current)).toBe(label)
 })
 it('repeats without skipping and removes the entry for Not Acquired',()=>{
  let collection:BlueprintCollection={id:'a',name:'Active',entries:[]}
  for(let index=0;index<12;index++){
   const status=collection.entries.find(entry=>entry.blueprintId===4403)?.status
   collection=setCollectionBlueprintStatus(collection,4403,nextBlueprintCollectionStatus(status))
   expect(collection.entries).toEqual(index%4===3?[]:[{blueprintId:4403,status:['acquired','to-acquire','sell'][index%4]}])
  }
 })
 it('changes only the target Blueprint in the intended collection without mutating saved input',()=>{
  const original:BlueprintCollection[]=[{id:'a',name:'A',entries:[{blueprintId:4403,status:'acquired'},{blueprintId:4439,status:'sell'}]},{id:'b',name:'B',entries:[{blueprintId:4403,status:'to-acquire'}]}]
  const before=structuredClone(original)
  const result=original.map(collection=>collection.id==='a'?setCollectionBlueprintStatus(collection,4403,nextBlueprintCollectionStatus(collection.entries[0].status)):collection)
  expect(result[0].entries).toEqual([{blueprintId:4403,status:'to-acquire'},{blueprintId:4439,status:'sell'}])
  expect(result[1]).toBe(original[1]);expect(result[0].entries[1]).toBe(original[0].entries[1]);expect(original).toEqual(before)
 })
 it.each([undefined,'acquired','to-acquire','sell'] as const)('explicit acquisition sets %s directly to Acquired',status=>{
  const collection:BlueprintCollection={id:'a',name:'A',entries:status?[{blueprintId:4403,status}]:[]}
  expect(setCollectionBlueprintStatus(collection,4403,'acquired').entries).toEqual([{blueprintId:4403,status:'acquired'}])
 })
 it('round trips existing statuses and untracked membership through full export/import unchanged',()=>{
  const original:BlueprintCollection[]=[{id:'a',name:'A',entries:[{blueprintId:4403,status:'acquired'},{blueprintId:4439,status:'to-acquire'},{blueprintId:4422,status:'sell'}]},{id:'b',name:'B',entries:[{blueprintId:4403,status:'sell'}]}]
  const source=memory(),destination=memory(),key='wasteland-workshop-blueprint-collections'
  source.setItem(key,JSON.stringify(original));source.setItem('wasteland-workshop-active-blueprint-collection','a')
  const backup=createBackup(source)
  expect(source.getItem(key)).toBe(JSON.stringify(original))
  restoreBackup(parseBackup(serializeBackup(backup)),destination)
  const restored=JSON.parse(destination.getItem(key)!) as BlueprintCollection[]
  expect(restored).toEqual(original)
  expect(restored[0].entries.find(entry=>entry.blueprintId===9999)).toBeUndefined()
  expect(nextBlueprintCollectionStatus(restored[0].entries[0].status)).toBe('to-acquire')
  expect(destination.getItem('wasteland-workshop-active-blueprint-collection')).toBe('a')
 })
})
