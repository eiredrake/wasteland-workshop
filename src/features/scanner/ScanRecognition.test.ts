import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {createScanRecognizer,matchPaddleLines,type OcrLine} from './ScanRecognition'
import {masterBlueprints} from '../blueprints/blueprints'
const mocks=vi.hoisted(()=>({create:vi.fn(),predict:vi.fn(),dispose:vi.fn(),terminate:vi.fn(),fallbackCreate:vi.fn(),fallbackRead:vi.fn(),fallbackClose:vi.fn()}))
vi.mock('@paddleocr/paddleocr-js',()=>({PaddleOCR:{create:mocks.create}}))
vi.mock('./ScanOcr',()=>({createScanRecognizer:mocks.fallbackCreate}))
const base=masterBlueprints[0],catalog=[{...base,id:1,name:'Slappi Revolver'},{...base,id:2,name:'Hooch'}]
const line=(text:string,x:number,y:number,score=.95):OcrLine=>({text,score,poly:[[x,y],[x+100,y],[x+100,y+20],[x,y+20]]})
const image={width:800,height:200,toDataURL:()=> 'data:image/png;base64,local'} as HTMLCanvasElement
beforeEach(()=>{
 vi.resetAllMocks();vi.stubGlobal('location',{origin:'https://local.invalid'});vi.stubGlobal('window',{})
 vi.stubGlobal('Worker',class{terminate=mocks.terminate})
 vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({filter:'',drawImage:vi.fn()}),toDataURL:()=> 'data:image/png;base64,retry'})})
 mocks.create.mockImplementation(async options=>{options.worker.createWorker();return {predict:mocks.predict,dispose:mocks.dispose}})
 mocks.dispose.mockResolvedValue(undefined);mocks.fallbackCreate.mockReturnValue({recognize:mocks.fallbackRead,close:mocks.fallbackClose});mocks.fallbackClose.mockResolvedValue(undefined);mocks.fallbackRead.mockResolvedValue({confidence:'none',candidates:[]})
})
afterEach(()=>vi.unstubAllGlobals())
it('matches the name beside its label without matching resources later on the page',()=>{
 const result=matchPaddleLines([line('Item Name',10,10),line('Slappi Revolver',140,10),line('Item Type',10,40),line('Hooch',140,100)],catalog)
 expect(result.confidence).toBe('high');expect(result.candidates.map(c=>c.blueprint.id)).toEqual([1])
})
it('keeps fuzzy and context-free results as suggestions without lowering matching thresholds',()=>{
 const result=matchPaddleLines([line('MonNope',10,10,.58),line('Slappi Revover',140,10,.88),line('Item Type',10,40)],catalog)
 expect(result.confidence).toBe('ambiguous');expect(result.candidates[0].blueprint.id).toBe(1)
 expect(matchPaddleLines([line('Hooch',100,10)],catalog).confidence).toBe('ambiguous')
 expect(matchPaddleLines([line('garbled unreadable',10,10)],catalog).confidence).toBe('none')
})
it('uses local assets, a single-thread worker, and the primary engine before fallback',async()=>{
 mocks.predict.mockResolvedValue([{items:[line('Item Name',10,10),line('Slappi Revolver',140,10)]}])
 const reader=createScanRecognizer(),diagnostic=vi.fn(),result=await reader.recognize(image,catalog,diagnostic)
 expect(result.confidence).toBe('high');expect(mocks.fallbackCreate).not.toHaveBeenCalled()
 const options=mocks.create.mock.calls[0][0];expect(options.ortOptions).toMatchObject({backend:'wasm',numThreads:1});expect(options.textRecognitionModelAsset.url).toContain('https://local.invalid/ocr-paddle/')
 expect(diagnostic.mock.calls[0][0]).toMatchObject({engine:'PaddleOCR PP-OCRv5 mobile',mode:'detection+recognition'})
 await reader.close();expect(mocks.terminate).toHaveBeenCalledOnce();await expect(reader.recognize(image,catalog)).rejects.toThrow('closed')
})
it('falls back locally for an unmatched primary result',async()=>{
 mocks.predict.mockResolvedValue([{items:[]}]);const reader=createScanRecognizer()
 await reader.recognize(image,catalog);expect(mocks.fallbackRead).toHaveBeenCalledWith(image,catalog,undefined)
 await reader.close();expect(mocks.fallbackClose).toHaveBeenCalledOnce()
})
it('records primary errors and can still use the existing fallback',async()=>{
 mocks.create.mockRejectedValue(Error('Model failed'));const diagnostic=vi.fn(),reader=createScanRecognizer()
 await reader.recognize(image,catalog,diagnostic);expect(diagnostic.mock.calls[0][0]).toMatchObject({mode:'error',text:'Model failed'});expect(mocks.fallbackRead).toHaveBeenCalledOnce();await reader.close()
})
it('does not launch a worker or fallback after closing before lazy initialization',async()=>{
 const reader=createScanRecognizer();await reader.close();await expect(reader.recognize(image,catalog)).rejects.toThrow('closed');expect(mocks.create).not.toHaveBeenCalled();expect(mocks.fallbackCreate).not.toHaveBeenCalled()
})

it('terminates initialization in flight and ignores the late reader without launching fallback',async()=>{
 let resolve!:(value:unknown)=>void
 mocks.create.mockImplementation(options=>{options.worker.createWorker();return new Promise(done=>{resolve=done})})
 const reader=createScanRecognizer(),recognition=reader.recognize(image,catalog)
 await vi.waitFor(()=>expect(mocks.create).toHaveBeenCalledOnce());await reader.close();expect(mocks.terminate).toHaveBeenCalledOnce()
 resolve({predict:mocks.predict,dispose:mocks.dispose});await expect(recognition).rejects.toThrow('closed');expect(mocks.predict).not.toHaveBeenCalled();expect(mocks.fallbackCreate).not.toHaveBeenCalled()
})

it('retries an unmatched capture at reduced scale and requires confirmation',async()=>{
 mocks.predict.mockResolvedValueOnce([{items:[]}]).mockResolvedValueOnce([{items:[line('Inem Niame',10,10),line('Freeiron Hawkbi',140,10),line('Inem Type',10,40)]}])
 const reader=createScanRecognizer(),diagnostic=vi.fn()
 const result=await reader.recognize(image,[{...base,id:3,name:'Freeiron Hawkbill'}],diagnostic)
 expect(result.confidence).toBe('ambiguous');expect(result.candidates[0].blueprint.name).toBe('Freeiron Hawkbill')
 expect(mocks.fallbackRead).not.toHaveBeenCalled();expect(diagnostic.mock.calls[1][0].variant).toBe('grayscale reduced-scale')
 await reader.close()
})
