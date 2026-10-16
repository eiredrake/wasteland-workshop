import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import QuantityDialog from './QuantityDialog'
import QuantitySplitButton from './QuantitySplitButton'
import { BATCH_QUANTITIES } from '../../features/batch/BatchQuantity'
describe('shared quantity interface',()=>{
 it('defaults to 1 and offers precisely the ten allowed quantities without side effects',()=>{
  const confirm=vi.fn(),cancel=vi.fn(),html=renderToStaticMarkup(<QuantityDialog title="Add to Work Queue" name="Long blueprint name" onConfirm={confirm} onCancel={cancel}/>)
  expect(BATCH_QUANTITIES).toEqual([1,2,3,4,5,6,7,8,9,10]);expect(html).toContain('value="1" selected=""');expect(html).toContain('Add 1')
  expect(html.match(/<option /g)).toHaveLength(10);expect(html).not.toContain('value="0"');expect(html).not.toContain('value="11"');expect(html).toContain('Cancel')
  expect(confirm).not.toHaveBeenCalled();expect(cancel).not.toHaveBeenCalled()
 })
 it('uses accessible native buttons and keeps the modal closed until requested',()=>{
  const html=renderToStaticMarkup(<QuantitySplitButton title="Add" name="Example" quantityLabel="Choose build quantity" onAdd={()=>true}>Build</QuantitySplitButton>)
  expect(html.match(/<button /g)).toHaveLength(2);expect(html).toContain('aria-label="Choose build quantity"');expect(html).toContain('aria-haspopup="dialog"');expect(html).not.toContain('<dialog')
 })
 it('disables both halves together',()=>{
  const html=renderToStaticMarkup(<QuantitySplitButton disabled title="Add" name="Example" quantityLabel="Choose quantity" onAdd={()=>true}>Build</QuantitySplitButton>)
  expect(html.match(/disabled=""/g)).toHaveLength(2)
 })
})
