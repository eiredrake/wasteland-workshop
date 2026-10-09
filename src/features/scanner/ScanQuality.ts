export type ScanQuality = 'dark' | 'washed-out' | 'moving' | 'aim'
export const scanQualityMessage: Record<ScanQuality,string> = {
 dark: 'More light needed. Move out of shadow and avoid covering the camera.',
 'washed-out': 'Little text contrast. Tilt the paper away from glare and fill the frame with the name.',
 moving: 'Hold still for a moment so the camera can focus.',
 aim: 'Keep the full name inside the frame. Capture when the letters look sharp.',
}
export function assessScanQuality(gray: Uint8Array, previous?: Uint8Array): ScanQuality {
 if (!gray.length) return 'aim'
 let total=0, motion=0
 const histogram=new Uint32Array(256)
 for(let i=0;i<gray.length;i++){total+=gray[i];histogram[gray[i]]++;if(previous?.length===gray.length)motion+=Math.abs(gray[i]-previous[i])}
 const mean=total/gray.length
 if(mean<55)return 'dark'
 let low=0,high=255,count=0
 for(let i=0;i<256;i++){count+=histogram[i];if(count>=gray.length*.03){low=i;break}}
 count=0
 for(let i=255;i>=0;i--){count+=histogram[i];if(count>=gray.length*.03){high=i;break}}
 if(high-low<25)return 'washed-out'
 if(previous?.length===gray.length&&motion/gray.length>18)return 'moving'
 return 'aim'
}
// Small transient pixels used for guidance only; not an OCR confidence/focus guarantee.
export function grayscalePixels(rgba: Uint8ClampedArray): Uint8Array {
 const gray=new Uint8Array(rgba.length/4)
 for(let i=0;i<gray.length;i++)gray[i]=Math.round(.299*rgba[i*4]+.587*rgba[i*4+1]+.114*rgba[i*4+2])
 return gray
}
export function normalizeScanContrast(rgba: Uint8ClampedArray): void {
 const gray=grayscalePixels(rgba),histogram=new Uint32Array(256)
 for(const value of gray)histogram[value]++
 let low=0,high=255,count=0
 for(let i=0;i<256;i++){count+=histogram[i];if(count>=gray.length*.01){low=i;break}}
 count=0
 for(let i=255;i>=0;i--){count+=histogram[i];if(count>=gray.length*.01){high=i;break}}
 const stretch=high-low>=20
 for(let i=0;i<gray.length;i++){
  const value=stretch?Math.max(0,Math.min(255,Math.round((gray[i]-low)*255/(high-low)))):gray[i]
  rgba[i*4]=rgba[i*4+1]=rgba[i*4+2]=value;rgba[i*4+3]=255
 }
}
