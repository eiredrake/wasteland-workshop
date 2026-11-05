import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe,it,expect,vi} from 'vitest'
import {allBlueprints} from './blueprints'
import {analyzeBlueprintUsage,blueprintUsageRestrictions} from './UsageRestrictions'
import type {Blueprint} from './Blueprint'
import BlueprintDetails from './BlueprintDetails'
import BlueprintUsageBadges from '../../components/BlueprintUsageBadges/BlueprintUsageBadges'
import {DefaultCostCalculator} from '../../economics/DefaultCostCalculator'
import {createIdleCraftTimer} from '../timer/CraftTimerState'
import baseline from '../../../docs/audits/issue-38-lineage-baseline.json'

const brew=allBlueprints.find(b=>b.id===4403)!
function example(mechanics='',requirement:string|null='None'):Blueprint {
 const bp=structuredClone(brew)
 bp.metadata!.requirementsToUse=null;bp.metadata!.mechanics=null
 const product=bp.itemCraftings![0].craftingFinalProducts[0].finalProduct
 product.metadata!.requirementsToUse=requirement;product.metadata!.mechanics=mechanics;product.childItemClassifications=[]
 return bp
}
const values=(bp:Blueprint)=>blueprintUsageRestrictions(bp).filter(r=>r.type==='Lineage').map(r=>r.value)
const healing=[['Arisen Healing Brew','Devoted'],['Bayful Healing Brew','Mutant'],['Burney Healing Brew','Landsman'],['Liquorish Healing Brew','Elitariat'],['Mary-Gold Healing Brew','Evolved'],["Reaper's Healing Brew",'Gorger'],['Slicker Healing Brew','Townie'],['Wandering Healing Brew','Nomad']]
const poisons=[['Antithesis Poison','Evolved'],['Betrayal Poison','Devoted'],['Bitter Herb Poison','Landsman'],['Bloodless Poison','Gorger'],['Ghost Town Poison','Townie'],['Lost Trail Poison','Nomad'],['Rotting Corpse Poison','Mutant'],['Recession Poison','Elitariat']]

