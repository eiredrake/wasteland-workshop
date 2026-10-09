import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ActionConfigurationForm from './ActionConfigurationForm'
import { actionCatalog } from './ActionCatalog'
const render=(id:string)=>renderToStaticMarkup(<ActionConfigurationForm definition={actionCatalog.find(a=>a.id===id)!} onAdd={()=>true} onClose={()=>{}}/>)
describe('queue Action entry',()=>{
 it('puts Repair submission before collapsed optional details',()=>{
  const html=render('basic-artisan-repair')
  expect(html).not.toContain('Close Action Selection')
  expect(html).not.toContain('Optional target')
  expect(html.indexOf('Add to Queue')).toBeLessThan(html.indexOf('Requirements and details'))
  expect(html).not.toContain('<details open')
  expect(html).toContain('Cannot repair limited-use items')
 })
 it('keeps required choices visible before submission',()=>{
  const action=actionCatalog.find(a=>a.options.some(o=>o.fields.some(f=>f.required)))!
  const chosen={...action,options:[action.options.find(o=>o.fields.some(f=>f.required))!]}
  const html=renderToStaticMarkup(<ActionConfigurationForm definition={chosen} onAdd={()=>true} onClose={()=>{}}/>)
  expect(html.indexOf('required=""')).toBeGreaterThan(-1)
  expect(html.indexOf('required=""')).toBeLessThan(html.indexOf('Add to Queue'))
 })
 it('keeps meaningful limb quantity and omits all cosmetic target fields',()=>{
  const html=render('proficient-medical-mangle');expect(html).toContain('Affected limbs');expect(html).toContain('min="1"');expect(html).not.toContain('Target (');expect(html).not.toContain('Optional target')
 })
 it('automatically selects fixed herb types and retains quantity and session ID',()=>{
  const html=render('basic-agricultural');expect(html).not.toContain('<select');expect(html).toContain('Herbs in this gathering');expect(html).toContain('Session ID')
 })
})
