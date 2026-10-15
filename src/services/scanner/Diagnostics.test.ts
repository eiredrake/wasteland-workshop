import {expect,it} from 'vitest'
import {DiagnosticRecorder} from './Diagnostics'
import {OcrService} from '../ocr/OcrService'
import {MockOcrProvider} from '../ocr/MockOcrProvider'
it('defaults off, records actual structured events when enabled and clears when disabled',()=>{
 const recorder=new DiagnosticRecorder();recorder.record({type:'TEST',stage:'acquisition'});expect(recorder.count).toBe(0);recorder.configure(true);recorder.record({type:'TEST',stage:'acquisition',scanId:'scan',width:100});const data=JSON.parse(recorder.exportJson());expect(data.records[0]).toMatchObject({schemaVersion:1,type:'TEST',sessionId:recorder.sessionId,scanId:'scan',width:100});expect(data.records[0].timestamp).toBeTruthy();recorder.clear();expect(recorder.count).toBe(0);recorder.record({type:'TEST',stage:'acquisition'});recorder.configure(false);expect(recorder.count).toBe(0)
})
it('bounds both record count and serialized memory, discarding oldest records',()=>{
 const recorder=new DiagnosticRecorder(2,1024);recorder.configure(true);for(let i=0;i<10;i++)recorder.record({type:String(i),stage:'matching'});expect(recorder.count).toBeLessThanOrEqual(2);expect(JSON.parse(recorder.exportJson()).records.at(-1).type).toBe('9');recorder.record({type:'LARGE',stage:'matching',text:'x'.repeat(2000)});expect(recorder.count).toBeLessThanOrEqual(2)
})
it('does not retain or export image payloads, even when future image inclusion is requested',()=>{
 const recorder=new DiagnosticRecorder();recorder.configure(true,true);recorder.record(Object.assign({type:'TEST',stage:'image' as const},{image:new Blob(['PRIVATE']),dataUrl:'PRIVATE'}));const data=recorder.exportJson();expect(data).not.toContain('PRIVATE');expect(data).not.toContain('dataUrl');expect(JSON.parse(data).imageExportImplemented).toBe(false);recorder.configure(false,true);expect(recorder.includeImages).toBe(false)
})
it('records actual load/request/result events with shared scan correlation and structured errors',async()=>{
 const recorder=new DiagnosticRecorder();recorder.configure(true);const service=new OcrService(new MockOcrProvider(),recorder.lifecycle,event=>recorder.record(event));await service.initialize();await service.scanImage({image:new Blob(['x']),sourceType:'FILE',width:10,height:10,target:{x:0,y:0,width:10,height:10},correlationId:'actual-scan'});const events=JSON.parse(recorder.exportJson()).records;expect(events.map((event:{type:string})=>event.type)).toEqual(['OCR_LOAD_STARTED','OCR_LOAD_SUCCEEDED','OCR_SCAN_REQUEST','OCR_SCAN_RESULT']);expect(events[2].scanId).toBe(events[3].scanId);expect(events[3].error.code).toBe('OCR_NOT_IMPLEMENTED')
})

it('exports real OCR, exact candidates, matches, and staged errors without retention when disabled',()=>{
 const recorder=new DiagnosticRecorder();const input={type:'BLUEPRINT_MATCH_RESULT',stage:'matching' as const,scanId:'scan',text:'AA Blade',candidates:['aa blade'],matchCount:1,matchedIds:[1],confidence:87}
 recorder.record(input);expect(recorder.count).toBe(0);recorder.configure(true);recorder.record(input)
 expect(JSON.parse(recorder.exportJson()).records[0]).toMatchObject(input);recorder.configure(false);expect(recorder.count).toBe(0)
})

it('retains source/coordinate/extracted dimensions but never a camera frame payload',()=>{
 const recorder=new DiagnosticRecorder();recorder.configure(true)
 const event={type:'SCAN_STARTED',stage:'target' as const,sourceType:'CAMERA_CAPTURE' as const,acquisitionId:'capture',scanId:'scan',target:{x:100,y:50,width:600,height:100},transformation:{viewportWidth:300,viewportHeight:225,scale:.5,offsetX:-20,offsetY:-10,targetX:27,targetY:80,targetWidth:246,targetHeight:50},extractedWidth:600,extractedHeight:100,frames:['must not retain']}
 recorder.record(event);const exported=JSON.parse(recorder.exportJson()).records[0];expect(exported).toMatchObject({sourceType:'CAMERA_CAPTURE',target:event.target,transformation:event.transformation,extractedWidth:600,extractedHeight:100});expect(exported.frames).toBeUndefined();recorder.configure(false);expect(recorder.count).toBe(0)
})

it('retains only one explicitly enabled crop, never embeds pixels, and releases it on clear or opt-out',()=>{
 const recorder=new DiagnosticRecorder(),blob=new Blob(['PRIVATE PIXELS'],{type:'image/png'}),request={image:blob,width:100,height:80,target:{x:10,y:5,width:60,height:40},sourceType:'FILE' as const,correlationId:'one'}
 recorder.captureCrop(blob,request);expect(recorder.getCrop()).toBeUndefined()
 recorder.configure(true);recorder.captureCrop(blob,request);expect(recorder.getCrop()).toBeUndefined()
 recorder.configure(true,true);recorder.captureCrop(blob,request);expect(recorder.getCrop()?.blob).toBe(blob);expect(recorder.getCrop()).toMatchObject({scanId:'one',width:60,height:40,target:request.target})
 recorder.captureCrop(new Blob(['two']),{...request,correlationId:'two'});expect(recorder.getCrop()?.scanId).toBe('two');expect(recorder.exportJson()).not.toContain('PRIVATE PIXELS')
 recorder.configure(true,false);expect(recorder.getCrop()).toBeUndefined()
 recorder.configure(true,true);recorder.captureCrop(blob,request);recorder.clear();expect(recorder.getCrop()).toBeUndefined()
})
it('clears a stale crop when a new crop exceeds the retention bound',()=>{
 const recorder=new DiagnosticRecorder();recorder.configure(true,true)
 const request={image:new Blob(['x']),width:10,height:10,target:{x:0,y:0,width:10,height:10},sourceType:'FILE' as const,correlationId:'large'}
 recorder.captureCrop(request.image,request)
 recorder.captureCrop(new Blob([new Uint8Array(8*1024*1024+1)]),request);expect(recorder.getCrop()).toBeUndefined()
 expect(JSON.parse(recorder.exportJson()).records.at(-1)).toMatchObject({type:'OCR_INPUT_IMAGE_SKIPPED',scanId:'large'})
})
