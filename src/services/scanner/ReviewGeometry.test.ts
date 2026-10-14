import {expect,it} from 'vitest'
import {fittedView,reviewView,targetingBox,targetInImage,zoomView,moveGesture,sourceBox} from './ReviewGeometry'
it('maps viewport coordinates through the actual zoom and offset',()=>expect(targetInImage({width:2000,height:1200},{x:100,y:80,width:300,height:60},{x:-50,y:-20,scale:.5})).toEqual({ok:true,value:{x:300,y:200,width:600,height:120}}))
it('accepts a partially covered target and extracts only source pixels',()=>expect(targetInImage({width:100,height:100},{x:0,y:0,width:50,height:20},{x:10,y:0,scale:1})).toEqual({ok:true,value:{x:0,y:0,width:40,height:20}}))
it('rounds inward to complete source pixels',()=>expect(targetInImage({width:100,height:100},{x:1,y:1,width:20,height:10},{x:0,y:0,scale:1.5})).toEqual({ok:true,value:{x:1,y:1,width:13,height:6}}))
it.each([{width:288,height:216},{width:704,height:528}])('initial review covers the stationary target for portrait images: %j',view=>{const image={width:600,height:1200};expect(targetInImage(image,targetingBox(view),reviewView(image,view))).toMatchObject({ok:true})})
it('preserves camera target position when entering review at the same size',()=>{
 const image={width:1920,height:1080},size={width:288,height:216},box=targetingBox(size),target=targetInImage(image,box,fittedView(image,size,true));expect(target.ok).toBe(true)
 if(target.ok){const projected=targetInImage(image,box,reviewView(image,size,sourceBox(box,fittedView(image,size,true))));expect(projected).toMatchObject({ok:true});if(projected.ok){expect(Math.abs(projected.value.x-target.value.x)).toBeLessThanOrEqual(1);expect(Math.abs(projected.value.y-target.value.y)).toBeLessThanOrEqual(1)}}
})
it('zooms around an anchor without moving its source pixel',()=>{const a={x:-10,y:20,scale:.5},b=zoomView(a,{x:100,y:80},1);expect((100-b.x)/b.scale).toBe((100-a.x)/a.scale);expect((80-b.y)/b.scale).toBe((80-a.y)/a.scale)})
it('pans one finger and pinches two fingers with a fixed source anchor',()=>{
 expect(moveGesture({x:0,y:0,scale:1},[{x:5,y:5}],[{x:25,y:35}],.1,10)).toEqual({x:20,y:30,scale:1})
 expect(moveGesture({x:0,y:0,scale:1},[{x:0,y:0},{x:100,y:0}],[{x:-50,y:0},{x:150,y:0}],.1,10)).toEqual({scale:2,x:-50,y:0})
})
it('bounds pinch zoom',()=>expect(moveGesture({x:0,y:0,scale:1},[{x:0,y:0},{x:1,y:0}],[{x:0,y:0},{x:100,y:0}],.1,4).scale).toBe(4))
it.each([0,NaN,Infinity,-1])('rejects invalid view scale %s',scale=>expect(targetInImage({width:100,height:100},{x:0,y:0,width:40,height:10},{x:0,y:0,scale})).toMatchObject({ok:false}))

it.each([{x:-20,y:0},{x:80,y:0},{x:0,y:-20},{x:0,y:80}])('clips partially overlapping targets at each image edge: %j',box=>{const result=targetInImage({width:100,height:100},{...box,width:40,height:40},{x:0,y:0,scale:1});expect(result.ok).toBe(true);if(result.ok){expect(result.value.width).toBeGreaterThan(0);expect(result.value.height).toBeGreaterThan(0);expect(result.value.x+result.value.width).toBeLessThanOrEqual(100);expect(result.value.y+result.value.height).toBeLessThanOrEqual(100)}})
it('rejects a box entirely outside the image',()=>expect(targetInImage({width:100,height:100},{x:120,y:0,width:40,height:40},{x:0,y:0,scale:1})).toMatchObject({ok:false,error:{code:'TARGET_REGION_INVALID'}}))
