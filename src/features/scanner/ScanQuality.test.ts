import { afterEach, describe, expect, it, vi } from 'vitest'
import { assessScanQuality, grayscalePixels, normalizeScanContrast } from './ScanQuality'
import { captureScanFrame } from './ScanOcr'
import { scanFrameBounds } from '../../components/CameraPreview/CameraGeometry'
import { catalogNameFragments, extractScanNames, matchScanNames } from './ScanMatching'
import { masterBlueprints } from '../blueprints/blueprints'
afterEach(()=>vi.unstubAllGlobals())
describe('name-strip capture and guidance',()=>{
 it('warns for poor light and nearly blank/glare regions',()=>{
  expect(assessScanQuality(new Uint8Array(100).fill(30))).toBe('dark')
  expect(assessScanQuality(new Uint8Array(100).fill(250))).toBe('washed-out')
  expect(assessScanQuality(new Uint8Array(100).fill(130))).toBe('washed-out')
 })
 it('provides movement advice without claiming OCR/focus success',()=>{
  const pixels=Uint8Array.from({length:100},(_,i)=>i%2?220:60)
  expect(assessScanQuality(pixels)).toBe('aim')
  expect(assessScanQuality(pixels,pixels)).toBe('aim')
  expect(assessScanQuality(pixels,Uint8Array.from(pixels,v=>280-v))).toBe('moving')
  expect(assessScanQuality(new Uint8Array())).toBe('aim')
 })
 it('normalizes dim contrast and handles blank pixels without dividing by zero',()=>{
  const pixels=Uint8ClampedArray.from([70,70,70,255,130,130,130,255]);normalizeScanContrast(pixels)
  expect([...pixels]).toEqual([0,0,0,255,255,255,255,255])
  const blank=new Uint8ClampedArray(40).fill(100);normalizeScanContrast(blank);expect([...grayscalePixels(blank)]).toEqual(new Array(10).fill(100))
 })
 it('keeps tilted sparse OCR names occurring just before the label',()=>{
  const names=extractScanNames('Freeiron Dry Pack\nItem Name\nGizmo\nItem Type\nHooch')
  expect(matchScanNames(names,masterBlueprints).candidates[0].blueprint.name).toBe('Freeiron Dry Pack')
  expect(extractScanNames('Artisan Recipe\nItem Name\nFreeiron Dry Pack\nItem Type Gizmo')).not.toContain('Artisan Recipe')
 })
 it.each([[800,1050],[4000,3000],[1600,900]])('captures the exact visible strip without a whole-page downscale (%s,%s)',(width,height)=>{
  const drawImage=vi.fn(),canvas={width:0,height:0,getContext:()=>({drawImage})}
  vi.stubGlobal('document',{createElement:()=>canvas})
  const video={videoWidth:width,videoHeight:height} as HTMLVideoElement
  const capture=captureScanFrame(video),frame=scanFrameBounds(width,height)
  expect(capture.width).toBeLessThanOrEqual(2200)
  expect(capture.height/capture.width).toBeCloseTo(1/3.4,2)
  expect(drawImage).toHaveBeenCalledWith(video,frame.x,frame.y,frame.width,frame.height,0,0,canvas.width,canvas.height)
 })
 it('offers only whole-word catalog fragments without lowering fuzzy thresholds',()=>{
  const catalog=masterBlueprints.filter(b=>['Freeiron Dry Pack','Hooch'].includes(b.name))
  expect(catalogNameFragments(['�* Fréeiron/Dry,Pack! FESR�'],catalog)).toEqual(['Freeiron Dry Pack'])
  expect(catalogNameFragments(['Hooch Bs ee'],catalog)).toEqual(['Hooch'])
  expect(catalogNameFragments(['Hoochlemon unrelated text'],catalog)).toEqual([])
 })
 it('requires a ready camera',()=>expect(()=>captureScanFrame({videoWidth:0,videoHeight:0} as HTMLVideoElement)).toThrow('not ready'))
})
