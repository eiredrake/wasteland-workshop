import { describe,expect,it } from 'vitest'
import { cleanNamePixels,findNameRows,thresholdNamePixels } from './ScanNameRows'
describe('isolated name preprocessing',()=>{
 it('removes color and illumination gradients while retaining darker lettering',()=>{
  const width=100,height=30,data=new Uint8ClampedArray(width*height*4)
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,background=100+x;data[i]=background;data[i+1]=background+20;data[i+2]=background+40;data[i+3]=255;if(x>=45&&x<50&&y>=10&&y<20){data[i]-=40;data[i+1]-=40;data[i+2]-=40}}
  const binary=thresholdNamePixels(data,width,height),flatten=thresholdNamePixels(data,width,height,true)
  expect(binary[(15*width+47)*4]).toBe(0);expect(binary[(15*width+65)*4]).toBe(255)
  expect(flatten[(15*width+47)*4]).toBeLessThan(flatten[(15*width+65)*4]);expect(flatten[0]).toBe(flatten[1]);expect(flatten[1]).toBe(flatten[2])
 })
 it('ignores blank paper, tiny speckles and long rules',()=>{
  const width=400,height=100,data=new Uint8ClampedArray(width*height*4).fill(255)
  expect(findNameRows(data,width,height)).toEqual([])
  for(let x=0;x<width;x++)data[(50*width+x)*4]=0
  data[(20*width+200)*4]=0;cleanNamePixels(data,width,height)
  expect(findNameRows(data,width,height)).toEqual([])
 })
 it('finds text-height bands in reading order with a bounded retry count',()=>{
  const width=1000,height=300,data=new Uint8ClampedArray(width*height*4).fill(255)
  for(const top of [30,80,130,180,230])for(let y=top;y<top+12;y++)for(let x=200;x<300;x++)data[(y*width+x)*4]=0
  const rows=findNameRows(data,width,height);expect(rows).toHaveLength(3);expect(rows[0].y).toBeLessThan(30);expect(rows[0].y+rows[0].height).toBeGreaterThan(41);expect(rows[1].y).toBeGreaterThan(rows[0].y)
 })
})
