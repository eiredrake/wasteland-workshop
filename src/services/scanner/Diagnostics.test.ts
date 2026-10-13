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
