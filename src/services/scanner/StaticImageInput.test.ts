import {expect,it,vi,afterEach} from 'vitest'
import {prepareStaticImage,fullImageRequest} from './StaticImageInput'
afterEach(()=>vi.unstubAllGlobals())
it.each(['image/jpeg','image/png','image/webp'])('uses decoded original dimensions for %s regardless of extension',async type=>{
 vi.stubGlobal('Image',class{src='';naturalWidth=1234;naturalHeight=987;decode(){return Promise.resolve()}})
 const canvas={width:0,height:0,getContext:()=>({drawImage:vi.fn()}),toBlob:(done:(blob:Blob)=>void)=>done(new Blob(['normalized'],{type:'image/png'}))};vi.stubGlobal('document',{createElement:()=>canvas})
 const file=new File(['pixels'],'arbitrary.data',{type}),result=await prepareStaticImage(file)
 expect(result).toMatchObject({ok:true,value:{width:1234,height:987}})
 if(result.ok)expect(fullImageRequest(result.value,'id')).toMatchObject({image:result.value.blob,width:1234,height:987,target:{x:0,y:0,width:1234,height:987},correlationId:'id'})
})
it('reports decoding errors separately',async()=>{
 vi.stubGlobal('Image',class{decode(){return Promise.reject(Error('Invalid bytes'))}})
 expect(await prepareStaticImage(new File(['invalid'],'bad.jpg'))).toMatchObject({ok:false,error:{code:'IMAGE_DECODE_FAILED',stage:'image'}})
})
it.each([new File(['video'],'x.webm',{type:'video/webm'}),new File([new Uint8Array([0x1a,0x45,0xdf,0xa3])],'x.data')])('rejects video before invoking image decoding',async file=>{
 const image=vi.fn();vi.stubGlobal('Image',image)
 expect(await prepareStaticImage(file)).toMatchObject({ok:false,error:{code:'VIDEO_UNSUPPORTED',stage:'image'}});expect(image).not.toHaveBeenCalled()
})

it('uses the same oriented normalization for camera and file sources',async()=>{
 const drawImage=vi.fn(),bitmap={width:200,height:100,close:vi.fn()},canvas={width:0,height:0,getContext:()=>({drawImage}),toBlob:(done:(blob:Blob)=>void)=>done(new Blob(['normalized'],{type:'image/png'}))}
 vi.stubGlobal('document',{createElement:()=>canvas});vi.stubGlobal('Image',class{decode(){return Promise.reject(Error('image element decoder failed'))}});vi.stubGlobal('createImageBitmap',vi.fn(async()=>bitmap))
 const result=await prepareStaticImage(new File(['pixels'],'native-camera-return.jpg'),'CAMERA_CAPTURE','capture-id')
 expect(result).toMatchObject({ok:true,value:{width:200,height:100,sourceType:'CAMERA_CAPTURE',acquisitionId:'capture-id'}})
 expect(drawImage).toHaveBeenCalledWith(bitmap,0,0,200,100);expect(bitmap.close).toHaveBeenCalled();expect(canvas.width).toBe(0)
})

