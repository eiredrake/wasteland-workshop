import { scanFrameBounds } from '../../components/CameraPreview/CameraGeometry'
import { describe, expect, it } from 'vitest'
import { extractScanNames, matchScanNames, normalizeScanName } from './ScanMatching'
import { acquireScannedBlueprint, scanCounters } from './ScanSession'
import { masterBlueprints } from '../blueprints/blueprints'
import { setCollectionBlueprintStatus } from '../blueprints/BlueprintCollectionService'
const blueprint=masterBlueprints.find(b=>b.name==='Freeiron Dry Pack')!
const catalog=[{...blueprint,id:1,name:'Freeiron Dry Pack'},{...blueprint,id:2,name:'Hooch'}]
describe('local scanner matching',()=>{
 it('normalizes case, spacing, punctuation and accents',()=>expect(normalizeScanName('  FRÉEiron — Dry-Pack! ')).toBe('freeirondrypack'))
 it('extracts Item Name separately from mechanics and headings',()=>{
  const names=extractScanNames('Artisan Recipe\nItem Name: Freeiron Dry Pack\nItem Type Gizmo\nRequirements None\nHooch')
  expect(names).toContain('Freeiron Dry Pack');expect(names).not.toContain('Hooch')
  expect(matchScanNames(names,catalog).candidates[0].blueprint.id).toBe(1)
 })
 it('joins broken title lines without treating headings as names',()=>expect(matchScanNames(extractScanNames('Item Name\nFreeiron Dry\nPack\nItem Type Gizmo'),catalog).confidence).toBe('high'))
 it.each(['Freeiron Dry Pack','FREEIRON DRY PACK','Freeiron-Dry  Pack','FreeironDryPack','Freeiron Dry Pacl'])('matches %s against canonical IDs',name=>{
  const result=matchScanNames([name],catalog);expect(result.candidates[0].blueprint.id).toBe(1);expect(result.confidence).not.toBe('none')
 })
 it('compares both OCR and catalog names without case sensitivity',()=>{expect(matchScanNames(['hOoCh'],[{...catalog[1],name:'HOOCH'}]).confidence).toBe('high')})
 it('handles common OCR confusions conservatively',()=>expect(matchScanNames(['H00ch'],catalog).confidence).toBe('high'))
 it('requires user choice for duplicate names and plausible fuzzy alternatives',()=>{
  expect(matchScanNames(['Hooch'],[...catalog,{...catalog[1],id:3}]).confidence).toBe('ambiguous')
  expect(matchScanNames(['Freeiron Dry Pac'],[catalog[0],{...catalog[0],id:3,name:'Freeiron Dry Pads'}]).confidence).toBe('ambiguous')
 })
 it('rejects unrelated and short fuzzy text instead of inventing catalog entries',()=>{
  for(const name of ['ZZZZZZZZZZZZ','Hoch',''])expect(matchScanNames([name],catalog).confidence).toBe('none')
 })
})
describe('confirmed acquisition and counters',()=>{
 const collection={id:'c',name:'Character',entries:[{blueprintId:blueprint.id,status:'to-acquire' as const,notes:'keep me'}],extra:'metadata'}
 it('updates To Acquire while preserving collection/entry metadata and unrelated entries',()=>{
  const before=structuredClone(collection),other={id:'other',name:'Other',entries:[]}
  const result=acquireScannedBlueprint([collection,other],'c','c',blueprint)
  expect(result.alreadyOwned).toBe(false);expect(result.collections[0]).toEqual({...collection,entries:[{...collection.entries[0],status:'acquired'}]});expect(result.collections[1]).toBe(other);expect(collection).toEqual(before)
 })
 it('adds missing membership and detects already Acquired without duplicating or overwriting',()=>{
  const first=acquireScannedBlueprint([{...collection,entries:[]}],'c','c',blueprint)
  const second=acquireScannedBlueprint(first.collections,'c','c',blueprint)
  expect(second.alreadyOwned).toBe(true);expect(second.collections).toBe(first.collections);expect(second.collections[0].entries).toHaveLength(1)
 })
 it('rejects changed, missing and deleted destinations',()=>{
  expect(()=>acquireScannedBlueprint([collection],'other','c',blueprint)).toThrow('changed')
  expect(()=>acquireScannedBlueprint([],undefined,'c',blueprint)).toThrow('changed')
  expect(()=>acquireScannedBlueprint([],'c','c',blueprint)).toThrow('deleted')
 })
 it('shares membership behavior with badges and supports removal',()=>{
  expect(setCollectionBlueprintStatus(collection,blueprint.id,'to-acquire')).toBe(collection)
  expect(setCollectionBlueprintStatus(collection,blueprint.id,undefined).entries).toEqual([])
 })
 it('classifies each document once; retakes replace its outcome',()=>{
  expect(scanCounters(['acquired','owned','unmatched'])).toEqual({scanned:3,acquired:1,owned:1,unmatched:1})
  expect(scanCounters(['acquired','owned','acquired'])).toEqual({scanned:3,acquired:2,owned:1,unmatched:0})
  expect(scanCounters([]).scanned).toBe(0)
 })
})


it.each([[800,1050],[1600,900]])('name strip capture frame stays aligned inside %s x %s video', (width,height)=>{
 const frame=scanFrameBounds(width,height)
 expect(frame.width/frame.height).toBeCloseTo(3.4)
 expect(frame.x).toBeGreaterThanOrEqual(width*.05-.001)
 expect(frame.y).toBeGreaterThanOrEqual(height*.05-.001)
 expect(frame.x*2+frame.width).toBeCloseTo(width)
 expect(frame.y*2+frame.height).toBeCloseTo(height)
})
