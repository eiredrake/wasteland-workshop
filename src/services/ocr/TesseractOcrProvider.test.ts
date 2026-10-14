import {expect,it,vi} from 'vitest'
import {TesseractOcrProvider,type RecognitionWorker} from './TesseractOcrProvider'
import {OcrService} from './OcrService'
import type {ScanImageRequest} from './OcrTypes'
vi.mock('../scanner/ImageRegion',()=>({extractImageRegion:vi.fn(async()=>({ok:true,value:new Blob(['region'])}))}))
const request:ScanImageRequest={image:new Blob(['image']),width:100,height:80,target:{x:10,y:5,width:60,height:40},sourceType:'FILE',correlationId:'scan-1'}
function setup(){const recognize=vi.fn().mockResolvedValue({data:{text:'raw provider text\n',confidence:87}}),terminate=vi.fn().mockResolvedValue(undefined),worker={recognize,terminate} as unknown as RecognitionWorker,factory=vi.fn(async()=>worker),provider=new TesseractOcrProvider(factory);return {recognize,terminate,factory,provider}}
it('initializes one shared worker through service, reuses it, and releases resources',async()=>{
 const {provider,factory,recognize,terminate}=setup(),service=new OcrService(provider),a=service.initialize(),b=service.initialize()
 expect(a).toBe(b);await a;await service.initialize();expect(factory).toHaveBeenCalledTimes(1)
 const first=await service.scanImage(request);await service.scanImage(request)
 expect(first).toMatchObject({ok:true,value:{text:'raw provider text\n',providerId:'tesseract',providerVersion:'7.0.0',confidence:87,correlationId:'scan-1'}})
 expect(recognize).toHaveBeenCalledWith(expect.any(Blob),{rectangle:{left:0,top:0,width:60,height:40}},{text:true})
 await service.dispose();expect(terminate).toHaveBeenCalledTimes(1);expect(provider.state).toBe('NOT_LOADED')
})
it('reports failed initialization and retries with a new worker',async()=>{
 const {provider,factory}=setup();factory.mockRejectedValueOnce(Error('Missing English data'));const service=new OcrService(provider)
 await expect(service.initialize()).rejects.toThrow('Missing English data');expect(service.state).toBe('FAILED')
 await service.initialize();expect(service.state).toBe('READY');expect(factory).toHaveBeenCalledTimes(2)
})
it('rejects invalid targets before calling the worker',async()=>{
 const {provider,recognize}=setup();await provider.initialize()
 expect(await provider.scanImage({...request,target:{x:99,y:0,width:2,height:10}})).toMatchObject({ok:false,error:{code:'TARGET_REGION_INVALID',stage:'target'}});expect(recognize).not.toHaveBeenCalled()
})
it('retains actual recognition errors and permits retry',async()=>{
 const {provider,recognize}=setup();await provider.initialize();recognize.mockRejectedValueOnce(Error('Recognition failed'))
 expect(await provider.scanImage(request)).toMatchObject({ok:false,error:{code:'OCR_RECOGNITION_FAILED',stage:'recognition',message:'Recognition failed'}})
 expect(await provider.scanImage(request)).toMatchObject({ok:true})
})
it('serializes scans and waits for in-flight work before cleanup',async()=>{
 const {provider,recognize,terminate}=setup();await provider.initialize();let finish:()=>void=()=>{}
 recognize.mockImplementationOnce(()=>new Promise(resolve=>{finish=()=>resolve({data:{text:'one',confidence:1}})}))
 const first=provider.scanImage(request),second=provider.scanImage(request);await vi.waitFor(()=>expect(recognize).toHaveBeenCalledTimes(1))
 finish();await first;await second;await provider.dispose();expect(recognize).toHaveBeenCalledTimes(2);expect(terminate).toHaveBeenCalledTimes(1)
})
