import {scannerError,type OcrProvider,type OcrState,type ScanImageRequest,type OcrResult,type Outcome} from './OcrTypes'
export class MockOcrProvider implements OcrProvider {
 readonly id='mock';readonly version='1';state:OcrState='NOT_LOADED'
 private readonly prepare:()=>Promise<void>
 constructor(prepare:()=>Promise<void>=()=>new Promise(resolve=>setTimeout(resolve,0))){this.prepare=prepare}
 async initialize(){this.state='LOADING';try{await this.prepare();this.state='READY'}catch(error){this.state='FAILED';throw error}}
 async scanImage(_request:ScanImageRequest):Promise<Outcome<OcrResult>>{void _request;return {ok:false,error:scannerError('OCR_NOT_IMPLEMENTED','recognition','OCR recognition is not implemented in this phase.')}}
 async dispose(){this.state='NOT_LOADED'}
}
