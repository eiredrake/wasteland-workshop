import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import BlueprintDetails from './BlueprintDetails'
import WorkshopView from './WorkshopView'
import { masterBlueprints } from './blueprints'
import type { BlueprintCollection, BlueprintAccessStatus } from './BlueprintCollection'
import { DefaultCostCalculator } from '../../economics/DefaultCostCalculator'
import { createIdleCraftTimer } from '../timer/CraftTimerState'
const blueprint = masterBlueprints.find(b=>b.id===4403)!
const base = {blueprint,calculator:new DefaultCostCalculator(),defaultMarkupPercent:25,craftTimer:createIdleCraftTimer(),shopping:{lists:[],onAddComponents:vi.fn(),onOpenLists:vi.fn()},onUpdateCollectionEntry:vi.fn(),onCraftBlueprint:vi.fn(),onAddBuild:vi.fn(),onOpenCraftTimer:vi.fn()}
const collection = (status?:BlueprintAccessStatus):BlueprintCollection => ({id:'test',name:'Test',entries:status?[{blueprintId:blueprint.id,status}]:[]})
const details = (activeCollection:BlueprintCollection,mode:'catalog'|'collection'='catalog') => renderToStaticMarkup(createElement(BlueprintDetails,{...base,mode,activeCollection}))
describe('Blueprint Details collection status', () => {
 it.each(['catalog','collection'] as const)('shows Not Acquired for missing membership in %s',mode => {
  expect(details(collection(),mode)).toMatch(/blueprint-access-status-untracked[^>]*>Not Acquired<\/button>/)
 })
 it.each([['to-acquire','To Acquire'],['acquired','Acquired'],['sell','To Sell']] as const)('shows explicit %s membership accurately', (status,label) => {
  expect(details(collection(status))).toMatch(new RegExp(`blueprint-access-status-${status}[^>]*>${label}</button>`))
 })
 it('reflects removal and active collection switches without cached status', () => {
  const owned=collection('acquired'), removed={...owned,entries:owned.entries.filter(e=>e.blueprintId!==blueprint.id)}
  expect(details(owned)).toContain('>Acquired</button>')
  expect(details(removed)).toContain('>Not Acquired</button>')
  expect(details({...collection('to-acquire'),id:'other'})).toContain('>To Acquire</button>')
  const html=renderToStaticMarkup(createElement(WorkshopView,{...base,activeCollection:removed}))
  expect(html).not.toContain(blueprint.name)
  expect(masterBlueprints.some(b=>b.id===blueprint.id)).toBe(true)
 })
 it('keeps missing membership distinct after serialized collection restoration', () => {
  const restored:BlueprintCollection=JSON.parse(JSON.stringify(collection()))
  expect(details(restored)).toContain('>Not Acquired</button>')
  expect(restored.entries).toEqual([])
 })
})
