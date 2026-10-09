import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createScanRecognizer } from './ScanOcr'
import { masterBlueprints } from '../blueprints/blueprints'
const mocks=vi.hoisted(()=>({recognize:vi.fn(),setParameters:vi.fn(),terminate:vi.fn(),createWorker:vi.fn()}))
vi.mock('tesseract.js',()=>({createWorker:mocks.createWorker}))
const base=masterBlueprints[0]
const catalog=[{...base,id:1,name:'Freeiron Dry Pack'},{...base,id:2,name:'Hooch'}]
const image={width:100,height:30} as HTMLCanvasElement
beforeEach(()=>{
 vi.resetAllMocks();mocks.createWorker.mockResolvedValue(mocks);mocks.setParameters.mockResolvedValue({});mocks.terminate.mockResolvedValue(undefined)
 vi.stubGlobal('location',{origin:'https://local.invalid'})
 vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({drawImage:vi.fn(),getImageData:()=>({data:new Uint8ClampedArray([70,70,70,255,130,130,130,255])}),putImageData:vi.fn(),fillRect:vi.fn(),translate:vi.fn(),rotate:vi.fn()})})})
})
afterEach(()=>vi.unstubAllGlobals())
describe('bounded local name OCR passes',()=>{
 it('exports exact input and complete per-pass text only when requested',async()=>{
  mocks.recognize.mockResolvedValue({data:{text:'Item Name Freeiron Dry Pack',confidence:87,blocks:null}})
  const toDataURL=vi.fn(()=> 'data:image/png;base64,exact'),diagnostic=vi.fn(),reader=createScanRecognizer()
  const capture={...image,toDataURL} as unknown as HTMLCanvasElement
  await reader.recognize(capture,catalog);expect(toDataURL).not.toHaveBeenCalled()
  await reader.recognize(capture,catalog,diagnostic)
  expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({mode:'11',variant:'original',text:'Item Name Freeiron Dry Pack',confidence:87,width:100,height:30,image:'data:image/png;base64,exact',names:['Freeiron Dry Pack']}))
  await reader.close()
 })
 it('returns a direct exact match after one pass and closes its worker',async()=>{
  mocks.recognize.mockResolvedValue({data:{text:'Item Name Freeiron Dry Pack',blocks:null}})
  const reader=createScanRecognizer();expect((await reader.recognize(image,catalog)).confidence).toBe('high');expect(mocks.recognize).toHaveBeenCalledTimes(1)
  await reader.close();expect(mocks.terminate).toHaveBeenCalledTimes(1)
 })
 it('tries unprocessed single-line OCR before contrast enhancement',async()=>{
  mocks.recognize.mockResolvedValueOnce({data:{text:'',blocks:null}}).mockResolvedValueOnce({data:{text:'Freeiron] Dry Pack',blocks:null}})
  const reader=createScanRecognizer();expect((await reader.recognize(image,catalog)).candidates[0].blueprint.id).toBe(1)
  expect(mocks.setParameters.mock.calls.map(call=>call[0].tessedit_pageseg_mode)).toEqual(['11','7']);await reader.close()
 })
 it('offers word-supported suggestions only as uncertain, preserving explicit choice',async()=>{
  mocks.recognize.mockResolvedValue({data:{text:'Spced Hooch noise',blocks:[{paragraphs:[{lines:[{words:[{text:'Spced',confidence:10},{text:'Hooch',confidence:50},{text:'noise',confidence:5}]}]}]}]}})
  const reader=createScanRecognizer(),match=await reader.recognize(image,[...catalog,{...base,id:3,name:'Spiced Hooch'}])
  expect(match.confidence).toBe('ambiguous');expect(match.candidates[0].blueprint.name).toBe('Hooch');expect(mocks.recognize).toHaveBeenCalledTimes(6)
  await reader.close()
 })
 it('keeps exact fragments surrounded by capture noise uncertain',async()=>{
  mocks.recognize.mockResolvedValue({data:{text:'�* Fréeiron/Dry,Pack! FESR�',blocks:null}})
  const reader=createScanRecognizer(),match=await reader.recognize(image,catalog)
  expect(match.confidence).toBe('ambiguous');expect(match.candidates[0].blueprint.name).toBe('Freeiron Dry Pack');await reader.close()
 })
 it('stops after six attempts without inventing an unknown blueprint',async()=>{
  mocks.recognize.mockResolvedValue({data:{text:'unrecognizable',blocks:null}})
  const reader=createScanRecognizer();expect((await reader.recognize(image,catalog)).confidence).toBe('none');expect(mocks.recognize).toHaveBeenCalledTimes(6);await reader.close()
 })
 it('terminates and rejects a reader closed before initialization',async()=>{
  const reader=createScanRecognizer();await reader.close();await expect(reader.recognize(image,catalog)).rejects.toThrow('closed');expect(mocks.terminate).toHaveBeenCalledTimes(1);expect(mocks.recognize).not.toHaveBeenCalled()
 })
})