it('preserves a header-read rejection and never starts decoding',async()=>{
 const {DiagnosticRecorder}=await import('./Diagnostics'),log=new DiagnosticRecorder();log.configure(true)
 const file=new File(['pixels'],'provider.jpg',{type:'image/jpeg',lastModified:123})
 vi.spyOn(file,'slice').mockReturnValue({arrayBuffer:()=>Promise.reject(new DOMException('Provider content unavailable','NotReadableError'))} as Blob)
 const result=await prepareStaticImage(file,'FILE','read-id',undefined,event=>log.record(event))
 expect(result).toMatchObject({ok:false,error:{code:'IMAGE_READ_FAILED',details:{exceptionName:'NotReadableError',exceptionMessage:'Provider content unavailable'}}})
 const records=JSON.parse(log.exportJson()).records
 expect(records.map((r:{type:string})=>r.type)).toEqual(['IMAGE_READ_STARTED','IMAGE_READ_FAILED'])
 expect(records[1]).toMatchObject({scanId:'read-id',operation:'read-header',api:'Blob.slice().arrayBuffer()',lastModified:123,readScope:'first 4 bytes only',exceptionName:'NotReadableError'})
})
it('preserves both decoder exceptions and releases the URL only after the delayed fallback',async()=>{
 const {DiagnosticRecorder}=await import('./Diagnostics'),log=new DiagnosticRecorder();log.configure(true)
 vi.stubGlobal('Image',class{decode(){return Promise.reject(new DOMException('Element rejected bytes','EncodingError'))}})
 let reject!:(error:Error)=>void
 vi.stubGlobal('createImageBitmap',vi.fn(()=>new Promise((_,no)=>{reject=no})))
 const revoke=vi.spyOn(URL,'revokeObjectURL'),pending=prepareStaticImage(new File(['pixels'],'provider.jpg'),'FILE','decode-id',undefined,event=>log.record(event))
 await vi.waitFor(()=>expect(reject).toBeTypeOf('function'));expect(revoke).not.toHaveBeenCalled()
 reject(new DOMException('Bitmap could not read source','NotReadableError'))
 expect(await pending).toMatchObject({ok:false,error:{code:'IMAGE_DECODE_FAILED',details:{exceptionName:'NotReadableError'}}})
 expect(JSON.parse(log.exportJson()).records.filter((r:{type:string})=>r.type==='IMAGE_DECODE_FAILED')).toMatchObject([{api:'HTMLImageElement.decode',exceptionName:'EncodingError',exceptionMessage:'Element rejected bytes'},{api:'createImageBitmap(imageOrientation=from-image)',exceptionName:'NotReadableError',exceptionMessage:'Bitmap could not read source'}])
 expect(revoke).toHaveBeenCalledTimes(1);revoke.mockRestore()
})
it('distinguishes successful decoding from preview encoding failure',async()=>{
 const {DiagnosticRecorder}=await import('./Diagnostics'),log=new DiagnosticRecorder();log.configure(true)
 vi.stubGlobal('Image',class{naturalWidth=100;naturalHeight=50;decode(){return Promise.resolve()}})
 vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({drawImage:vi.fn()}),toBlob:()=>{throw new DOMException('Canvas unavailable','SecurityError')}})})
 expect(await prepareStaticImage(new File(['pixels'],'x.png'),'FILE','preview-id',undefined,e=>log.record(e))).toMatchObject({ok:false,error:{code:'IMAGE_PREVIEW_FAILED',details:{exceptionName:'SecurityError'}}})
 const events=JSON.parse(log.exportJson()).records
 expect(events.some((e:{type:string})=>e.type==='IMAGE_DECODE_SUCCEEDED')).toBe(true)
 expect(events.find((e:{type:string})=>e.type==='IMAGE_PREVIEW_ENCODING_FAILED')).toMatchObject({exceptionName:'SecurityError',api:'HTMLCanvasElement.toBlob(image/png)',scanId:'preview-id'})
})
it('keeps overlapping acquisitions and their URL cleanup independent',async()=>{
 const resolvers:(()=>void)[]=[]
 vi.stubGlobal('Image',class{naturalWidth=10;naturalHeight=10;decode(){return new Promise<void>(yes=>resolvers.push(yes))}})
 vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({drawImage:vi.fn()}),toBlob:(done:(value:Blob)=>void)=>done(new Blob(['png']))})})
 const revoke=vi.spyOn(URL,'revokeObjectURL'),file=new File(['pixels'],'repeat.webp')
 const first=prepareStaticImage(file),second=prepareStaticImage(file)
 await vi.waitFor(()=>expect(resolvers).toHaveLength(2))
 resolvers[1]();expect((await second).ok).toBe(true);expect(revoke).toHaveBeenCalledTimes(1)
 resolvers[0]();expect((await first).ok).toBe(true);expect(revoke).toHaveBeenCalledTimes(2)
 revoke.mockRestore()
})
