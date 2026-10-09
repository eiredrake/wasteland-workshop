import { describe, expect, it } from 'vitest'
import { defaultActionConfiguration, visibleActionFields } from './ActionConfiguration'
import { actionCatalog } from './ActionCatalog'
import { resolveAction } from './ActionService'
const all=actionCatalog.flatMap(definition=>definition.options.map(option=>({definition,option})))
describe('mechanical Action configuration audit',()=>{
 it.each(all)('preserves meaningful fields and resolves defaults for $definition.id/$option.id',({definition,option})=>{
  const config=defaultActionConfiguration(option)
  for(const field of option.fields) {
   if(field.type==='select'&&field.choices.length===1){expect(visibleActionFields(option)).not.toContain(field);expect(config[field.id]).toBe(field.choices[0].value)}
   else expect(visibleActionFields(option)).toContain(field)
   if(field.type==='text'&&field.required)config[field.id]='Anise'
  }
  const before=structuredClone(definition)
  const resolved=resolveAction(definition,option.id,config,undefined,option.sessionConstraints?'test-session':undefined)
  expect(resolved.option.mind).toBe(option.mind);expect(resolved.option.minutes).toBe(option.minutes);expect(resolved.option.resolve).toBe(option.resolve)
  expect(resolved.option.inputs).toEqual(option.inputs);expect(resolved.option.equipmentUses).toEqual(option.equipmentUses)
  expect(definition).toEqual(before)
 })
 it('retains named herbs, healing Mind and limb quantities',()=>{
  const find=(id:string)=>actionCatalog.find(a=>a.id===id)!
  expect(visibleActionFields(find('master-agricultural').options[1]).map(f=>f.id)).toContain('herb')
  expect(visibleActionFields(find('basic-medical-healing').options[0]).map(f=>f.id)).toEqual(['additionalMind'])
  expect(visibleActionFields(find('proficient-medical-mangle').options[0]).map(f=>f.id)).toEqual(['limbs'])
 })
})