describe('mechanics-derived Lineage applicability (#38)',()=>{
 it.each([...healing,...poisons])('finds the real %s print as %s',(name,lineage)=>{
  const bp=allBlueprints.find(b=>b.name===name)!
  expect(bp).toBeDefined();expect(values(bp)).toEqual([lineage])
  expect(blueprintUsageRestrictions(bp)[0]).toMatchObject({applicability:'target',sourceField:'mechanics'})
  expect(renderToStaticMarkup(createElement(BlueprintUsageBadges,{blueprint:bp}))).toContain('Lineage: '+lineage)
 })
 it.each(['Members of the Townie Lineage','Target (Both) of the Townie Lineage','Townie Lineage only','Members  OF  the  tOwNiE Lineage regain 10 Body.','Target(Both) of the Townie: Lineage regains 10 Body.','Members\nof the\tTownie Lineage regain 10 Body.'])('recognizes bounded mechanics phrase %s',text=>{
  expect(values(example(text))).toEqual(['Townie'])
 })
 it('normalizes the Landsmen alias in both sources',()=>{
  expect(values(example('Members of the Landsmen Lineage'))).toEqual(['Landsman'])
  expect(values(example('', 'landsmen Lineage'))).toEqual(['Landsman'])
 })
 it.each(['Any Lineage','Lineage: Any','Lineage Any','Any: Lineage','LINEAGE:ANY','Any-Lineage','Lineage - Any','Members of any Lineage regain 20 Body.','This item can be used by any Lineage.','This effect applies to Any Lineage.'])('recognizes genuine Any applicability: %s',text=>{
  expect(values(example(text))).toEqual(['Any'])
 })
 it.each(['Any Lineage','Lineage: Any','Lineage Any','Any: Lineage'])('accepts an explicit structured applicability field: %s',text=>{
  expect(values(example('',text))).toEqual(['Any'])
 })
 it.each([null,'','None','Master Medical'])('uses mechanics when requirements are %s',requirements=>{
  expect(values(example('Members of the Devoted Lineage regain 10 Body.',requirements))).toEqual(['Devoted'])
 })
 it('handles Blueprint-level mechanics and Requirements To Use',()=>{
  const bp=example();bp.metadata!.mechanics='Target (Both) of the Mutant Lineage regains 10 Body.'
  expect(values(bp)).toEqual(['Mutant'])
  bp.metadata!.requirementsToUse='Townie Lineage'
  expect(values(bp)).toEqual(['Townie']);expect(analyzeBlueprintUsage(bp).diagnostics.some(d=>d.kind==='conflict')).toBe(true)
 })
 it('deduplicates identical normalized structured, mechanics and variant evidence',()=>{
  const bp=example('Members of the Townie Lineage regain 20 Body.','Townie Lineage')
  bp.metadata!.requirementsToUse='townie Lineage'
  const product=bp.itemCraftings![0].craftingFinalProducts[0].finalProduct
  product.childItemClassifications=[{childItem:{id:9,name:'Variant',kind:'test-variant',metadata:{...product.metadata!,requirementsToUse:'Townie Lineage'}}}]
  expect(values(bp)).toEqual(['Townie'])
 })
 it.each(['Members of the Nomad Lineage regain 20 Body.','Members of Any Lineage regain 20 Body.'])('keeps named structured requirements authoritative over %s',mechanics=>{
  const bp=example(mechanics,'Townie Lineage'),result=analyzeBlueprintUsage(bp)
  expect(result.restrictions).toEqual([{type:'Lineage',value:'Townie',source:'Townie Lineage'}])
  expect(result.diagnostics).toContainEqual(expect.objectContaining({kind:'conflict',source:mechanics}))
 })
 it('inherits explicit parent requirements in child mechanics but does not restrict unrelated sibling products',()=>{
  const bp=example('', 'Townie Lineage'),product=bp.itemCraftings![0].craftingFinalProducts[0].finalProduct
  product.childItemClassifications=[{childItem:{id:8,name:'Child',kind:'test-variant',metadata:{...product.metadata!,requirementsToUse:'None',mechanics:'Members of the Devoted Lineage regain 10 Body.'}}}]
  bp.itemCraftings![0].craftingFinalProducts.push({id:7,stack:1,finalProduct:{...structuredClone(product),id:7,name:'Other output',childItemClassifications:[],metadata:{...product.metadata!,requirementsToUse:'None',mechanics:'Members of the Nomad Lineage regain 10 Body.'}}})
  expect(values(bp)).toEqual(['Townie','Nomad'])
  expect(analyzeBlueprintUsage(bp).diagnostics).toContainEqual(expect.objectContaining({kind:'conflict',productId:8}))
 })
 it('preserves multiple legitimate named statements and suppresses contradictory Any with an audit diagnostic',()=>{
  const bp=example('Members of the Townie Lineage regain 10 Body. Members of the Nomad Lineage regain 5 Mind.')
  expect(values(bp)).toEqual(['Townie','Nomad'])
  bp.itemCraftings![0].craftingFinalProducts[0].finalProduct.metadata!.mechanics+=' Members of Any Lineage regain 1 Body.'
  expect(values(bp)).toEqual(['Townie','Nomad'])
  expect(analyzeBlueprintUsage(bp).diagnostics.some(d=>d.reason.includes('Any contexts'))).toBe(true)
 })
 it('retains explicit compound lineage alternatives',()=>{
  expect(values(example('', 'townie or nomad Lineage'))).toEqual(['Townie or Nomad'])
  expect(values(example('Members of the Townie or Nomad Lineage regain 10 Body.'))).toEqual(['Townie or Nomad'])
 })
 it('distinguishes user eligibility from target effects without changing the gold badge',()=>{
  expect(blueprintUsageRestrictions(example('Only members of the Townie Lineage may use this item.'))[0].applicability).toBe('user')
  expect(blueprintUsageRestrictions(example('Members of the Townie Lineage regain 10 Body.'))[0].applicability).toBe('target')
 })
 it.each(['Extends the Gorger Lineage advantage to all participants.','The Gorger Lineage advantage is described here.','A head is required from any Lineage corpse.','A corpse belonging to any Lineage is required.','Townies compare the Gorger Lineage with the Nomad Lineage.','Lore: Townie Lineage only.','Does not affect members of the Townie Lineage.','Except Members of the Townie Lineage regain 10 Body.','Members of the Townie Lineage are renowned for trading.','Any unidentified Lineage may apply.'])('does not invent applicability from %s',text=>{
  expect(values(example(text))).toEqual([])
  expect(analyzeBlueprintUsage(example(text)).diagnostics.length).toBeGreaterThan(0)
 })
 it('does not interpret bare Any in a damage call as Any Lineage',()=>{expect(values(example('Applied. On next Strike, call 20 Body to any target.'))).toEqual([])})
 it('can read a valid second sentence without carrying a corpse/advantage context into it',()=>{
  expect(values(example('This refers to the Gorger Lineage advantage. Target (Both) of the Townie Lineage regains 10 Body.'))).toEqual(['Townie'])
 })
 it('ignores unrelated ingredient metadata and preserves source objects',()=>{
  const bp=example();Object.assign(bp.itemCraftings![0].craftingComponents[0].component,{metadata:{mechanics:'Townie Lineage only'}})
  const before=structuredClone(bp)
  expect(values(bp)).toEqual([]);expect(bp).toEqual(before)
 })
 it('uses only clear evidence for Recession Poison and records its malformed consumed wording',()=>{
  const bp=allBlueprints.find(b=>b.name==='Recession Poison')!,result=analyzeBlueprintUsage(bp)
  expect(result.restrictions[0]).toMatchObject({value:'Elitariat',applicability:'target',source:expect.stringContaining('20 Body to Elitariat')})
  expect(result.diagnostics).toContainEqual(expect.objectContaining({kind:'ambiguous',productName:'Recession Poison (Consumed)'}))
 })
 it.each([4744,4860,4841,6284])('does not assign a badge to incidental/conditional catalog record %s',id=>{
  expect(values(allBlueprints.find(b=>b.id===id)!)).toEqual([])
 })
 it('preserves every previously working badge and every Strain value in the full catalog',()=>{
  for(const row of baseline.records){
   const after=blueprintUsageRestrictions(allBlueprints.find(b=>b.id===row.id)!)
   for(const badge of row.badges)expect(after).toContainEqual(badge)
   expect(after.filter(r=>r.type==='Strain')).toEqual(row.badges.filter(r=>r.type==='Strain'))
  }
 })
 it('has only the reviewed 16 new named and 30 Any matches across all 655 records',()=>{
  const newlyRecognized=allBlueprints.filter(bp=>!baseline.records.find(row=>row.id===bp.id)!.badges.some(r=>r.type==='Lineage')).map(bp=>({bp,values:values(bp)})).filter(r=>r.values.length)
  expect(allBlueprints).toHaveLength(655)
  expect(newlyRecognized.filter(r=>r.values[0]!=='Any').map(r=>r.bp.name).sort()).toEqual([...healing,...poisons].map(r=>r[0]).sort())
  expect(newlyRecognized.filter(r=>r.values[0]==='Any')).toHaveLength(30)
  expect(allBlueprints.flatMap(bp=>analyzeBlueprintUsage(bp).diagnostics).filter(d=>d.kind==='conflict')).toEqual([])
 })
 it.each(['catalog','collection'] as const)('reuses gold badges in %s Details',mode=>{
  const bp=allBlueprints.find(b=>b.name==='Slicker Healing Brew')!
  const html=renderToStaticMarkup(createElement(BlueprintDetails,{blueprint:bp,mode,calculator:new DefaultCostCalculator(),defaultMarkupPercent:25,craftTimer:createIdleCraftTimer(),activeCollection:undefined,shopping:{lists:[],onAddComponents:vi.fn(),onOpenLists:vi.fn()},onUpdateCollectionEntry:vi.fn(),onCraftBlueprint:vi.fn(),onAddBuild:vi.fn(),onOpenCraftTimer:vi.fn()}))
  expect(html).toContain('blueprint-usage-badge');expect(html).toContain('Lineage: Townie');expect(html).toContain('Target applicability')
 })
})
