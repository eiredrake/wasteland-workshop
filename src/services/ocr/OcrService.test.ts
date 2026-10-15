import {describe,it,expect,vi} from 'vitest'
import {OcrService} from './OcrService'
import {MockOcrProvider} from './MockOcrProvider'
import {validateScanRequest,type ScanImageRequest} from './OcrTypes'
const request:ScanImageRequest={image:new Blob(['image']),sourceType:'FILE',width:100,height:80,target:{x:0,y:0,width:100,height:80}}
describe('mock OCR foundation',()=>{
 it('shares concurrent/reentrant initialization and reuses READY without duplicate events',async()=>{
  let finish!:()=>void;const prepare=vi.fn(()=>new Promise<void>(resolve=>{finish=resolve})),service=new OcrService(new MockOcrProvider(prepare)),events:string[]=[]
  expect(service.state).toBe('NOT_LOADED');let nested:Promise<void>|undefined
  const unsubscribe=service.subscribe(event=>{events.push(event.type);if(event.type==='OCR_LOAD_STARTED')nested=service.initialize();expect(event.providerId).toBe('mock');expect(Date.parse(event.timestamp)).not.toBeNaN()})
  const first=service.initialize();expect(service.state).toBe('LOADING');expect(service.initialize()).toBe(first);expect(nested).toBe(first);await Promise.resolve();finish();await first
  expect(service.state).toBe('READY');expect(service.initialize()).toBe(first);expect(prepare).toHaveBeenCalledOnce();expect(events).toEqual(['OCR_LOAD_STARTED','OCR_LOAD_SUCCEEDED']);unsubscribe();await service.replaceProvider(new MockOcrProvider());await service.initialize();expect(events).toHaveLength(2)
 })
 it('reports structured initialization failure and permits retry',async()=>{
  const prepare=vi.fn().mockRejectedValueOnce(new Error('Model preparation failed')).mockResolvedValueOnce(undefined),service=new OcrService(new MockOcrProvider(prepare)),events:unknown[]=[];service.subscribe(event=>events.push(event))
  await expect(service.initialize()).rejects.toMatchObject({detail:{code:'OCR_INITIALIZATION_FAILED',stage:'initialization',message:'Model preparation failed'}});expect(service.state).toBe('FAILED');expect(events).toEqual(expect.arrayContaining([expect.objectContaining({type:'OCR_LOAD_FAILED',state:'FAILED',durationMs:expect.any(Number)})]));await service.initialize();expect(service.state).toBe('READY');expect(prepare).toHaveBeenCalledTimes(2)
 })
 it('never fabricates OCR results and distinguishes not-ready/invalid/not-implemented',async()=>{
  const provider=new MockOcrProvider(),service=new OcrService(provider);expect(await service.scanImage(request)).toMatchObject({ok:false,error:{code:'OCR_NOT_READY'}});await service.initialize();expect(await service.scanImage(request)).toMatchObject({ok:false,error:{code:'OCR_NOT_IMPLEMENTED'}});expect(await provider.scanImage(request)).not.toHaveProperty('value');expect(await service.scanImage({...request,width:0})).toMatchObject({ok:false,error:{code:'IMAGE_INVALID'}});expect(await service.scanImage({...request,target:{x:-1,y:0,width:1,height:1}})).toMatchObject({ok:false,error:{code:'TARGET_REGION_INVALID'}})
 })
 it('cleans up and replaces providers without loading the replacement automatically',async()=>{
  const original=new MockOcrProvider(),next=new MockOcrProvider(),dispose=vi.spyOn(original,'dispose'),service=new OcrService(original);await service.initialize();await service.replaceProvider(next);expect(dispose).toHaveBeenCalledOnce();expect(service.state).toBe('NOT_LOADED');expect(next.state).toBe('NOT_LOADED');await service.initialize();await service.dispose();expect(service.state).toBe('NOT_LOADED')
 })
 it.each(['FILE','CAMERA_CAPTURE'] as const)('accepts static %s source in original pixel coordinates',sourceType=>expect(validateScanRequest({...request,sourceType})).toBeUndefined())
 it.each([{x:-1,y:0,width:1,height:1},{x:0,y:-1,width:1,height:1},{x:0,y:0,width:0,height:1},{x:0,y:0,width:1,height:0},{x:99,y:0,width:2,height:1},{x:0,y:79,width:1,height:2},{x:NaN,y:0,width:1,height:1}])('rejects invalid target %j',target=>expect(validateScanRequest({...request,target})?.code).toBe('TARGET_REGION_INVALID'))
 it.each([0,-1,NaN,Infinity])('rejects invalid source dimensions %s',width=>expect(validateScanRequest({...request,width})?.code).toBe('IMAGE_INVALID'))
})
