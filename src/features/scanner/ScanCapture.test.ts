import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { captureNamePhoto, stillFrameBounds, type StillCamera } from './ScanCapture'
import { scanSharpness } from './ScanQuality'
const drawImage=vi.fn(),close=vi.fn()
const video={videoWidth:1920,videoHeight:2560} as HTMLVideoElement
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({drawImage})})});vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({width:3840,height:5120,close}))})
afterEach(()=>vi.unstubAllGlobals())
it('uses native still capture and one-shot flash, crops the name and releases the bitmap',async()=>{
 const camera={takePhoto:vi.fn().mockResolvedValue(new Blob()),getPhotoCapabilities:vi.fn()} as StillCamera
 const result=await captureNamePhoto(video,camera,true,()=>true)
 expect(camera.takePhoto).toHaveBeenCalledWith({fillLightMode:'flash'});expect(result.source).toBe('still-photo');expect(result.canvas.width).toBe(2200);expect(close).toHaveBeenCalledOnce()
 expect(drawImage.mock.calls[0].slice(1,5)).toEqual(Object.values(stillFrameBounds(3840,5120,1920,2560)))
})
it('uses video when native capture is unsupported or fails without flash',async()=>{
 expect((await captureNamePhoto(video,undefined,false,()=>true)).source).toBe('video-frame')
 const camera={takePhoto:vi.fn().mockRejectedValue(Error('unavailable'))} as unknown as StillCamera
 expect((await captureNamePhoto(video,camera,false,()=>true)).source).toBe('video-fallback')
 await expect(captureNamePhoto(video,camera,true,()=>true)).rejects.toThrow('unavailable')
})
it('discards late stills when the scanner exits or backgrounds',async()=>{
 const camera={takePhoto:vi.fn().mockResolvedValue(new Blob())} as unknown as StillCamera
 await expect(captureNamePhoto(video,camera,false,()=>false)).rejects.toThrow('cancelled')
 expect(drawImage).not.toHaveBeenCalled()
})
it('center-maps a different still aspect ratio without stretching',()=>{
 const frame=stillFrameBounds(4000,3000,1920,2560)
 expect(frame.width/frame.height).toBeCloseTo(3.4)
 expect(frame.x+frame.width/2).toBeCloseTo(2000);expect(frame.y+frame.height/2).toBeCloseTo(1500)
})
it('reports lower edge energy for soft text and handles blank captures',()=>{
 const sharp=Uint8Array.from({length:64*64},(_,i)=>Math.floor(i%64/4)%2?220:30)
 const soft=Uint8Array.from({length:64*64},(_,i)=>Math.round(125+95*Math.sin(i%64*Math.PI/32)))
 expect(scanSharpness(sharp,64,64)).toBeGreaterThan(scanSharpness(soft,64,64)*10)
 expect(scanSharpness(new Uint8Array(4096).fill(200),64,64)).toBe(0)
 expect(scanSharpness(new Uint8Array(),0,0)).toBe(0)
})

it('closes a decoded photo when cancellation happens during decode',async()=>{
 let calls=0
 const camera={takePhoto:vi.fn().mockResolvedValue(new Blob())} as unknown as StillCamera
 await expect(captureNamePhoto(video,camera,false,()=>++calls===1)).rejects.toThrow('cancelled')
 expect(close).toHaveBeenCalledOnce();expect(drawImage).not.toHaveBeenCalled()
})
