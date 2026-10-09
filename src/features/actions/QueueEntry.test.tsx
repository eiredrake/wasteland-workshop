import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ActionDetails from './ActionDetails'
import { actionCatalog } from './ActionCatalog'
const render=(id:string,compact=true)=>renderToStaticMarkup(<ActionDetails definition={actionCatalog.find(a=>a.id===id)!} dismissible={compact} onAdd={()=>true} onClose={()=>{}}/>)
describe('queue Action entry',()=>{
 it('puts Repair submission before collapsed optional details',()=>{
  const html=render('basic-artisan-repair')
  expect(html).not.toContain('Close Action Selection')
  expect(html.indexOf('Add to Queue')).toBeLessThan(html.indexOf('Optional target'))
  expect(html.indexOf('Add to Queue')).toBeLessThan(html.indexOf('Requirements and details'))
  expect(html).not.toContain('<details open')
  expect(html).toContain('Cannot repair limited-use items')
 })
 it('keeps required choices visible before submission',()=>{
  const action=actionCatalog.find(a=>a.options.some(o=>o.fields.some(f=>f.required)))!
  const chosen={...action,options:[action.options.find(o=>o.fields.some(f=>f.required))!]}
  const html=renderToStaticMarkup(<ActionDetails definition={chosen} dismissible onAdd={()=>true} onClose={()=>{}}/>)
  expect(html.indexOf('required=""')).toBeGreaterThan(-1)
  expect(html.indexOf('required=""')).toBeLessThan(html.indexOf('Add to Queue'))
 })
 it('keeps the catalog details expanded',()=>{
  const html=render('basic-artisan-repair',false)
  expect(html).not.toContain('Requirements and details')
  expect(html.indexOf('Rules and Limitations')).toBeLessThan(html.indexOf('Add to Queue'))
 })
})
