import { describe,it,expect,vi,afterEach } from 'vitest'
import { fullPhotoCrop,photoGeometry,supportedPhoto,decodePhoto,recognizePhoto } from './PhotoImage'
import type { ScanRecognizer } from './ScanRecognition'
afterEach(()=>vi.unstubAllGlobals())
describe('photo inputs and geometry',()=>{
 it.each(['image/jpeg','image/png','image/webp','image/heic','image/heif'])('accepts supported format %s',type=>expect(supportedPhoto({type,name:'photo',size:20})).toBe(true))
 it('rejects unsupported, empty and oversized files',()=>{for(const file of [{type:'text/plain',name:'notes.txt',size:10},{type:'image/jpeg',name:'empty.jpg',size:0},{type:'image/jpeg',name:'huge.jpg',size:31*1024*1024}])expect(supportedPhoto(file)).toBe(false)})
 it('rotates actual dimensions and applies normalized crop bounds',()=>{expect(photoGeometry(1200,800,90,{x:.25,y:.1,width:.5,height:.2})).toEqual({width:800,height:1200,x:200,y:120,cropWidth:400,cropHeight:240});expect(photoGeometry(1200,800,0,fullPhotoCrop).cropWidth).toBe(1200);expect(()=>photoGeometry(100,100,0,{x:.9,y:0,width:.5,height:1})).toThrow()})
 it('honors EXIF orientation and releases decoded bitmap after resizing',async()=>{
  const close=vi.fn(),drawImage=vi.fn(),bitmap={width:4000,height:3000,close}
  const decode=vi.fn(async()=>bitmap);vi.stubGlobal('createImageBitmap',decode)
  const canvas={width:0,height:0,getContext:()=>({drawImage})};vi.stubGlobal('document',{createElement:()=>canvas})
  const file=new File(['photo'],'photo.jpg',{type:'image/jpeg'})
  expect(await decodePhoto(file)).toMatchObject({width:2560,height:1920});expect(decode).toHaveBeenCalledWith(file,{imageOrientation:'from-image'});expect(close).toHaveBeenCalledOnce()
 })
 it('decoding failure returns a recoverable format message',async()=>{vi.stubGlobal('createImageBitmap',async()=>{throw new Error('invalid image')});await expect(decodePhoto(new File(['bad'],'bad.png',{type:'image/png'}))).rejects.toThrow('Try a JPEG')})
 it('reuses the existing static recognizer and releases temporary title crops',async()=>{
  const canvases:{width:number;height:number}[]=[],context={translate:vi.fn(),rotate:vi.fn(),drawImage:vi.fn()}
  vi.stubGlobal('document',{createElement:()=>{const canvas={width:0,height:0,getContext:()=>context};canvases.push(canvas);return canvas}})
  const recognize=vi.fn().mockResolvedValueOnce({confidence:'none',candidates:[]}).mockResolvedValueOnce({confidence:'ambiguous',candidates:[]})
  const recognizer={recognize,close:vi.fn()} as ScanRecognizer
  const image={width:1200,height:1600} as HTMLCanvasElement
  expect((await recognizePhoto(image,recognizer,[],false)).confidence).toBe('ambiguous');expect(recognize).toHaveBeenCalledTimes(2);expect(canvases.every(canvas=>canvas.width===0&&canvas.height===0)).toBe(true)
  recognize.mockClear().mockResolvedValue({confidence:'high',candidates:[]});await recognizePhoto(image,recognizer,[],true);expect(recognize).toHaveBeenCalledOnce();expect(recognize.mock.calls[0][0]).toBe(image)
 })
})
